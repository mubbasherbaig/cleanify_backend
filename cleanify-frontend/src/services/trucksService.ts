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
      ...options
    });
  }

  async batchRefuel(truckIds: string[]): Promise<ApiResponse> {
    return this.batchOperation('refuel', truckIds);
  }

  async batchMaintenanceStart(truckIds: string[]): Promise<ApiResponse> {
    return this.batchOperation('maintenance_start', truckIds);
  }

  async batchMaintenanceComplete(truckIds: string[]): Promise<ApiResponse> {
    return this.batchOperation('maintenance_complete', truckIds);
  }

  async batchClearRoutes(truckIds: string[]): Promise<ApiResponse> {
    return this.batchOperation('clear_routes', truckIds);
  }

  async batchSetOffline(truckIds: string[], offline: boolean = true): Promise<ApiResponse> {
    return this.batchOperation('set_offline', truckIds, { offline });
  }

  // Utility methods
  async getAvailableTrucks(): Promise<Truck[]> {
    try {
      const response = await this.getTrucks({ available_only: true });
      return response.trucks || [];
    } catch {
      return [];
    }
  }

  async getTrucksByStatus(status: TruckStatus): Promise<Truck[]> {
    try {
      const response = await this.getTrucks({ status });
      return response.trucks || [];
    } catch {
      return [];
    }
  }

  async getIdleTrucks(): Promise<Truck[]> {
    return this.getTrucksByStatus(TruckStatus.IDLE);
  }

  async getTrucksInMaintenance(): Promise<Truck[]> {
    return this.getTrucksByStatus(TruckStatus.MAINTENANCE);
  }

  async getTrucksWithRoutes(): Promise<Truck[]> {
    try {
      const response = await this.getTrucks();
      return response.trucks?.filter(truck => truck.route.length > 0) || [];
    } catch {
      return [];
    }
  }

  async getTrucksNeedingMaintenance(): Promise<Truck[]> {
    try {
      const response = await this.getTrucks();
      return response.trucks?.filter(truck => truck.needs_maintenance) || [];
    } catch {
      return [];
    }
  }

  async getTrucksLowFuel(threshold: number = 20): Promise<Truck[]> {
    try {
      const response = await this.getTrucks();
      return response.trucks?.filter(truck => truck.fuel_level < threshold) || [];
    } catch {
      return [];
    }
  }

  // Performance calculations
  async calculateFleetEfficiency(): Promise<{
    utilization: number;
    availability: number;
    maintenance_ratio: number;
    fuel_efficiency: number;
  }> {
    try {
      const response = await this.getTrucks();
      const trucks = response.trucks || [];
      
      if (trucks.length === 0) {
        return { utilization: 0, availability: 0, maintenance_ratio: 0, fuel_efficiency: 0 };
      }

      const available = trucks.filter(t => t.is_available).length;
      const withRoutes = trucks.filter(t => t.route.length > 0).length;
      const inMaintenance = trucks.filter(t => t.status === TruckStatus.MAINTENANCE).length;
      const avgFuel = trucks.reduce((sum, t) => sum + t.fuel_level, 0) / trucks.length;

      return {
        utilization: (withRoutes / Math.max(available, 1)) * 100,
        availability: (available / trucks.length) * 100,
        maintenance_ratio: (inMaintenance / trucks.length) * 100,
        fuel_efficiency: avgFuel
      };
    } catch {
      return { utilization: 0, availability: 0, maintenance_ratio: 0, fuel_efficiency: 0 };
    }
  }

  // Route optimization helpers
  async optimizeTruckRoute(truckId: string, binIds: string[]): Promise<string[]> {
    try {
      // This would typically call an optimization endpoint
      // For now, just return the original order
      return binIds;
    } catch {
      return binIds;
    }
  }

  async estimateRouteTime(truckId: string, binIds: string[]): Promise<number> {
    try {
      const truck = await this.getTruck(truckId);
      // Simple estimation: 10 minutes per bin + travel time
      return binIds.length * 10;
    } catch {
      return 0;
    }
  }

  async estimateRouteDistance(truckId: string, binIds: string[]): Promise<number> {
    try {
      // Simple estimation: 2km per bin
      return binIds.length * 2;
    } catch {
      return 0;
    }
  }

  // Fleet management helpers
  async getFleetSummary(): Promise<{
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
      const trucks = response.trucks || [];
      
      if (trucks.length === 0) {
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

      const available = trucks.filter(t => t.is_available).length;
      const busy = trucks.filter(t => t.status === TruckStatus.EN_ROUTE || t.status === TruckStatus.COLLECTING).length;
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

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Create and export singleton instance
const trucksService = new TrucksService();
export default trucksService;