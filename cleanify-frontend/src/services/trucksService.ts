import apiService from './api';
import {
  TrucksListResponse,
  TruckResponse,
  TruckStatisticsResponse,
  TruckRouteResponse,
  ApiResponse,
  Truck,
  TruckFormData,
  TruckStatus
} from '@/types';

class TrucksService {
  // CRUD operations
  async getTrucks(filters?: {
    status?: TruckStatus;
    available_only?: boolean;
    limit?: number;
  }): Promise<TrucksListResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters?.status) {
      queryParams.append('status', filters.status);
    }
    if (filters?.available_only) {
      queryParams.append('available', 'true');
    }
    if (filters?.limit) {
      queryParams.append('limit', filters.limit.toString());
    }

    const endpoint = `/api/trucks${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiService.get(endpoint);
  }

  async getTruck(truckId: string): Promise<TruckResponse> {
    return apiService.get(`/api/trucks/${truckId}`);
  }

  async createTruck(truckData: TruckFormData): Promise<ApiResponse> {
    return apiService.post('/api/trucks', truckData);
  }

  async updateTruck(truckId: string, truckData: Partial<TruckFormData>): Promise<TruckResponse> {
    return apiService.put(`/api/trucks/${truckId}`, truckData);
  }

  async deleteTruck(truckId: string): Promise<ApiResponse> {
    return apiService.delete(`/api/trucks/${truckId}`);
  }

  // Route management
  async assignRoute(truckId: string, binIds: string[]): Promise<TruckResponse> {
    return apiService.post(`/api/trucks/${truckId}/route`, { bin_ids: binIds });
  }

  async clearRoute(truckId: string): Promise<TruckResponse> {
    return apiService.delete(`/api/trucks/${truckId}/route`);
  }

  async getTruckRoute(truckId: string): Promise<TruckRouteResponse> {
    return apiService.get(`/api/optimization/routes/${truckId}`);
  }

  // Maintenance operations
  async startMaintenance(truckId: string): Promise<TruckResponse> {
    return apiService.post(`/api/trucks/${truckId}/maintenance`, { action: 'start' });
  }

  async completeMaintenance(truckId: string): Promise<TruckResponse> {
    return apiService.post(`/api/trucks/${truckId}/maintenance`, { action: 'complete' });
  }

  // Operational commands
  async refuelTruck(truckId: string): Promise<TruckResponse> {
    return apiService.post(`/api/trucks/${truckId}/refuel`);
  }

  async emptyTruck(truckId: string): Promise<TruckResponse> {
    return apiService.post(`/api/trucks/${truckId}/empty`);
  }

  async setTruckStatus(truckId: string, status: 'online' | 'offline'): Promise<TruckResponse> {
    return apiService.post(`/api/trucks/${truckId}/status`, { status });
  }

  async simulateBreakdown(truckId: string): Promise<TruckResponse> {
    return apiService.post(`/api/trucks/${truckId}/simulate_breakdown`);
  }

  // Statistics and analytics
  async getStatistics(): Promise<TruckStatisticsResponse> {
    return apiService.get('/api/trucks/statistics');
  }

  // Batch operations
  async batchOperation(operation: string, truckIds: string[], options?: any): Promise<ApiResponse> {
    return apiService.post('/api/trucks/batch', {
      operation,
      truck_ids: truckIds,
      options
    });
  }

  async batchMaintenance(truckIds: string[], maintenance: boolean): Promise<ApiResponse> {
    return this.batchOperation('maintenance', truckIds, { maintenance });
  }

  async batchRefuel(truckIds: string[]): Promise<ApiResponse> {
    return this.batchOperation('refuel', truckIds);
  }

  async batchEmpty(truckIds: string[]): Promise<ApiResponse> {
    return this.batchOperation('empty', truckIds);
  }

  async batchSetStatus(truckIds: string[], status: 'online' | 'offline'): Promise<ApiResponse> {
    return this.batchOperation('set_status', truckIds, { status });
  }

  async batchDelete(truckIds: string[]): Promise<ApiResponse> {
    return this.batchOperation('delete', truckIds);
  }

  // Filtering and search
  async searchTrucks(query: string): Promise<TrucksListResponse> {
    return apiService.get(`/api/trucks/search?q=${encodeURIComponent(query)}`);
  }

  async getTrucksByStatus(status: TruckStatus): Promise<TrucksListResponse> {
    return this.getTrucks({ status });
  }

  async getAvailableTrucks(): Promise<TrucksListResponse> {
    return this.getTrucks({ available_only: true });
  }

  async getTrucksWithRoutes(): Promise<TrucksListResponse> {
    return apiService.get('/api/trucks/with_routes');
  }

  async getTrucksNeedingMaintenance(): Promise<TrucksListResponse> {
    return apiService.get('/api/trucks/needs_maintenance');
  }

  async getTrucksByLocation(latitude: number, longitude: number, radiusKm: number): Promise<TrucksListResponse> {
    return apiService.get(`/api/trucks/nearby?lat=${latitude}&lon=${longitude}&radius=${radiusKm}`);
  }

  // Location and tracking
  async updateTruckLocation(truckId: string, latitude: number, longitude: number): Promise<TruckResponse> {
    return apiService.patch(`/api/trucks/${truckId}/location`, {
      location: [longitude, latitude]
    });
  }

  async getTruckHistory(truckId: string, timeRange?: 'hour' | 'day' | 'week'): Promise<ApiResponse> {
    const params = timeRange ? `?time_range=${timeRange}` : '';
    return apiService.get(`/api/trucks/${truckId}/history${params}`);
  }

  async getTruckRoute(truckId: string): Promise<ApiResponse> {
    return apiService.get(`/api/trucks/${truckId}/route`);
  }

  // Performance and analytics
  async getTruckAnalytics(truckId: string, timeRange?: 'hour' | 'day' | 'week' | 'month'): Promise<ApiResponse> {
    const params = timeRange ? `?time_range=${timeRange}` : '';
    return apiService.get(`/api/trucks/${truckId}/analytics${params}`);
  }

  async getTruckEfficiency(truckId: string): Promise<ApiResponse> {
    return apiService.get(`/api/trucks/${truckId}/efficiency`);
  }

  async compareTruckPerformance(truckIds: string[]): Promise<ApiResponse> {
    return apiService.post('/api/trucks/compare_performance', { truck_ids: truckIds });
  }

  async getTruckUtilization(): Promise<ApiResponse> {
    return apiService.get('/api/trucks/utilization');
  }

  async calculateFleetEfficiency(): Promise<ApiResponse> {
    return apiService.get('/api/trucks/fleet_efficiency');
  }

  // Capacity and load management
  async updateTruckLoad(truckId: string, load: number): Promise<TruckResponse> {
    return apiService.patch(`/api/trucks/${truckId}/load`, { load });
  }

  async updateTruckCapacity(truckId: string, capacity: number): Promise<TruckResponse> {
    return apiService.patch(`/api/trucks/${truckId}/capacity`, { capacity });
  }

  async setTruckFuelLevel(truckId: string, fuelLevel: number): Promise<TruckResponse> {
    return apiService.patch(`/api/trucks/${truckId}/fuel`, { fuel_level: fuelLevel });
  }

  // Route optimization for individual trucks
  async optimizeTruckRoute(truckId: string): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/${truckId}/optimize_route`);
  }

  async assignBinsToTruck(truckId: string, binIds: string[]): Promise<TruckResponse> {
    return apiService.post(`/api/trucks/${truckId}/assign_bins`, { bin_ids: binIds });
  }

  async removeBinFromRoute(truckId: string, binId: string): Promise<TruckResponse> {
    return apiService.delete(`/api/trucks/${truckId}/route/bins/${binId}`);
  }

  // Maintenance scheduling
  async scheduleMaintenance(truckId: string, scheduledTime: string): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/${truckId}/schedule_maintenance`, {
      scheduled_time: scheduledTime
    });
  }

  async getMaintenanceSchedule(truckId?: string): Promise<ApiResponse> {
    const endpoint = truckId ? `/api/trucks/${truckId}/maintenance_schedule` : '/api/trucks/maintenance_schedule';
    return apiService.get(endpoint);
  }

  async cancelScheduledMaintenance(truckId: string): Promise<ApiResponse> {
    return apiService.delete(`/api/trucks/${truckId}/maintenance_schedule`);
  }

  // Fuel management
  async getFuelConsumption(truckId: string, timeRange?: string): Promise<ApiResponse> {
    const params = timeRange ? `?time_range=${timeRange}` : '';
    return apiService.get(`/api/trucks/${truckId}/fuel_consumption${params}`);
  }

  async predictFuelNeeds(truckId: string, routeDistance: number): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/${truckId}/predict_fuel`, {
      route_distance: routeDistance
    });
  }

  async getFuelStations(latitude: number, longitude: number, radius: number): Promise<ApiResponse> {
    return apiService.get(`/api/trucks/fuel_stations?lat=${latitude}&lon=${longitude}&radius=${radius}`);
  }

  // Real-time tracking
  async subscribeTo(truckId: string, callback: (truck: Truck) => void): Promise<() => void> {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll simulate with polling
    const interval = setInterval(async () => {
      try {
        const response = await this.getTruck(truckId);
        if (response.success && response.truck) {
          callback(response.truck);
        }
      } catch (error) {
        console.error('Error fetching truck updates:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }

  // Import/Export
  async exportTrucks(format: 'csv' | 'json' | 'excel' = 'csv'): Promise<ApiResponse> {
    return apiService.get(`/api/trucks/export?format=${format}`);
  }

  async importTrucks(file: File, format: 'csv' | 'json' | 'excel'): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    return apiService.post('/api/trucks/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // Simulation and testing
  async simulateTruckOperation(truckId: string, scenario: 'normal' | 'breakdown' | 'efficiency'): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/${truckId}/simulate`, { scenario });
  }

  async testTruckCapacity(truckId: string, testLoad: number): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/${truckId}/test_capacity`, { test_load: testLoad });
  }

  // Alerts and notifications
  async getTruckAlerts(truckId?: string): Promise<ApiResponse> {
    const endpoint = truckId ? `/api/trucks/${truckId}/alerts` : '/api/trucks/alerts';
    return apiService.get(endpoint);
  }

  async acknowledgeAlert(alertId: string): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/alerts/${alertId}/acknowledge`);
  }

  async dismissAlert(alertId: string): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/alerts/${alertId}/dismiss`);
  }

  // Fleet reporting
  async generateFleetReport(options?: {
    time_range?: string;
    include_analytics?: boolean;
    format?: 'pdf' | 'excel' | 'csv';
  }): Promise<ApiResponse> {
    return apiService.post('/api/trucks/report', options);
  }

  async getFleetSummary(): Promise<ApiResponse> {
    return apiService.get('/api/trucks/fleet_summary');
  }

  async getFleetKPIs(): Promise<ApiResponse> {
    return apiService.get('/api/trucks/kpis');
  }

  // Predictive analytics
  async predictMaintenanceNeeds(truckId: string): Promise<ApiResponse> {
    return apiService.get(`/api/trucks/${truckId}/predict_maintenance`);
  }

  async predictOptimalRoutes(truckId: string): Promise<ApiResponse> {
    return apiService.get(`/api/trucks/${truckId}/predict_routes`);
  }

  async getEfficiencyTrends(timeRange: 'week' | 'month' | 'quarter'): Promise<ApiResponse> {
    return apiService.get(`/api/trucks/efficiency_trends?time_range=${timeRange}`);
  }

  // Integration helpers
  async syncWithGPS(truckId: string, gpsData: any): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/${truckId}/sync_gps`, gpsData);
  }

  async updateFromExternalSystem(truckId: string, externalData: any): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/${truckId}/external_update`, externalData);
  }

  // Utility methods
  async findNearestTruck(latitude: number, longitude: number, filters?: {
    status?: TruckStatus;
    available_only?: boolean;
  }): Promise<TruckResponse> {
    const queryParams = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString()
    });

    if (filters?.status) {
      queryParams.append('status', filters.status);
    }
    if (filters?.available_only) {
      queryParams.append('available_only', 'true');
    }

    return apiService.get(`/api/trucks/nearest?${queryParams}`);
  }

  async getFleetOverview(): Promise<{
    total: number;
    available: number;
    busy: number;
    maintenance: number;
    offline: number;
    avgLoad: number;
    avgFuel: number;
  }> {
    try {
      const response = await this.getTrucks();
      const trucks = response.data || [];

      const available = trucks.filter(t => t.status === TruckStatus.IDLE).length;
      const busy = trucks.filter(t => 
        t.status === TruckStatus.EN_ROUTE || 
        t.status === TruckStatus.COLLECTING || 
        t.status === TruckStatus.RETURNING
      ).length;
      const maintenance = trucks.filter(t => t.status === TruckStatus.MAINTENANCE).length;
      const offline = trucks.filter(t => t.status === TruckStatus.OFFLINE).length;
      const avgLoad = trucks.reduce((sum, t) => sum + t.load_percentage, 0) / trucks.length;
      const avgFuel = trucks.reduce((sum, t) => sum + t.fuel_level, 0) / trucks.length;

      return {
        total: trucks.length,
        available,
        busy,
        maintenance,
        offline,
        avgLoad: Math.round(avgLoad * 10) / 10,
        avgFuel: Math.round(avgFuel * 10) / 10
      };
    } catch {
      return {
        total: 0,
        available: 0,
        busy: 0,
        maintenance: 0,
        offline: 0,
        avgLoad: 0,
        avgFuel: 0
      };
    }
  }

  // Validation helpers
  validateTruckData(data: Partial<TruckFormData>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.id && data.id.trim().length === 0) {
      errors.push('Truck ID is required');
    }

    if (data.capacity !== undefined && data.capacity <= 0) {
      errors.push('Capacity must be greater than 0');
    }

    if (data.speed !== undefined && data.speed <= 0) {
      errors.push('Speed must be greater than 0');
    }

    if (data.fuel_level !== undefined && (data.fuel_level < 0 || data.fuel_level > 100)) {
      errors.push('Fuel level must be between 0 and 100');
    }

    if (data.fuel_consumption !== undefined && data.fuel_consumption < 0) {
      errors.push('Fuel consumption cannot be negative');
    }

    if (data.location && (!Array.isArray(data.location) || data.location.length !== 2)) {
      errors.push('Location must be [longitude, latitude]');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Route validation
  async validateRoute(truckId: string, binIds: string[]): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/${truckId}/validate_route`, {
      bin_ids: binIds
    });
  }

  // Emergency operations
  async emergencyStop(truckId: string, reason: string): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/${truckId}/emergency_stop`, { reason });
  }

  async emergencyReturn(truckId: string): Promise<ApiResponse> {
    return apiService.post(`/api/trucks/${truckId}/emergency_return`);
  }

  async broadcastEmergency(message: string, truckIds?: string[]): Promise<ApiResponse> {
    return apiService.post('/api/trucks/emergency_broadcast', {
      message,
      truck_ids: truckIds
    });
  }

  // Advanced analytics
  async getPerformanceBenchmarks(): Promise<ApiResponse> {
    return apiService.get('/api/trucks/benchmarks');
  }

  async analyzeRouteEfficiency(truckId: string): Promise<ApiResponse> {
    return apiService.get(`/api/trucks/${truckId}/route_efficiency`);
  }

  async getIdleTimeAnalysis(): Promise<ApiResponse> {
    return apiService.get('/api/trucks/idle_analysis');
  }

  async getFuelEfficiencyRanking(): Promise<ApiResponse> {
    return apiService.get('/api/trucks/fuel_efficiency_ranking');
  }

  // Machine learning features
  async trainRoutePredictionModel(): Promise<ApiResponse> {
    return apiService.post('/api/trucks/train_route_model');
  }

  async getPredictiveMaintenanceScore(truckId: string): Promise<ApiResponse> {
    return apiService.get(`/api/trucks/${truckId}/maintenance_score`);
  }

  async getOptimalLoadPrediction(truckId: string): Promise<ApiResponse> {
    return apiService.get(`/api/trucks/${truckId}/optimal_load`);
  }
}

// Create and export singleton instance
const trucksService = new TrucksService();
export default trucksService;