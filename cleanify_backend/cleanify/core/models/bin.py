"""
Plain dataclass – if you later migrate to SQLAlchemy, keep same attributes.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Tuple

class WasteType(str, Enum):
    GENERAL = "general"
    RECYCLABLE = "recyclable"
    HAZARDOUS = "hazardous"

@dataclass
class Bin:
    id: str
    type: WasteType
    location: Tuple[float, float]    # (lon, lat)
    fill_level: float                # 0-100
    static_threshold: float
