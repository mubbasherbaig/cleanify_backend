"""
Reusable geographic helpers – keeps heavy libs (shapely, rtree) isolated.
Provides distance calculations, geometric operations, and spatial utilities.
"""
from math import radians, sin, cos, sqrt, atan2, degrees, asin, acos
from typing import Tuple, List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


def haversine(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """
    Calculate haversine distance between two points in meters.
    
    Args:
        a: First point as (longitude, latitude)
        b: Second point as (longitude, latitude)
        
    Returns:
        Distance in meters
    """
    R = 6371000  # Earth's radius in meters
    lon1, lat1 = map(radians, a)
    lon2, lat2 = map(radians, b)
    dlon, dlat = lon2 - lon1, lat2 - lat1
    h = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
    return 2*R*atan2(sqrt(h), sqrt(1-h))


def haversine_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """
    Calculate haversine distance between two points in kilometers.
    
    Args:
        a: First point as (longitude, latitude)
        b: Second point as (longitude, latitude)
        
    Returns:
        Distance in kilometers
    """
    return haversine(a, b) / 1000.0


def bearing(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """
    Calculate the initial bearing from point a to point b.
    
    Args:
        a: Starting point as (longitude, latitude)
        b: Ending point as (longitude, latitude)
        
    Returns:
        Bearing in degrees (0-360)
    """
    lon1, lat1 = map(radians, a)
    lon2, lat2 = map(radians, b)
    
    dlon = lon2 - lon1
    
    y = sin(dlon) * cos(lat2)
    x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dlon)
    
    initial_bearing = atan2(y, x)
    initial_bearing = degrees(initial_bearing)
    compass_bearing = (initial_bearing + 360) % 360
    
    return compass_bearing


def destination_point(start: Tuple[float, float], distance: float, bearing_deg: float) -> Tuple[float, float]:
    """
    Calculate destination point given start point, distance and bearing.
    
    Args:
        start: Starting point as (longitude, latitude)
        distance: Distance in meters
        bearing_deg: Bearing in degrees
        
    Returns:
        Destination point as (longitude, latitude)
    """
    R = 6371000  # Earth's radius in meters
    lon1, lat1 = map(radians, start)
    bearing_rad = radians(bearing_deg)
    
    lat2 = asin(sin(lat1) * cos(distance/R) + cos(lat1) * sin(distance/R) * cos(bearing_rad))
    
    lon2 = lon1 + atan2(
        sin(bearing_rad) * sin(distance/R) * cos(lat1),
        cos(distance/R) - sin(lat1) * sin(lat2)
    )
    
    return (degrees(lon2), degrees(lat2))


def bounding_box(center: Tuple[float, float], radius_meters: float) -> Dict[str, float]:
    """
    Calculate bounding box around a center point.
    
    Args:
        center: Center point as (longitude, latitude)
        radius_meters: Radius in meters
        
    Returns:
        Dictionary with 'north', 'south', 'east', 'west' bounds
    """
    north_point = destination_point(center, radius_meters, 0)
    south_point = destination_point(center, radius_meters, 180)
    east_point = destination_point(center, radius_meters, 90)
    west_point = destination_point(center, radius_meters, 270)
    
    return {
        'north': north_point[1],
        'south': south_point[1],
        'east': east_point[0],
        'west': west_point[0]
    }


def bounding_circle(points: List[Tuple[float, float]]) -> Tuple[Tuple[float, float], float]:
    """
    Find the smallest circle that contains all points.
    Uses a simple approximate algorithm.
    
    Args:
        points: List of points as (longitude, latitude)
        
    Returns:
        Tuple of (center_point, radius_meters)
    """
    if not points:
        return ((0.0, 0.0), 0.0)
    
    if len(points) == 1:
        return (points[0], 0.0)
    
    # Simple approximation: use centroid as center
    center_lon = sum(p[0] for p in points) / len(points)
    center_lat = sum(p[1] for p in points) / len(points)
    center = (center_lon, center_lat)
    
    # Find maximum distance from center
    max_distance = max(haversine(center, point) for point in points)
    
    return (center, max_distance)


def points_within_radius(points: List[Tuple[float, float]], 
                        center: Tuple[float, float], 
                        radius_meters: float) -> List[Tuple[float, float]]:
    """
    Filter points that are within a given radius of center.
    
    Args:
        points: List of points to filter
        center: Center point for radius calculation
        radius_meters: Radius in meters
        
    Returns:
        List of points within radius
    """
    return [point for point in points if haversine(center, point) <= radius_meters]


def nearest_point(target: Tuple[float, float], 
                  candidates: List[Tuple[float, float]]) -> Optional[Tuple[float, float]]:
    """
    Find the nearest point to target from a list of candidates.
    
    Args:
        target: Target point
        candidates: List of candidate points
        
    Returns:
        Nearest point or None if candidates is empty
    """
    if not candidates:
        return None
    
    return min(candidates, key=lambda p: haversine(target, p))


def interpolate_point(a: Tuple[float, float], 
                     b: Tuple[float, float], 
                     fraction: float) -> Tuple[float, float]:
    """
    Interpolate a point between two points.
    
    Args:
        a: First point
        b: Second point
        fraction: Fraction between 0 (point a) and 1 (point b)
        
    Returns:
        Interpolated point
    """
    fraction = max(0.0, min(1.0, fraction))  # Clamp to [0, 1]
    
    lon = a[0] + (b[0] - a[0]) * fraction
    lat = a[1] + (b[1] - a[1]) * fraction
    
    return (lon, lat)


def point_along_path(path: List[Tuple[float, float]], 
                    distance_meters: float) -> Optional[Tuple[float, float]]:
    """
    Find point along a path at specified distance from start.
    
    Args:
        path: List of points forming the path
        distance_meters: Distance along path in meters
        
    Returns:
        Point at specified distance or None if path too short
    """
    if len(path) < 2:
        return None
    
    if distance_meters <= 0:
        return path[0]
    
    accumulated_distance = 0.0
    
    for i in range(len(path) - 1):
        segment_start = path[i]
        segment_end = path[i + 1]
        segment_length = haversine(segment_start, segment_end)
        
        if accumulated_distance + segment_length >= distance_meters:
            # Point is within this segment
            remaining_distance = distance_meters - accumulated_distance
            fraction = remaining_distance / segment_length if segment_length > 0 else 0
            return interpolate_point(segment_start, segment_end, fraction)
        
        accumulated_distance += segment_length
    
    # Distance exceeds path length, return last point
    return path[-1]


def path_length(path: List[Tuple[float, float]]) -> float:
    """
    Calculate total length of a path in meters.
    
    Args:
        path: List of points forming the path
        
    Returns:
        Total path length in meters
    """
    if len(path) < 2:
        return 0.0
    
    total_length = 0.0
    for i in range(len(path) - 1):
        total_length += haversine(path[i], path[i + 1])
    
    return total_length


def simplify_path(path: List[Tuple[float, float]], 
                 tolerance_meters: float = 10.0) -> List[Tuple[float, float]]:
    """
    Simplify a path using Douglas-Peucker algorithm approximation.
    
    Args:
        path: List of points forming the path
        tolerance_meters: Simplification tolerance in meters
        
    Returns:
        Simplified path
    """
    if len(path) <= 2:
        return path.copy()
    
    # Simple approximation: remove points that are too close to previous point
    simplified = [path[0]]
    
    for i in range(1, len(path)):
        distance = haversine(simplified[-1], path[i])
        if distance >= tolerance_meters:
            simplified.append(path[i])
    
    # Always include the last point if it's not already included
    if simplified[-1] != path[-1]:
        simplified.append(path[-1])
    
    return simplified


def point_to_line_distance(point: Tuple[float, float], 
                          line_start: Tuple[float, float], 
                          line_end: Tuple[float, float]) -> float:
    """
    Calculate shortest distance from point to line segment.
    
    Args:
        point: Point to measure from
        line_start: Start of line segment
        line_end: End of line segment
        
    Returns:
        Distance in meters
    """
    # If line segment is actually a point
    if line_start == line_end:
        return haversine(point, line_start)
    
    # Calculate the projection of point onto the line
    line_length = haversine(line_start, line_end)
    
    if line_length == 0:
        return haversine(point, line_start)
    
    # Use simple approach: check distances to endpoints and midpoint
    dist_to_start = haversine(point, line_start)
    dist_to_end = haversine(point, line_end)
    
    # Check midpoint
    midpoint = interpolate_point(line_start, line_end, 0.5)
    dist_to_mid = haversine(point, midpoint)
    
    return min(dist_to_start, dist_to_end, dist_to_mid)


def convex_hull(points: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
    """
    Calculate convex hull of points using Graham scan algorithm.
    Simple implementation for geographic coordinates.
    
    Args:
        points: List of points
        
    Returns:
        List of points forming convex hull
    """
    if len(points) < 3:
        return points.copy()
    
    def cross_product(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    
    # Sort points lexicographically
    points = sorted(set(points))
    
    if len(points) <= 1:
        return points
    
    # Build lower hull
    lower = []
    for p in points:
        while len(lower) >= 2 and cross_product(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    
    # Build upper hull
    upper = []
    for p in reversed(points):
        while len(upper) >= 2 and cross_product(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    
    # Remove last point of each half because it's repeated
    return lower[:-1] + upper[:-1]


def is_point_in_polygon(point: Tuple[float, float], 
                       polygon: List[Tuple[float, float]]) -> bool:
    """
    Check if point is inside polygon using ray casting algorithm.
    
    Args:
        point: Point to test
        polygon: List of points forming polygon boundary
        
    Returns:
        True if point is inside polygon
    """
    if len(polygon) < 3:
        return False
    
    x, y = point
    n = len(polygon)
    inside = False
    
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    
    return inside


def polygon_area(polygon: List[Tuple[float, float]]) -> float:
    """
    Calculate area of polygon using shoelace formula.
    Result is approximate for geographic coordinates.
    
    Args:
        polygon: List of points forming polygon
        
    Returns:
        Area in square meters (approximate)
    """
    if len(polygon) < 3:
        return 0.0
    
    # Shoelace formula
    area = 0.0
    n = len(polygon)
    
    for i in range(n):
        j = (i + 1) % n
        area += polygon[i][0] * polygon[j][1]
        area -= polygon[j][0] * polygon[i][1]
    
    area = abs(area) / 2.0
    
    # Convert from degrees squared to approximate meters squared
    # This is a rough approximation and becomes less accurate for large areas
    lat_avg = sum(p[1] for p in polygon) / len(polygon)
    meters_per_degree_lat = 111320  # Approximate
    meters_per_degree_lon = 111320 * cos(radians(lat_avg))
    
    area_m2 = area * meters_per_degree_lat * meters_per_degree_lon
    
    return area_m2


def grid_points_in_bbox(bbox: Dict[str, float], 
                       spacing_meters: float) -> List[Tuple[float, float]]:
    """
    Generate grid points within bounding box.
    
    Args:
        bbox: Bounding box with 'north', 'south', 'east', 'west'
        spacing_meters: Spacing between grid points in meters
        
    Returns:
        List of grid points
    """
    # Convert spacing to approximate degrees
    lat_spacing = spacing_meters / 111320  # Approximate meters per degree latitude
    
    center_lat = (bbox['north'] + bbox['south']) / 2
    lon_spacing = spacing_meters / (111320 * cos(radians(center_lat)))
    
    points = []
    
    lat = bbox['south']
    while lat <= bbox['north']:
        lon = bbox['west']
        while lon <= bbox['east']:
            points.append((lon, lat))
            lon += lon_spacing
        lat += lat_spacing
    
    return points


def cluster_points(points: List[Tuple[float, float]], 
                  max_distance_meters: float) -> List[List[Tuple[float, float]]]:
    """
    Simple clustering of points based on distance threshold.
    
    Args:
        points: List of points to cluster
        max_distance_meters: Maximum distance within cluster
        
    Returns:
        List of clusters, each cluster is a list of points
    """
    if not points:
        return []
    
    clusters = []
    remaining_points = points.copy()
    
    while remaining_points:
        # Start new cluster with first remaining point
        cluster = [remaining_points.pop(0)]
        
        # Find all points within distance of any point in cluster
        i = 0
        while i < len(remaining_points):
            point = remaining_points[i]
            
            # Check if point is close to any point in current cluster
            is_close = any(
                haversine(point, cluster_point) <= max_distance_meters
                for cluster_point in cluster
            )
            
            if is_close:
                cluster.append(remaining_points.pop(i))
            else:
                i += 1
        
        clusters.append(cluster)
    
    return clusters


def centroid(points: List[Tuple[float, float]]) -> Tuple[float, float]:
    """
    Calculate centroid (geometric center) of points.
    
    Args:
        points: List of points
        
    Returns:
        Centroid point
    """
    if not points:
        return (0.0, 0.0)
    
    lon_sum = sum(p[0] for p in points)
    lat_sum = sum(p[1] for p in points)
    
    return (lon_sum / len(points), lat_sum / len(points))


def weighted_centroid(points: List[Tuple[float, float]], 
                     weights: List[float]) -> Tuple[float, float]:
    """
    Calculate weighted centroid of points.
    
    Args:
        points: List of points
        weights: List of weights for each point
        
    Returns:
        Weighted centroid point
    """
    if not points or len(points) != len(weights):
        return (0.0, 0.0)
    
    total_weight = sum(weights)
    if total_weight == 0:
        return centroid(points)
    
    weighted_lon = sum(p[0] * w for p, w in zip(points, weights))
    weighted_lat = sum(p[1] * w for p, w in zip(points, weights))
    
    return (weighted_lon / total_weight, weighted_lat / total_weight)


def route_optimization_2opt(points: List[Tuple[float, float]]) -> List[int]:
    """
    Simple 2-opt route optimization for TSP-like problems.
    Returns indices of points in optimized order.
    
    Args:
        points: List of points to visit
        
    Returns:
        List of indices representing optimized route
    """
    if len(points) <= 2:
        return list(range(len(points)))
    
    # Start with original order
    route = list(range(len(points)))
    
    def route_distance(route_indices):
        total = 0.0
        for i in range(len(route_indices)):
            start_idx = route_indices[i]
            end_idx = route_indices[(i + 1) % len(route_indices)]
            total += haversine(points[start_idx], points[end_idx])
        return total
    
    best_distance = route_distance(route)
    improved = True
    max_iterations = 100
    iteration = 0
    
    while improved and iteration < max_iterations:
        improved = False
        iteration += 1
        
        for i in range(1, len(route) - 1):
            for j in range(i + 1, len(route)):
                # Try reversing the segment between i and j
                new_route = route.copy()
                new_route[i:j+1] = reversed(new_route[i:j+1])
                
                new_distance = route_distance(new_route)
                
                if new_distance < best_distance:
                    route = new_route
                    best_distance = new_distance
                    improved = True
                    break
            
            if improved:
                break
    
    return route


def validate_coordinates(lon: float, lat: float) -> bool:
    """
    Validate if coordinates are within valid ranges.
    
    Args:
        lon: Longitude
        lat: Latitude
        
    Returns:
        True if coordinates are valid
    """
    return -180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0


def normalize_longitude(lon: float) -> float:
    """
    Normalize longitude to [-180, 180] range.
    
    Args:
        lon: Longitude to normalize
        
    Returns:
        Normalized longitude
    """
    while lon > 180.0:
        lon -= 360.0
    while lon < -180.0:
        lon += 360.0
    return lon


def format_coordinates(lon: float, lat: float, precision: int = 6) -> str:
    """
    Format coordinates as string with specified precision.
    
    Args:
        lon: Longitude
        lat: Latitude
        precision: Number of decimal places
        
    Returns:
        Formatted coordinate string
    """
    return f"{lat:.{precision}f}, {lon:.{precision}f}"


def parse_coordinates(coord_str: str) -> Tuple[float, float]:
    """
    Parse coordinate string in various formats.
    
    Args:
        coord_str: Coordinate string (e.g., "31.5204, 74.3587")
        
    Returns:
        Tuple of (longitude, latitude)
        
    Raises:
        ValueError: If string cannot be parsed
    """
    try:
        # Remove any extra whitespace and split
        parts = [part.strip() for part in coord_str.replace(',', ' ').split()]
        
        if len(parts) != 2:
            raise ValueError("Coordinate string must contain exactly 2 numbers")
        
        # Assume first number is latitude, second is longitude
        # This is the common format, but could be reversed
        lat = float(parts[0])
        lon = float(parts[1])
        
        # If values seem reversed (lat > 90 or lon > 180), swap them
        if abs(lat) > 90 or abs(lon) > 180:
            lat, lon = lon, lat
        
        if not validate_coordinates(lon, lat):
            raise ValueError("Coordinates are outside valid ranges")
        
        return (lon, lat)
        
    except (ValueError, IndexError) as e:
        raise ValueError(f"Invalid coordinate string: {coord_str}") from e


# Utility functions for specific geographic regions
def lahore_bounds() -> Dict[str, float]:
    """Get bounding box for Lahore, Pakistan"""
    return {
        'north': 31.6340,
        'south': 31.4204,
        'east': 74.4587,
        'west': 74.2587
    }


def is_in_lahore(point: Tuple[float, float]) -> bool:
    """Check if point is within Lahore bounds"""
    bounds = lahore_bounds()
    lon, lat = point
    return (bounds['west'] <= lon <= bounds['east'] and 
            bounds['south'] <= lat <= bounds['north'])