"""
Enhanced simulation service with automatic optimization and proper route following.
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
    """Enhanced simulation service with automatic optimization"""
    
    TICK_REAL_SECONDS = 0.1

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
        
        # Route geometry storage for trucks
        self.truck_routes_geometry = {}  # truck_id -> route_geometry
        
        # Performance tracking
        self.tick_count = 0
        self.total_collections = 0
        self.total_distance_traveled = 0.0
        self.simulation_start_time = datetime.now()
        
        # Auto-optimization tracking
        self.last_auto_optimization = datetime.now()
        self.auto_optimization_interval_minutes = 5  # Run auto-optimization every 5 minutes
        self.urgent_bins_last_check = []
        
        # Maintenance tracking
        self.maintenance_duration_minutes = 10  # 10 minutes maintenance
        self.truck_maintenance_start = {}  # truck_id -> start_time
        
        # Event tracking
        self.events_log = []
        self.max_events = 1000
        
        # Enhanced Configuration
        self.config = {
            # Optimization settings
            "optimization_mode": "auto",  # "auto" or "manual"
            "auto_optimization": True,
            "auto_optimization_interval_minutes": 5,
            "urgent_bin_threshold": 90.0,  # Auto-optimize when bins reach this level
            
            # Simulation settings
            "auto_bin_filling": True,
            "truck_breakdown_probability": 0.001,
            "bin_overflow_enabled": True,
            "depot_processing_enabled": True,
            "emit_frequency": 1,
            "max_trucks_per_optimization": 10,
            
            # Maintenance settings
            "auto_maintenance_completion": True,
            "maintenance_duration_minutes": 10,
            "maintenance_probability": 0.0005,
            
            # Route following
            "use_osrm_routes": True,
            "route_following_precision": 0.01,  # km precision for route following
        }
        
        self.logger = logging.getLogger(__name__)
        self.logger.info("Enhanced SimulationService initialized")

    def run(self):
        """Enhanced main simulation loop"""
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
                time.sleep(1)
        
        self.logger.info("Simulation stopped")

    def _step(self, sim_now: datetime):
        """Enhanced core logic per tick"""
        try:
            # 1. Update bin fill levels
            if self.config["auto_bin_filling"]:
                self._update_bin_fill_levels(sim_now)
            
            # 2. Process depot operations
            if self.config["depot_processing_enabled"]:
                self._process_depots(sim_now)
            
            # 3. Handle automatic maintenance completion
            if self.config["auto_maintenance_completion"]:
                self._handle_automatic_maintenance_completion(sim_now)
            
            # 4. Move trucks and handle collections (with route following)
            self._move_trucks_with_route_following(sim_now)
            
            # 5. Check for truck maintenance/breakdowns
            self._handle_truck_maintenance()
            
            # 6. Auto-optimization logic
            if self.config["optimization_mode"] == "auto":
                self._handle_automatic_optimization(sim_now)
            
            # 7. Update statistics
            self._update_statistics()
            
        except Exception as e:
            self.logger.error(f"Simulation step error: {e}")

    def _handle_automatic_optimization(self, sim_now: datetime):
        """Handle automatic route optimization"""
        try:
            # Check if it's time for scheduled optimization
            time_since_last = (sim_now - self.last_auto_optimization).total_seconds() / 60
            should_optimize_scheduled = time_since_last >= self.config["auto_optimization_interval_minutes"]
            
            # Check for urgent bins that need immediate optimization
            urgent_bins = self._get_urgent_bins()
            new_urgent_bins = [b for b in urgent_bins if b.id not in self.urgent_bins_last_check]
            should_optimize_urgent = len(new_urgent_bins) > 0
            
            # Check for idle trucks that could be assigned work
            idle_trucks = [t for t in self.trucks if t.status == TruckStatus.IDLE and t.is_available()]
            bins_needing_collection = self._get_bins_needing_collection()
            should_optimize_idle = len(idle_trucks) > 0 and len(bins_needing_collection) > 0
            
            if should_optimize_scheduled or should_optimize_urgent or should_optimize_idle:
                self.logger.info(f"🤖 Auto-optimization triggered: scheduled={should_optimize_scheduled}, urgent={should_optimize_urgent}, idle={should_optimize_idle}")
                
                available_trucks = [t for t in self.trucks if t.is_available()]
                if available_trucks and bins_needing_collection:
                    result = self.optimization_svc.full_reoptimize(available_trucks, bins_needing_collection)
                    
                    if result.get("success"):
                        self.logger.info(f"✅ Auto-optimization completed: {result.get('bins_assigned', 0)} bins assigned")
                        
                        # Store route geometries for trucks
                        if "routes" in result:
                            for truck_id, route_data in result["routes"].items():
                                if "route_geometry" in route_data:
                                    self.truck_routes_geometry[truck_id] = route_data["route_geometry"]
                        
                        self._log_event("auto_optimization_completed", {
                            "bins_assigned": result.get("bins_assigned", 0),
                            "trucks_used": result.get("trucks_used", 0),
                            "trigger_reason": {
                                "scheduled": should_optimize_scheduled,
                                "urgent": should_optimize_urgent,
                                "idle": should_optimize_idle
                            }
                        })
                    
                    self.last_auto_optimization = sim_now
                    self.urgent_bins_last_check = [b.id for b in urgent_bins]
        
        except Exception as e:
            self.logger.error(f"Auto-optimization failed: {e}")

    def _get_urgent_bins(self) -> List[Bin]:
        """Get bins that are urgently needing collection"""
        urgent_bins = []
        for bin_obj in self.bins:
            if (bin_obj.status == BinStatus.ACTIVE and 
                bin_obj.fill_level >= self.config["urgent_bin_threshold"]):
                urgent_bins.append(bin_obj)
        return urgent_bins

    def _get_bins_needing_collection(self) -> List[Bin]:
        """Get all bins that need collection based on thresholds"""
        bins_needing_collection = []
        for bin_obj in self.bins:
            if bin_obj.status == BinStatus.ACTIVE:
                threshold = self.threshold_service.threshold_for(bin_obj)
                if bin_obj.fill_level >= threshold:
                    bins_needing_collection.append(bin_obj)
        return bins_needing_collection

    def _handle_automatic_maintenance_completion(self, sim_now: datetime):
        """Automatically complete maintenance after specified duration"""
        for truck in self.trucks:
            if truck.status == TruckStatus.MAINTENANCE:
                # Check if maintenance started (track start time)
                if truck.id not in self.truck_maintenance_start:
                    self.truck_maintenance_start[truck.id] = sim_now
                    self.logger.info(f"🔧 Started maintenance for truck {truck.id}")
                
                # Check if maintenance duration has passed
                start_time = self.truck_maintenance_start[truck.id]
                duration_minutes = (sim_now - start_time).total_seconds() / 60
                
                if duration_minutes >= self.config["maintenance_duration_minutes"]:
                    truck.complete_maintenance()
                    del self.truck_maintenance_start[truck.id]
                    self.logger.info(f"✅ Completed maintenance for truck {truck.id}")
                    
                    self._log_event("maintenance_completed", {
                        "truck_id": truck.id,
                        "duration_minutes": duration_minutes
                    })

    def _move_trucks_with_route_following(self, sim_now: datetime):
        """Enhanced truck movement with proper route following"""
        traffic_multiplier = self.traffic_service.current_multiplier()
        time_delta_minutes = self.time_manager.get_time_delta_minutes()
        
        for truck in self.trucks:
            if truck.status == TruckStatus.OFFLINE or truck.status == TruckStatus.MAINTENANCE:
                continue
            
            try:
                self._move_single_truck_with_route(truck, time_delta_minutes, traffic_multiplier)
            except Exception as e:
                self.logger.error(f"Error moving truck {truck.id}: {e}")

    def _move_single_truck_with_route(self, truck: Truck, time_delta_minutes: float, 
                                    traffic_multiplier: float):
        """Enhanced single truck movement with OSRM route following"""
        if truck.status == TruckStatus.IDLE:
            if truck.route:
                truck.status = TruckStatus.EN_ROUTE
                self.logger.info(f"🚛 Truck {truck.id} started route with {len(truck.route)} bins")
                self._log_event("truck_started_route", {
                    "truck_id": truck.id,
                    "route": truck.route.copy()
                })
        
        elif truck.status == TruckStatus.EN_ROUTE:
            self._handle_en_route_truck_with_geometry(truck, time_delta_minutes, traffic_multiplier)
        
        elif truck.status == TruckStatus.COLLECTING:
            # Simulate collection time
            truck.status = TruckStatus.EN_ROUTE
            self._log_event("truck_finished_collecting", {"truck_id": truck.id})
        
        elif truck.status == TruckStatus.RETURNING:
            self._handle_returning_truck(truck, time_delta_minutes, traffic_multiplier)

    def _handle_en_route_truck_with_geometry(self, truck: Truck, time_delta_minutes: float, 
                                           traffic_multiplier: float):
        """Handle truck movement using OSRM route geometry"""
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
            truck.advance_route()
            return
        
        # Use stored route geometry if available
        if (self.config["use_osrm_routes"] and 
            truck.id in self.truck_routes_geometry and 
            self.truck_routes_geometry[truck.id]):
            
            reached = self._move_along_route_geometry(
                truck, target_bin.location, time_delta_minutes, traffic_multiplier
            )
        else:
            # Fallback to direct movement
            reached = truck.move_towards(
                target_bin.location, time_delta_minutes, traffic_multiplier
            )
        
        if reached:
            self._handle_bin_collection(truck, target_bin)
            truck.advance_route()

    def _move_along_route_geometry(self, truck: Truck, target_location: tuple, 
                                 time_delta_minutes: float, traffic_multiplier: float) -> bool:
        """Move truck along OSRM route geometry"""
        route_geometry = self.truck_routes_geometry.get(truck.id, [])
        
        if not route_geometry:
            # No geometry available, use direct movement
            return truck.move_towards(target_location, time_delta_minutes, traffic_multiplier)
        
        # Find current position in route geometry
        current_pos = truck.location
        min_distance = float('inf')
        closest_index = 0
        
        for i, point in enumerate(route_geometry):
            # Convert [lat, lon] to [lon, lat] for distance calculation
            route_point = (point[1], point[0]) if len(point) == 2 else point
            distance = self._calculate_distance(current_pos, route_point)
            if distance < min_distance:
                min_distance = distance
                closest_index = i
        
        # Move to next point in route geometry
        if closest_index < len(route_geometry) - 1:
            next_point = route_geometry[closest_index + 1]
            # Convert [lat, lon] to [lon, lat]
            next_location = (next_point[1], next_point[0]) if len(next_point) == 2 else next_point
            
            reached_waypoint = truck.move_towards(
                next_location, time_delta_minutes, traffic_multiplier
            )
            
            # Check if we're close to the final target
            distance_to_target = self._calculate_distance(truck.location, target_location)
            return distance_to_target < self.config["route_following_precision"]
        else:
            # At end of route geometry, move directly to target
            return truck.move_towards(target_location, time_delta_minutes, traffic_multiplier)

    def _handle_returning_truck(self, truck: Truck, time_delta_minutes: float, 
                              traffic_multiplier: float):
        """Handle truck returning to depot"""
        depot = self._find_nearest_depot(truck.location)
        if not depot:
            truck.status = TruckStatus.IDLE
            return
        
        reached = truck.move_towards(depot.location, time_delta_minutes, traffic_multiplier)
        
        if reached:
            self._handle_depot_arrival(truck, depot)

    def _handle_bin_collection(self, truck: Truck, bin_obj: Bin):
        """Handle collection of waste from bin"""
        if bin_obj.status != BinStatus.ACTIVE or truck.is_full():
            return
        
        bin_load = (bin_obj.fill_level / 100.0) * bin_obj.capacity
        
        if truck.can_collect_bin(bin_load):
            collected_amount = bin_obj.collect()
            truck.collect_bin(bin_obj.id, collected_amount)
            
            self.total_collections += 1
            
            self._log_event("bin_collected", {
                "truck_id": truck.id,
                "bin_id": bin_obj.id,
                "amount_collected": collected_amount,
                "truck_load_after": truck.load
            })
            
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
            if depot.can_accept_waste(WasteType.GENERAL, truck.load):
                emptied_amount = truck.empty_load()
                depot.receive_waste(WasteType.GENERAL, emptied_amount, truck.id)
                
                # Clear route geometry when truck returns to depot
                if truck.id in self.truck_routes_geometry:
                    del self.truck_routes_geometry[truck.id]
                
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
                return
        
        truck.status = TruckStatus.IDLE
        truck.location = depot.location

    def _handle_truck_maintenance(self):
        """Enhanced truck maintenance handling"""
        for truck in self.trucks:
            if truck.needs_maintenance() and truck.status != TruckStatus.MAINTENANCE:
                truck.perform_maintenance()
                self._log_event("truck_maintenance_started", {
                    "truck_id": truck.id,
                    "reason": "scheduled_maintenance"
                })
            
            # Random breakdown simulation
            if (truck.status not in [TruckStatus.MAINTENANCE, TruckStatus.OFFLINE] and 
                self._random_event(self.config["truck_breakdown_probability"])):
                truck.perform_maintenance()
                self._log_event("truck_breakdown", {
                    "truck_id": truck.id,
                    "location": list(truck.location)
                })

    # Enhanced configuration methods
    def set_optimization_mode(self, mode: str):
        """Set optimization mode: 'auto' or 'manual'"""
        if mode not in ["auto", "manual"]:
            raise ValueError("Mode must be 'auto' or 'manual'")
        
        self.config["optimization_mode"] = mode
        self.logger.info(f"Optimization mode set to: {mode}")
        
        self._log_event("optimization_mode_changed", {"mode": mode})

    def configure_auto_optimization(self, interval_minutes: int = 5, urgent_threshold: float = 90.0):
        """Configure auto-optimization parameters"""
        self.config["auto_optimization_interval_minutes"] = interval_minutes
        self.config["urgent_bin_threshold"] = urgent_threshold
        self.auto_optimization_interval_minutes = interval_minutes
        
        self.logger.info(f"Auto-optimization configured: interval={interval_minutes}min, threshold={urgent_threshold}%")

    def trigger_manual_optimization(self) -> Dict[str, Any]:
        """Trigger manual optimization (for manual mode)"""
        if self.config["optimization_mode"] != "manual":
            self.logger.warning("Manual optimization triggered but system is in auto mode")
        
        available_trucks = [t for t in self.trucks if t.is_available()]
        bins_needing_collection = self._get_bins_needing_collection()
        
        if not available_trucks or not bins_needing_collection:
            return {
                "success": False,
                "message": "No available trucks or bins needing collection"
            }
        
        result = self.optimization_svc.full_reoptimize(available_trucks, bins_needing_collection)
        
        # Store route geometries
        if result.get("success") and "routes" in result:
            for truck_id, route_data in result["routes"].items():
                if "route_geometry" in route_data:
                    self.truck_routes_geometry[truck_id] = route_data["route_geometry"]
        
        self._log_event("manual_optimization_triggered", {
            "bins_assigned": result.get("bins_assigned", 0),
            "trucks_used": result.get("trucks_used", 0)
        })
        
        return result

    def get_route_geometry(self, truck_id: str) -> List[List[float]]:
        """Get route geometry for a specific truck"""
        return self.truck_routes_geometry.get(truck_id, [])

    def configure(self, config: Dict[str, Any]) -> None:
        """Enhanced configuration update"""
        for key, value in config.items():
            if key in self.config:
                old_value = self.config[key]
                self.config[key] = value
                
                # Handle specific configuration changes
                if key == "optimization_mode":
                    self.set_optimization_mode(value)
                elif key == "auto_optimization_interval_minutes":
                    self.auto_optimization_interval_minutes = value
                elif key == "maintenance_duration_minutes":
                    self.maintenance_duration_minutes = value
                
                self.logger.info(f"Config updated: {key} = {old_value} -> {value}")

    # Keep all existing methods from the original class
    def _update_bin_fill_levels(self, sim_now: datetime):
        """Update fill levels for all bins based on time passed"""
        time_delta = self.time_manager.get_time_delta_minutes()
        
        for bin_obj in self.bins:
            if bin_obj.status == BinStatus.ACTIVE:
                old_fill = bin_obj.fill_level
                bin_obj.update_fill_level(time_delta)
                
                if (self.config["bin_overflow_enabled"] and 
                    bin_obj.fill_level >= 100 and old_fill < 100):
                    self._handle_bin_overflow(bin_obj)
                
                threshold = self.threshold_service.threshold_for(bin_obj)
                if (bin_obj.fill_level >= threshold and old_fill < threshold):
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
        total_distance = sum(truck.total_distance_traveled for truck in self.trucks)
        self.total_distance_traveled = total_distance

    def _emit_state_update(self, sim_now: datetime):
        """Emit current simulation state via SocketIO"""
        try:
            snapshot = self._snapshot(sim_now)
            self.sio.emit("simulation_tick", snapshot)
        except Exception as e:
            self.logger.error(f"Failed to emit state update: {e}")

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
        
        if len(self.events_log) > self.max_events:
            self.events_log = self.events_log[-self.max_events:]
        
        if event_type in ["bin_collected", "truck_breakdown", "bin_overflow", 
                         "auto_optimization_completed", "maintenance_completed"]:
            self.sio.emit("simulation_event", event)

    def _snapshot(self, sim_now: datetime) -> Dict[str, Any]:
        """Enhanced snapshot with route geometry"""
        snapshot = {
            "sim_time": sim_now.isoformat(),
            "sim_speed": self.time_manager.speed,
            "is_paused": self._paused,
            "tick_count": self.tick_count,
            "trucks": [truck.as_dict() for truck in self.trucks],
            "bins": [bin_obj.as_dict() for bin_obj in self.bins[:50]],
            "depots": [depot.as_dict() for depot in self.depots],
            "traffic_multiplier": self.traffic_service.current_multiplier(),
            "optimization_mode": self.config["optimization_mode"],
            "truck_routes_geometry": self.truck_routes_geometry.copy(),
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
            "recent_events": self.events_log[-10:]
        }
        return snapshot

    # Keep all existing bootstrap and API methods...
    def _bootstrap_demo_trucks(self) -> List[Truck]:
        """Create demo trucks for simulation"""
        trucks = []
        depot_location = (74.3587, 31.5204)
        
        for i in range(6):
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
        locations = [
            (74.3587, 31.5204),
            (74.3400, 31.5150),
            (74.3700, 31.5300),
            (74.3500, 31.5100),
            (74.3650, 31.5250),
        ]
        
        waste_types = [WasteType.GENERAL, WasteType.RECYCLABLE, WasteType.HAZARDOUS]
        
        for i, location in enumerate(locations):
            for j, waste_type in enumerate(waste_types):
                bin_obj = Bin(
                    id=f"bin_{i}_{j}",
                    type=waste_type,
                    location=location,
                    fill_level=30.0 + (i * 10),
                    static_threshold=80.0,
                    capacity=100.0,
                    fill_rate=45.0
                )
                bins.append(bin_obj)
        
        return bins

    def _bootstrap_demo_depots(self) -> List[Depot]:
        """Create demo depots for simulation"""
        depot = Depot(
            id="main_depot",
            name="Main Waste Processing Depot",
            location=(74.3587, 31.5204),
            capacity=10000.0,
            processing_rate=150.0
        )
        return [depot]

    # Keep all existing public API methods...
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
            if truck_id in self.truck_routes_geometry:
                del self.truck_routes_geometry[truck_id]
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
                "current_time": self.time_manager.now().isoformat(),
                "optimization_mode": self.config["optimization_mode"]
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