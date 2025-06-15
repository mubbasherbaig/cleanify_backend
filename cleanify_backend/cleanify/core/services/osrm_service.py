class OSRMService:
    def __init__(self, host="http://localhost:5000"):
        self.base = f"{host}/route/v1/driving"

    def route(self, coords: List[Tuple[float,float]]) -> dict:
        coord_str = ';'.join(f"{lon},{lat}" for lon,lat in coords)
        url = f"{self.base}/{coord_str}?overview=false&annotations=duration,distance"
        res = requests.get(url, timeout=2)
        res.raise_for_status()
        return res.json()
