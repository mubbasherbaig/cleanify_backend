export interface AllSettings {
  simulation: SimulationSettings;
  traffic: TrafficSettings;
  threshold: ThresholdSettings;
  optimization: OptimizationConfig;
  scheduler: SchedulerSettings;
}

export interface SimulationSettings {
  speed: number;
  is_paused: boolean;
  current_time: string;
  config: SimulationConfig;
}

export interface TrafficSettings {
  mode: 'auto' | 'manual';
  current_multiplier: number;
  manual_multiplier: number;
  auto_multiplier: number;
  current_time: string;
  current_hour: number;
  active_events: number;
  total_events: number;
  update_interval_minutes: number;
  last_update: string;
  forecast?: TrafficForecast[];
}

export interface TrafficForecast {
  time: string;
  hour: number;
  multiplier: number;
  base_multiplier: number;
  event_multiplier: number;
}

export interface TrafficEvent {
  start_time: string;
  end_time: string;
  multiplier_delta: number;
  description: string;
}

export interface TrafficPatterns {
  rush_hour_morning: [number, number];
  rush_hour_evening: [number, number];
  base_multiplier: number;
  max_multiplier: number;
  min_multiplier: number;
  noise_amplitude: number;
  update_interval_minutes: number;
}

export interface ThresholdSettings {
  mode: 'static' | 'dynamic';
  static_thresholds: Record<string, number>;
  dynamic_config: DynamicThresholdConfig;
  services: {
    osrm_available: boolean;
    traffic_available: boolean;
  };
}

export interface DynamicThresholdConfig {
  base_threshold: number;
  eta_weight: number;
  traffic_weight: number;
  priority_weight: number;
  fill_rate_weight: number;
  time_weight: number;
  capacity_weight: number;
  min_threshold: number;
  max_threshold: number;
  min_eta_minutes: number;
  max_eta_minutes: number;
  peak_hours: [number, number][];
  off_peak_bonus: number;
  slow_fill_rate: number;
  fast_fill_rate: number;
}

export interface SchedulerSettings {
  collections_per_day: number;
  working_hours: [number, number];
  scheduler_active: boolean;
}

export interface SettingsProfile {
  name: string;
  description: string;
  settings: Partial<AllSettings>;
}

export interface SettingsExport {
  export_timestamp: string;
  simulation: {
    config: SimulationConfig;
    collections_per_day: number;
    working_hours: [number, number];
  };
  traffic: {
    mode: string;
    manual_multiplier: number;
    patterns: TrafficPatterns;
  };
  threshold: {
    mode: string;
    static_thresholds: Record<string, number>;
    dynamic_config: DynamicThresholdConfig;
  };
  optimization: OptimizationConfig;
}

export interface SettingsValidationResult {
  category: string;
  field: string;
  error: string;
}