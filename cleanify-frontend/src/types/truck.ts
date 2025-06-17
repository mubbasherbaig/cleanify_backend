export enum TruckStatus {
  IDLE = 'idle',
  EN_ROUTE = 'en_route',
  COLLECTING = 'collecting',
  RETURNING = 'returning',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline'
}

export interface Truck {
  id: string;
  capacity: number;
  location: [number, number]; // [longitude, latitude]
  load: number;
  load_percentage: number;
  status: TruckStatus;
  route: string[];
  current_route_index: number;
  next_destination: string | null;
  speed: number;
  fuel_level: number;
  fuel_consumption: number;
  depot_location: [number, number];
  total_distance_traveled: number;
  collections_today: number;
  is_available: boolean;
  is_full: boolean;
  needs_maintenance: boolean;
  efficiency_metrics: TruckEfficiencyMetrics;
  last_maintenance: string;
  created_at: string;
  updated_at: string;
}

export interface TruckEfficiencyMetrics {
  load_efficiency: number;
  fuel_efficiency: number;
  daily_collections: number;
  distance_per_collection: number;
  average_load_per_collection: number;
}

export interface TruckRoute {
  truck_id: string;
  status: TruckStatus;
  current_location: [number, number];
  depot_location: [number, number];
  current_load: number;
  capacity: number;
  route_bins: string[];
  current_route_index: number;
  next_destination: string | null;
  route_details: RouteDetail[];
  route_summary: RouteSummary;
  return_to_depot_distance: number;
}

export interface RouteDetail {
  sequence: number;
  bin_id: string;
  location: [number, number];
  fill_level: number;
  type: string;
  priority: number;
  estimated_load: number;
  distance_from_previous: number;
  is_next: boolean;
  is_completed: boolean;
  threshold: number;
  needs_collection: boolean;
}

export interface RouteSummary {
  total_bins: number;
  completed_bins: number;
  remaining_bins: number;
  estimated_total_load: number;
  estimated_total_distance: number;
  estimated_time_minutes: number;
  capacity_utilization: number;
  route_progress: number;
}

export interface TruckStatistics {
  fleet_overview: {
    total_trucks: number;
    available_trucks: number;
    trucks_with_routes: number;
    availability_rate: number;
  };
  status_distribution: Record<TruckStatus, number>;
  capacity_metrics: {
    total_capacity: number;
    total_current_load: number;
    average_utilization: number;
    available_capacity: number;
  };
  fuel_metrics: {
    average_fuel_level: number;
    trucks_low_fuel: number;
    trucks_need_refuel: number;
  };
  performance_metrics: {
    total_distance_traveled: number;
    total_collections_today: number;
    average_distance_per_truck: number;
    average_collections_per_truck: number;
    route_efficiency: number;
  };
  maintenance_metrics: {
    trucks_in_maintenance: number;
    trucks_needing_maintenance: number;
  };
}

export interface TruckFormData {
  id: string;
  capacity: number;
  location?: [number, number];
  depot_location?: [number, number];
  speed?: number;
  fuel_level?: number;
  fuel_consumption?: number;
}