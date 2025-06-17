import apiService from './api';
import {
  SettingsResponse,
  SettingsUpdateResponse,
  SettingsExportResponse,
  SettingsValidationResponse,
  SettingsProfilesResponse,
  ApiResponse,
  AllSettings,
  TrafficEvent,
  TrafficPatterns,
  DynamicThresholdConfig,
  WasteType
} from '@/types';

class SettingsService {
  // Main settings operations
  async getAllSettings(): Promise<SettingsResponse> {
    return apiService.get('/api/settings');
  }

  async getSimulationSettings(): Promise<ApiResponse> {
    return apiService.get('/api/settings/simulation');
  }

  async updateSimulationSettings(settings: any): Promise<SettingsUpdateResponse> {
    return apiService.post('/api/settings/simulation', settings);
  }

  // Traffic settings
  async getTrafficSettings(): Promise<ApiResponse> {
    return apiService.get('/api/settings/traffic');
  }

  async updateTrafficSettings(settings: {
    mode?: 'auto' | 'manual';
    manual_multiplier?: number;
    patterns?: Partial<TrafficPatterns>;
  }): Promise<SettingsUpdateResponse> {
    return apiService.post('/api/settings/traffic', settings);
  }

  async addTrafficEvent(event: TrafficEvent): Promise<ApiResponse> {
    return apiService.post('/api/settings/traffic/events', event);
  }

  async clearTrafficEvents(): Promise<ApiResponse> {
    return apiService.delete('/api/settings/traffic/events');
  }

  // Threshold settings
  async getThresholdSettings(): Promise<ApiResponse> {
    return apiService.get('/api/settings/threshold');
  }

  async updateThresholdSettings(settings: {
    mode?: 'static' | 'dynamic';
    static_thresholds?: Record<string, number>;
    dynamic_config?: Partial<DynamicThresholdConfig>;
  }): Promise<SettingsUpdateResponse> {
    return apiService.post('/api/settings/threshold', settings);
  }

  // Optimization settings
  async getOptimizationSettings(): Promise<ApiResponse> {
    return apiService.get('/api/settings/optimization');
  }

  async updateOptimizationSettings(settings: any): Promise<SettingsUpdateResponse> {
    return apiService.post('/api/settings/optimization', settings);
  }

  // Scheduler settings
  async getSchedulerSettings(): Promise<ApiResponse> {
    return apiService.get('/api/settings/scheduler');
  }

  async updateSchedulerSettings(settings: {
    collections_per_day?: number;
    working_hours?: [number, number];
  }): Promise<SettingsUpdateResponse> {
    return apiService.post('/api/settings/scheduler', settings);
  }

  async setWorkingHours(startHour: number, endHour: number): Promise<ApiResponse> {
    return apiService.post('/api/settings/working_hours', {
      start_hour: startHour,
      end_hour: endHour
    });
  }

  async setCollectionsPerDay(collections: number): Promise<ApiResponse> {
    return apiService.post('/api/settings/collections_per_day', {
      collections_per_day: collections
    });
  }

  // Import/Export
  async exportSettings(): Promise<SettingsExportResponse> {
    return apiService.get('/api/settings/export');
  }

  async importSettings(settingsData: any): Promise<ApiResponse> {
    return apiService.post('/api/settings/import', {
      settings_export: settingsData
    });
  }

  // Validation
  async validateSettings(settings: any): Promise<SettingsValidationResponse> {
    return apiService.post('/api/settings/validate', settings);
  }

  // Profiles
  async getSettingsProfiles(): Promise<SettingsProfilesResponse> {
    return apiService.get('/api/settings/profiles');
  }

  async applyProfile(profileName: string): Promise<ApiResponse> {
    const profiles = await this.getSettingsProfiles();
    
    if (!profiles.success || !profiles.profiles[profileName]) {
      return {
        success: false,
        error: `Profile '${profileName}' not found`
      };
    }

    const profile = profiles.profiles[profileName];
    return this.importSettings(profile.settings);
  }

  // Reset
  async resetSettings(categories?: string[]): Promise<ApiResponse> {
    return apiService.post('/api/settings/reset', {
      categories: categories || ['simulation', 'traffic', 'threshold', 'optimization', 'scheduler']
    });
  }

  // Utility methods
  async setTrafficMode(mode: 'auto' | 'manual', multiplier?: number): Promise<SettingsUpdateResponse> {
    const settings: any = { mode };
    if (mode === 'manual' && multiplier !== undefined) {
      settings.manual_multiplier = multiplier;
    }
    return this.updateTrafficSettings(settings);
  }

  async setThresholdMode(mode: 'static' | 'dynamic'): Promise<SettingsUpdateResponse> {
    return this.updateThresholdSettings({ mode });
  }

  async updateStaticThreshold(wasteType: WasteType, threshold: number): Promise<SettingsUpdateResponse> {
    const current = await this.getThresholdSettings();
    const staticThresholds = current.data?.static_thresholds || {};
    
    staticThresholds[wasteType] = threshold;
    
    return this.updateThresholdSettings({
      static_thresholds: staticThresholds
    });
  }

  async updateDynamicThresholdConfig(config: Partial<DynamicThresholdConfig>): Promise<SettingsUpdateResponse> {
    return this.updateThresholdSettings({
      dynamic_config: config
    });
  }

  // Simulation control helpers
  async toggleAutoOptimization(): Promise<SettingsUpdateResponse> {
    const current = await this.getSimulationSettings();
    const autoOptimization = !current.data?.auto_optimization;
    
    return this.updateSimulationSettings({
      auto_optimization: autoOptimization
    });
  }

  async toggleAutoBinFilling(): Promise<SettingsUpdateResponse> {
    const current = await this.getSimulationSettings();
    const autoBinFilling = !current.data?.auto_bin_filling;
    
    return this.updateSimulationSettings({
      auto_bin_filling: autoBinFilling
    });
  }

  async setEmitFrequency(frequency: number): Promise<SettingsUpdateResponse> {
    return this.updateSimulationSettings({
      emit_frequency: Math.max(1, Math.min(10, frequency))
    });
  }

  async setTruckBreakdownProbability(probability: number): Promise<SettingsUpdateResponse> {
    return this.updateSimulationSettings({
      truck_breakdown_probability: Math.max(0, Math.min(1, probability))
    });
  }

  // Optimization control helpers
  async setVRPTimeLimit(seconds: number): Promise<SettingsUpdateResponse> {
    return this.updateOptimizationSettings({
      vrp_time_limit_seconds: Math.max(1, seconds)
    });
  }

  async setKnapsackTimeLimit(seconds: number): Promise<SettingsUpdateResponse> {
    return this.updateOptimizationSettings({
      knapsack_time_limit_seconds: Math.max(1, seconds)
    });
  }

  async setMaxRouteDistance(km: number): Promise<SettingsUpdateResponse> {
    return this.updateOptimizationSettings({
      max_route_distance_km: Math.max(1, km)
    });
  }

  async setMaxRouteDuration(minutes: number): Promise<SettingsUpdateResponse> {
    return this.updateOptimizationSettings({
      max_route_duration_minutes: Math.max(1, minutes)
    });
  }

  async setOptimizationAlgorithm(algorithm: 'greedy' | 'guided_local_search' | 'auto'): Promise<SettingsUpdateResponse> {
    return this.updateOptimizationSettings({
      optimization_algorithm: algorithm
    });
  }

  async setUrgencyThreshold(threshold: number): Promise<SettingsUpdateResponse> {
    return this.updateOptimizationSettings({
      urgency_threshold: Math.max(0, Math.min(100, threshold))
    });
  }

  async setRadarCheckInterval(minutes: number): Promise<SettingsUpdateResponse> {
    return this.updateOptimizationSettings({
      radar_check_interval_minutes: Math.max(1, minutes)
    });
  }

  // Traffic pattern helpers
  async updateTrafficPatterns(patterns: Partial<TrafficPatterns>): Promise<SettingsUpdateResponse> {
    return this.updateTrafficSettings({ patterns });
  }

  async addCustomTrafficEvent(event: {
    name: string;
    start_time: string;
    end_time: string;
    multiplier: number;
    description?: string;
  }): Promise<ApiResponse> {
    return this.addTrafficEvent({
      ...event,
      type: 'custom',
      id: `custom_${Date.now()}`
    });
  }

  // Batch operations
  async batchUpdateSettings(updates: {
    simulation?: any;
    traffic?: any;
    threshold?: any;
    optimization?: any;
    scheduler?: any;
  }): Promise<{
    results: Record<string, SettingsUpdateResponse>;
    success: boolean;
    errors: string[];
  }> {
    const results: Record<string, SettingsUpdateResponse> = {};
    const errors: string[] = [];

    try {
      if (updates.simulation) {
        results.simulation = await this.updateSimulationSettings(updates.simulation);
        if (!results.simulation.success) {
          errors.push(`Simulation: ${results.simulation.error}`);
        }
      }

      if (updates.traffic) {
        results.traffic = await this.updateTrafficSettings(updates.traffic);
        if (!results.traffic.success) {
          errors.push(`Traffic: ${results.traffic.error}`);
        }
      }

      if (updates.threshold) {
        results.threshold = await this.updateThresholdSettings(updates.threshold);
        if (!results.threshold.success) {
          errors.push(`Threshold: ${results.threshold.error}`);
        }
      }

      if (updates.optimization) {
        results.optimization = await this.updateOptimizationSettings(updates.optimization);
        if (!results.optimization.success) {
          errors.push(`Optimization: ${results.optimization.error}`);
        }
      }

      if (updates.scheduler) {
        results.scheduler = await this.updateSchedulerSettings(updates.scheduler);
        if (!results.scheduler.success) {
          errors.push(`Scheduler: ${results.scheduler.error}`);
        }
      }

      return {
        results,
        success: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(`Batch update failed: ${error}`);
      return {
        results,
        success: false,
        errors
      };
    }
  }

  // Settings comparison and diff
  async compareSettings(settingsA: AllSettings, settingsB: AllSettings): Promise<{
    differences: Record<string, any>;
    hasChanges: boolean;
  }> {
    const differences: Record<string, any> = {};
    let hasChanges = false;

    // Helper function to deeply compare objects
    const findDifferences = (objA: any, objB: any, path: string = '') => {
      if (typeof objA !== typeof objB) {
        differences[path] = { from: objA, to: objB };
        hasChanges = true;
        return;
      }

      if (typeof objA === 'object' && objA !== null) {
        const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);
        
        for (const key of allKeys) {
          const newPath = path ? `${path}.${key}` : key;
          
          if (!(key in objA)) {
            differences[newPath] = { from: undefined, to: objB[key] };
            hasChanges = true;
          } else if (!(key in objB)) {
            differences[newPath] = { from: objA[key], to: undefined };
            hasChanges = true;
          } else {
            findDifferences(objA[key], objB[key], newPath);
          }
        }
      } else if (objA !== objB) {
        differences[path] = { from: objA, to: objB };
        hasChanges = true;
      }
    };

    findDifferences(settingsA, settingsB);

    return { differences, hasChanges };
  }

  // Settings backup and restore
  async createBackup(name?: string): Promise<ApiResponse & { backup_id?: string }> {
    try {
      const export_result = await this.exportSettings();
      
      if (!export_result.success) {
        return export_result;
      }

      const backup_id = `backup_${Date.now()}`;
      const backup_name = name || `Settings Backup ${new Date().toLocaleString()}`;

      // Store backup in localStorage (in a real app, this would be sent to server)
      const backups = JSON.parse(localStorage.getItem('settings_backups') || '{}');
      backups[backup_id] = {
        name: backup_name,
        timestamp: new Date().toISOString(),
        data: export_result.export_data
      };
      localStorage.setItem('settings_backups', JSON.stringify(backups));

      return {
        success: true,
        message: 'Settings backup created successfully',
        backup_id
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create backup: ${error}`
      };
    }
  }

  async listBackups(): Promise<ApiResponse & { backups?: Array<{ id: string; name: string; timestamp: string }> }> {
    try {
      const backups = JSON.parse(localStorage.getItem('settings_backups') || '{}');
      
      const backup_list = Object.entries(backups).map(([id, backup]: [string, any]) => ({
        id,
        name: backup.name,
        timestamp: backup.timestamp
      }));

      return {
        success: true,
        backups: backup_list
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list backups: ${error}`
      };
    }
  }

  async restoreBackup(backup_id: string): Promise<ApiResponse> {
    try {
      const backups = JSON.parse(localStorage.getItem('settings_backups') || '{}');
      
      if (!backups[backup_id]) {
        return {
          success: false,
          error: 'Backup not found'
        };
      }

      return this.importSettings(backups[backup_id].data);
    } catch (error) {
      return {
        success: false,
        error: `Failed to restore backup: ${error}`
      };
    }
  }

  async deleteBackup(backup_id: string): Promise<ApiResponse> {
    try {
      const backups = JSON.parse(localStorage.getItem('settings_backups') || '{}');
      
      if (!backups[backup_id]) {
        return {
          success: false,
          error: 'Backup not found'
        };
      }

      delete backups[backup_id];
      localStorage.setItem('settings_backups', JSON.stringify(backups));

      return {
        success: true,
        message: 'Backup deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete backup: ${error}`
      };
    }
  }
}

// Create and export singleton instance
const settingsService = new SettingsService();
export default settingsService;