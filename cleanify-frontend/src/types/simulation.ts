export interface SimulationState {
  sim_time: string;
  sim_speed: number;
  is_paused: boolean;
  tick_count: number;
  traffic_multiplier: number;
  statistics: SimulationStatistics;
  recent_events: SimulationEvent[];
}

export interface SimulationStatistics {
  total_collections: number;
  total_distance: number;
  active_trucks: number;
  bins_needing_collection: number;
  simulation_uptime: number;
}

export interface SimulationEvent {
  timestamp: string;
  type: string;
  data: Record<string, any>;
}

export interface TimeManagerStatus {
  current_sim_time: string;
  speed: number;
  is_paused: boolean;
  total_sim_time_elapsed: number;
  total_real_time_elapsed: number;
  total_paused_time: number;
  sim_time_ratio: number;
  average_speed: number;
  speed_changes: number;
  pause_count: number;
  last_delta_seconds: number;
  last_delta_sim_seconds: number;
  formatted: {
    total_sim_time_elapsed: string;
    total_real_time_elapsed: string;
    total_paused_time: string;
    current_sim_time: string;
    speed_display: string;
  };
}

export interface SimulationConfig {
  auto_optimization: boolean;
  auto_bin_filling: boolean;
  truck_breakdown_probability: number;
  bin_overflow_enabled: boolean;
  depot_processing_enabled: boolean;
  emit_frequency: number;
  max_trucks_per_optimization: number;
}

export interface SimulationSnapshot {
  sim_time: string;
  sim_speed: number;
  is_paused: boolean;
  tick_count: number;
  trucks: any[];
  bins: any[];
  depots: any[];
  traffic_multiplier: number;
  statistics: SimulationStatistics;
  recent_events: SimulationEvent[];
}

export interface PerformanceMetrics {
  time_management: {
    average_tick_duration: number;
    simulation_efficiency: number;
    time_compression_ratio: number;
    real_time_factor: number;
    pause_efficiency: number;
  };
  simulation: {
    ticks_per_second: number;
    events_per_second: number;
    collections_per_hour: number;
    average_trucks_utilized: number;
  };
  optimization: any;
  traffic: any;
}

export interface HealthStatus {
  simulation_running: boolean;
  services: {
    time_manager: boolean;
    traffic_service: boolean;
    threshold_service: boolean;
    optimization_service: boolean;
    osrm_service: boolean;
  };
  data_integrity: {
    trucks_count: number;
    bins_count: number;
    depots_count: number;
  };
  performance: {
    tick_count: number;
    events_logged: number;
    uptime_seconds: number;
  };
}