"""
Plain dataclass – if you later migrate to SQLAlchemy, keep same attributes.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Tuple, Dict, Any
from datetime import datetime


class WasteType(str, Enum):
    GENERAL = "general"
    RECYCLABLE = "recyclable"
    HAZARDOUS = "hazardous"


class BinStatus(str, Enum):
    ACTIVE = "active"
    FULL = "full"
    MAINTENANCE = "maintenance"
    COLLECTED = "collected"


@dataclass
class Bin:
    id: str
    type: WasteType
    location: Tuple[float, float]    # (lon, lat)
    fill_level: float                # 0-100
    static_threshold: float          # threshold percentage for collection
    capacity: float = 100.0          # kg
    status: BinStatus = BinStatus.ACTIVE
    last_collected: datetime = field(default_factory=datetime.now)
    fill_rate: float = 5.0           # kg/hour typical fill rate
    priority: int = 1                # 1=low, 2=medium, 3=high
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate bin data after initialization"""
        if not (0 <= self.fill_level <= 100):
            raise ValueError("Fill level must be between 0 and 100")
        if not (0 <= self.static_threshold <= 100):
            raise ValueError("Static threshold must be between 0 and 100")
        if self.capacity <= 0:
            raise ValueError("Capacity must be positive")
        if self.fill_rate < 0:
            raise ValueError("Fill rate cannot be negative")
    
    def is_full(self) -> bool:
        """Check if bin is considered full"""
        return self.fill_level >= 100
    
    def needs_collection(self, dynamic_threshold: float = None) -> bool:
        threshold = dynamic_threshold if dynamic_threshold is not None else self.static_threshold
        return (self.fill_level >= threshold and 
                self.status in [BinStatus.ACTIVE, BinStatus.FULL])
    
    def collect(self) -> float:
        """Simulate collection - returns amount collected"""
        if self.status != BinStatus.ACTIVE:
            return 0.0
        
        collected_amount = (self.fill_level / 100) * self.capacity
        self.fill_level = 0.0
        self.status = BinStatus.COLLECTED
        self.last_collected = datetime.now()
        self.updated_at = datetime.now()
        return collected_amount
    
    def update_fill_level(self, minutes_passed: float) -> None:
        """Update fill level based on time passed and fill rate"""
        if self.status != BinStatus.ACTIVE:
            return
        
        # Convert minutes to hours for fill rate calculation
        hours_passed = minutes_passed / 60.0
        fill_increase = (self.fill_rate * hours_passed / self.capacity) * 100
        
        self.fill_level = min(100.0, self.fill_level + fill_increase)
        self.updated_at = datetime.now()
        
        # Update status if full
        if self.fill_level >= 100:
            self.status = BinStatus.FULL
    
    def reset_status(self) -> None:
        """Reset bin status to active after collection"""
        if self.status == BinStatus.COLLECTED:
            self.status = BinStatus.ACTIVE
            self.updated_at = datetime.now()
    
    def set_maintenance(self, maintenance: bool = True) -> None:
        """Set or remove maintenance status"""
        if maintenance:
            self.status = BinStatus.MAINTENANCE
        else:
            self.status = BinStatus.ACTIVE
        self.updated_at = datetime.now()
    
    def get_urgency_score(self) -> float:
        """Calculate urgency score for optimization priority"""
        base_score = self.fill_level / 100.0
        
        # Adjust for bin type
        type_multiplier = {
            WasteType.HAZARDOUS: 1.5,
            WasteType.RECYCLABLE: 1.0,
            WasteType.GENERAL: 0.8
        }.get(self.type, 1.0)
        
        # Adjust for priority
        priority_multiplier = self.priority * 0.5
        
        return base_score * type_multiplier * priority_multiplier
    
    def as_dict(self) -> Dict[str, Any]:
        """Convert bin to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "type": self.type.value,
            "location": list(self.location),
            "fill_level": self.fill_level,
            "static_threshold": self.static_threshold,
            "capacity": self.capacity,
            "status": self.status.value,
            "last_collected": self.last_collected.isoformat(),
            "fill_rate": self.fill_rate,
            "priority": self.priority,
            "needs_collection": self.needs_collection(),
            "urgency_score": self.get_urgency_score(),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Bin':
        """Create bin from dictionary"""
        return cls(
            id=data["id"],
            type=WasteType(data["type"]),
            location=tuple(data["location"]),
            fill_level=data["fill_level"],
            static_threshold=data["static_threshold"],
            capacity=data.get("capacity", 100.0),
            status=BinStatus(data.get("status", "active")),
            last_collected=datetime.fromisoformat(data.get("last_collected", datetime.now().isoformat())),
            fill_rate=data.get("fill_rate", 15.0),
            priority=data.get("priority", 1),
            created_at=datetime.fromisoformat(data.get("created_at", datetime.now().isoformat())),
            updated_at=datetime.fromisoformat(data.get("updated_at", datetime.now().isoformat()))
        )