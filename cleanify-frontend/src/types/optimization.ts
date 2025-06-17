export interface OptimizationResult {
  success: boolean;
  routes: Record<string, RouteResult>;
  capacity_allocation?: CapacityAllocation;
  total_distance: number;
  total_duration: number;
  bins_assigned: number;
  trucks_used: number;
  optimization_time: number;
  quality_metrics: QualityMetrics;
}

export interface RouteResult {
  truck_id: string;
  optimized_bin_ids: string[];
  total_distance: number;
  total_duration: number;
  original_order: string[];
  optimization_used: boolean;
  error?: string;
}

export interface CapacityAllocation {
  allocations: Record<string, TruckAllocation>;
  total_bins_allocated: number;
  total_weight_allocated: number;
  num_trucks_used: number;
  solve_time: number;
}

export interface TruckAllocation {
  truck_id: string;
  selected_bins: any[];
  selected_bin_ids: string[];
  total_urgency: number;
  total_weight: number;
  capacity_utilization: number;
  num_bins: number;
}

export interface QualityMetrics {
  coverage: number;
  efficiency: number;
  balance: number;
  assigned_bins: number;
  total_bins: number;
}

export interface OptimizationConfig {
  vrp_time_limit_seconds: number;
  knapsack_time_limit_seconds: number;
  max_route_distance_km: number;
  max_route_duration_minutes: number;
  depot_return_required: boolean;
  vehicle_capacity_buffer: number;
  radar_check_interval_minutes: number;
  urgency_threshold: number;
  optimization_algorithm: 'auto' | 'local_search' | 'guided_local_search';
}

export interface OptimizationStatistics {
  optimization_count: number;
  radar_checks: number;
  last_optimization: string;
  last_radar_check: string;
  average_optimization_time: number;
  average_quality_metrics: Partial<QualityMetrics>;
  recent_optimization_times: number[];
  config: OptimizationConfig;
  current_state: {
    available_trucks: number;
    trucks_with_routes: number;
    urgent_bins: number;
    total_active_bins: number;
    optimization_efficiency: number;
  };
}

export interface OptimizationAnalysis {
  input: {
    trucks_analyzed: number;
    available_trucks: number;
    bins_analyzed: number;
    active_bins: number;
    urgent_bins: number;
  };
  current_state: {
    trucks_with_routes: number;
    current_efficiency: number;
    total_current_load: number;
  };
  optimization_potential: {
    bins_that_could_be_assigned: number;
    trucks_that_would_work: number;
    potential_efficiency: number;
    efficiency_improvement: number;
  };
  capacity_allocation: CapacityAllocation;
  recommendations: OptimizationRecommendation[];
}

export interface OptimizationRecommendation {
  type: 'info' | 'warning' | 'suggestion';
  message: string;
}

export interface OptimizationRequest {
  truck_ids?: string[];
  bin_ids?: string[];
  force_all_bins?: boolean;
}