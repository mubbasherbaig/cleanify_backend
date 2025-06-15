"""
Reusable geographic helpers – keeps heavy libs (shapely, rtree) isolated.
"""
from math import radians, sin, cos, sqrt, atan2

def haversine(a, b):
    # quick lon/lat distance in meters
    R = 6371000
    lon1, lat1 = map(radians, a)
    lon2, lat2 = map(radians, b)
    dlon, dlat = lon2 - lon1, lat2 - lat1
    h = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
    return 2*R*atan2(sqrt(h), sqrt(1-h))
