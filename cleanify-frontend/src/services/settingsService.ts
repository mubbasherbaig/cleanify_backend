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
  async setTrafficMode(mode: 'auto' | 'manual', multiplier?: number): Promise<ApiResponse> {
    const settings: any = { mode };
    
    if (mode === 'manual' && multiplier !== undefined) {
      settings.manual_multiplier = multiplier;
    }
    
    return this.updateTrafficSettings(settings);
  }

  async setThresholdMode(mode: 'static' | 'dynamic'): Promise<ApiResponse> {
    return this.updateThresholdSettings({ mode });
  }

  async updateStaticThresholds(thresholds: Record<WasteType, number>): Promise<ApiResponse> {
    const thresholdMap: Record<string, number> = {};
    
    Object.entries(thresholds).forEach(([type, value]) => {
      thresholdMap[type] = value;
    });
    
    return this.updateThresholdSettings({
      static_thresholds: thresholdMap
    });
  }

  async updateDynamicThresholdConfig(config: Partial<DynamicThresholdConfig>): Promise<ApiResponse> {
    return this.updateThresholdSettings({
      dynamic_config: config
    });
  }

  // Presets and quick actions
  async applyQuickPreset(preset: 'efficient' | 'conservative' | 'balanced'): Promise<ApiResponse> {
    const presets = {
      efficient: {
        simulation: {
          auto_optimization: true,
          auto_bin_filling: true,
          truck_breakdown_probability: 0.0005,
          emit_frequency: 2
        },
        traffic: {
          mode: 'auto'
        },
        threshold: {
          mode: 'dynamic',
          static_thresholds: {
            general: 85,
            recyclable: 90,
            hazardous: 65
          }
        },
        scheduler: {
          collections_per_day: 3,
          working_hours: [6, 20]
        }
      },
      conservative: {
        simulation: {
          auto_optimization: true,
          auto_bin_filling: true,
          truck_breakdown_probability: 0.002,
          emit_frequency: 1
        },
        traffic: {
          mode: 'manual',
          manual_multiplier: 1.2
        },
        threshold: {
          mode: 'static',
          static_thresholds: {
            general: 70,
            recyclable: 75,
            hazardous: 60
          }
        },
        scheduler: {
          collections_per_day: 4,
          working_hours: [7, 19]
        }
      },
      balanced: {
        simulation: {
          auto_optimization: true,
          auto_bin_filling: true,
          truck_breakdown_probability: 0.001,
          emit_frequency: 1
        },
        traffic: {
          mode: 'auto'
        },
        threshold: {
          mode: 'static',
          static_thresholds: {
            general: 80,
            recyclable: 85,
            hazardous: 70
          }
        },
        scheduler: {
          collections_per_day: 2,
          working_hours: [8, 18]
        }
      }
    };

    const presetData = presets[preset];
    
    // Apply each setting category
    const results = await Promise.allSettled([
      this.updateSimulationSettings(presetData.simulation),
      this.updateTrafficSettings(presetData.traffic),
      this.updateThresholdSettings(presetData.threshold),
      this.updateSchedulerSettings(presetData.scheduler)
    ]);

    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length > 0) {
      return {
        success: false,
        error: `Failed to apply some preset settings: ${failures.length} failures`
      };
    }

    return {
      success: true,
      message: `Applied ${preset} preset successfully`
    };
  }

  // Configuration helpers
  async enableAutoOptimization(): Promise<ApiResponse> {
    return this.updateSimulationSettings({
      config: { auto_optimization: true }
    });
  }

  async disableAutoOptimization(): Promise<ApiResponse> {
    return this.updateSimulationSettings({
      config: { auto_optimization: false }
    });
  }

  async setEmitFrequency(frequency: number): Promise<ApiResponse> {
    return this.updateSimulationSettings({
      config: { emit_frequency: frequency }
    });
  }

  async setTruckBreakdownProbability(probability: number): Promise<ApiResponse> {
    return this.updateSimulationSettings({
      config: { truck_breakdown_probability: probability }
    });
  }

  // Traffic management helpers
  async createTrafficEvent(
    startTime: Date,
    endTime: Date,
    multiplierDelta: number,
    description: string
  ): Promise<ApiResponse> {
    return this.addTrafficEvent({
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      multiplier_delta: multiplierDelta,
      description
    });
  }

  async createRushHourEvent(
    date: Date,
    type: 'morning' | 'evening'
  ): Promise<ApiResponse> {
    const isEvening = type === 'evening';
    const startHour = isEvening ? 17 : 7;
    const endHour = isEvening ? 19 : 9;
    
    const startTime = new Date(date);
    startTime.setHours(startHour, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(endHour, 0, 0, 0);
    
    return this.createTrafficEvent(
      startTime,
      endTime,
      isEvening ? 0.8 : 0.6, // Evening rush is typically heavier
      `${type.charAt(0).toUpperCase() + type.slice(1)} rush hour`
    );
  }

  // Bulk operations
  async updateMultipleSettings(updates: {
    simulation?: any;
    traffic?: any;
    threshold?: any;
    optimization?: any;
    scheduler?: any;
  }): Promise<{ success: boolean; results: any[] }> {
    const operations = [];
    
    if (updates.simulation) {
      operations.push(['simulation', this.updateSimulationSettings(updates.simulation)]);
    }
    
    if (updates.traffic) {
      operations.push(['traffic', this.updateTrafficSettings(updates.traffic)]);
    }
    
    if (updates.threshold) {
      operations.push(['threshold', this.updateThresholdSettings(updates.threshold)]);
    }
    
    if (updates.optimization) {
      operations.push(['optimization', this.updateOptimizationSettings(updates.optimization)]);
    }
    
    if (updates.scheduler) {
      operations.push(['scheduler', this.updateSchedulerSettings(updates.scheduler)]);
    }

    const results = await Promise.allSettled(
      operations.map(([_, promise]) => promise)
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    return {
      success: successCount === operations.length,
      results: results.map((result, index) => ({
        category: operations[index][0],
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? result.reason : undefined
      }))
    };
  }

  // Settings comparison and diff
  async compareWithDefaults(): Promise<{
    differences: Array<{
      category: string;
      setting: string;
      current: any;
      default: any;
    }>;
    identical: boolean;
  }> {
    try {
      const current = await this.getAllSettings();
      
      // This would compare with default settings
      // For now, return empty differences
      return {
        differences: [],
        identical: true
      };
    } catch {
      return {
        differences: [],
        identical: false
      };
    }
  }

  async getSettingsSummary(): Promise<{
    traffic_mode: string;
    threshold_mode: string;
    auto_optimization: boolean;
    collections_per_day: number;
    working_hours: string;
    last_modified: string | null;
  }> {
    try {
      const settings = await this.getAllSettings();
      
      if (!settings.success) {
        throw new Error('Failed to get settings');
      }

      return {
        traffic_mode: settings.settings.traffic.mode,
        threshold_mode: settings.settings.threshold.mode,
        auto_optimization: settings.settings.simulation.config.auto_optimization,
        collections_per_day: settings.settings.scheduler.collections_per_day,
        working_hours: `${settings.settings.scheduler.working_hours[0]}:00 - ${settings.settings.scheduler.working_hours[1]}:00`,
        last_modified: null // Would track this in real implementation
      };
    } catch {
      return {
        traffic_mode: 'unknown',
        threshold_mode: 'unknown',
        auto_optimization: false,
        collections_per_day: 0,
        working_hours: 'unknown',
        last_modified: null
      };
    }
  }

  // Validation helpers
  validateTrafficSettings(settings: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.mode && !['auto', 'manual'].includes(settings.mode)) {
      errors.push('Traffic mode must be "auto" or "manual"');
    }

    if (settings.manual_multiplier !== undefined) {
      if (typeof settings.manual_multiplier !== 'number' || 
          settings.manual_multiplier < 1.0 || 
          settings.manual_multiplier > 2.0) {
        errors.push('Manual multiplier must be between 1.0 and 2.0');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateThresholdSettings(settings: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.mode && !['static', 'dynamic'].includes(settings.mode)) {
      errors.push('Threshold mode must be "static" or "dynamic"');
    }

    if (settings.static_thresholds) {
      Object.entries(settings.static_thresholds).forEach(([type, threshold]) => {
        if (typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
          errors.push(`Threshold for ${type} must be between 0 and 100`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  validateSchedulerSettings(settings: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.collections_per_day !== undefined) {
      if (!Number.isInteger(settings.collections_per_day) || 
          settings.collections_per_day < 1 || 
          settings.collections_per_day > 10) {
        errors.push('Collections per day must be between 1 and 10');
      }
    }

    if (settings.working_hours) {
      const [start, end] = settings.working_hours;
      if (!Number.isInteger(start) || !Number.isInteger(end) ||
          start < 0 || start > 23 || end < 1 || end > 24 || start >= end) {
        errors.push('Invalid working hours');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Create and export singleton instance
const settingsService = new SettingsService();
export default settingsService;