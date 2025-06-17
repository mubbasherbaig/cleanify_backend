// pages/Settings/Settings.tsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { fetchSettings, updateSettings } from '@/store/slices/settingsSlice';
import { updateConfig as updateSimulationConfig } from '@/store/slices/simulationSlice';
import { updateConfig as updateOptimizationConfig } from '@/store/slices/optimizationSlice';
import { 
  Cog6ToothIcon, 
  ClockIcon, 
  TruckIcon, 
  TrashIcon,
  MapIcon,
  BellIcon,
  ShieldCheckIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useNotification } from '@/hooks/useNotification';

// Components
import SimulationSettings from './components/SimulationSettings';
import ThresholdSettings from './components/ThresholdSettings';
import OptimizationSettings from './components/OptimizationSettings';
import NotificationSettings from './components/NotificationSettings';
import SystemSettings from './components/SystemSettings';
import UserPreferences from './components/UserPreferences';

const Settings: React.FC = () => {
  const dispatch = useDispatch();
  const notify = useNotification();
  
  const { settings, isLoading, error } = useSelector((state: RootState) => state.settings);
  const { config: simulationConfig } = useSelector((state: RootState) => state.simulation);
  const { config: optimizationConfig } = useSelector((state: RootState) => state.optimization);

  // Local state
  const [activeTab, setActiveTab] = useState<'simulation' | 'thresholds' | 'optimization' | 'notifications' | 'system' | 'preferences'>('simulation');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState<any>(null);

  // Fetch settings on mount
  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  // Update local settings when store settings change
  useEffect(() => {
    if (settings) {
      setLocalSettings({ ...settings });
    }
  }, [settings]);

  // Handle error notifications
  useEffect(() => {
    if (error) {
      notify.error('Settings Error', error);
    }
  }, [error, notify]);

  const tabs = [
    { id: 'simulation', name: 'Simulation', icon: ClockIcon },
    { id: 'thresholds', name: 'Thresholds', icon: TrashIcon },
    { id: 'optimization', name: 'Optimization', icon: MapIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'system', name: 'System', icon: ShieldCheckIcon },
    { id: 'preferences', name: 'Preferences', icon: UserIcon },
  ];

  const handleSaveSettings = async () => {
    if (!localSettings) return;

    try {
      await dispatch(updateSettings(localSettings)).unwrap();
      setHasUnsavedChanges(false);
      notify.success('Success', 'Settings saved successfully');
    } catch (error) {
      notify.error('Error', 'Failed to save settings');
    }
  };

  const handleResetSettings = () => {
    if (settings) {
      setLocalSettings({ ...settings });
      setHasUnsavedChanges(false);
      notify.info('Reset', 'Settings reset to last saved values');
    }
  };

  const handleSettingChange = (path: string, value: any) => {
    if (!localSettings) return;

    const pathArray = path.split('.');
    const updatedSettings = { ...localSettings };
    
    let current = updatedSettings;
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    
    setLocalSettings(updatedSettings);
    setHasUnsavedChanges(true);
  };

  const handleQuickActions = {
    resetToDefaults: () => {
      const defaultSettings = {
        simulation: {
          speed: 1,
          is_paused: false,
          config: {
            auto_optimization: true,
            auto_bin_filling: true,
            truck_breakdown_probability: 0.001,
            bin_overflow_enabled: true,
            depot_processing_enabled: true,
            emit_frequency: 1,
            max_trucks_per_optimization: 10
          }
        },
        traffic: {
          enabled: true,
          multiplier: 1.0,
          patterns: {}
        },
        threshold: {
          general_threshold: 80,
          recyclable_threshold: 75,
          hazardous_threshold: 85,
          dynamic_thresholds: false
        },
        optimization: {
          vrp_time_limit_seconds: 300,
          knapsack_time_limit_seconds: 60,
          max_route_distance_km: 50,
          max_route_duration_minutes: 480,
          depot_return_required: true,
          vehicle_capacity_buffer: 0.1
        },
        scheduler: {
          collections_per_day: 2,
          working_hours: [8, 18]
        }
      };
      
      setLocalSettings(defaultSettings);
      setHasUnsavedChanges(true);
      notify.info('Reset', 'Settings reset to default values');
    },

    exportSettings: () => {
      if (!localSettings) return;
      
      const dataStr = JSON.stringify(localSettings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `cleanify-settings-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      notify.success('Export', 'Settings exported successfully');
    },

    importSettings: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedSettings = JSON.parse(e.target?.result as string);
            setLocalSettings(importedSettings);
            setHasUnsavedChanges(true);
            notify.success('Import', 'Settings imported successfully');
          } catch (error) {
            notify.error('Error', 'Invalid settings file');
          }
        };
        reader.readAsText(file);
      };
      
      input.click();
    }
  };

  if (isLoading || !localSettings) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Configure your waste management system
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleQuickActions.exportSettings}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Export
            </button>
            <button
              onClick={handleQuickActions.importSettings}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Import
            </button>
            <button
              onClick={handleQuickActions.resetToDefaults}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              Reset to Defaults
            </button>
          </div>

          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetSettings}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900 dark:border-yellow-700">
          <div className="flex items-center">
            <Cog6ToothIcon className="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Unsaved Changes
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                You have unsaved changes. Don't forget to save your settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'simulation' && (
          <SimulationSettings
            settings={localSettings.simulation}
            onChange={(path, value) => handleSettingChange(`simulation.${path}`, value)}
          />
        )}

        {activeTab === 'thresholds' && (
          <ThresholdSettings
            settings={localSettings.threshold}
            onChange={(path, value) => handleSettingChange(`threshold.${path}`, value)}
          />
        )}

        {activeTab === 'optimization' && (
          <OptimizationSettings
            settings={localSettings.optimization}
            onChange={(path, value) => handleSettingChange(`optimization.${path}`, value)}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationSettings
            onChange={(path, value) => handleSettingChange(`notifications.${path}`, value)}
          />
        )}

        {activeTab === 'system' && (
          <SystemSettings
            onChange={(path, value) => handleSettingChange(`system.${path}`, value)}
          />
        )}

        {activeTab === 'preferences' && (
          <UserPreferences
            onChange={(path, value) => handleSettingChange(`preferences.${path}`, value)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div>
            Last saved: {settings ? new Date().toLocaleString() : 'Never'}
          </div>
          <div>
            Version: 1.0.0 | Build: {process.env.REACT_APP_BUILD_NUMBER || 'dev'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;