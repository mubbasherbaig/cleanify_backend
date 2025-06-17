import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  XMarkIcon,
  TrashIcon,
  MapPinIcon,
  TruckIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Bin } from '@/types/bin';
import { STATUS_COLORS, WASTE_TYPE_COLORS } from '@/utils/constants';

interface BinDetailsProps {
  bin: Bin;
  onClose: () => void;
  onEdit: () => void;
  onTriggerCollection: (options?: any) => void;
}

const BinDetails: React.FC<BinDetailsProps> = ({ bin, onClose, onEdit, onTriggerCollection }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'collections' | 'analytics' | 'maintenance'>('overview');

  const getStatusColor = (status: string) => {
    return STATUS_COLORS.BIN[status.toUpperCase() as keyof typeof STATUS_COLORS.BIN] || '#6b7280';
  };

  const getWasteTypeColor = (type: string) => {
    return WASTE_TYPE_COLORS[type.toUpperCase() as keyof typeof WASTE_TYPE_COLORS] || '#6b7280';
  };

  const getUrgencyLevel = () => {
    if (bin.fill_percentage >= 95) return { level: 'critical', color: 'text-red-600' };
    if (bin.fill_percentage >= 80) return { level: 'high', color: 'text-orange-600' };
    if (bin.fill_percentage >= 60) return { level: 'medium', color: 'text-yellow-600' };
    return { level: 'low', color: 'text-green-600' };
  };

  const urgency = getUrgencyLevel();

  const tabs = [
    { id: 'overview', name: 'Overview', icon: TrashIcon },
    { id: 'collections', name: 'Collections', icon: TruckIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
    { id: 'maintenance', name: 'Maintenance', icon: ClockIcon },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div 
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: getStatusColor(bin.status) }}
              />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {bin.name || bin.id}
                </h2>
                <div className="flex items-center space-x-2">
                  <span 
                    className="px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      color: getWasteTypeColor(bin.type),
                      backgroundColor: `${getWasteTypeColor(bin.type)}20`,
                      border: `1px solid ${getWasteTypeColor(bin.type)}`
                    }}
                  >
                    {bin.type.toUpperCase()}
                  </span>
                  <span className={`text-sm font-medium ${urgency.color}`}>
                    {urgency.level.toUpperCase()} PRIORITY
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {bin.fill_percentage >= 80 && bin.status === 'active' && (
                <button
                  onClick={() => onTriggerCollection()}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Trigger Collection
                </button>
              )}
              <button
                onClick={onEdit}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Edit Bin
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
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

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Fill Level Warning */}
                {bin.fill_percentage >= 80 && (
                  <div className={`rounded-lg p-4 ${
                    bin.fill_percentage >= 95 
                      ? 'bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700'
                      : 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900 dark:border-yellow-700'
                  }`}>
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className={`h-5 w-5 mr-3 ${
                        bin.fill_percentage >= 95 ? 'text-red-500' : 'text-yellow-500'
                      }`} />
                      <div>
                        <h4 className={`text-sm font-medium ${
                          bin.fill_percentage >= 95 
                            ? 'text-red-800 dark:text-red-200' 
                            : 'text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {bin.fill_percentage >= 95 ? 'URGENT: Immediate collection required' : 'Collection recommended'}
                        </h4>
                        <p className={`text-sm ${
                          bin.fill_percentage >= 95 
                            ? 'text-red-700 dark:text-red-300' 
                            : 'text-yellow-700 dark:text-yellow-300'
                        }`}>
                          Fill level at {bin.fill_percentage}% - {bin.fill_percentage >= 95 ? 'overflow risk' : 'schedule collection soon'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className={`text-2xl font-bold ${urgency.color}`}>
                      {bin.fill_percentage}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Fill Level ({bin.fill_level}kg / {bin.capacity}kg)
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {bin.collections_count}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Total Collections
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {bin.fill_rate} kg/h
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Fill Rate
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <MapPinIcon className="h-5 w-5 mr-2" />
                    Location
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Coordinates:</span>
                      <div className="font-medium">
                        {bin.location.latitude.toFixed(6)}, {bin.location.longitude.toFixed(6)}
                      </div>
                    </div>
                    {bin.address && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Address:</span>
                        <div className="font-medium">{bin.address}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sensor Data */}
                {bin.sensor_data && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                      Sensor Readings
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {bin.sensor_data.temperature && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Temperature:</span>
                          <div className="font-medium">{bin.sensor_data.temperature}°C</div>
                        </div>
                      )}
                      {bin.sensor_data.humidity && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Humidity:</span>
                          <div className="font-medium">{bin.sensor_data.humidity}%</div>
                        </div>
                      )}
                      {bin.sensor_data.odor_level && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Odor Level:</span>
                          <div className="font-medium">{bin.sensor_data.odor_level}/10</div>
                        </div>
                      )}
                      {bin.sensor_data.compaction_level && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Compaction:</span>
                          <div className="font-medium">{bin.sensor_data.compaction_level}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Collection */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Collection Info</h4>
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Last collected:</span>
                    <span className="ml-2 font-medium">
                      {formatDistanceToNow(new Date(bin.last_collected), { addSuffix: true })}
                    </span>
                    <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                      {format(new Date(bin.last_collected), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'collections' && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Collection History
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Collection records and schedules would be displayed here
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Fill Level Analytics
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Fill level trends and predictions would be displayed here
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Maintenance Records
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Maintenance history and schedules would be displayed here
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3">
            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
              <div>
                Created: {format(new Date(bin.created_at), 'MMM dd, yyyy')}
              </div>
              <div>
                Last updated: {formatDistanceToNow(new Date(bin.updated_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BinDetails;