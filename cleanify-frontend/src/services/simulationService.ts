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
    reset_statistics?: boolean;
  }): Promise<ApiResponse> {
    return apiService.post('/api/simulation/reset', options || {});
  }

  async restart(): Promise<ApiResponse> {
    return apiService.post('/api/simulation/restart');
  }

  async hardReset(): Promise<ApiResponse> {
    return this.reset({
      reset_trucks: true,
      reset_bins: true,
      reset_optimization: true,
      reset_statistics: true
    });
  }

  // Advanced control methods
  async stepForward(steps: number = 1): Promise<ApiResponse> {
    return apiService.post('/api/simulation/step', { steps });
  }

  async stepBackward(steps: number = 1): Promise<ApiResponse> {
    return apiService.post('/api/simulation/step_back', { steps });
  }

  async setSpeedMultiplier(multiplier: number): Promise<ApiResponse> {
    return apiService.post('/api/simulation/speed_multiplier', { multiplier });
  }

  async enableDebugMode(enabled: boolean = true): Promise<ApiResponse> {
    return apiService.post('/api/simulation/debug', { enabled });
  }

  // Traffic management
  async getTrafficStatus(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/traffic');
  }

  async setTrafficMultiplier(multiplier: number): Promise<ApiResponse> {
    return apiService.post('/api/simulation/traffic', { multiplier });
  }

  async addTrafficEvent(event: {
    name: string;
    multiplier: number;
    start_time: string;
    duration_minutes: number;
    location?: { latitude: number; longitude: number; radius?: number };
  }): Promise<ApiResponse> {
    return apiService.post('/api/simulation/traffic/events', event);
  }

  async removeTrafficEvent(eventId: string): Promise<ApiResponse> {
    return apiService.delete(`/api/simulation/traffic/events/${eventId}`);
  }

  async clearTrafficEvents(): Promise<ApiResponse> {
    return apiService.delete('/api/simulation/traffic/events');
  }

  // Scenario management
  async loadScenario(scenarioName: string): Promise<ApiResponse> {
    return apiService.post('/api/simulation/scenarios/load', { scenario: scenarioName });
  }

  async saveScenario(scenarioName: string, description?: string): Promise<ApiResponse> {
    return apiService.post('/api/simulation/scenarios/save', {
      name: scenarioName,
      description
    });
  }

  async listScenarios(): Promise<ApiResponse<{ scenarios: Array<{ name: string; description: string; created_at: string }> }>> {
    return apiService.get('/api/simulation/scenarios');
  }

  async deleteScenario(scenarioName: string): Promise<ApiResponse> {
    return apiService.delete(`/api/simulation/scenarios/${scenarioName}`);
  }

  // Recording and playback
  async startRecording(recordingName?: string): Promise<ApiResponse> {
    return apiService.post('/api/simulation/recording/start', {
      name: recordingName || `recording_${Date.now()}`
    });
  }

  async stopRecording(): Promise<ApiResponse> {
    return apiService.post('/api/simulation/recording/stop');
  }

  async playRecording(recordingId: string, speed?: number): Promise<ApiResponse> {
    return apiService.post('/api/simulation/recording/play', {
      recording_id: recordingId,
      speed: speed || 1
    });
  }

  async listRecordings(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/recordings');
  }

  async deleteRecording(recordingId: string): Promise<ApiResponse> {
    return apiService.delete(`/api/simulation/recordings/${recordingId}`);
  }

  // Simulation state management
  async saveState(stateName: string): Promise<ApiResponse> {
    return apiService.post('/api/simulation/state/save', { name: stateName });
  }

  async loadState(stateName: string): Promise<ApiResponse> {
    return apiService.post('/api/simulation/state/load', { name: stateName });
  }

  async listSavedStates(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/state/list');
  }

  async deleteState(stateName: string): Promise<ApiResponse> {
    return apiService.delete(`/api/simulation/state/${stateName}`);
  }

  // Benchmarking and testing
  async runBenchmark(benchmarkConfig?: {
    duration_minutes?: number;
    truck_count?: number;
    bin_count?: number;
    optimization_enabled?: boolean;
  }): Promise<ApiResponse> {
    return apiService.post('/api/simulation/benchmark', benchmarkConfig || {});
  }

  async runStressTest(testConfig?: {
    max_trucks?: number;
    max_bins?: number;
    duration_minutes?: number;
    ramp_up_minutes?: number;
  }): Promise<ApiResponse> {
    return apiService.post('/api/simulation/stress_test', testConfig || {});
  }

  async validateConfiguration(): Promise<ApiResponse> {
    return apiService.post('/api/simulation/validate');
  }

  // Data export and analysis
  async exportSimulationData(format: 'csv' | 'json' | 'excel' = 'json'): Promise<ApiResponse> {
    return apiService.get(`/api/simulation/export?format=${format}`);
  }

  async exportTelemetry(timeRange?: {
    start: string;
    end: string;
  }): Promise<ApiResponse> {
    return apiService.post('/api/simulation/telemetry/export', timeRange);
  }

  async generateReport(reportType: 'summary' | 'detailed' | 'performance' = 'summary'): Promise<ApiResponse> {
    return apiService.post('/api/simulation/report', { type: reportType });
  }

  // Real-time monitoring
  async subscribeToUpdates(callback: (update: any) => void): Promise<() => void> {
    // This would typically use WebSocket
    const interval = setInterval(async () => {
      try {
        const status = await this.getStatus();
        if (status.success) {
          callback(status.status);
        }
      } catch (error) {
        console.error('Error fetching simulation updates:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }

  async getRealtimeMetrics(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/realtime/metrics');
  }

  async setMetricsInterval(intervalMs: number): Promise<ApiResponse> {
    return apiService.post('/api/simulation/realtime/interval', { interval: intervalMs });
  }

  // Error handling and diagnostics
  async getDiagnostics(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/diagnostics');
  }

  async getErrorLog(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/errors');
  }

  async clearErrors(): Promise<ApiResponse> {
    return apiService.delete('/api/simulation/errors');
  }

  async testConnectivity(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/ping');
  }

  // Utilities and helpers
  async isRunning(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.success && status.status?.is_running;
    } catch {
      return false;
    }
  }

  async isPaused(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.success && status.status?.is_paused;
    } catch {
      return false;
    }
  }

  async getCurrentTime(): Promise<string | null> {
    try {
      const timeInfo = await this.getTimeInfo();
      return timeInfo.success ? timeInfo.data?.current_time : null;
    } catch {
      return null;
    }
  }

  async getCurrentSpeed(): Promise<number> {
    try {
      const status = await this.getStatus();
      return status.success ? status.status?.speed || 1 : 1;
    } catch {
      return 1;
    }
  }

  async getUptime(): Promise<number> {
    try {
      const status = await this.getStatus();
      return status.success ? status.status?.uptime_seconds || 0 : 0;
    } catch {
      return 0;
    }
  }

  // Preset operations
  async applyPreset(presetName: 'demo' | 'stress' | 'minimal' | 'comprehensive'): Promise<ApiResponse> {
    return apiService.post('/api/simulation/presets/apply', { preset: presetName });
  }

  async listPresets(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/presets');
  }

  async createCustomPreset(preset: {
    name: string;
    description?: string;
    config: Partial<SimulationConfig>;
    truck_count?: number;
    bin_count?: number;
  }): Promise<ApiResponse> {
    return apiService.post('/api/simulation/presets/custom', preset);
  }

  // Automation and scheduling
  async scheduleStart(startTime: string): Promise<ApiResponse> {
    return apiService.post('/api/simulation/schedule/start', { start_time: startTime });
  }

  async scheduleStop(stopTime: string): Promise<ApiResponse> {
    return apiService.post('/api/simulation/schedule/stop', { stop_time: stopTime });
  }

  async setRecurringSchedule(schedule: {
    enabled: boolean;
    start_time: string;
    duration_minutes: number;
    days_of_week: number[];
    auto_reset?: boolean;
  }): Promise<ApiResponse> {
    return apiService.post('/api/simulation/schedule/recurring', schedule);
  }

  async getSchedule(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/schedule');
  }

  async clearSchedule(): Promise<ApiResponse> {
    return apiService.delete('/api/simulation/schedule');
  }

  // Integration and webhooks
  async registerWebhook(webhook: {
    url: string;
    events: string[];
    secret?: string;
    enabled: boolean;
  }): Promise<ApiResponse> {
    return apiService.post('/api/simulation/webhooks', webhook);
  }

  async testWebhook(webhookId: string): Promise<ApiResponse> {
    return apiService.post(`/api/simulation/webhooks/${webhookId}/test`);
  }

  async listWebhooks(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/webhooks');
  }

  async deleteWebhook(webhookId: string): Promise<ApiResponse> {
    return apiService.delete(`/api/simulation/webhooks/${webhookId}`);
  }

  // Custom event injection
  async injectEvent(event: {
    type: string;
    data: any;
    timestamp?: string;
  }): Promise<ApiResponse> {
    return apiService.post('/api/simulation/events/inject', event);
  }

  async injectTruckBreakdown(truckId: string, severity: 'minor' | 'major' = 'minor'): Promise<ApiResponse> {
    return this.injectEvent({
      type: 'truck_breakdown',
      data: { truck_id: truckId, severity }
    });
  }

  async injectBinOverflow(binId: string): Promise<ApiResponse> {
    return this.injectEvent({
      type: 'bin_overflow',
      data: { bin_id: binId }
    });
  }

  async injectTrafficJam(location: { latitude: number; longitude: number }, duration: number): Promise<ApiResponse> {
    return this.injectEvent({
      type: 'traffic_jam',
      data: { location, duration_minutes: duration }
    });
  }

  // Performance optimization
  async optimizePerformance(): Promise<ApiResponse> {
    return apiService.post('/api/simulation/optimize_performance');
  }

  async enableBatchMode(enabled: boolean = true): Promise<ApiResponse> {
    return apiService.post('/api/simulation/batch_mode', { enabled });
  }

  async setMaxConcurrency(maxThreads: number): Promise<ApiResponse> {
    return apiService.post('/api/simulation/concurrency', { max_threads: maxThreads });
  }

  async enableCaching(enabled: boolean = true): Promise<ApiResponse> {
    return apiService.post('/api/simulation/caching', { enabled });
  }

  // Development and debugging utilities
  async enableVerboseLogging(enabled: boolean = true): Promise<ApiResponse> {
    return apiService.post('/api/simulation/verbose_logging', { enabled });
  }

  async dumpState(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/dump_state');
  }

  async getMemoryUsage(): Promise<ApiResponse> {
    return apiService.get('/api/simulation/memory_usage');
  }

  async garbageCollect(): Promise<ApiResponse> {
    return apiService.post('/api/simulation/gc');
  }

  // Helper methods for common workflows
  async quickStart(preset: 'demo' | 'stress' | 'minimal' = 'demo'): Promise<ApiResponse> {
    try {
      await this.stop();
      await this.reset();
      await this.applyPreset(preset);
      return this.start();
    } catch (error) {
      return {
        success: false,
        error: `Quick start failed: ${error}`
      };
    }
  }

  async emergencyStop(): Promise<ApiResponse> {
    try {
      await this.stop();
      await this.clearEvents();
      return {
        success: true,
        message: 'Emergency stop completed'
      };
    } catch (error) {
      return {
        success: false,
        error: `Emergency stop failed: ${error}`
      };
    }
  }

  async safeRestart(): Promise<ApiResponse> {
    try {
      await this.pause();
      await this.saveState('auto_restart_backup');
      await this.stop();
      await this.restart();
      return {
        success: true,
        message: 'Safe restart completed'
      };
    } catch (error) {
      return {
        success: false,
        error: `Safe restart failed: ${error}`
      };
    }
  }

  async getDetailedStatus(): Promise<{
    basic: any;
    performance: any;
    health: any;
    recent_events: any[];
  }> {
    try {
      const [status, performance, health, events] = await Promise.all([
        this.getStatus(),
        this.getPerformanceMetrics(),
        this.getHealthStatus(),
        this.getEvents({ limit: 10 })
      ]);

      return {
        basic: status.success ? status.status : {},
        performance: performance.success ? performance.data : {},
        health: health.success ? health.data : {},
        recent_events: events.success ? events.data?.events || [] : []
      };
    } catch (error) {
      return {
        basic: {},
        performance: {},
        health: {},
        recent_events: []
      };
    }
  }
}

// Create and export singleton instance
const simulationService = new SimulationService();
export default simulationService;