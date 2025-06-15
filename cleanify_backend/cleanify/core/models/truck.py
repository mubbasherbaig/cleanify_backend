@dataclass
class Truck:
    id: str
    capacity: float          # kg / L
    location: Tuple[float,float]
    load: float = 0.0
    status: TruckStatus = TruckStatus.IDLE
    route: List[str] = field(default_factory=list)  # ordered bin IDs