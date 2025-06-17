import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  XMarkIcon,
  TruckIcon,
  MapIcon,
  WrenchIcon,
  ClockIcon,
  ChartBarIcon,
  BoltIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { Truck } from '@/types/truck';
import { STATUS_COLORS } from '@/utils/constants';

interface TruckDetailsProps {
  truck: Truck;
  onClose: () => void;
  onEdit: () => void;
}

const TruckDetails: React.FC<TruckDetailsProps> = ({ truck, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'maintenance' | 'history'>('overview');

  const getStatusColor = (status: string) => {
    return STATUS_COLORS.TRUCK[status.toUpperCase() as keyof typeof STATUS_COLORS.TRUCK] || '#6b7280';
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: TruckIcon },
    { id: 'performance', name: 'Performance', icon: ChartBarIcon },
    { id: 'maintenance', name: 'Maintenance', icon: WrenchIcon },
    { id: 'history', name: 'History', icon: ClockIcon },
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
                style={{ backgroundColor: getStatusColor(truck.status) }}
              />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {truck.name || truck.id}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {truck.status.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onEdit}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Edit Truck
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
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.round((truck.current_load / truck.capacity) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Capacity ({truck.current_load}kg / {truck.capacity}kg)
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {truck.fuel_level}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Fuel Level
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {truck.maintenance_status}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Maintenance Health
                    </div>
                  </div>
                </div>

                {/* Route Information */}
                {truck.route && truck.route.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                      <MapIcon className="h-5 w-5 mr-2" />
                      Current Route
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 dark:text-blue-300">Total Stops:</span>
                        <span className="ml-2 font-medium">{truck.route.length}</span>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-300">Progress:</span>
                        <span className="ml-2 font-medium">
                          {truck.current_bin_index !== undefined 
                            ? `${truck.current_bin_index + 1}/${truck.route.length}`
                            : 'Not started'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Location</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Current:</span>
                      <div className="font-medium">
                        {truck.location.latitude.toFixed(6)}, {truck.location.longitude.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Depot:</span>
                      <div className="font-medium">
                        {truck.depot_location.latitude.toFixed(6)}, {truck.depot_location.longitude.toFixed(6)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operational Stats */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Operational Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Collections Completed:</span>
                      <div className="font-medium text-gray-900 dark:text-white">{truck.collections_completed}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Distance Traveled:</span>
                      <div className="font-medium text-gray-900 dark:text-white">{Math.round(truck.distance_traveled)} km</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Time Collecting:</span>
                      <div className="font-medium text-gray-900 dark:text-white">{Math.round(truck.time_spent_collecting / 60)} min</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Speed:</span>
                      <div className="font-medium text-gray-900 dark:text-white">{truck.speed} km/h</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Performance Analytics
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Detailed performance metrics would be displayed here
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Maintenance Status
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Health Score:</span>
                      <div className={`font-medium ${
                        truck.maintenance_status >= 80 ? 'text-green-600' :
                        truck.maintenance_status >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {truck.maintenance_status}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Last Maintenance:</span>
                      <div className="font-medium">
                        {formatDistanceToNow(new Date(truck.last_maintenance), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center py-8">
                  <WrenchIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Maintenance History
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Maintenance records and schedules would be displayed here
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Activity History
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Historical activity and route data would be displayed here
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3">
            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
              <div>
                Created: {format(new Date(truck.created_at), 'MMM dd, yyyy')}
              </div>
              <div>
                Last updated: {formatDistanceToNow(new Date(truck.updated_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruckDetails;