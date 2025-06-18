"""
OSRM service for route calculation and optimization.
Provides routing, distance matrix, and travel time estimation.
"""
import requests
import time
from typing import List, Tuple, Dict, Any, Optional
import logging


class OSRMService:
    """Service for interacting with OSRM routing engine"""
    
    def __init__(self, host: str = "http://localhost:5000", timeout: int = 5):
        self.host = host.rstrip('/')
        self.timeout = timeout
        self.base_url = f"{self.host}/route/v1/driving"
        self.table_url = f"{self.host}/table/v1/driving"
        self.match_url = f"{self.host}/match/v1/driving"
        
        # Performance tracking
        self.request_count = 0
        self.total_request_time = 0.0
        self.failed_requests = 0
        
        # Cache for repeated requests
        self._route_cache = {}
        self._cache_max_size = 1000
        
        # Configure logging
        self.logger = logging.getLogger(__name__)
    
    def route(self, coords: List[Tuple[float, float]], 
              options: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Calculate route between coordinates.
        
        Args:
            coords: List of (lon, lat) coordinate pairs
            options: Additional OSRM options
            
        Returns:
            OSRM route response dict
        """
        if len(coords) < 2:
            raise ValueError("At least 2 coordinates required for routing")
        
        # Build coordinate string
        coord_str = ';'.join(f"{lon},{lat}" for lon, lat in coords)
        
        # Build URL with default options
        default_options = {
            'overview': 'false',
            'annotations': 'duration,distance',
            'geometries': 'geojson'
        }
        
        if options:
            default_options.update(options)
        
        # Create cache key
        cache_key = (coord_str, tuple(sorted(default_options.items())))
        
        # Check cache
        if cache_key in self._route_cache:
            return self._route_cache[cache_key].copy()
        
        # Build query string
        query_params = '&'.join(f"{k}={v}" for k, v in default_options.items())
        url = f"{self.base_url}/{coord_str}?{query_params}"
        
        try:
            start_time = time.perf_counter()
            response = requests.get(url, timeout=self.timeout)
            request_time = time.perf_counter() - start_time
            
            # Update statistics
            self.request_count += 1
            self.total_request_time += request_time
            
            response.raise_for_status()
            result = response.json()
            
            # Cache successful results
            if len(self._route_cache) >= self._cache_max_size:
                # Remove oldest entry
                oldest_key = next(iter(self._route_cache))
                del self._route_cache[oldest_key]
            
            self._route_cache[cache_key] = result.copy()
            
            return result
            
        except requests.exceptions.RequestException as e:
            self.failed_requests += 1
            self.logger.error(f"OSRM route request failed: {e}")
            raise OSRMError(f"Route calculation failed: {e}")
    
    def table(self, sources: List[Tuple[float, float]], 
              destinations: List[Tuple[float, float]] = None,
              annotations: List[str] = None) -> Dict[str, Any]:
        """
        Calculate distance/duration matrix.
        
        Args:
            sources: List of source coordinates (lon, lat)
            destinations: List of destination coordinates (defaults to sources)
            annotations: List of annotations ('duration', 'distance', 'duration,distance')
            
        Returns:
            OSRM table response with distance/duration matrices
        """
        if not sources:
            raise ValueError("At least one source coordinate required")
        
        if destinations is None:
            destinations = sources
        
        # Build coordinate string (sources first, then destinations)
        all_coords = sources + destinations
        coord_str = ';'.join(f"{lon},{lat}" for lon, lat in all_coords)
        
        # Build source and destination indices
        source_indices = ';'.join(str(i) for i in range(len(sources)))
        dest_indices = ';'.join(str(i) for i in range(len(sources), len(all_coords)))
        
        # Build query parameters
        params = {
            'sources': source_indices,
            'destinations': dest_indices,
            'annotations': ','.join(annotations) if annotations else 'duration,distance'
        }
        
        query_string = '&'.join(f"{k}={v}" for k, v in params.items())
        url = f"{self.table_url}/{coord_str}?{query_string}"
        
        try:
            start_time = time.perf_counter()
            response = requests.get(url, timeout=self.timeout)
            request_time = time.perf_counter() - start_time
            
            # Update statistics
            self.request_count += 1
            self.total_request_time += request_time
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            self.failed_requests += 1
            self.logger.error(f"OSRM table request failed: {e}")
            raise OSRMError(f"Table calculation failed: {e}")
    
    def nearest(self, coord: Tuple[float, float], number: int = 1) -> Dict[str, Any]:
        """
        Find nearest road coordinates.
        
        Args:
            coord: Input coordinate (lon, lat)
            number: Number of nearest points to return
            
        Returns:
            OSRM nearest response
        """
        lon, lat = coord
        url = f"{self.host}/nearest/v1/driving/{lon},{lat}?number={number}"
        
        try:
            start_time = time.perf_counter()
            response = requests.get(url, timeout=self.timeout)
            request_time = time.perf_counter() - start_time
            
            # Update statistics
            self.request_count += 1
            self.total_request_time += request_time
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            self.failed_requests += 1
            self.logger.error(f"OSRM nearest request failed: {e}")
            raise OSRMError(f"Nearest calculation failed: {e}")
    
    def calculate_travel_time(self, start: Tuple[float, float], 
                             end: Tuple[float, float],
                             traffic_multiplier: float = 1.0) -> float:
        """
        Calculate travel time between two points in minutes.
        
        Args:
            start: Starting coordinate (lon, lat)
            end: Ending coordinate (lon, lat)
            traffic_multiplier: Traffic adjustment factor
            
        Returns:
            Travel time in minutes
        """
        try:
            result = self.route([start, end])
            
            if 'routes' not in result or not result['routes']:
                raise OSRMError("No route found")
            
            duration_seconds = result['routes'][0]['duration']
            duration_minutes = (duration_seconds / 60.0) * traffic_multiplier
            
            return duration_minutes
            
        except Exception as e:
            self.logger.warning(f"Travel time calculation failed, using fallback: {e}")
            # Fallback to haversine distance estimation
            return self._estimate_travel_time_fallback(start, end, traffic_multiplier)
    
    def calculate_distance(self, start: Tuple[float, float], 
                          end: Tuple[float, float]) -> float:
        """
        Calculate driving distance between two points in kilometers.
        
        Args:
            start: Starting coordinate (lon, lat)
            end: Ending coordinate (lon, lat)
            
        Returns:
            Distance in kilometers
        """
        try:
            result = self.route([start, end])
            
            if 'routes' not in result or not result['routes']:
                raise OSRMError("No route found")
            
            distance_meters = result['routes'][0]['distance']
            return distance_meters / 1000.0
            
        except Exception as e:
            self.logger.warning(f"Distance calculation failed, using fallback: {e}")
            # Fallback to haversine distance
            return self._calculate_haversine_distance(start, end)
    
    def optimize_route(self, coords: List[Tuple[float, float]], 
                      start_index: int = 0) -> Dict[str, Any]:
        """
        Optimize waypoint order for shortest route.
        
        Args:
            coords: List of coordinates to visit
            start_index: Index of starting point
            
        Returns:
            Optimized route with waypoint order
        """
        if len(coords) < 3:
            # No optimization needed for 2 or fewer points
            return {
                'waypoints': list(range(len(coords))),
                'distance': self.calculate_distance(coords[0], coords[-1]) if len(coords) == 2 else 0,
                'duration': self.calculate_travel_time(coords[0], coords[-1]) if len(coords) == 2 else 0
            }
        
        # Build coordinate string
        coord_str = ';'.join(f"{lon},{lat}" for lon, lat in coords)
        
        # OSRM trip service for route optimization
        trip_url = f"{self.host}/trip/v1/driving/{coord_str}"
        params = {
            'source': 'first',  # Start from first coordinate
            'destination': 'last',  # End at last coordinate if different
            'roundtrip': 'false',
            'annotations': 'duration,distance'
        }
        
        query_string = '&'.join(f"{k}={v}" for k, v in params.items())
        url = f"{trip_url}?{query_string}"
        
        try:
            start_time = time.perf_counter()
            response = requests.get(url, timeout=self.timeout * 2)  # Longer timeout for optimization
            request_time = time.perf_counter() - start_time
            
            # Update statistics
            self.request_count += 1
            self.total_request_time += request_time
            
            response.raise_for_status()
            result = response.json()
            
            if 'waypoints' in result:
                waypoint_order = [wp['waypoint_index'] for wp in result['waypoints']]
                
                trip_info = {}
                if 'trips' in result and result['trips']:
                    trip = result['trips'][0]
                    trip_info = {
                        'distance': trip.get('distance', 0) / 1000.0,  # Convert to km
                        'duration': trip.get('duration', 0) / 60.0     # Convert to minutes
                    }
                
                return {
                    'waypoints': waypoint_order,
                    **trip_info
                }
            else:
                raise OSRMError("No waypoints in optimization result")
                
        except Exception as e:
            self.logger.warning(f"Route optimization failed, using original order: {e}")
            # Fallback to original order
            total_distance = sum(
                self.calculate_distance(coords[i], coords[i+1]) 
                for i in range(len(coords)-1)
            )
            total_time = sum(
                self.calculate_travel_time(coords[i], coords[i+1]) 
                for i in range(len(coords)-1)
            )
            
            return {
                'waypoints': list(range(len(coords))),
                'distance': total_distance,
                'duration': total_time
            }
    
    def _estimate_travel_time_fallback(self, start: Tuple[float, float], 
                                     end: Tuple[float, float],
                                     traffic_multiplier: float = 1.0) -> float:
        """Fallback travel time estimation using haversine distance"""
        distance_km = self._calculate_haversine_distance(start, end)
        # Assume average speed of 40 km/h in urban areas
        time_hours = distance_km / 40.0
        time_minutes = time_hours * 60.0 * traffic_multiplier
        return time_minutes
    
    def _calculate_haversine_distance(self, coord1: Tuple[float, float], 
                                     coord2: Tuple[float, float]) -> float:
        """Calculate haversine distance between two coordinates in kilometers"""
        import math
        
        R = 6371  # Earth's radius in km
        
        lat1, lon1 = math.radians(coord1[1]), math.radians(coord1[0])
        lat2, lon2 = math.radians(coord2[1]), math.radians(coord2[0])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def clear_cache(self) -> None:
        """Clear the route cache"""
        self._route_cache.clear()
    
    def is_available(self) -> bool:
        """Check if OSRM service is available"""
        try:
            # Simple health check
            response = requests.get(f"{self.host}/route/v1/driving/74.3587,31.5204;74.3700,31.5300",
                                  timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get service usage statistics"""
        avg_request_time = (
            self.total_request_time / max(1, self.request_count)
        )
        
        success_rate = (
            (self.request_count - self.failed_requests) / max(1, self.request_count) * 100
        )
        
        return {
            "request_count": self.request_count,
            "failed_requests": self.failed_requests,
            "success_rate": round(success_rate, 2),
            "average_request_time": round(avg_request_time, 3),
            "total_request_time": round(self.total_request_time, 3),
            "cache_size": len(self._route_cache),
            "cache_max_size": self._cache_max_size,
            "service_available": self.is_available()
        }
    
    def configure(self, config: Dict[str, Any]) -> None:
        """Configure service parameters"""
        if 'timeout' in config:
            self.timeout = config['timeout']
        
        if 'cache_max_size' in config:
            self._cache_max_size = config['cache_max_size']
            # Trim cache if needed
            while len(self._route_cache) > self._cache_max_size:
                oldest_key = next(iter(self._route_cache))
                del self._route_cache[oldest_key]
        
        if 'host' in config:
            self.host = config['host'].rstrip('/')
            self.base_url = f"{self.host}/route/v1/driving"
            self.table_url = f"{self.host}/table/v1/driving"
            self.match_url = f"{self.host}/match/v1/driving"


class OSRMError(Exception):
    """Custom exception for OSRM-related errors"""
    pass


class BatchOSRMService:
    """Service for batch processing of OSRM requests"""
    
    def __init__(self, osrm_service: OSRMService, batch_size: int = 10):
        self.osrm_service = osrm_service
        self.batch_size = batch_size
    
    def batch_distance_matrix(self, locations: List[Tuple[float, float]]) -> List[List[float]]:
        """
        Calculate full distance matrix for all locations.
        
        Args:
            locations: List of (lon, lat) coordinates
            
        Returns:
            2D matrix of distances in kilometers
        """
        n = len(locations)
        matrix = [[0.0 for _ in range(n)] for _ in range(n)]
        
        # Process in batches to avoid OSRM limits
        for i in range(0, n, self.batch_size):
            end_i = min(i + self.batch_size, n)
            sources = locations[i:end_i]
            
            for j in range(0, n, self.batch_size):
                end_j = min(j + self.batch_size, n)
                destinations = locations[j:end_j]
                
                try:
                    result = self.osrm_service.table(sources, destinations, ['distance'])
                    
                    if 'distances' in result:
                        distances = result['distances']
                        
                        for src_idx, row in enumerate(distances):
                            for dst_idx, distance in enumerate(row):
                                if distance is not None:
                                    # Convert meters to kilometers
                                    matrix[i + src_idx][j + dst_idx] = distance / 1000.0
                                else:
                                    # Use haversine as fallback
                                    matrix[i + src_idx][j + dst_idx] = (
                                        self.osrm_service._calculate_haversine_distance(
                                            sources[src_idx], destinations[dst_idx]
                                        )
                                    )
                
                except Exception as e:
                    # Fallback to haversine for this batch
                    for src_idx, src in enumerate(sources):
                        for dst_idx, dst in enumerate(destinations):
                            matrix[i + src_idx][j + dst_idx] = (
                                self.osrm_service._calculate_haversine_distance(src, dst)
                            )
        
        return matrix
    
    def batch_travel_times(self, locations: List[Tuple[float, float]], 
                          traffic_multiplier: float = 1.0) -> List[List[float]]:
        """
        Calculate travel time matrix for all locations.
        
        Args:
            locations: List of (lon, lat) coordinates
            traffic_multiplier: Traffic adjustment factor
            
        Returns:
            2D matrix of travel times in minutes
        """
        n = len(locations)
        matrix = [[0.0 for _ in range(n)] for _ in range(n)]
        
        # Process in batches
        for i in range(0, n, self.batch_size):
            end_i = min(i + self.batch_size, n)
            sources = locations[i:end_i]
            
            for j in range(0, n, self.batch_size):
                end_j = min(j + self.batch_size, n)
                destinations = locations[j:end_j]
                
                try:
                    result = self.osrm_service.table(sources, destinations, ['duration'])
                    
                    if 'durations' in result:
                        durations = result['durations']
                        
                        for src_idx, row in enumerate(durations):
                            for dst_idx, duration in enumerate(row):
                                if duration is not None:
                                    # Convert seconds to minutes and apply traffic
                                    time_minutes = (duration / 60.0) * traffic_multiplier
                                    matrix[i + src_idx][j + dst_idx] = time_minutes
                                else:
                                    # Use distance-based fallback
                                    matrix[i + src_idx][j + dst_idx] = (
                                        self.osrm_service._estimate_travel_time_fallback(
                                            sources[src_idx], destinations[dst_idx], traffic_multiplier
                                        )
                                    )
                
                except Exception as e:
                    # Fallback to distance-based estimation
                    for src_idx, src in enumerate(sources):
                        for dst_idx, dst in enumerate(destinations):
                            matrix[i + src_idx][j + dst_idx] = (
                                self.osrm_service._estimate_travel_time_fallback(
                                    src, dst, traffic_multiplier
                                )
                            )
        
        return matrix
    
    def batch_route_optimization(self, route_groups: List[List[Tuple[float, float]]]) -> List[Dict[str, Any]]:
        """
        Optimize multiple routes in batch.
        
        Args:
            route_groups: List of coordinate lists to optimize
            
        Returns:
            List of optimization results
        """
        results = []
        
        for coords in route_groups:
            try:
                result = self.osrm_service.optimize_route(coords)
                results.append(result)
            except Exception as e:
                # Fallback to original order
                results.append({
                    'waypoints': list(range(len(coords))),
                    'distance': 0,
                    'duration': 0,
                    'error': str(e)
                })
        
        return results