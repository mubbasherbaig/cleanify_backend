export enum WasteType {
  GENERAL = 'general',
  RECYCLABLE = 'recyclable',
  HAZARDOUS = 'hazardous'
}

export enum BinStatus {
  ACTIVE = 'active',
  FULL = 'full',
  MAINTENANCE = 'maintenance',
  COLLECTED = 'collected'
}

export interface Bin {
  id: string;
  type: WasteType;
  location: [number, number]; // [longitude, latitude]
  fill_level: number;
  static_threshold: number;
  capacity: number;
  status: BinStatus;
  last_collected: string;
  fill_rate: number;
  priority: number;
  needs_collection: boolean;
  urgency_score: number;
  current_threshold?: number;
  created_at: string;
  updated_at: string;
}

export interface BinStatistics {
  total_bins: number;
  active_bins: number;
  full_bins: number;
  maintenance_bins: number;
  average_fill_level: number;
  bins_needing_collection: number;
  urgent_bin_ids: string[];
  type_distribution: Record<WasteType, number>;
  priority_distribution: Record<number, number>;
  collection_efficiency: number;
}

export interface BinFormData {
  id: string;
  type: WasteType;
  location: [number, number];
  static_threshold: number;
  fill_level?: number;
  capacity?: number;
  fill_rate?: number;
  priority?: number;
}

export interface ThresholdAnalysis {
  mode: 'static' | 'dynamic';
  final_threshold: number;
  base_threshold: number;
  total_adjustment?: number;
  factors?: {
    eta: {
      raw_adjustment: number;
      weighted_adjustment: number;
      weight: number;
    };
    traffic: {
      raw_adjustment: number;
      weighted_adjustment: number;
      weight: number;
      current_multiplier?: number;
    };
    priority: {
      raw_adjustment: number;
      weighted_adjustment: number;
      weight: number;
      bin_priority: number;
    };
    fill_rate: {
      raw_adjustment: number;
      weighted_adjustment: number;
      weight: number;
      bin_fill_rate: number;
    };
    time_of_day: {
      raw_adjustment: number;
      weighted_adjustment: number;
      weight: number;
      current_hour: number;
    };
    capacity: {
      raw_adjustment: number;
      weighted_adjustment: number;
      weight: number;
      bin_capacity: number;
    };
  };
}

export interface BinFilters {
  status?: BinStatus;
  type?: WasteType;
  needs_collection?: boolean;
  priority?: number;
  fill_level_min?: number;
  fill_level_max?: number;
}