import { MAP_CONFIG } from './constants';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

// Distance calculations
export const calculateHaversineDistance = (
  coord1: Coordinates,
  coord2: Coordinates
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * 
    Math.cos(toRadians(coord2.latitude)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const calculateBearing = (
  from: Coordinates,
  to: Coordinates
): number => {
  const dLon = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  
  const y = Math.sin(dLon) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) - 
           Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLon);
  
  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
};

export const calculateDestination = (
  start: Coordinates,
  bearing: number,
  distance: number
): Coordinates => {
  const R = 6371; // Earth's radius in kilometers
  const bearingRad = toRadians(bearing);
  const startLatRad = toRadians(start.latitude);
  const startLonRad = toRadians(start.longitude);
  
  const destLatRad = Math.asin(
    Math.sin(startLatRad) * Math.cos(distance / R) +
    Math.cos(startLatRad) * Math.sin(distance / R) * Math.cos(bearingRad)
  );
  
  const destLonRad = startLonRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(startLatRad),
    Math.cos(distance / R) - Math.sin(startLatRad) * Math.sin(destLatRad)
  );
  
  return {
    latitude: toDegrees(destLatRad),
    longitude: toDegrees(destLonRad)
  };
};

// Coordinate conversions
export const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

export const toDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

export const normalizeCoordinates = (coordinates: Coordinates): Coordinates => {
  return {
    latitude: Math.max(-90, Math.min(90, coordinates.latitude)),
    longitude: ((coordinates.longitude + 180) % 360) - 180
  };
};

// Bounds calculations
export const calculateBounds = (coordinates: Coordinates[]): Bounds => {
  if (coordinates.length === 0) {
    return {
      north: MAP_CONFIG.DEFAULT_CENTER[1] + 0.01,
      south: MAP_CONFIG.DEFAULT_CENTER[1] - 0.01,
      east: MAP_CONFIG.DEFAULT_CENTER[0] + 0.01,
      west: MAP_CONFIG.DEFAULT_CENTER[0] - 0.01
    };
  }
  
  const latitudes = coordinates.map(coord => coord.latitude);
  const longitudes = coordinates.map(coord => coord.longitude);
  
  return {
    north: Math.max(...latitudes),
    south: Math.min(...latitudes),
    east: Math.max(...longitudes),
    west: Math.min(...longitudes)
  };
};

export const expandBounds = (bounds: Bounds, factor: number = 0.1): Bounds => {
  const latDiff = bounds.north - bounds.south;
  const lonDiff = bounds.east - bounds.west;
  
  return {
    north: bounds.north + latDiff * factor,
    south: bounds.south - latDiff * factor,
    east: bounds.east + lonDiff * factor,
    west: bounds.west - lonDiff * factor
  };
};

export const boundsContainPoint = (bounds: Bounds, point: Coordinates): boolean => {
  return point.latitude >= bounds.south &&
         point.latitude <= bounds.north &&
         point.longitude >= bounds.west &&
         point.longitude <= bounds.east;
};

export const boundsIntersect = (bounds1: Bounds, bounds2: Bounds): boolean => {
  return bounds1.west <= bounds2.east &&
         bounds1.east >= bounds2.west &&
         bounds1.south <= bounds2.north &&
         bounds1.north >= bounds2.south;
};

// Viewport calculations
export const calculateViewportForBounds = (
  bounds: Bounds,
  width: number,
  height: number,
  padding: number = 50
): MapViewport => {
  const expandedBounds = expandBounds(bounds, 0.1);
  
  // Calculate center
  const latitude = (expandedBounds.north + expandedBounds.south) / 2;
  const longitude = (expandedBounds.east + expandedBounds.west) / 2;
  
  // Calculate zoom level
  const latDiff = expandedBounds.north - expandedBounds.south;
  const lonDiff = expandedBounds.east - expandedBounds.west;
  
  const maxZoomLat = Math.log2(360 * (height - 2 * padding) / (latDiff * 256));
  const maxZoomLon = Math.log2(360 * (width - 2 * padding) / (lonDiff * 256));
  
  const zoom = Math.min(maxZoomLat, maxZoomLon, MAP_CONFIG.MAX_ZOOM);
  
  return {
    latitude,
    longitude,
    zoom: Math.max(zoom, MAP_CONFIG.MIN_ZOOM)
  };
};

export const isValidViewport = (viewport: MapViewport): boolean => {
  return viewport.latitude >= -90 &&
         viewport.latitude <= 90 &&
         viewport.longitude >= -180 &&
         viewport.longitude <= 180 &&
         viewport.zoom >= MAP_CONFIG.MIN_ZOOM &&
         viewport.zoom <= MAP_CONFIG.MAX_ZOOM;
};

// Clustering utilities
export const clusterPoints = (
  points: Array<Coordinates & { id: string; data?: any }>,
  zoom: number,
  clusterRadius: number = MAP_CONFIG.CLUSTER_RADIUS
): Array<{
  id: string;
  coordinates: Coordinates;
  count: number;
  points: Array<Coordinates & { id: string; data?: any }>;
}> => {
  const clusters: Array<{
    id: string;
    coordinates: Coordinates;
    count: number;
    points: Array<Coordinates & { id: string; data?: any }>;
  }> = [];
  
  const visited = new Set<string>();
  
  points.forEach(point => {
    if (visited.has(point.id)) return;
    
    const cluster = {
      id: `cluster_${point.id}`,
      coordinates: { ...point },
      count: 1,
      points: [point]
    };
    
    visited.add(point.id);
    
    // Find nearby points for clustering
    const radiusInDegrees = clusterRadius / (111320 * Math.cos(toRadians(point.latitude)));
    
    points.forEach(otherPoint => {
      if (visited.has(otherPoint.id)) return;
      
      const distance = calculateHaversineDistance(point, otherPoint);
      const distanceInPixels = distance * 111320 / Math.pow(2, zoom - 1);
      
      if (distanceInPixels <= clusterRadius) {
        cluster.points.push(otherPoint);
        cluster.count++;
        visited.add(otherPoint.id);
        
        // Update cluster center
        cluster.coordinates.latitude = 
          cluster.points.reduce((sum, p) => sum + p.latitude, 0) / cluster.count;
        cluster.coordinates.longitude = 
          cluster.points.reduce((sum, p) => sum + p.longitude, 0) / cluster.count;
      }
    });
    
    clusters.push(cluster);
  });
  
  return clusters;
};

// Route utilities
export const simplifyRoute = (
  route: Coordinates[],
  tolerance: number = 0.0001
): Coordinates[] => {
  if (route.length <= 2) return route;
  
  // Douglas-Peucker algorithm simplified
  const simplified: Coordinates[] = [route[0]];
  
  for (let i = 1; i < route.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const current = route[i];
    const next = route[i + 1];
    
    const distance = pointToLineDistance(current, prev, next);
    
    if (distance > tolerance) {
      simplified.push(current);
    }
  }
  
  simplified.push(route[route.length - 1]);
  return simplified;
};

export const calculateRouteDistance = (route: Coordinates[]): number => {
  let totalDistance = 0;
  
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += calculateHaversineDistance(route[i], route[i + 1]);
  }
  
  return totalDistance;
};

export const interpolateRoute = (
  route: Coordinates[],
  intervalKm: number = 0.1
): Coordinates[] => {
  if (route.length < 2) return route;
  
  const interpolated: Coordinates[] = [route[0]];
  
  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i];
    const end = route[i + 1];
    const segmentDistance = calculateHaversineDistance(start, end);
    
    if (segmentDistance > intervalKm) {
      const steps = Math.ceil(segmentDistance / intervalKm);
      
      for (let step = 1; step < steps; step++) {
        const fraction = step / steps;
        const interpolatedPoint = {
          latitude: start.latitude + (end.latitude - start.latitude) * fraction,
          longitude: start.longitude + (end.longitude - start.longitude) * fraction
        };
        interpolated.push(interpolatedPoint);
      }
    }
    
    interpolated.push(end);
  }
  
  return interpolated;
};

// Geometric utilities
export const pointToLineDistance = (
  point: Coordinates,
  lineStart: Coordinates,
  lineEnd: Coordinates
): number => {
  const A = point.latitude - lineStart.latitude;
  const B = point.longitude - lineStart.longitude;
  const C = lineEnd.latitude - lineStart.latitude;
  const D = lineEnd.longitude - lineStart.longitude;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    return calculateHaversineDistance(point, lineStart);
  }
  
  const param = dot / lenSq;
  
  let closestPoint: Coordinates;
  
  if (param < 0) {
    closestPoint = lineStart;
  } else if (param > 1) {
    closestPoint = lineEnd;
  } else {
    closestPoint = {
      latitude: lineStart.latitude + param * C,
      longitude: lineStart.longitude + param * D
    };
  }
  
  return calculateHaversineDistance(point, closestPoint);
};

export const isPointInPolygon = (point: Coordinates, polygon: Coordinates[]): boolean => {
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

export const calculatePolygonArea = (polygon: Coordinates[]): number => {
  if (polygon.length < 3) return 0;
  
  let area = 0;
  const n = polygon.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].longitude * polygon[j].latitude;
    area -= polygon[j].longitude * polygon[i].latitude;
  }
  
  return Math.abs(area) / 2;
};

// Map styling utilities
export const getMarkerColor = (type: string, status?: string): string => {
  switch (type) {
    case 'truck':
      switch (status) {
        case 'idle': return '#6b7280';
        case 'en_route': return '#3b82f6';
        case 'collecting': return '#10b981';
        case 'returning': return '#8b5cf6';
        case 'maintenance': return '#f59e0b';
        case 'offline': return '#ef4444';
        default: return '#6b7280';
      }
    case 'bin':
      switch (status) {
        case 'active': return '#10b981';
        case 'full': return '#ef4444';
        case 'maintenance': return '#f59e0b';
        case 'collected': return '#6b7280';
        default: return '#10b981';
      }
    case 'depot':
      switch (status) {
        case 'active': return '#10b981';
        case 'maintenance': return '#f59e0b';
        case 'full': return '#ef4444';
        case 'offline': return '#ef4444';
        default: return '#10b981';
      }
    default:
      return '#6b7280';
  }
};

export const getMarkerSize = (type: string, zoom: number): number => {
  const baseSize = type === 'truck' ? MAP_CONFIG.MARKER_SIZES.LARGE : MAP_CONFIG.MARKER_SIZES.MEDIUM;
  const zoomFactor = Math.max(0.5, Math.min(2, zoom / 12));
  return baseSize * zoomFactor;
};

// Coordinate formatting
export const formatCoordinate = (
  value: number,
  type: 'latitude' | 'longitude',
  precision: number = 6
): string => {
  const absValue = Math.abs(value);
  const direction = type === 'latitude' 
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');
  
  return `${absValue.toFixed(precision)}° ${direction}`;
};

export const formatCoordinates = (
  coordinates: Coordinates,
  precision: number = 6
): string => {
  return `${formatCoordinate(coordinates.latitude, 'latitude', precision)}, ${formatCoordinate(coordinates.longitude, 'longitude', precision)}`;
};

// Map data utilities
export const createGeoJSONFeature = (
  coordinates: Coordinates,
  properties: Record<string, any> = {}
): any => {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [coordinates.longitude, coordinates.latitude]
    },
    properties
  };
};

export const createGeoJSONLineString = (
  coordinates: Coordinates[]
): any => {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates.map(coord => [coord.longitude, coord.latitude])
    },
    properties: {}
  };
};

export const createGeoJSONPolygon = (
  coordinates: Coordinates[]
): any => {
  // Close the polygon if not already closed
  const coords = [...coordinates];
  if (coords[0] !== coords[coords.length - 1]) {
    coords.push(coords[0]);
  }
  
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords.map(coord => [coord.longitude, coord.latitude])]
    },
    properties: {}
  };
};

// Export default utilities
export const mapUtils = {
  calculateHaversineDistance,
  calculateBearing,
  calculateDestination,
  calculateBounds,
  expandBounds,
  calculateViewportForBounds,
  clusterPoints,
  simplifyRoute,
  calculateRouteDistance,
  interpolateRoute,
  isPointInPolygon,
  calculatePolygonArea,
  getMarkerColor,
  getMarkerSize,
  formatCoordinates,
  createGeoJSONFeature,
  createGeoJSONLineString,
  createGeoJSONPolygon
};