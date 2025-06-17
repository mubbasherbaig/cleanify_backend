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
      ...options
    });
  }

  async batchCollect(binIds: string[]): Promise<ApiResponse> {
    return this.batchOperation('collect', binIds);
  }

  async batchMaintenance(binIds: string[], maintenance: boolean = true): Promise<ApiResponse> {
    return this.batchOperation('maintenance', binIds, { maintenance });
  }

  async batchUpdateThreshold(binIds: string[], threshold: number): Promise<ApiResponse> {
    return this.batchOperation('update_threshold', binIds, { threshold });
  }

  // Utility methods
  async getBinsByStatus(status: BinStatus): Promise<Bin[]> {
    try {
      const response = await this.getBins({ status });
      return response.bins || [];
    } catch {
      return [];
    }
  }

  async getBinsByType(type: WasteType): Promise<Bin[]> {
    try {
      const response = await this.getBins({ type });
      return response.bins || [];
    } catch {
      return [];
    }
  }

  async getActiveBins(): Promise<Bin[]> {
    return this.getBinsByStatus(BinStatus.ACTIVE);
  }

  async getFullBins(): Promise<Bin[]> {
    return this.getBinsByStatus(BinStatus.FULL);
  }

  async getBinsInMaintenance(): Promise<Bin[]> {
    return this.getBinsByStatus(BinStatus.MAINTENANCE);
  }

  async getBinsNeedingCollection(): Promise<Bin[]> {
    try {
      const response = await this.getBins({ needs_collection: true });
      return response.bins || [];
    } catch {
      return [];
    }
  }

  async getUrgentBins(urgencyThreshold: number = 90): Promise<Bin[]> {
    try {
      const response = await this.getBins();
      return response.bins?.filter(bin => bin.fill_level >= urgencyThreshold) || [];
    } catch {
      return [];
    }
  }

  async getBinsByPriority(priority: number): Promise<Bin[]> {
    try {
      const response = await this.getBins();
      return response.bins?.filter(bin => bin.priority === priority) || [];
    } catch {
      return [];
    }
  }

  async getBinsInRange(
    center: [number, number],
    radiusKm: number
  ): Promise<Bin[]> {
    try {
      const response = await this.getBins();
      const bins = response.bins || [];
      
      return bins.filter(bin => {
        const distance = this.calculateDistance(center, bin.location);
        return distance <= radiusKm;
      });
    } catch {
      return [];
    }
  }

  // Collection planning helpers
  async getBinsForOptimization(options?: {
    includeUrgent?: boolean;
    includeScheduled?: boolean;
    maxFillLevel?: number;
    minFillLevel?: number;
  }): Promise<Bin[]> {
    try {
      const response = await this.getBins();
      let bins = response.bins || [];
      
      if (options?.includeUrgent) {
        bins = bins.filter(bin => bin.needs_collection);
      }
      
      if (options?.maxFillLevel !== undefined) {
        bins = bins.filter(bin => bin.fill_level <= options.maxFillLevel!);
      }
      
      if (options?.minFillLevel !== undefined) {
        bins = bins.filter(bin => bin.fill_level >= options.minFillLevel!);
      }
      
      return bins.filter(bin => bin.status === BinStatus.ACTIVE);
    } catch {
      return [];
    }
  }

  async estimateCollectionLoad(binIds: string[]): Promise<number> {
    try {
      const bins = await Promise.all(
        binIds.map(id => this.getBin(id).then(r => r.bin))
      );
      
      return bins.reduce((total, bin) => {
        const binLoad = (bin.fill_level / 100) * bin.capacity;
        return total + binLoad;
      }, 0);
    } catch {
      return 0;
    }
  }

  async calculateCollectionPriority(binId: string): Promise<number> {
    try {
      const response = await this.getBin(binId);
      const bin = response.bin;
      
      // Priority calculation: fill level + type weight + priority multiplier
      let priority = bin.fill_level;
      
      // Type weights
      const typeWeights = {
        [WasteType.HAZARDOUS]: 1.5,
        [WasteType.GENERAL]: 1.0,
        [WasteType.RECYCLABLE]: 0.8
      };
      
      priority *= typeWeights[bin.type] || 1.0;
      priority *= bin.priority * 0.5 + 0.5; // Priority 1-3 becomes 1.0-2.0 multiplier
      
      return Math.round(priority * 10) / 10;
    } catch {
      return 0;
    }
  }

  // Analytics and reporting
  async getBinAnalytics(binId: string): Promise<{
    fillTrend: number;
    collectionFrequency: number;
    efficiency: number;
    recommendations: string[];
  }> {
    try {
      const response = await this.getBin(binId);
      const bin = response.bin;
      
      // Simple analytics - in real app this would use historical data
      const fillTrend = bin.fill_rate; // kg/hour
      const collectionFrequency = 7; // days (placeholder)
      const efficiency = bin.fill_level > 80 ? 85 : 60; // percentage
      
      const recommendations: string[] = [];
      
      if (bin.fill_level > 90) {
        recommendations.push('Schedule immediate collection');
      }
      
      if (bin.fill_rate > 10) {
        recommendations.push('Consider increasing collection frequency');
      }
      
      if (bin.priority === 1 && bin.fill_level > 70) {
        recommendations.push('Consider upgrading bin priority');
      }
      
      return {
        fillTrend,
        collectionFrequency,
        efficiency,
        recommendations
      };
    } catch {
      return {
        fillTrend: 0,
        collectionFrequency: 0,
        efficiency: 0,
        recommendations: []
      };
    }
  }

  async getDistributionAnalysis(): Promise<{
    byType: Record<WasteType, number>;
    byStatus: Record<BinStatus, number>;
    byPriority: Record<number, number>;
    byFillLevel: { low: number; medium: number; high: number; full: number };
  }> {
    try {
      const response = await this.getBins();
      const bins = response.bins || [];
      
      const byType: Record<WasteType, number> = {
        [WasteType.GENERAL]: 0,
        [WasteType.RECYCLABLE]: 0,
        [WasteType.HAZARDOUS]: 0
      };
      
      const byStatus: Record<BinStatus, number> = {
        [BinStatus.ACTIVE]: 0,
        [BinStatus.FULL]: 0,
        [BinStatus.MAINTENANCE]: 0,
        [BinStatus.COLLECTED]: 0
      };
      
      const byPriority: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
      const byFillLevel = { low: 0, medium: 0, high: 0, full: 0 };
      
      bins.forEach(bin => {
        byType[bin.type]++;
        byStatus[bin.status]++;
        byPriority[bin.priority]++;
        
        if (bin.fill_level >= 100) {
          byFillLevel.full++;
        } else if (bin.fill_level >= 80) {
          byFillLevel.high++;
        } else if (bin.fill_level >= 50) {
          byFillLevel.medium++;
        } else {
          byFillLevel.low++;
        }
      });
      
      return { byType, byStatus, byPriority, byFillLevel };
    } catch {
      return {
        byType: { [WasteType.GENERAL]: 0, [WasteType.RECYCLABLE]: 0, [WasteType.HAZARDOUS]: 0 },
        byStatus: { [BinStatus.ACTIVE]: 0, [BinStatus.FULL]: 0, [BinStatus.MAINTENANCE]: 0, [BinStatus.COLLECTED]: 0 },
        byPriority: { 1: 0, 2: 0, 3: 0 },
        byFillLevel: { low: 0, medium: 0, high: 0, full: 0 }
      };
    }
  }

  // Utility calculations
  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  // Validation helpers
  validateBinData(data: Partial<BinFormData>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.id && data.id.trim().length === 0) {
      errors.push('Bin ID is required');
    }

    if (data.type && !Object.values(WasteType).includes(data.type)) {
      errors.push('Invalid waste type');
    }

    if (data.location && data.location.length !== 2) {
      errors.push('Location must be [longitude, latitude]');
    }

    if (data.static_threshold !== undefined && (data.static_threshold < 0 || data.static_threshold > 100)) {
      errors.push('Threshold must be between 0 and 100');
    }

    if (data.fill_level !== undefined && (data.fill_level < 0 || data.fill_level > 100)) {
      errors.push('Fill level must be between 0 and 100');
    }

    if (data.capacity !== undefined && data.capacity <= 0) {
      errors.push('Capacity must be greater than 0');
    }

    if (data.fill_rate !== undefined && data.fill_rate < 0) {
      errors.push('Fill rate cannot be negative');
    }

    if (data.priority !== undefined && ![1, 2, 3].includes(data.priority)) {
      errors.push('Priority must be 1, 2, or 3');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Search and filtering
  async searchBins(query: string): Promise<Bin[]> {
    try {
      const response = await this.getBins();
      const bins = response.bins || [];
      
      const lowerQuery = query.toLowerCase();
      
      return bins.filter(bin => 
        bin.id.toLowerCase().includes(lowerQuery) ||
        bin.type.toLowerCase().includes(lowerQuery) ||
        bin.status.toLowerCase().includes(lowerQuery)
      );
    } catch {
      return [];
    }
  }

  async filterBins(filters: BinFilters): Promise<Bin[]> {
    try {
      const response = await this.getBins();
      let bins = response.bins || [];
      
      if (filters.status) {
        bins = bins.filter(bin => bin.status === filters.status);
      }
      
      if (filters.type) {
        bins = bins.filter(bin => bin.type === filters.type);
      }
      
      if (filters.priority) {
        bins = bins.filter(bin => bin.priority === filters.priority);
      }
      
      if (filters.needs_collection) {
        bins = bins.filter(bin => bin.needs_collection);
      }
      
      if (filters.fill_level_min !== undefined) {
        bins = bins.filter(bin => bin.fill_level >= filters.fill_level_min!);
      }
      
      if (filters.fill_level_max !== undefined) {
        bins = bins.filter(bin => bin.fill_level <= filters.fill_level_max!);
      }
      
      return bins;
    } catch {
      return [];
    }
  }
}

// Create and export singleton instance
const binsService = new BinsService();
export default binsService;