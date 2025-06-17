import apiService from './api';
import {
  SimulationStatusResponse,
  SimulationSnapshotResponse,
  ApiResponse,
  PerformanceMetrics,
  HealthStatus,
  SimulationEvent,
  SimulationConfig
} from '@/types';

class SimulationService {
  // Control methods
  async start(): Promise<ApiResponse> {
    return apiService.post('/api/simulation/start');
  }

  async pause(): Promise<ApiResponse> {
    return apiService.post('/api/simulation/pause');
  }

  async stop(): Promise<ApiResponse> {
    return apiService.post('/api/simulation/stop');
  }

  async setSpeed(speed: number): Promise<ApiResponse> {
    return apiService.post('/api/simulation/speed', { speed });
  }

  // Status and information
  async getStatus(): Promise<SimulationStatusResponse> {
    return apiService.get('/api/simulation/status');
  }

  async getSnapshot(): Promise<SimulationSnapshotResponse> {
    return apiService.get('/api/simulation/snapshot');
  }

  async getStatistics(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/statistics');
  }

  async getPerformanceMetrics(): Promise<ApiResponse<PerformanceMetrics>> {
    return apiService.get('/api/simulation/performance');
  }

  async getHealthStatus(): Promise<ApiResponse<HealthStatus>> {
    return apiService.get('/api/simulation/health');
  }

  // Time management
  async getTimeInfo(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/time');
  }

  async setTime(time: string): Promise<ApiResponse> {
    return apiService.post('/api/simulation/time', { time });
  }

  async fastForward(duration: {
    hours?: number;
    minutes?: number;
    seconds?: number;
  }): Promise<ApiResponse> {
    return apiService.post('/api/simulation/fast_forward', duration);
  }

  // Configuration
  async getConfig(): Promise<ApiResponse<SimulationConfig>> {
    return apiService.get('/api/simulation/config');
  }

  async updateConfig(config: Partial<SimulationConfig>): Promise<ApiResponse> {
    return apiService.post('/api/simulation/config', config);
  }

  // Events
  async getEvents(params?: {
    limit?: number;
    type?: string;
  }): Promise<ApiResponse<{
    events: SimulationEvent[];
    total_events: number;
    filtered_events: number;
    filters: any;
  }>> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.type) {
      queryParams.append('type', params.type);
    }

    const endpoint = `/api/simulation/events${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiService.get(endpoint);
  }

  async clearEvents(): Promise<ApiResponse> {
    return apiService.delete('/api/simulation/events');
  }

  // Reset and control
  async reset(options?: {
    start_time?: string;
    reset_trucks?: boolean;
    reset_bins?: boolean;
    reset_optimization?: boolean;
  }): Promise<ApiResponse> {
    return apiService.post('/api/simulation/reset', options || {});
  }

  // Utility methods for common operations
  async togglePause(): Promise<ApiResponse> {
    const status = await this.getStatus();
    
    if (status.status.is_paused) {
      return this.start();
    } else {
      return this.pause();
    }
  }

  async adjustSpeed(delta: number): Promise<ApiResponse> {
    const status = await this.getStatus();
    const newSpeed = Math.max(1, Math.min(10, status.status.speed + delta));
    return this.setSpeed(newSpeed);
  }

  async skipTime(minutes: number): Promise<ApiResponse> {
    return this.fastForward({ minutes });
  }

  // Monitoring helpers
  async isRunning(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.status.is_running && !status.status.is_paused;
    } catch {
      return false;
    }
  }

  async getUptime(): Promise<number> {
    try {
      const status = await this.getStatus();
      return status.status.uptime_seconds;
    } catch {
      return 0;
    }
  }

  async getCurrentTime(): Promise<string | null> {
    try {
      const status = await this.getStatus();
      return status.status.current_time;
    } catch {
      return null;
    }
  }

  async getSystemHealth(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    try {
      const health = await this.getHealthStatus();
      
      const issues: string[] = [];
      
      if (!health.data?.healthy) {
        if (!health.data?.health_status?.simulation_running) {
          issues.push('Simulation not running');
        }
        
        Object.entries(health.data?.health_status?.services || {}).forEach(([service, status]) => {
          if (!status) {
            issues.push(`${service} service unavailable`);
          }
        });
      }

      return {
        healthy: health.data?.healthy || false,
        issues
      };
    } catch (error) {
      return {
        healthy: false,
        issues: ['Failed to check system health']
      };
    }
  }

  // Batch operations
  async batchControl(operations: Array<{
    action: 'start' | 'pause' | 'stop' | 'setSpeed';
    params?: any;
  }>): Promise<ApiResponse[]> {
    const results: ApiResponse[] = [];
    
    for (const operation of operations) {
      try {
        let result: ApiResponse;
        
        switch (operation.action) {
          case 'start':
            result = await this.start();
            break;
          case 'pause':
            result = await this.pause();
            break;
          case 'stop':
            result = await this.stop();
            break;
          case 'setSpeed':
            result = await this.setSpeed(operation.params?.speed || 1);
            break;
          default:
            result = { success: false, error: `Unknown action: ${operation.action}` };
        }
        
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  // Event filtering helpers
  async getEventsByType(type: string, limit: number = 50): Promise<SimulationEvent[]> {
    try {
      const response = await this.getEvents({ type, limit });
      return response.data?.events || [];
    } catch {
      return [];
    }
  }

  async getRecentEvents(limit: number = 20): Promise<SimulationEvent[]> {
    try {
      const response = await this.getEvents({ limit });
      return response.data?.events || [];
    } catch {
      return [];
    }
  }

  // Configuration presets
  async applyPreset(preset: 'default' | 'efficient' | 'conservative' | 'testing'): Promise<ApiResponse> {
    const presets = {
      default: {
        auto_optimization: true,
        auto_bin_filling: true,
        truck_breakdown_probability: 0.001,
        bin_overflow_enabled: true,
        depot_processing_enabled: true,
        emit_frequency: 1,
        max_trucks_per_optimization: 10
      },
      efficient: {
        auto_optimization: true,
        auto_bin_filling: true,
        truck_breakdown_probability: 0.0005,
        bin_overflow_enabled: true,
        depot_processing_enabled: true,
        emit_frequency: 2,
        max_trucks_per_optimization: 15
      },
      conservative: {
        auto_optimization: true,
        auto_bin_filling: true,
        truck_breakdown_probability: 0.002,
        bin_overflow_enabled: true,
        depot_processing_enabled: true,
        emit_frequency: 1,
        max_trucks_per_optimization: 8
      },
      testing: {
        auto_optimization: false,
        auto_bin_filling: true,
        truck_breakdown_probability: 0.01,
        bin_overflow_enabled: false,
        depot_processing_enabled: true,
        emit_frequency: 1,
        max_trucks_per_optimization: 5
      }
    };

    return this.updateConfig(presets[preset]);
  }
}

// Create and export singleton instance
const simulationService = new SimulationService();
export default simulationService;