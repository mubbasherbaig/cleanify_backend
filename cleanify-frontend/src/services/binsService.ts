import apiService from './api';
import {
  BinsListResponse,
  BinResponse,
  BinStatisticsResponse,
  ApiResponse,
  Bin,
  BinFormData,
  BinStatus,
  WasteType,
  BinFilters
} from '@/types';

class BinsService {
  // CRUD operations
  async getBins(filters?: BinFilters & { limit?: number }): Promise<BinsListResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters?.status) {
      queryParams.append('status', filters.status);
    }
    if (filters?.type) {
      queryParams.append('type', filters.type);
    }
    if (filters?.needs_collection) {
      queryParams.append('needs_collection', 'true');
    }
    if (filters?.limit) {
      queryParams.append('limit', filters.limit.toString());
    }

    const endpoint = `/api/bins${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiService.get(endpoint);
  }

  async getBin(binId: string): Promise<BinResponse> {
    return apiService.get(`/api/bins/${binId}`);
  }

  async createBin(binData: BinFormData): Promise<ApiResponse> {
    return apiService.post('/api/bins', binData);
  }

  async updateBin(binId: string, binData: Partial<BinFormData>): Promise<BinResponse> {
    return apiService.put(`/api/bins/${binId}`, binData);
  }

  async deleteBin(binId: string): Promise<ApiResponse> {
    return apiService.delete(`/api/bins/${binId}`);
  }

  // Collection operations
  async collectBin(binId: string): Promise<ApiResponse> {
    return apiService.post(`/api/bins/${binId}/collect`);
  }

  async collectUrgentBins(): Promise<ApiResponse> {
    return apiService.post('/api/bins/collect/urgent');
  }

  async collectAllBins(): Promise<ApiResponse> {
    return apiService.post('/api/bins/collect/all');
  }

  // Maintenance operations
  async setBinMaintenance(binId: string, maintenance: boolean = true): Promise<BinResponse> {
    return apiService.post(`/api/bins/${binId}/maintenance`, { maintenance });
  }

  // Statistics and analytics
  async getStatistics(): Promise<BinStatisticsResponse> {
    return apiService.get('/api/bins/statistics');
  }

  // Batch operations
  async batchOperation(operation: string, binIds: string[], options?: any): Promise<ApiResponse> {
    return apiService.post('/api/bins/batch', {
      operation,
      bin_ids: binIds,
      options
    });
  }

  async batchCollect(binIds: string[]): Promise<ApiResponse> {
    return this.batchOperation('collect', binIds);
  }

  async batchMaintenance(binIds: string[], maintenance: boolean): Promise<ApiResponse> {
    return this.batchOperation('maintenance', binIds, { maintenance });
  }

  async batchUpdateCapacity(binIds: string[], capacity: number): Promise<ApiResponse> {
    return this.batchOperation('update_capacity', binIds, { capacity });
  }

  async batchUpdateThreshold(binIds: string[], threshold: number): Promise<ApiResponse> {
    return this.batchOperation('update_threshold', binIds, { threshold });
  }

  async batchDelete(binIds: string[]): Promise<ApiResponse> {
    return this.batchOperation('delete', binIds);
  }

  // Filtering and search
  async searchBins(query: string): Promise<BinsListResponse> {
    return apiService.get(`/api/bins/search?q=${encodeURIComponent(query)}`);
  }

  async getBinsByStatus(status: BinStatus): Promise<BinsListResponse> {
    return this.getBins({ status });
  }

  async getBinsByType(type: WasteType): Promise<BinsListResponse> {
    return this.getBins({ type });
  }

  async getBinsNeedingCollection(): Promise<BinsListResponse> {
    return this.getBins({ needs_collection: true });
  }

  async getBinsByLocation(latitude: number, longitude: number, radiusKm: number): Promise<BinsListResponse> {
    return apiService.get(`/api/bins/nearby?lat=${latitude}&lon=${longitude}&radius=${radiusKm}`);
  }

  async getBinsInBounds(northEast: [number, number], southWest: [number, number]): Promise<BinsListResponse> {
    const [neLat, neLng] = northEast;
    const [swLat, swLng] = southWest;
    return apiService.get(`/api/bins/bounds?ne_lat=${neLat}&ne_lng=${neLng}&sw_lat=${swLat}&sw_lng=${swLng}`);
  }

  // Capacity and fill level management
  async updateFillLevel(binId: string, fillLevel: number): Promise<BinResponse> {
    return apiService.patch(`/api/bins/${binId}/fill_level`, { fill_level: fillLevel });
  }

  async emptyBin(binId: string): Promise<BinResponse> {
    return this.updateFillLevel(binId, 0);
  }

  async simulateFilling(binId: string, hours: number): Promise<BinResponse> {
    return apiService.post(`/api/bins/${binId}/simulate_filling`, { hours });
  }

  async setCapacity(binId: string, capacity: number): Promise<BinResponse> {
    return apiService.patch(`/api/bins/${binId}/capacity`, { capacity });
  }

  async setThreshold(binId: string, threshold: number): Promise<BinResponse> {
    return apiService.patch(`/api/bins/${binId}/threshold`, { threshold });
  }

  async setFillRate(binId: string, fillRate: number): Promise<BinResponse> {
    return apiService.patch(`/api/bins/${binId}/fill_rate`, { fill_rate: fillRate });
  }

  // Status management
  async setBinStatus(binId: string, status: BinStatus): Promise<BinResponse> {
    return apiService.patch(`/api/bins/${binId}/status`, { status });
  }

  async activateBin(binId: string): Promise<BinResponse> {
    return this.setBinStatus(binId, BinStatus.ACTIVE);
  }

  async deactivateBin(binId: string): Promise<BinResponse> {
    return this.setBinStatus(binId, BinStatus.MAINTENANCE);
  }

  // Analytics and reporting
  async getBinAnalytics(binId: string, timeRange?: 'hour' | 'day' | 'week' | 'month'): Promise<ApiResponse> {
    const params = timeRange ? `?time_range=${timeRange}` : '';
    return apiService.get(`/api/bins/${binId}/analytics${params}`);
  }

  async getBinHistory(binId: string, limit?: number): Promise<ApiResponse> {
    const params = limit ? `?limit=${limit}` : '';
    return apiService.get(`/api/bins/${binId}/history${params}`);
  }

  async getBinCollectionHistory(binId: string): Promise<ApiResponse> {
    return apiService.get(`/api/bins/${binId}/collections`);
  }

  async generateBinReport(binIds?: string[], timeRange?: string): Promise<ApiResponse> {
    return apiService.post('/api/bins/report', {
      bin_ids: binIds,
      time_range: timeRange
    });
  }

  // Optimization helpers
  async getOptimizationCandidates(): Promise<BinsListResponse> {
    return apiService.get('/api/bins/optimization_candidates');
  }

  async getBinsForRoute(): Promise<BinsListResponse> {
    return apiService.get('/api/bins/route_candidates');
  }

  async getUrgentBins(): Promise<BinsListResponse> {
    return apiService.get('/api/bins/urgent');
  }

  async getBinsPrioritized(): Promise<BinsListResponse> {
    return apiService.get('/api/bins/prioritized');
  }

  // Location and mapping
  async updateBinLocation(binId: string, latitude: number, longitude: number): Promise<BinResponse> {
    return apiService.patch(`/api/bins/${binId}/location`, {
      location: [longitude, latitude]
    });
  }

  async getBinClusters(zoomLevel: number): Promise<ApiResponse> {
    return apiService.get(`/api/bins/clusters?zoom=${zoomLevel}`);
  }

  async getBinHeatmapData(): Promise<ApiResponse> {
    return apiService.get('/api/bins/heatmap');
  }

  // Alerts and notifications
  async getBinAlerts(binId?: string): Promise<ApiResponse> {
    const endpoint = binId ? `/api/bins/${binId}/alerts` : '/api/bins/alerts';
    return apiService.get(endpoint);
  }

  async acknowledgeAlert(alertId: string): Promise<ApiResponse> {
    return apiService.post(`/api/bins/alerts/${alertId}/acknowledge`);
  }

  async dismissAlert(alertId: string): Promise<ApiResponse> {
    return apiService.post(`/api/bins/alerts/${alertId}/dismiss`);
  }

  // Import/Export
  async exportBins(format: 'csv' | 'json' | 'excel' = 'csv'): Promise<ApiResponse> {
    return apiService.get(`/api/bins/export?format=${format}`);
  }

  async importBins(file: File, format: 'csv' | 'json' | 'excel'): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    return apiService.post('/api/bins/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // Validation and testing
  async validateBinData(binData: BinFormData): Promise<ApiResponse> {
    return apiService.post('/api/bins/validate', binData);
  }

  async testBinFilling(binId: string, scenario: 'normal' | 'high' | 'low'): Promise<ApiResponse> {
    return apiService.post(`/api/bins/${binId}/test_filling`, { scenario });
  }

  async simulateOverflow(binId: string): Promise<ApiResponse> {
    return apiService.post(`/api/bins/${binId}/simulate_overflow`);
  }

  // Utility methods
  async getNearestBin(latitude: number, longitude: number, type?: WasteType): Promise<BinResponse> {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString()
    });

    if (type) {
      params.append('type', type);
    }

    return apiService.get(`/api/bins/nearest?${params}`);
  }

  async getBinCapacityUtilization(): Promise<ApiResponse> {
    return apiService.get('/api/bins/capacity_utilization');
  }

  async getBinFillRateAnalysis(): Promise<ApiResponse> {
    return apiService.get('/api/bins/fill_rate_analysis');
  }

  async getCollectionEfficiency(): Promise<ApiResponse> {
    return apiService.get('/api/bins/collection_efficiency');
  }

  async getThresholdRecommendations(binId: string): Promise<ApiResponse> {
    return apiService.get(`/api/bins/${binId}/threshold_recommendations`);
  }

  // Real-time helpers
  async subscribeToBinUpdates(binId: string, callback: (bin: Bin) => void): Promise<() => void> {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll simulate with polling
    const interval = setInterval(async () => {
      try {
        const response = await this.getBin(binId);
        if (response.success && response.bin) {
          callback(response.bin);
        }
      } catch (error) {
        console.error('Error fetching bin updates:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }

  // Bulk operations for performance
  async bulkCreateBins(bins: BinFormData[]): Promise<ApiResponse> {
    return apiService.post('/api/bins/bulk_create', { bins });
  }

  async bulkUpdateBins(updates: Array<{ id: string; data: Partial<BinFormData> }>): Promise<ApiResponse> {
    return apiService.post('/api/bins/bulk_update', { updates });
  }

  // Geographic analysis
  async getCollectionDensity(): Promise<ApiResponse> {
    return apiService.get('/api/bins/collection_density');
  }

  async getOptimalBinPlacements(count: number): Promise<ApiResponse> {
    return apiService.post('/api/bins/optimal_placements', { count });
  }

  async analyzeCoverage(): Promise<ApiResponse> {
    return apiService.get('/api/bins/coverage_analysis');
  }

  // Performance metrics
  async getBinPerformanceMetrics(binId: string): Promise<ApiResponse> {
    return apiService.get(`/api/bins/${binId}/performance`);
  }

  async comparePerformance(binIds: string[]): Promise<ApiResponse> {
    return apiService.post('/api/bins/compare_performance', { bin_ids: binIds });
  }

  async getBenchmarkData(): Promise<ApiResponse> {
    return apiService.get('/api/bins/benchmarks');
  }

  // Predictive analytics
  async predictFillLevel(binId: string, hours: number): Promise<ApiResponse> {
    return apiService.post(`/api/bins/${binId}/predict_fill`, { hours });
  }

  async predictOverflow(binId: string): Promise<ApiResponse> {
    return apiService.get(`/api/bins/${binId}/predict_overflow`);
  }

  async getMaintenancePredictions(): Promise<ApiResponse> {
    return apiService.get('/api/bins/maintenance_predictions');
  }
}

// Create and export singleton instance
const binsService = new BinsService();
export default binsService;