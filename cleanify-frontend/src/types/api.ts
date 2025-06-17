// Base API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// Generic list response
export interface ListResponse<T> extends ApiResponse<T[]> {
  total: number;
  page?: number;
  limit?: number;
  filters_applied?: Record<string, any>;
}

// Simulation API responses
export interface SimulationStatusResponse extends ApiResponse {
  status: {
    is_running: boolean;
    is_paused: boolean;
    current_time: string;
    speed: number;
    tick_count: number;
    uptime_seconds: number;
    time_manager_status: any;
    traffic_multiplier: number;
    active_trucks: number;
    total_trucks: number;
    active_bins: number;
    total_bins: number;
    bins_needing_collection: number;
  };
}

export interface SimulationSnapshotResponse extends ApiResponse {
  snapshot: SimulationSnapshot;
}

// Trucks API responses
export interface TrucksListResponse extends ListResponse<Truck> {
  filters_applied: {
    status?: string;
    available_only?: boolean;
    limit?: number;
  };
}

export interface TruckResponse extends ApiResponse {
  truck: Truck;
}

export interface TruckStatisticsResponse extends ApiResponse {
  statistics: TruckStatistics;
}

export interface TruckRouteResponse extends ApiResponse {
  truck_id: string;
  route: TruckRoute | null;
}

// Bins API responses
export interface BinsListResponse extends ListResponse<Bin> {
  filters_applied: {
    status?: string;
    type?: string;
    needs_collection?: boolean;
    limit?: number;
  };
}

export interface BinResponse extends ApiResponse {
  bin: Bin & {
    current_threshold: number;
    threshold_analysis: ThresholdAnalysis;
  };
}

export interface BinStatisticsResponse extends ApiResponse {
  statistics: BinStatistics;
}

// Optimization API responses
export interface OptimizationResponse extends ApiResponse {
  optimization_result: OptimizationResult;
  trucks_optimized: number;
  bins_considered: number;
}

export interface RoutesResponse extends ApiResponse {
  routes: Record<string, any>;
  total_trucks: number;
  trucks_with_routes: number;
  active_routes: number;
}

export interface OptimizationStatisticsResponse extends ApiResponse {
  statistics: OptimizationStatistics;
}

export interface OptimizationAnalysisResponse extends ApiResponse {
  analysis: OptimizationAnalysis;
}

// Settings API responses
export interface SettingsResponse extends ApiResponse {
  settings: AllSettings;
}

export interface SettingsUpdateResponse extends ApiResponse {
  updated_settings: string[];
  current_config?: any;
}

export interface SettingsExportResponse extends ApiResponse {
  settings_export: SettingsExport;
}

export interface SettingsValidationResponse extends ApiResponse {
  is_valid: boolean;
  validation_results: SettingsValidationResult[];
}

export interface SettingsProfilesResponse extends ApiResponse {
  profiles: Record<string, SettingsProfile>;
}

// WebSocket message types
export interface SocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface SimulationTickMessage extends SocketMessage {
  type: 'simulation_tick';
  data: SimulationSnapshot;
}

export interface SimulationEventMessage extends SocketMessage {
  type: 'simulation_event';
  data: SimulationEvent;
}

export interface ServerMessage extends SocketMessage {
  type: 'server_message';
  data: {
    msg: string;
  };
}

// HTTP request options
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

// Error types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Query filters
export interface QueryFilters {
  [key: string]: string | number | boolean | undefined;
}