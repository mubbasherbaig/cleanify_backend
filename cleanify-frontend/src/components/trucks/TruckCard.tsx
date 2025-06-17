// pages/FleetManagement/components/TruckCard.tsx
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  MapIcon,
  WrenchIcon,
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  BatteryIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { Truck, TruckStatus } from '@/types/truck';
import { STATUS_COLORS } from '@/utils/constants';

interface TruckCardProps {
  truck: Truck;
  view: 'grid' | 'list';
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssignRoute: (binIds: string[]) => void;
  onClearRoute: () => void;
  onStartMaintenance: () => void;
  onCompleteMaintenance: () => void;
}

const TruckCard: React.FC<TruckCardProps> = ({
  truck,
  view,
  onView,
  onEdit,
  onDelete,
  onAssignRoute,
  onClearRoute,
  onStartMaintenance,
  onCompleteMaintenance
}) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: TruckStatus) => {
    return STATUS_COLORS.TRUCK[status.toUpperCase() as keyof typeof STATUS_COLORS.TRUCK] || '#6b7280';
  };

  const getStatusLabel = (status: TruckStatus) => {
    switch (status) {
      case 'idle': return 'Idle';
      case 'en_route': return 'En Route';
      case 'collecting': return 'Collecting';
      case 'returning': return 'Returning';
      case 'maintenance': return 'Maintenance';
      case 'offline': return 'Offline';
      default: return status;
    }
  };

  const getCapacityPercentage = () => {
    return (truck.current_load / truck.capacity) * 100;
  };

  const getFuelColor = () => {
    if (truck.fuel_level >= 50) return 'text-green-500';
    if (truck.fuel_level >= 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMaintenanceColor = () => {
    if (truck.maintenance_status >= 80) return 'text-green-500';
    if (truck.maintenance_status >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const needsAttention = truck.fuel_level < 20 || truck.maintenance_status < 30;

  if (view === 'list') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor(truck.status) }}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {truck.id}
              </span>
            </div>

            {/* Status Label */}
            <span className={`px-2 py-1 text-xs font-medium rounded-full border`} style={{
              color: getStatusColor(truck.status),
              borderColor: getStatusColor(truck.status),
              backgroundColor: `${getStatusColor(truck.status)}20`
            }}>
              {getStatusLabel(truck.status)}
            </span>

            {/* Metrics */}
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <span>Load:</span>
                <span className="font-medium">
                  {Math.round(getCapacityPercentage())}%
                </span>
              </div>
              <div className={`flex items-center space-x-1 ${getFuelColor()}`}>
                <BatteryIcon className="h-4 w-4" />
                <span>{truck.fuel_level}%</span>
              </div>
              <div className={`flex items-center space-x-1 ${getMaintenanceColor()}`}>
                <WrenchIcon className="h-4 w-4" />
                <span>{truck.maintenance_status}%</span>
              </div>
            </div>

            {/* Route Info */}
            {truck.route && truck.route.length > 0 && (
              <div className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400">
                <MapIcon className="h-4 w-4" />
                <span>{truck.route.length} stops</span>
              </div>
            )}

            {/* Alerts */}
            {needsAttention && (
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onView}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            {truck.status !== 'maintenance' && (
              <button
                onClick={onStartMaintenance}
                className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                title="Start Maintenance"
              >
                <WrenchIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Alert Badge */}
      {needsAttention && (
        <div className="absolute top-2 right-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getStatusColor(truck.status) }}
          />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {truck.name || truck.id}
          </h3>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full border`} style={{
          color: getStatusColor(truck.status),
          borderColor: getStatusColor(truck.status),
          backgroundColor: `${getStatusColor(truck.status)}20`
        }}>
          {getStatusLabel(truck.status)}
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-3 mb-4">
        {/* Capacity */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Capacity</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {truck.current_load}kg / {truck.capacity}kg
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(getCapacityPercentage(), 100)}%` }}
            />
          </div>
        </div>

        {/* Fuel Level */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Fuel</span>
            <span className={`font-medium ${getFuelColor()}`}>
              {truck.fuel_level}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                truck.fuel_level >= 50 ? 'bg-green-500' :
                truck.fuel_level >= 20 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${truck.fuel_level}%` }}
            />
          </div>
        </div>

        {/* Maintenance Status */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Maintenance</span>
            <span className={`font-medium ${getMaintenanceColor()}`}>
              {truck.maintenance_status}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                truck.maintenance_status >= 80 ? 'bg-green-500' :
                truck.maintenance_status >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${truck.maintenance_status}%` }}
            />
          </div>
        </div>
      </div>

      {/* Route Info */}
      {truck.route && truck.route.length > 0 && (
        <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900 rounded-md">
          <div className="flex items-center space-x-2 text-sm text-blue-800 dark:text-blue-200">
            <MapIcon className="h-4 w-4" />
            <span>Route: {truck.route.length} stops</span>
            {truck.current_bin_index !== undefined && (
              <span>({truck.current_bin_index + 1}/{truck.route.length})</span>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Collections</span>
          <div className="font-semibold text-gray-900 dark:text-white">
            {truck.collections_completed}
          </div>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Distance</span>
          <div className="font-semibold text-gray-900 dark:text-white">
            {Math.round(truck.distance_traveled)}km
          </div>
        </div>
      </div>

      {/* Last Maintenance */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Last maintenance: {formatDistanceToNow(new Date(truck.last_maintenance), { addSuffix: true })}
      </div>

      {/* Actions */}
      <div className={`flex items-center justify-between transition-opacity duration-200 ${
        showActions ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center space-x-2">
          <button
            onClick={onView}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-md transition-colors"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {truck.status === 'maintenance' ? (
            <button
              onClick={onCompleteMaintenance}
              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-md transition-colors"
              title="Complete Maintenance"
            >
              <PlayIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onStartMaintenance}
              className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900 rounded-md transition-colors"
              title="Start Maintenance"
            >
              <WrenchIcon className="h-4 w-4" />
            </button>
          )}
          
          {truck.route && truck.route.length > 0 ? (
            <button
              onClick={onClearRoute}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-md transition-colors"
              title="Clear Route"
            >
              <StopIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onAssignRoute([])}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
              title="Assign Route"
            >
              <MapIcon className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-md transition-colors"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TruckCard;