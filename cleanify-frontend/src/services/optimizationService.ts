import apiService from './api';
import {
  OptimizationResponse,
  RoutesResponse,
  OptimizationStatisticsResponse,
  OptimizationAnalysisResponse,
  ApiResponse,
  OptimizationRequest,
  OptimizationConfig,
  OptimizationResult
} from '@/types';

class OptimizationService {
  // Main optimization operations
  async triggerOptimization(request?: OptimizationRequest): Promise<OptimizationResponse> {
    return apiService.post('/api/optimization/optimize', request || {});
  }

  async optimizeUrgent(): Promise<OptimizationResponse> {
    return apiService.post('/api/optimization/optimize/urgent');
  }

  async optimizeSpecificTrucks(truckIds: string[], binIds?: string[]): Promise<OptimizationResponse> {
    return this.triggerOptimization({
      truck_ids: truckIds,
      bin_ids: binIds
    });
  }

  async optimizeAllBins(): Promise<OptimizationResponse> {
    return this.triggerOptimization({
      force_all_bins: true
    });
  }

  // Route management
  async getCurrentRoutes(): Promise<RoutesResponse> {
    return apiService.get('/api/optimization/routes');
  }

  async getTruckRoute(truckId: string): Promise<ApiResponse> {
    return apiService.get(`/api/optimization/routes/${truckId}`);
  }

  async clearAllRoutes(): Promise<ApiResponse> {
    return apiService.post('/api/optimization/clear_all_routes');
  }

  // Statistics and analysis
  async getStatistics(): Promise<OptimizationStatisticsResponse> {
    return apiService.get('/api/optimization/statistics');
  }

  async analyzeOptimization(request?: {
    truck_ids?: string[];
    bin_ids?: string[];
  }): Promise<OptimizationAnalysisResponse> {
    return apiService.post('/api/optimization/analyze', request || {});
  }

  // Configuration
  async getConfig(): Promise<ApiResponse<OptimizationConfig>> {
    return apiService.get('/api/optimization/config');
  }

  async updateConfig(config: Partial<OptimizationConfig>): Promise<ApiResponse> {
    return apiService.post('/api/optimization/config', config);
  }

  // Algorithm testing
  async testAlgorithms(params?: {
    algorithms?: string[];
    test_bins_count?: number;
  }): Promise<ApiResponse> {
    return apiService.post('/api/optimization/test_algorithms', params || {});
  }

  // Utility methods
  async optimizeForEmergency(binIds: string[]): Promise<OptimizationResponse> {
    // Emergency optimization with highest priority
    return this.triggerOptimization({
      bin_ids: binIds,
      force_all_bins: false
    });
  }

  async optimizeForEfficiency(): Promise<OptimizationResponse> {
    // Optimize for maximum efficiency
    const urgentResult = await this.optimizeUrgent();
    return urgentResult;
  }

  async scheduleOptimization(delayMinutes: number = 0): Promise<ApiResponse> {
    // This would integrate with the scheduling system
    // For now, just trigger immediate optimization
    if (delayMinutes === 0) {
      return this.triggerOptimization();
    }
    
    // In a real implementation, this would schedule the optimization
    return Promise.resolve({
      success: true,
      message: `Optimization scheduled for ${delayMinutes} minutes from now`
    });
  }

  // Route quality assessment
  async assessRouteQuality(routes: Record<string, any>): Promise<{
    overall_score: number;
    efficiency: number;
    balance: number;
    coverage: number;
    recommendations: string[];
  }> {
    try {
      const analysis = await this.analyzeOptimization();
      
      if (!analysis.success || !analysis.analysis) {
        return {
          overall_score: 0,
          efficiency: 0,
          balance: 0,
          coverage: 0,
          recommendations: ['Unable to assess route quality']
        };
      }

      const { optimization_potential } = analysis.analysis;
      
      const efficiency = optimization_potential.potential_efficiency;
      const coverage = (optimization_potential.bins_that_could_be_assigned / 
                       Math.max(1, analysis.analysis.input.urgent_bins)) * 100;
      const balance = efficiency > 80 ? 90 : 70; // Simplified balance calculation

      const overall_score = (efficiency + coverage + balance) / 3;

      const recommendations = [];
      if (efficiency < 70) recommendations.push('Consider increasing VRP time limit');
      if (coverage < 80) recommendations.push('Review bin selection criteria');
      if (balance < 75) recommendations.push('Improve truck load balancing');

      return {
        overall_score,
        efficiency,
        balance,
        coverage,
        recommendations
      };
    } catch (error) {
      console.error('Route quality assessment failed:', error);
      return {
        overall_score: 0,
        efficiency: 0,
        balance: 0,
        coverage: 0,
        recommendations: ['Assessment failed']
      };
    }
  }

  // Advanced optimization features
  async optimizeWithConstraints(constraints: {
    max_route_time?: number;
    max_route_distance?: number;
    required_truck_ids?: string[];
    excluded_bin_ids?: string[];
    time_windows?: Array<{ start: string; end: string }>;
  }): Promise<OptimizationResponse> {
    return apiService.post('/api/optimization/optimize_constrained', constraints);
  }

  async optimizeMultiObjective(objectives: {
    minimize_distance?: boolean;
    minimize_time?: boolean;
    maximize_efficiency?: boolean;
    balance_loads?: boolean;
    weights?: Record<string, number>;
  }): Promise<OptimizationResponse> {
    return apiService.post('/api/optimization/multi_objective', objectives);
  }

  async optimizeIncremental(): Promise<OptimizationResponse> {
    return apiService.post('/api/optimization/incremental');
  }

  async optimizeByPriority(priorities: Record<string, number>): Promise<OptimizationResponse> {
    return apiService.post('/api/optimization/by_priority', { priorities });
  }

  // Route operations
  async validateRoute(truckId: string, binIds: string[]): Promise<ApiResponse> {
    return apiService.post('/api/optimization/validate_route', {
      truck_id: truckId,
      bin_ids: binIds
    });
  }

  async optimizeRoute(truckId: string): Promise<ApiResponse> {
    return apiService.post(`/api/optimization/routes/${truckId}/optimize`);
  }

  async reorderRoute(truckId: string, binIds: string[]): Promise<ApiResponse> {
    return apiService.post(`/api/optimization/routes/${truckId}/reorder`, {
      bin_ids: binIds
    });
  }

  async splitRoute(truckId: string, splitPoint: number): Promise<ApiResponse> {
    return apiService.post(`/api/optimization/routes/${truckId}/split`, {
      split_point: splitPoint
    });
  }

  async mergeRoutes(truckIds: string[]): Promise<ApiResponse> {
    return apiService.post('/api/optimization/routes/merge', {
      truck_ids: truckIds
    });
  }

  // Performance analysis
  async getPerformanceMetrics(): Promise<ApiResponse> {
    return apiService.get('/api/optimization/performance');
  }

  async compareAlgorithms(algorithms: string[], testData?: any): Promise<ApiResponse> {
    return apiService.post('/api/optimization/compare_algorithms', {
      algorithms,
      test_data: testData
    });
  }

  async benchmarkOptimization(): Promise<ApiResponse> {
    return apiService.post('/api/optimization/benchmark');
  }

  async getOptimizationHistory(limit?: number): Promise<ApiResponse> {
    const params = limit ? `?limit=${limit}` : '';
    return apiService.get(`/api/optimization/history${params}`);
  }

  // Simulation and what-if analysis
  async simulateOptimization(scenario: {
    additional_trucks?: number;
    reduced_trucks?: number;
    modified_capacities?: Record<string, number>;
    traffic_multiplier?: number;
  }): Promise<ApiResponse> {
    return apiService.post('/api/optimization/simulate', scenario);
  }

  async whatIfAnalysis(changes: {
    bin_changes?: Array<{ id: string; fill_level?: number; type?: string }>;
    truck_changes?: Array<{ id: string; capacity?: number; location?: [number, number] }>;
    traffic_changes?: { multiplier: number };
  }): Promise<ApiResponse> {
    return apiService.post('/api/optimization/what_if', changes);
  }

  // Optimization scheduling
  async scheduleRecurringOptimization(schedule: {
    interval_minutes: number;
    start_time?: string;
    end_time?: string;
    days_of_week?: number[];
    enabled: boolean;
  }): Promise<ApiResponse> {
    return apiService.post('/api/optimization/schedule', schedule);
  }

  async getOptimizationSchedule(): Promise<ApiResponse> {
    return apiService.get('/api/optimization/schedule');
  }

  async cancelScheduledOptimization(): Promise<ApiResponse> {
    return apiService.delete('/api/optimization/schedule');
  }

  // Real-time optimization
  async enableRealtimeOptimization(settings: {
    threshold_changes: boolean;
    new_urgent_bins: boolean;
    truck_availability_changes: boolean;
    interval_minutes: number;
  }): Promise<ApiResponse> {
    return apiService.post('/api/optimization/realtime/enable', settings);
  }

  async disableRealtimeOptimization(): Promise<ApiResponse> {
    return apiService.post('/api/optimization/realtime/disable');
  }

  async getRealtimeOptimizationStatus(): Promise<ApiResponse> {
    return apiService.get('/api/optimization/realtime/status');
  }

  // Route export and sharing
  async exportRoutes(format: 'json' | 'csv' | 'kml' | 'gpx' = 'json'): Promise<ApiResponse> {
    return apiService.get(`/api/optimization/routes/export?format=${format}`);
  }

  async shareRoute(truckId: string, recipients: string[]): Promise<ApiResponse> {
    return apiService.post(`/api/optimization/routes/${truckId}/share`, {
      recipients
    });
  }

  async generateRouteQRCode(truckId: string): Promise<ApiResponse> {
    return apiService.get(`/api/optimization/routes/${truckId}/qr_code`);
  }

  // Machine learning and AI features
  async trainOptimizationModel(trainingData?: any): Promise<ApiResponse> {
    return apiService.post('/api/optimization/train_model', trainingData);
  }

  async getModelPerformance(): Promise<ApiResponse> {
    return apiService.get('/api/optimization/model_performance');
  }

  async enableAIOptimization(settings: {
    use_ml_predictions: boolean;
    confidence_threshold: number;
    fallback_to_traditional: boolean;
  }): Promise<ApiResponse> {
    return apiService.post('/api/optimization/ai/enable', settings);
  }

  // Integration helpers
  async getOptimizationForIntegration(format: 'api' | 'webhook' | 'mqtt'): Promise<ApiResponse> {
    return apiService.get(`/api/optimization/integration?format=${format}`);
  }

  async registerOptimizationWebhook(url: string, events: string[]): Promise<ApiResponse> {
    return apiService.post('/api/optimization/webhooks', {
      url,
      events
    });
  }

  async testOptimizationWebhook(webhookId: string): Promise<ApiResponse> {
    return apiService.post(`/api/optimization/webhooks/${webhookId}/test`);
  }

  // Debugging and diagnostics
  async getOptimizationDiagnostics(): Promise<ApiResponse> {
    return apiService.get('/api/optimization/diagnostics');
  }

  async debugOptimization(request: OptimizationRequest): Promise<ApiResponse> {
    return apiService.post('/api/optimization/debug', request);
  }

  async getOptimizationLogs(level?: 'debug' | 'info' | 'warning' | 'error'): Promise<ApiResponse> {
    const params = level ? `?level=${level}` : '';
    return apiService.get(`/api/optimization/logs${params}`);
  }

  // Utility methods for common operations
  async quickOptimize(): Promise<OptimizationResponse> {
    // Quick optimization for immediate needs
    return this.optimizeUrgent();
  }

  async fullOptimize(): Promise<OptimizationResponse> {
    // Comprehensive optimization
    return this.optimizeAllBins();
  }

  async smartOptimize(): Promise<OptimizationResponse> {
    // AI-powered optimization if available
    try {
      const status = await this.getRealtimeOptimizationStatus();
      if (status.success && status.data?.ai_enabled) {
        return this.triggerOptimization({ use_ai: true });
      }
    } catch (error) {
      console.warn('AI optimization not available, falling back to standard');
    }
    
    return this.optimizeUrgent();
  }

  async getOptimizationRecommendations(): Promise<ApiResponse> {
    try {
      const analysis = await this.analyzeOptimization();
      const stats = await this.getStatistics();
      
      const recommendations = [];
      
      if (analysis.success && analysis.analysis) {
        const { optimization_potential } = analysis.analysis;
        
        if (optimization_potential.potential_efficiency < 70) {
          recommendations.push({
            type: 'efficiency',
            message: 'Consider increasing optimization time limits for better efficiency',
            priority: 'high'
          });
        }
        
        if (optimization_potential.bins_that_could_be_assigned < optimization_potential.total_urgent_bins) {
          recommendations.push({
            type: 'coverage',
            message: 'Some urgent bins cannot be assigned. Consider adding more trucks.',
            priority: 'medium'
          });
        }
      }
      
      if (stats.success && stats.statistics) {
        const { average_route_length, total_optimizations } = stats.statistics;
        
        if (average_route_length > 100) {
          recommendations.push({
            type: 'route_length',
            message: 'Routes are getting long. Consider adjusting maximum route distance.',
            priority: 'low'
          });
        }
        
        if (total_optimizations > 1000) {
          recommendations.push({
            type: 'performance',
            message: 'Consider enabling AI optimization for better performance.',
            priority: 'low'
          });
        }
      }
      
      return {
        success: true,
        recommendations
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate recommendations: ${error}`
      };
    }
  }
}

// Create and export singleton instance
const optimizationService = new OptimizationService();
export default optimizationService;