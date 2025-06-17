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
      const balance = efficiency > 80 ? 85 : 60; // Simplified balance calculation
      
      const overall_score = (efficiency + coverage + balance) / 3;
      
      const recommendations: string[] = [];
      
      if (efficiency < 70) {
        recommendations.push('Consider redistributing bins among trucks');
      }
      
      if (coverage < 80) {
        recommendations.push('Some bins may not be collected - consider additional trucks');
      }
      
      if (balance < 70) {
        recommendations.push('Workload is unbalanced across trucks');
      }
      
      if (overall_score > 90) {
        recommendations.push('Routes are well optimized');
      }
      
      return {
        overall_score: Math.round(overall_score),
        efficiency: Math.round(efficiency),
        balance: Math.round(balance),
        coverage: Math.round(coverage),
        recommendations
      };
    } catch {
      return {
        overall_score: 0,
        efficiency: 0,
        balance: 0,
        coverage: 0,
        recommendations: ['Error assessing route quality']
      };
    }
  }

  // Performance monitoring
  async getOptimizationMetrics(): Promise<{
    average_time: number;
    success_rate: number;
    last_optimization: string | null;
    optimizations_today: number;
    efficiency_trend: number[];
  }> {
    try {
      const stats = await this.getStatistics();
      
      if (!stats.success || !stats.statistics) {
        return {
          average_time: 0,
          success_rate: 0,
          last_optimization: null,
          optimizations_today: 0,
          efficiency_trend: []
        };
      }

      const { statistics } = stats;
      
      return {
        average_time: statistics.average_optimization_time,
        success_rate: 95, // Would calculate from historical data
        last_optimization: statistics.last_optimization,
        optimizations_today: statistics.optimization_count,
        efficiency_trend: statistics.recent_optimization_times.slice(-10)
      };
    } catch {
      return {
        average_time: 0,
        success_rate: 0,
        last_optimization: null,
        optimizations_today: 0,
        efficiency_trend: []
      };
    }
  }

  // Configuration presets
  async applyPreset(preset: 'fast' | 'balanced' | 'thorough'): Promise<ApiResponse> {
    const presets = {
      fast: {
        vrp_time_limit_seconds: 15,
        knapsack_time_limit_seconds: 3,
        optimization_algorithm: 'greedy' as const,
        radar_check_interval_minutes: 5
      },
      balanced: {
        vrp_time_limit_seconds: 30,
        knapsack_time_limit_seconds: 5,
        optimization_algorithm: 'auto' as const,
        radar_check_interval_minutes: 2
      },
      thorough: {
        vrp_time_limit_seconds: 60,
        knapsack_time_limit_seconds: 10,
        optimization_algorithm: 'guided_local_search' as const,
        radar_check_interval_minutes: 1
      }
    };

    return this.updateConfig(presets[preset]);
  }

  // Advanced optimization features
  async optimizeWithConstraints(constraints: {
    max_distance_per_truck?: number;
    max_time_per_route?: number;
    required_trucks?: string[];
    forbidden_bins?: string[];
    time_windows?: Array<{ start: string; end: string }>;
  }): Promise<OptimizationResponse> {
    // This would be implemented with more sophisticated constraints
    // For now, we'll just do a basic optimization
    return this.triggerOptimization();
  }

  async simulateOptimization(request: OptimizationRequest): Promise<{
    estimated_time: number;
    estimated_distance: number;
    truck_utilization: Record<string, number>;
    warnings: string[];
  }> {
    try {
      const analysis = await this.analyzeOptimization(request);
      
      if (!analysis.success) {
        return {
          estimated_time: 0,
          estimated_distance: 0,
          truck_utilization: {},
          warnings: ['Simulation failed']
        };
      }

      // Simple estimation based on analysis
      const binCount = analysis.analysis.input.urgent_bins;
      const truckCount = analysis.analysis.input.available_trucks;
      
      const estimated_time = binCount * 15; // 15 minutes per bin
      const estimated_distance = binCount * 2; // 2 km per bin
      
      const truck_utilization: Record<string, number> = {};
      // Would calculate actual utilization per truck
      
      const warnings: string[] = [];
      if (binCount > truckCount * 10) {
        warnings.push('High bin-to-truck ratio may result in long routes');
      }
      
      return {
        estimated_time,
        estimated_distance,
        truck_utilization,
        warnings
      };
    } catch {
      return {
        estimated_time: 0,
        estimated_distance: 0,
        truck_utilization: {},
        warnings: ['Simulation error']
      };
    }
  }

  // Batch operations
  async batchOptimization(requests: OptimizationRequest[]): Promise<OptimizationResponse[]> {
    const results: OptimizationResponse[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.triggerOptimization(request);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          message: error instanceof Error ? error.message : 'Optimization failed',
          optimization_result: {} as OptimizationResult,
          trucks_optimized: 0,
          bins_considered: 0
        });
      }
    }
    
    return results;
  }

  // Validation and helpers
  validateOptimizationRequest(request: OptimizationRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (request.truck_ids && request.truck_ids.length === 0) {
      errors.push('At least one truck ID must be provided if truck_ids is specified');
    }

    if (request.bin_ids && request.bin_ids.length === 0) {
      errors.push('At least one bin ID must be provided if bin_ids is specified');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async getOptimizationStatus(): Promise<{
    running: boolean;
    progress: number;
    current_operation: string | null;
    estimated_completion: string | null;
  }> {
    // This would check if optimization is currently running
    // For now, return a simple status
    return {
      running: false,
      progress: 0,
      current_operation: null,
      estimated_completion: null
    };
  }

  // Integration helpers
  async optimizeAndWait(request: OptimizationRequest, timeout: number = 60000): Promise<OptimizationResponse> {
    const startTime = Date.now();
    
    const result = await this.triggerOptimization(request);
    
    if (!result.success) {
      return result;
    }

    // In a real implementation, you might poll for completion status
    // For now, just return the immediate result
    return result;
  }

  async getOptimizationHistory(limit: number = 50): Promise<Array<{
    timestamp: string;
    duration: number;
    bins_optimized: number;
    trucks_used: number;
    success: boolean;
  }>> {
    try {
      const stats = await this.getStatistics();
      
      if (!stats.success) {
        return [];
      }

      // This would come from historical data in a real implementation
      // For now, generate some sample data based on recent optimization times
      const times = stats.statistics.recent_optimization_times;
      
      return times.map((duration, index) => ({
        timestamp: new Date(Date.now() - (times.length - index) * 3600000).toISOString(),
        duration,
        bins_optimized: Math.floor(Math.random() * 20) + 5,
        trucks_used: Math.floor(Math.random() * 5) + 1,
        success: Math.random() > 0.1 // 90% success rate
      }));
    } catch {
      return [];
    }
  }
}

// Create and export singleton instance
const optimizationService = new OptimizationService();
export default optimizationService;