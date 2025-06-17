export enum DepotStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  FULL = 'full',
  OFFLINE = 'offline'
}

export interface Depot {
  id: string;
  name: string;
  location: [number, number]; // [longitude, latitude]
  capacity: number;
  current_load: number;
  capacity_percentage: number;
  status: DepotStatus;
  operating_hours: [number, number]; // [start_hour, end_hour]
  waste_types_accepted: WasteType[];
  processing_rate: number;
  trucks_stationed: string[];
  truck_count: number;
  daily_processed: number;
  total_processed: number;
  is_operational: boolean;
  is_near_capacity: boolean;
  utilization_metrics: DepotUtilizationMetrics;
  last_emptied: string;
  maintenance_schedule: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepotUtilizationMetrics {
  capacity_utilization: number;
  processing_efficiency: number;
  daily_throughput: number;
  total_throughput: number;
  trucks_stationed: number;
  operational_status: boolean;
}

export interface DepotFormData {
  id: string;
  name: string;
  location: [number, number];
  capacity?: number;
  operating_hours?: [number, number];
  waste_types_accepted?: WasteType[];
  processing_rate?: number;
}