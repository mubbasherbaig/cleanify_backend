"""
Truck model with complete functionality for waste collection simulation.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Tuple, List, Dict, Any, Optional
from datetime import datetime
import math


class TruckStatus(str, Enum):
    IDLE = "idle"
    EN_ROUTE = "en_route"
    COLLECTING = "collecting"
    RETURNING = "returning"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"


@dataclass
class Truck:
    id: str
    capacity: float          # kg / L
    location: Tuple[float, float]  # (lon, lat)
    load: float = 0.0
    status: TruckStatus = TruckStatus.IDLE
    route: List[str] = field(default_factory=list)  # ordered bin IDs
    speed: float = 50.0      # km/h
    fuel_level: float = 100.0  # percentage
    fuel_consumption: float = 0.1  # L/km
    depot_location: Tuple[float, float] = field(default_factory=lambda: (0.0, 0.0))
    current_route_index: int = 0
    total_distance_traveled: float = 0.0
    collections_today: int = 0
    last_maintenance: datetime = field(default_factory=datetime.now)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate truck data after initialization"""
        if self.capacity <= 0:
            raise ValueError("Capacity must be positive")
        if not (0 <= self.load <= self.capacity):
            raise ValueError(f"Load must be between 0 and {self.capacity}")
        if not (0 <= self.fuel_level <= 100):
            raise ValueError("Fuel level must be between 0 and 100")
        if self.speed <= 0:
            raise ValueError("Speed must be positive")
    
    def is_available(self) -> bool:
        """Check if truck is available for new assignments"""
        return self.status in [TruckStatus.IDLE, TruckStatus.EN_ROUTE] and not self.needs_maintenance()
    
    def is_full(self) -> bool:
        """Check if truck is at or near capacity"""
        return self.load >= self.capacity * 0.95  # 95% capacity threshold
    
    def is_empty(self) -> bool:
        """Check if truck is empty"""
        return self.load <= 0.01  # Small threshold for floating point precision
    
    def needs_maintenance(self) -> bool:
        if self.status == TruckStatus.MAINTENANCE:
            return True
        if self.fuel_level < 10:
            return True
        # REMOVED: if self.total_distance_traveled % 1000 < 10:
        return False
    
    def can_collect_bin(self, bin_load: float) -> bool:
        """Check if truck can collect a bin with given load"""
        return (self.load + bin_load) <= self.capacity and self.is_available()
    
    def collect_bin(self, bin_id: str, bin_load: float) -> bool:
        """Collect waste from a bin"""
        if not self.can_collect_bin(bin_load):
            return False
        
        self.load += bin_load
        self.collections_today += 1
        self.status = TruckStatus.COLLECTING
        self.updated_at = datetime.now()
        
        # Remove collected bin from route if present
        if bin_id in self.route:
            self.route.remove(bin_id)
            # Adjust current route index if necessary
            if self.current_route_index >= len(self.route):
                self.current_route_index = max(0, len(self.route) - 1)
        
        return True
    
    def empty_load(self) -> float:
        """Empty truck load at depot, return amount emptied"""
        emptied_amount = self.load
        self.load = 0.0
        self.status = TruckStatus.IDLE
        self.location = self.depot_location
        self.updated_at = datetime.now()
        return emptied_amount
    
    def assign_route(self, bin_ids: List[str]) -> None:
        """Assign new route to truck"""
        self.route = bin_ids.copy()
        self.current_route_index = 0
        if bin_ids:
            self.status = TruckStatus.EN_ROUTE
        else:
            self.status = TruckStatus.IDLE
        self.updated_at = datetime.now()
    
    def get_next_destination(self) -> Optional[str]:
        """Get next bin ID in route"""
        if self.current_route_index < len(self.route):
            return self.route[self.current_route_index]
        return None
    
    def advance_route(self) -> Optional[str]:
        """Move to next destination in route"""
        if self.current_route_index < len(self.route):
            current_dest = self.route[self.current_route_index]
            self.current_route_index += 1
            
            if self.current_route_index >= len(self.route):
                # Route completed
                self.status = TruckStatus.RETURNING if not self.is_empty() else TruckStatus.IDLE
            
            return current_dest
        return None
    
    def move_towards(self, destination: Tuple[float, float], time_delta_minutes: float, 
                 traffic_multiplier: float = 1.0) -> bool:
        """Move truck towards destination for given time."""
        if self.status == TruckStatus.OFFLINE or self.status == TruckStatus.MAINTENANCE:
            return False
        
        # Calculate distance to destination
        distance_to_dest = self._calculate_distance(self.location, destination)
        
        if distance_to_dest < 0.01:  # Already at destination (within 10m)
            return True
        
        # IMPROVED: Better speed calculation with simulation multiplier
        time_hours = time_delta_minutes / 60.0
        
        # Apply traffic and get effective speed
        effective_speed = self.speed / traffic_multiplier  # km/h
        
        # BOOSTED: Multiply by 5 for more visible movement
        max_distance = effective_speed * time_hours * 5  # Increased movement
        
        # Update fuel consumption (using original distance, not boosted)
        actual_distance = min(effective_speed * time_hours, distance_to_dest)
        fuel_consumed = actual_distance * self.fuel_consumption
        self.fuel_level = max(0, self.fuel_level - fuel_consumed)
        
        # Update total distance
        self.total_distance_traveled += actual_distance
        
        if max_distance >= distance_to_dest:
            # Reached destination
            self.location = destination
            self.updated_at = datetime.now()
            return True
        else:
            # Move partway towards destination
            ratio = max_distance / distance_to_dest
            new_lon = self.location[0] + (destination[0] - self.location[0]) * ratio
            new_lat = self.location[1] + (destination[1] - self.location[1]) * ratio
            self.location = (new_lon, new_lat)
            self.updated_at = datetime.now()
            return False
    
    def _calculate_distance(self, loc1: Tuple[float, float], loc2: Tuple[float, float]) -> float:
        """Calculate haversine distance between two points in kilometers"""
        R = 6371  # Earth's radius in km
        
        lat1, lon1 = math.radians(loc1[1]), math.radians(loc1[0])
        lat2, lon2 = math.radians(loc2[1]), math.radians(loc2[0])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def get_load_percentage(self) -> float:
        """Get current load as percentage of capacity"""
        return (self.load / self.capacity) * 100 if self.capacity > 0 else 0
    
    def estimate_time_to_depot(self, traffic_multiplier: float = 1.0) -> float:
        """Estimate time to return to depot in minutes"""
        distance = self._calculate_distance(self.location, self.depot_location)
        time_hours = distance / (self.speed / traffic_multiplier)
        return time_hours * 60  # Convert to minutes
    
    def refuel(self) -> None:
        """Refuel truck to full capacity"""
        self.fuel_level = 100.0
        self.updated_at = datetime.now()
    
    def perform_maintenance(self) -> None:
        """Perform maintenance on truck"""
        self.status = TruckStatus.MAINTENANCE
        self.fuel_level = 100.0
        self.last_maintenance = datetime.now()
        self.updated_at = datetime.now()
    
    def complete_maintenance(self) -> None:
        """Complete maintenance and return truck to service"""
        if self.status == TruckStatus.MAINTENANCE:
            self.status = TruckStatus.IDLE
            self.location = self.depot_location
            self.updated_at = datetime.now()
    
    def set_offline(self, offline: bool = True) -> None:
        """Set truck online/offline status"""
        if offline:
            self.status = TruckStatus.OFFLINE
        else:
            self.status = TruckStatus.IDLE
        self.updated_at = datetime.now()
    
    def get_efficiency_metrics(self) -> Dict[str, float]:
        """Calculate efficiency metrics"""
        return {
            "load_efficiency": self.get_load_percentage(),
            "fuel_efficiency": self.fuel_level,
            "daily_collections": self.collections_today,
            "distance_per_collection": (
                self.total_distance_traveled / max(1, self.collections_today)
            ),
            "average_load_per_collection": (
                self.load / max(1, self.collections_today) if self.collections_today > 0 else 0
            )
        }
    
    def as_dict(self) -> Dict[str, Any]:
        """Convert truck to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "capacity": self.capacity,
            "location": list(self.location),
            "load": self.load,
            "load_percentage": self.get_load_percentage(),
            "status": self.status.value,
            "route": self.route.copy(),
            "current_route_index": self.current_route_index,
            "next_destination": self.get_next_destination(),
            "speed": self.speed,
            "fuel_level": self.fuel_level,
            "fuel_consumption": self.fuel_consumption,
            "depot_location": list(self.depot_location),
            "total_distance_traveled": self.total_distance_traveled,
            "collections_today": self.collections_today,
            "is_available": self.is_available(),
            "is_full": self.is_full(),
            "needs_maintenance": self.needs_maintenance(),
            "efficiency_metrics": self.get_efficiency_metrics(),
            "last_maintenance": self.last_maintenance.isoformat(),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Truck':
        """Create truck from dictionary"""
        return cls(
            id=data["id"],
            capacity=data["capacity"],
            location=tuple(data["location"]),
            load=data.get("load", 0.0),
            status=TruckStatus(data.get("status", "idle")),
            route=data.get("route", []),
            speed=data.get("speed", 50.0),
            fuel_level=data.get("fuel_level", 100.0),
            fuel_consumption=data.get("fuel_consumption", 0.1),
            depot_location=tuple(data.get("depot_location", (0.0, 0.0))),
            current_route_index=data.get("current_route_index", 0),
            total_distance_traveled=data.get("total_distance_traveled", 0.0),
            collections_today=data.get("collections_today", 0),
            last_maintenance=datetime.fromisoformat(
                data.get("last_maintenance", datetime.now().isoformat())
            ),
            created_at=datetime.fromisoformat(
                data.get("created_at", datetime.now().isoformat())
            ),
            updated_at=datetime.fromisoformat(
                data.get("updated_at", datetime.now().isoformat())
            )
        )