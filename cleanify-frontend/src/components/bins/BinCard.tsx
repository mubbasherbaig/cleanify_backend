// pages/BinManagement/components/BinCard.tsx
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  TruckIcon,
  WrenchIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { Bin, BinStatus, WasteType } from '@/types/bin';
import { STATUS_COLORS, WASTE_TYPE_COLORS } from '@/utils/constants';

interface BinCardProps {
  bin: Bin;
  view: 'grid' | 'list';
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTriggerCollection: (options?: any) => void;
  onEmpty: (data?: any) => void;
  onUpdateFillLevel: (level: number) => void;
  onStartMaintenance: () => void;
  onCompleteMaintenance: () => void;
}

const BinCard: React.FC<BinCardProps> = ({
  bin,
  view,
  onView,
  onEdit,
  onDelete,
  onTriggerCollection,
  onEmpty,
  onUpdateFillLevel,
  onStartMaintenance,
  onCompleteMaintenance
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showFillLevelInput, setShowFillLevelInput] = useState(false);
  const [newFillLevel, setNewFillLevel] = useState(bin.fill_level);

  const getStatusColor = (status: BinStatus) => {
    return STATUS_COLORS.BIN[status.toUpperCase() as keyof typeof STATUS_COLORS.BIN] || '#6b7280';
  };

  const getWasteTypeColor = (type: WasteType) => {
    return WASTE_TYPE_COLORS[type.toUpperCase() as keyof typeof WASTE_TYPE_COLORS] || '#6b7280';
  };

  const getStatusLabel = (status: BinStatus) => {
    switch (status) {
      case 'active': return 'Active';
      case 'full': return 'Full';
      case 'maintenance': return 'Maintenance';
      case 'collected': return 'Collected';
      default: return status;
    }
  };

  const getWasteTypeLabel = (type: WasteType) => {
    switch (type) {
      case 'general': return 'General';
      case 'recyclable': return 'Recyclable';
      case 'hazardous': return 'Hazardous';
      default: return type;
    }
  };

  const getUrgencyLevel = () => {
    if (bin.fill_percentage >= 95) return { level: 'critical', color: 'text-red-600' };
    if (bin.fill_percentage >= 80) return { level: 'high', color: 'text-orange-600' };
    if (bin.fill_percentage >= 60) return { level: 'medium', color: 'text-yellow-600' };
    return { level: 'low', color: 'text-green-600' };
  };

  const getFillColor = () => {
    if (bin.fill_percentage >= 90) return 'bg-red-500';
    if (bin.fill_percentage >= 70) return 'bg-yellow-500';
    if (bin.fill_percentage >= 40) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const needsCollection = bin.fill_percentage >= 80;
  const isCritical = bin.fill_percentage >= 95;
  const urgency = getUrgencyLevel();

  const handleFillLevelUpdate = () => {
    if (newFillLevel !== bin.fill_level) {
      onUpdateFillLevel(newFillLevel);
    }
    setShowFillLevelInput(false);
  };

  if (view === 'list') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor(bin.status) }}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {bin.name || bin.id}
              </span>
            </div>

            {/* Type Badge */}
            <span className={`px-2 py-1 text-xs font-medium rounded-full border`} style={{
              color: getWasteTypeColor(bin.type),
              borderColor: getWasteTypeColor(bin.type),
              backgroundColor: `${getWasteTypeColor(bin.type)}20`
            }}>
              {getWasteTypeLabel(bin.type)}
            </span>

            {/* Fill Level */}
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getFillColor()}`}
                  style={{ width: `${bin.fill_percentage}%` }}
                />
              </div>
              <span className={`text-sm font-medium ${urgency.color}`}>
                {bin.fill_percentage}%
              </span>
            </div>

            {/* Location */}
            {bin.address && (
              <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                <MapPinIcon className="h-4 w-4" />
                <span className="truncate max-w-32">{bin.address}</span>
              </div>
            )}

            {/* Last Collected */}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(bin.last_collected), { addSuffix: true })}
            </div>

            {/* Alerts */}
            {isCritical && (
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            )}
            {needsCollection && !isCritical && (
              <ClockIcon className="h-4 w-4 text-yellow-500" />
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
            {needsCollection && bin.status === 'active' && (
              <button
                onClick={() => onTriggerCollection()}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Trigger Collection"
              >
                <TruckIcon className="h-4 w-4" />
              </button>
            )}
            {bin.status !== 'maintenance' && (
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
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative group ${
        isCritical ? 'ring-2 ring-red-500 ring-opacity-50' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Alert Badge */}
      {isCritical && (
        <div className="absolute top-2 right-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getStatusColor(bin.status) }}
          />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {bin.name || bin.id}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full border`} style={{
            color: getWasteTypeColor(bin.type),
            borderColor: getWasteTypeColor(bin.type),
            backgroundColor: `${getWasteTypeColor(bin.type)}20`
          }}>
            {getWasteTypeLabel(bin.type)}
          </span>
        </div>
      </div>

      {/* Fill Level */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Fill Level</span>
          <span className={`font-bold ${urgency.color}`}>
            {bin.fill_percentage}%
          </span>
        </div>
        <div className="relative">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div 
              className={`h-4 rounded-full transition-all duration-300 ${getFillColor()}`}
              style={{ width: `${bin.fill_percentage}%` }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-white drop-shadow-md">
              {bin.fill_level}kg / {bin.capacity}kg
            </span>
          </div>
        </div>
        
        {/* Quick Fill Level Update */}
        {showFillLevelInput ? (
          <div className="mt-2 flex items-center space-x-2">
            <input
              type="number"
              min="0"
              max={bin.capacity}
              value={newFillLevel}
              onChange={(e) => setNewFillLevel(Number(e.target.value))}
              className="w-20 px-2 py-1 text-xs border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-xs text-gray-500">kg</span>
            <button
              onClick={handleFillLevelUpdate}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Update
            </button>
            <button
              onClick={() => setShowFillLevelInput(false)}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowFillLevelInput(true)}
            className="mt-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Update fill level
          </button>
        )}
      </div>

      {/* Status and Urgency */}
      <div className="flex items-center justify-between mb-4">
        <span className={`px-2 py-1 text-sm font-medium rounded-full border`} style={{
          color: getStatusColor(bin.status),
          borderColor: getStatusColor(bin.status),
          backgroundColor: `${getStatusColor(bin.status)}20`
        }}>
          {getStatusLabel(bin.status)}
        </span>
        <span className={`text-sm font-medium ${urgency.color}`}>
          {urgency.level.toUpperCase()} priority
        </span>
      </div>

      {/* Location */}
      {bin.address && (
        <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <MapPinIcon className="h-4 w-4" />
            <span className="truncate">{bin.address}</span>
          </div>
        </div>
      )}

      {/* Sensor Data */}
      {bin.sensor_data && (
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
          {bin.sensor_data.temperature && (
            <div className="text-gray-600 dark:text-gray-400">
              Temp: {bin.sensor_data.temperature}°C
            </div>
          )}
          {bin.sensor_data.odor_level && (
            <div className="text-gray-600 dark:text-gray-400">
              Odor: {bin.sensor_data.odor_level}/10
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Collections</span>
          <div className="font-semibold text-gray-900 dark:text-white">
            {bin.collections_count}
          </div>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Fill Rate</span>
          <div className="font-semibold text-gray-900 dark:text-white">
            {bin.fill_rate}kg/h
          </div>
        </div>
      </div>

      {/* Last Collected */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Last collected: {formatDistanceToNow(new Date(bin.last_collected), { addSuffix: true })}
      </div>

      {/* Collection Warning */}
      {needsCollection && bin.status === 'active' && (
        <div className={`mb-4 p-2 rounded-md ${
          isCritical 
            ? 'bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700' 
            : 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900 dark:border-yellow-700'
        }`}>
          <div className={`text-xs font-medium ${
            isCritical ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            {isCritical ? 'URGENT: Collection required immediately' : 'Collection recommended'}
          </div>
        </div>
      )}

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
          {needsCollection && bin.status === 'active' && (
            <button
              onClick={() => onTriggerCollection()}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
              title="Trigger Collection"
            >
              <TruckIcon className="h-4 w-4" />
            </button>
          )}
          
          {bin.status === 'maintenance' ? (
            <button
              onClick={onCompleteMaintenance}
              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-md transition-colors"
              title="Complete Maintenance"
            >
              <CheckCircleIcon className="h-4 w-4" />
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

export default BinCard;