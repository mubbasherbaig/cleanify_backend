"""
Depot model for waste management system.
Represents central depot where trucks start/end routes and empty loads.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Tuple, List, Dict, Any, Optional
from datetime import datetime


class DepotStatus(str, Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    FULL = "full"
    OFFLINE = "offline"


class WasteType(str, Enum):
    GENERAL = "general"
    RECYCLABLE = "recyclable"
    HAZARDOUS = "hazardous"


@dataclass
class Depot:
    id: str
    name: str
    location: Tuple[float, float]  # (lon, lat)
    capacity: float = 10000.0  # kg total capacity
    current_load: float = 0.0  # current waste stored
    status: DepotStatus = DepotStatus.ACTIVE
    operating_hours: Tuple[int, int] = (0, 24)  # 24/7 by default
    waste_types_accepted: List[WasteType] = field(
        default_factory=lambda: [WasteType.GENERAL, WasteType.RECYCLABLE]
    )
    processing_rate: float = 100.0  # kg/hour processing capacity
    trucks_stationed: List[str] = field(default_factory=list)  # truck IDs
    daily_processed: float = 0.0
    total_processed: float = 0.0
    last_emptied: datetime = field(default_factory=datetime.now)
    maintenance_schedule: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate depot data after initialization"""
        if self.capacity <= 0:
            raise ValueError("Capacity must be positive")
        if not (0 <= self.current_load <= self.capacity):
            raise ValueError(f"Current load must be between 0 and {self.capacity}")
        if self.processing_rate < 0:
            raise ValueError("Processing rate cannot be negative")
        
        # Validate operating hours
        start_hour, end_hour = self.operating_hours
        if not (0 <= start_hour <= 23 and 0 <= end_hour <= 24):
            raise ValueError("Operating hours must be valid (0-23 for start, 0-24 for end)")
    
    def is_operational(self, current_time: datetime = None) -> bool:
        """Check if depot is currently operational"""
        if self.status != DepotStatus.ACTIVE:
            return False
        
        if current_time is None:
            current_time = datetime.now()
        
        current_hour = current_time.hour
        start_hour, end_hour = self.operating_hours
        
        if start_hour <= end_hour:
            # Normal hours (e.g., 8-18)
            return start_hour <= current_hour < end_hour
        else:
            # Overnight hours (e.g., 22-6)
            return current_hour >= start_hour or current_hour < end_hour
    
    def can_accept_waste(self, waste_type: WasteType, amount: float) -> bool:
        """Check if depot can accept given waste type and amount"""
        if not self.is_operational():
            return False
        
        if waste_type not in self.waste_types_accepted:
            return False
        
        if self.current_load + amount > self.capacity:
            return False
        
        return True
    
    def receive_waste(self, waste_type: WasteType, amount: float, truck_id: str = None) -> bool:
        """Accept waste delivery from truck"""
        if not self.can_accept_waste(waste_type, amount):
            return False
        
        self.current_load += amount
        self.daily_processed += amount
        self.total_processed += amount
        self.updated_at = datetime.now()
        
        # Update status if near capacity
        if self.current_load >= self.capacity * 0.95:
            self.status = DepotStatus.FULL
        
        return True
    
    def process_waste(self, time_delta_hours: float) -> float:
        """Process stored waste over time, return amount processed"""
        if not self.is_operational() or self.current_load <= 0:
            return 0.0
        
        # Calculate maximum processing based on rate and time
        max_processing = self.processing_rate * time_delta_hours
        actual_processing = min(max_processing, self.current_load)
        
        self.current_load -= actual_processing
        self.updated_at = datetime.now()
        
        # Update status if no longer full
        if self.status == DepotStatus.FULL and self.current_load < self.capacity * 0.9:
            self.status = DepotStatus.ACTIVE
        
        return actual_processing
    
    def empty_depot(self) -> float:
        """Manually empty depot, return amount removed"""
        emptied_amount = self.current_load
        self.current_load = 0.0
        self.last_emptied = datetime.now()
        self.updated_at = datetime.now()
        
        # Reset status if was full
        if self.status == DepotStatus.FULL:
            self.status = DepotStatus.ACTIVE
        
        return emptied_amount
    
    def assign_truck(self, truck_id: str) -> bool:
        """Assign truck to this depot"""
        if truck_id not in self.trucks_stationed:
            self.trucks_stationed.append(truck_id)
            self.updated_at = datetime.now()
            return True
        return False
    
    def remove_truck(self, truck_id: str) -> bool:
        """Remove truck from this depot"""
        if truck_id in self.trucks_stationed:
            self.trucks_stationed.remove(truck_id)
            self.updated_at = datetime.now()
            return True
        return False
    
    def get_truck_count(self) -> int:
        """Get number of trucks stationed at depot"""
        return len(self.trucks_stationed)
    
    def get_capacity_percentage(self) -> float:
        """Get current capacity usage as percentage"""
        return (self.current_load / self.capacity) * 100 if self.capacity > 0 else 0
    
    def is_near_capacity(self, threshold: float = 90.0) -> bool:
        """Check if depot is near capacity"""
        return self.get_capacity_percentage() >= threshold
    
    def estimate_time_to_full(self, average_delivery_rate: float) -> Optional[float]:
        """Estimate hours until depot is full based on delivery rate"""
        if average_delivery_rate <= 0:
            return None
        
        remaining_capacity = self.capacity - self.current_load
        net_fill_rate = average_delivery_rate - self.processing_rate
        
        if net_fill_rate <= 0:
            return None  # Will never fill at current rates
        
        return remaining_capacity / net_fill_rate
    
    def schedule_maintenance(self, maintenance_time: datetime) -> None:
        """Schedule maintenance for depot"""
        self.maintenance_schedule = maintenance_time
        self.updated_at = datetime.now()
    
    def start_maintenance(self) -> None:
        """Start maintenance mode"""
        self.status = DepotStatus.MAINTENANCE
        self.maintenance_schedule = None
        self.updated_at = datetime.now()
    
    def complete_maintenance(self) -> None:
        """Complete maintenance and return to active status"""
        if self.status == DepotStatus.MAINTENANCE:
            self.status = DepotStatus.ACTIVE
            self.updated_at = datetime.now()
    
    def set_offline(self, offline: bool = True) -> None:
        """Set depot online/offline status"""
        if offline:
            self.status = DepotStatus.OFFLINE
        else:
            self.status = DepotStatus.ACTIVE
        self.updated_at = datetime.now()
    
    def reset_daily_stats(self) -> None:
        """Reset daily statistics (call at start of new day)"""
        self.daily_processed = 0.0
        self.updated_at = datetime.now()
    
    def get_utilization_metrics(self) -> Dict[str, float]:
        """Calculate utilization and efficiency metrics"""
        capacity_utilization = self.get_capacity_percentage()
        
        # Calculate processing efficiency (processed vs received)
        total_received = self.total_processed + self.current_load
        processing_efficiency = (
            (self.total_processed / total_received * 100) 
            if total_received > 0 else 0
        )
        
        return {
            "capacity_utilization": capacity_utilization,
            "processing_efficiency": processing_efficiency,
            "daily_throughput": self.daily_processed,
            "total_throughput": self.total_processed,
            "trucks_stationed": self.get_truck_count(),
            "operational_status": self.is_operational()
        }
    
    def as_dict(self) -> Dict[str, Any]:
        """Convert depot to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "name": self.name,
            "location": list(self.location),
            "capacity": self.capacity,
            "current_load": self.current_load,
            "capacity_percentage": self.get_capacity_percentage(),
            "status": self.status.value,
            "operating_hours": list(self.operating_hours),
            "waste_types_accepted": [wt.value for wt in self.waste_types_accepted],
            "processing_rate": self.processing_rate,
            "trucks_stationed": self.trucks_stationed.copy(),
            "truck_count": self.get_truck_count(),
            "daily_processed": self.daily_processed,
            "total_processed": self.total_processed,
            "is_operational": self.is_operational(),
            "is_near_capacity": self.is_near_capacity(),
            "utilization_metrics": self.get_utilization_metrics(),
            "last_emptied": self.last_emptied.isoformat(),
            "maintenance_schedule": (
                self.maintenance_schedule.isoformat() 
                if self.maintenance_schedule else None
            ),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Depot':
        """Create depot from dictionary"""
        return cls(
            id=data["id"],
            name=data["name"],
            location=tuple(data["location"]),
            capacity=data.get("capacity", 10000.0),
            current_load=data.get("current_load", 0.0),
            status=DepotStatus(data.get("status", "active")),
            operating_hours=tuple(data.get("operating_hours", (0, 24))),
            waste_types_accepted=[
                WasteType(wt) for wt in data.get("waste_types_accepted", ["general", "recyclable"])
            ],
            processing_rate=data.get("processing_rate", 100.0),
            trucks_stationed=data.get("trucks_stationed", []),
            daily_processed=data.get("daily_processed", 0.0),
            total_processed=data.get("total_processed", 0.0),
            last_emptied=datetime.fromisoformat(
                data.get("last_emptied", datetime.now().isoformat())
            ),
            maintenance_schedule=(
                datetime.fromisoformat(data["maintenance_schedule"])
                if data.get("maintenance_schedule") else None
            ),
            created_at=datetime.fromisoformat(
                data.get("created_at", datetime.now().isoformat())
            ),
            updated_at=datetime.fromisoformat(
                data.get("updated_at", datetime.now().isoformat())
            )
        )