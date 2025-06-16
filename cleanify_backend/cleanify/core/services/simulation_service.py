"""
Main game-loop.
Own thread/greenlet → periodically:
    1. Advance sim time
    2. Ask OptimizationService if any action needed
    3. Move trucks (respect traffic multiplier)
    4. Collect bins that were reached
    5. Emit updated state via SocketIO
"""
import threading
import time
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from cleanify.core.utils.time_manager import TimeManager
from cleanify.core.models.truck import Truck, TruckStatus
from cleanify.core.models.bin import Bin, BinStatus, WasteType
from cleanify.core.models.depot import Depot
from .traffic_service import TrafficService
from .optimization_service import OptimizationService
from .threshold_service import ThresholdService
from .osrm_service import OSRMService


class SimulationService(threading.Thread):
    """Main simulation service managing the waste collection simulation"""
    
    TICK_REAL_SECONDS = 0.2            # 5 Hz loop (change if heavy)

    def __init__(self, sio):
        super().__init__(daemon=True)
        self.sio = sio
        self.time_manager = TimeManager()
        self.traffic_service = TrafficService(self.time_manager)
        self.osrm_service = OSRMService()
        self.threshold_service = ThresholdService(self.osrm_service, self.traffic_service)
        self.optimization_svc = OptimizationService(
            self.traffic_service, self.osrm_service, self.threshold_service
        )
        
        self._running = False
        self._paused = False
        
        # Simulation state
        self.trucks: List[Truck] = self._bootstrap_demo_trucks()
        self.bins: List[Bin] = self._bootstrap_demo_bins()
        self.depots: List[Depot] = self._bootstrap_demo_depots()
        
        # Performance tracking
        self.tick_count = 0
        self.total_collections = 0
        self.total_distance_traveled = 0.0
        self.simulation_start_time = datetime.now()
        
        # Event tracking
        self.events_log = []
        self.max_events = 1000
        
        # Configuration
        self.config = {
            "auto_optimization": True,
            "auto_bin_filling": True,
            "truck_breakdown_probability": 0.001,  # Per tick
            "bin_overflow_enabled": True,
            "depot_processing_enabled": True,
            "emit_frequency": 1,  # Emit every N ticks
            "max_trucks_per_optimization": 10
        }
        
        self.logger = logging.getLogger(__name__)
        self.logger.info("SimulationService initialized")

    # ---------- Thread controls -----------------

    def run(self):
        """Main simulation loop"""
        self._running = True
        self.logger.info("Simulation started")
        
        while self._running:
            try:
                sim_now = self.time_manager.now()
                
                if not self._paused:
                    self._step(sim_now)
                    self.tick_count += 1
                    
                    # Emit state update periodically
                    if self.tick_count % self.config["emit_frequency"] == 0:
                        self._emit_state_update(sim_now)
                
                time.sleep(self.TICK_REAL_SECONDS)
                
            except Exception as e:
                self.logger.error(f"Simulation step failed: {e}")
                time.sleep(1)  # Prevent rapid error loops
        
        self.logger.info("Simulation stopped")

    def pause(self):
        """Pause simulation"""
        self._paused = True
        self.time_manager.pause()
        self._log_event("simulation_paused", {"timestamp": datetime.now().isoformat()})

    def resume(self):
        """Resume simulation"""
        self._paused = False
        self.time_manager.resume()
        self._log_event("simulation_resumed", {"timestamp": datetime.now().isoformat()})

    def stop(self):
        """Stop simulation"""
        self._running = False
        self._log_event("simulation_stopped", {"timestamp": datetime.now().isoformat()})

    def set_speed(self, speed: int):
        """Set simulation speed multiplier"""
        self.time_manager.set_speed(speed)
        self._log_event("speed_changed", {"new_speed": speed})

    # ---------- Inner loop ----------------------

    def _step(self, sim_now: datetime):
        """Core logic per tick – VERY high-level; delegate details out."""
        try:
            # 1. Update bin fill levels
            if self.config["auto_bin_filling"]:
                self._update_bin_fill_levels(sim_now)
            
            # 2. Process depot operations
            if self.config["depot_processing_enabled"]:
                self._process_depots(sim_now)
            
            # 3. Move trucks and handle collections
            self._move_trucks(sim_now)
            
            # 4. Check for truck maintenance/breakdowns
            self._handle_truck_maintenance()
            
            # 5. Ask optimization service for any needed actions
            if self.config["auto_optimization"]:
                self.optimization_svc.maybe_reoptimize(self.trucks)
            
            # 6. Update statistics
            self._update_statistics()
            
        except Exception as e:
            self.logger.error(f"Simulation step error: {e}")

    def _update_bin_fill_levels(self, sim_now: datetime):
        """Update fill levels for all bins based on time passed"""
        time_delta = self.time_manager.get_time_delta_minutes()
        
        for bin_obj in self.bins:
            if bin_obj.status == BinStatus.ACTIVE:
                old_fill = bin_obj.fill_level
                bin_obj.update_fill_level(time_delta)
                
                # Check for overflow
                if (self.config["bin_overflow_enabled"] and 
                    bin_obj.fill_level >= 100 and old_fill < 100):
                    self._handle_bin_overflow(bin_obj)
                
                # Check if bin needs urgent collection
                threshold = self.threshold_service.threshold_for(bin_obj)
                if (bin_obj.fill_level >= threshold and 
                    old_fill < threshold):
                    self._log_event("bin_needs_collection", {
                        "bin_id": bin_obj.id,
                        "fill_level": bin_obj.fill_level,
                        "threshold": threshold
                    })

    def _process_depots(self, sim_now: datetime):
        """Process waste at depots"""
        time_delta_hours = self.time_manager.get_time_delta_minutes() / 60.0
        
        for depot in self.depots:
            if depot.is_operational(sim_now):
                processed = depot.process_waste(time_delta_hours)
                if processed > 0:
                    self._log_event("depot_processed_waste", {
                        "depot_id": depot.id,
                        "amount_processed": processed
                    })

    def _move_trucks(self, sim_now: datetime):
        """Advance each truck along its route, respecting current traffic multiplier."""
        traffic_multiplier = self.traffic_service.current_multiplier()
        time_delta_minutes = self.time_manager.get_time_delta_minutes()
        
        for truck in self.trucks:
            if truck.status == TruckStatus.OFFLINE:
                continue
            
            try:
                self._move_single_truck(truck, time_delta_minutes, traffic_multiplier)
            except Exception as e:
                self.logger.error(f"Error moving truck {truck.id}: {e}")

    def _move_single_truck(self, truck: Truck, time_delta_minutes: float, 
                          traffic_multiplier: float):
        """Handle movement and actions for a single truck"""
        original_status = truck.status
        
        if truck.status == TruckStatus.IDLE:
            # Check if truck has a route assigned
            if truck.route:
                truck.status = TruckStatus.EN_ROUTE
                self._log_event("truck_started_route", {
                    "truck_id": truck.id,
                    "route": truck.route.copy()
                })
        
        elif truck.status == TruckStatus.EN_ROUTE:
            self._handle_en_route_truck(truck, time_delta_minutes, traffic_multiplier)
        
        elif truck.status == TruckStatus.COLLECTING:
            # Simulate collection time (could be more sophisticated)
            truck.status = TruckStatus.EN_ROUTE
            self._log_event("truck_finished_collecting", {"truck_id": truck.id})
        
        elif truck.status == TruckStatus.RETURNING:
            self._handle_returning_truck(truck, time_delta_minutes, traffic_multiplier)
        
        elif truck.status == TruckStatus.MAINTENANCE:
            # Truck is in maintenance, don't move
            pass

    def _handle_en_route_truck(self, truck: Truck, time_delta_minutes: float, 
                             traffic_multiplier: float):
        """Handle truck that is en route to next bin"""
        next_bin_id = truck.get_next_destination()
        
        if not next_bin_id:
            # No more destinations, return to depot or go idle
            if truck.load > 0:
                truck.status = TruckStatus.RETURNING
            else:
                truck.status = TruckStatus.IDLE
            return
        
        # Find the target bin
        target_bin = next((b for b in self.bins if b.id == next_bin_id), None)
        
        if not target_bin:
            # Bin not found, skip to next
            truck.advance_route()
            self._log_event("bin_not_found", {
                "truck_id": truck.id,
                "bin_id": next_bin_id
            })
            return
        
        # Move towards target bin
        reached = truck.move_towards(
            target_bin.location, time_delta_minutes, traffic_multiplier
        )
        
        if reached:
            # Truck reached the bin
            self._handle_bin_collection(truck, target_bin)
            truck.advance_route()

    def _handle_returning_truck(self, truck: Truck, time_delta_minutes: float, 
                              traffic_multiplier: float):
        """Handle truck returning to depot"""
        depot = self._find_nearest_depot(truck.location)
        
        if not depot:
            self.logger.warning(f"No depot found for truck {truck.id}")
            truck.status = TruckStatus.IDLE
            return
        
        reached = truck.move_towards(
            depot.location, time_delta_minutes, traffic_multiplier
        )
        
        if reached:
            # Truck reached depot
            self._handle_depot_arrival(truck, depot)

    def _handle_bin_collection(self, truck: Truck, bin_obj: Bin):
        """Handle collection of waste from bin"""
        if bin_obj.status != BinStatus.ACTIVE or truck.is_full():
            return
        
        # Calculate bin load
        bin_load = (bin_obj.fill_level / 100.0) * bin_obj.capacity
        
        if truck.can_collect_bin(bin_load):
            # Perform collection
            collected_amount = bin_obj.collect()
            truck.collect_bin(bin_obj.id, collected_amount)
            
            self.total_collections += 1
            
            self._log_event("bin_collected", {
                "truck_id": truck.id,
                "bin_id": bin_obj.id,
                "amount_collected": collected_amount,
                "truck_load_after": truck.load
            })
            
            # Reset bin status after a short delay
            bin_obj.reset_status()
        else:
            self._log_event("collection_failed", {
                "truck_id": truck.id,
                "bin_id": bin_obj.id,
                "reason": "insufficient_capacity"
            })

    def _handle_depot_arrival(self, truck: Truck, depot: Depot):
        """Handle truck arrival at depot"""
        if truck.load > 0:
            # Try to empty truck at depot
            if depot.can_accept_waste(WasteType.GENERAL, truck.load):
                emptied_amount = truck.empty_load()
                depot.receive_waste(WasteType.GENERAL, emptied_amount, truck.id)
                
                self._log_event("truck_emptied_at_depot", {
                    "truck_id": truck.id,
                    "depot_id": depot.id,
                    "amount_emptied": emptied_amount
                })
            else:
                self._log_event("depot_full", {
                    "truck_id": truck.id,
                    "depot_id": depot.id,
                    "truck_load": truck.load
                })
                # Truck remains loaded, might need to find another depot
                return
        
        # Truck is now idle at depot
        truck.status = TruckStatus.IDLE
        truck.location = depot.location

    def _handle_truck_maintenance(self):
        """Check and handle truck maintenance needs"""
        for truck in self.trucks:
            if truck.needs_maintenance() and truck.status != TruckStatus.MAINTENANCE:
                truck.perform_maintenance()
                self._log_event("truck_maintenance_started", {
                    "truck_id": truck.id,
                    "reason": "scheduled_maintenance"
                })
            
            # Random breakdown simulation
            if (truck.status != TruckStatus.MAINTENANCE and 
                truck.status != TruckStatus.OFFLINE):
                if self._random_event(self.config["truck_breakdown_probability"]):
                    truck.perform_maintenance()
                    self._log_event("truck_breakdown", {
                        "truck_id": truck.id,
                        "location": list(truck.location)
                    })

    def _handle_bin_overflow(self, bin_obj: Bin):
        """Handle bin overflow situation"""
        bin_obj.status = BinStatus.FULL
        self._log_event("bin_overflow", {
            "bin_id": bin_obj.id,
            "location": list(bin_obj.location),
            "type": bin_obj.type.value
        })

    def _update_statistics(self):
        """Update simulation statistics"""
        # Calculate total distance traveled
        total_distance = sum(truck.total_distance_traveled for truck in self.trucks)
        self.total_distance_traveled = total_distance

    def _emit_state_update(self, sim_now: datetime):
        """Emit current simulation state via SocketIO"""
        try:
            snapshot = self._snapshot(sim_now)
            self.sio.emit("simulation_tick", snapshot)
        except Exception as e:
            self.logger.error(f"Failed to emit state update: {e}")

    # ---------------- Helper methods --------------------

    def _find_nearest_depot(self, location: tuple) -> Optional[Depot]:
        """Find nearest depot to given location"""
        if not self.depots:
            return None
        
        min_distance = float('inf')
        nearest_depot = None
        
        for depot in self.depots:
            if depot.status.value == "active":
                distance = self._calculate_distance(location, depot.location)
                if distance < min_distance:
                    min_distance = distance
                    nearest_depot = depot
        
        return nearest_depot

    def _calculate_distance(self, loc1: tuple, loc2: tuple) -> float:
        """Calculate distance between two locations"""
        if self.osrm_service:
            try:
                return self.osrm_service.calculate_distance(loc1, loc2)
            except:
                pass
        
        # Fallback to haversine
        import math
        R = 6371  # Earth's radius in km
        lat1, lon1 = math.radians(loc1[1]), math.radians(loc1[0])
        lat2, lon2 = math.radians(loc2[1]), math.radians(loc2[0])
        dlat, dlon = lat2 - lat1, lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        return 2 * R * math.asin(math.sqrt(a))

    def _random_event(self, probability: float) -> bool:
        """Check if random event occurs based on probability"""
        import random
        return random.random() < probability

    def _log_event(self, event_type: str, data: dict):
        """Log simulation event"""
        event = {
            "timestamp": datetime.now().isoformat(),
            "type": event_type,
            "data": data
        }
        
        self.events_log.append(event)
        
        # Keep only recent events
        if len(self.events_log) > self.max_events:
            self.events_log = self.events_log[-self.max_events:]
        
        # Emit significant events
        if event_type in ["bin_collected", "truck_breakdown", "bin_overflow"]:
            self.sio.emit("simulation_event", event)

    def _snapshot(self, sim_now: datetime) -> Dict[str, Any]:
        """Build lightweight dict (no ORM objects) for SocketIO emit."""
        return {
            "sim_time": sim_now.isoformat(),
            "sim_speed": self.time_manager.speed,
            "is_paused": self._paused,
            "tick_count": self.tick_count,
            "trucks": [truck.as_dict() for truck in self.trucks],
            "bins": [bin_obj.as_dict() for bin_obj in self.bins[:50]],  # Limit for performance
            "depots": [depot.as_dict() for depot in self.depots],
            "traffic_multiplier": self.traffic_service.current_multiplier(),
            "statistics": {
                "total_collections": self.total_collections,
                "total_distance": self.total_distance_traveled,
                "active_trucks": len([t for t in self.trucks if t.is_available()]),
                "bins_needing_collection": len([
                    b for b in self.bins 
                    if b.needs_collection(self.threshold_service.threshold_for(b))
                ]),
                "simulation_uptime": (datetime.now() - self.simulation_start_time).total_seconds()
            },
            "recent_events": self.events_log[-10:]  # Last 10 events
        }

    # ---------------- Bootstrap methods --------------------

    def _bootstrap_demo_trucks(self) -> List[Truck]:
        """Create demo trucks for simulation"""
        trucks = []
        
        depot_location = (74.3587, 31.5204)  # Lahore coordinates
        
        for i in range(3):
            truck = Truck(
                id=f"truck_{i+1}",
                capacity=1000.0,
                location=depot_location,
                depot_location=depot_location,
                speed=45.0,
                fuel_level=100.0
            )
            trucks.append(truck)
        
        return trucks

    def _bootstrap_demo_bins(self) -> List[Bin]:
        """Create demo bins for simulation"""
        bins = []
        
        # Sample locations around Lahore
        locations = [
            (74.3587, 31.5204),  # City center
            (74.3400, 31.5150),  # West
            (74.3700, 31.5300),  # North
            (74.3500, 31.5100),  # South
            (74.3650, 31.5250),  # East
        ]
        
        waste_types = [WasteType.GENERAL, WasteType.RECYCLABLE, WasteType.HAZARDOUS]
        
        for i, location in enumerate(locations):
            for j, waste_type in enumerate(waste_types):
                bin_obj = Bin(
                    id=f"bin_{i}_{j}",
                    type=waste_type,
                    location=location,
                    fill_level=30.0 + (i * 10),  # Varying fill levels
                    static_threshold=80.0,
                    capacity=100.0,
                    fill_rate=5.0
                )
                bins.append(bin_obj)
        
        return bins

    def _bootstrap_demo_depots(self) -> List[Depot]:
        """Create demo depots for simulation"""
        depot = Depot(
            id="main_depot",
            name="Main Waste Processing Depot",
            location=(74.3587, 31.5204),  # Lahore
            capacity=10000.0,
            processing_rate=150.0
        )
        
        return [depot]

    # ---------------- Public API --------------------

    def add_truck(self, truck_data: Dict[str, Any]) -> bool:
        """Add new truck to simulation"""
        try:
            truck = Truck.from_dict(truck_data)
            self.trucks.append(truck)
            self._log_event("truck_added", {"truck_id": truck.id})
            return True
        except Exception as e:
            self.logger.error(f"Failed to add truck: {e}")
            return False

    def remove_truck(self, truck_id: str) -> bool:
        """Remove truck from simulation"""
        truck = next((t for t in self.trucks if t.id == truck_id), None)
        if truck:
            self.trucks.remove(truck)
            self._log_event("truck_removed", {"truck_id": truck_id})
            return True
        return False

    def add_bin(self, bin_data: Dict[str, Any]) -> bool:
        """Add new bin to simulation"""
        try:
            bin_obj = Bin.from_dict(bin_data)
            self.bins.append(bin_obj)
            self._log_event("bin_added", {"bin_id": bin_obj.id})
            return True
        except Exception as e:
            self.logger.error(f"Failed to add bin: {e}")
            return False

    def remove_bin(self, bin_id: str) -> bool:
        """Remove bin from simulation"""
        bin_obj = next((b for b in self.bins if b.id == bin_id), None)
        if bin_obj:
            self.bins.remove(bin_obj)
            self._log_event("bin_removed", {"bin_id": bin_id})
            return True
        return False

    def get_statistics(self) -> Dict[str, Any]:
        """Get detailed simulation statistics"""
        uptime = (datetime.now() - self.simulation_start_time).total_seconds()
        
        return {
            "simulation": {
                "uptime_seconds": uptime,
                "tick_count": self.tick_count,
                "is_running": self._running,
                "is_paused": self._paused,
                "speed": self.time_manager.speed,
                "current_time": self.time_manager.now().isoformat()
            },
            "trucks": {
                "total": len(self.trucks),
                "active": len([t for t in self.trucks if t.status != TruckStatus.OFFLINE]),
                "idle": len([t for t in self.trucks if t.status == TruckStatus.IDLE]),
                "en_route": len([t for t in self.trucks if t.status == TruckStatus.EN_ROUTE]),
                "maintenance": len([t for t in self.trucks if t.status == TruckStatus.MAINTENANCE])
            },
            "bins": {
                "total": len(self.bins),
                "active": len([b for b in self.bins if b.status == BinStatus.ACTIVE]),
                "full": len([b for b in self.bins if b.status == BinStatus.FULL]),
                "needing_collection": len([
                    b for b in self.bins 
                    if b.needs_collection(self.threshold_service.threshold_for(b))
                ])
            },
            "performance": {
                "total_collections": self.total_collections,
                "total_distance_km": self.total_distance_traveled,
                "collections_per_hour": (
                    self.total_collections / max(0.1, uptime / 3600)
                ),
                "average_distance_per_collection": (
                    self.total_distance_traveled / max(1, self.total_collections)
                )
            },
            "services": {
                "traffic": self.traffic_service.get_status(),
                "optimization": self.optimization_svc.get_statistics(),
                "threshold": self.threshold_service.get_status()
            }
        }

    def configure(self, config: Dict[str, Any]) -> None:
        """Update simulation configuration"""
        for key, value in config.items():
            if key in self.config:
                self.config[key] = value