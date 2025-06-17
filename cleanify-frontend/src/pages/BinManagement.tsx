// pages/BinManagement/BinManagement.tsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  fetchBins, 
  setFilters, 
  clearFilters,
  setSelectedBin,
  createBin,
  updateBin,
  deleteBin,
  triggerCollection,
  emptyBin,
  updateFillLevel,
  setMaintenanceMode,
  completeMaintenance
} from '@/store/slices/binsSlice';
import { 
  PlusIcon, 
  FunnelIcon, 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon,
  WrenchIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { BinFilters, BinStatus, Bin, WasteType } from '@/types/bin';
import { useNotification } from '@/hooks/useNotification';

// Components
import BinCard from './components/BinCard';
import BinModal from './components/BinModal';
import FilterPanel from './components/FilterPanel';
import BinDetails from './components/BinDetails';
import BinMap from './components/BinMap';

const BinManagement: React.FC = () => {
  const dispatch = useDispatch();
  const notify = useNotification();
  
  const { bins, selectedBin, filters, alerts, isLoading, error } = useSelector(
    (state: RootState) => state.bins
  );

  // Local state
  const [showFilters, setShowFilters] = useState(false);
  const [showBinModal, setShowBinModal] = useState(false);
  const [showBinDetails, setShowBinDetails] = useState(false);
  const [showBinMap, setShowBinMap] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [view, setView] = useState<'grid' | 'list' | 'map'>('grid');

  // Fetch bins on mount and when filters change
  useEffect(() => {
    dispatch(fetchBins(filters));
  }, [dispatch, filters]);

  // Handle error notifications
  useEffect(() => {
    if (error) {
      notify.error('Bin Management Error', error);
    }
  }, [error, notify]);

  const handleCreateBin = () => {
    setModalMode('create');
    setSelectedBin(null);
    setShowBinModal(true);
  };

  const handleEditBin = (bin: Bin) => {
    setModalMode('edit');
    dispatch(setSelectedBin(bin));
    setShowBinModal(true);
  };

  const handleViewBin = (bin: Bin) => {
    dispatch(setSelectedBin(bin));
    setShowBinDetails(true);
  };

  const handleDeleteBin = async (binId: string) => {
    if (window.confirm('Are you sure you want to delete this bin?')) {
      try {
        await dispatch(deleteBin(binId)).unwrap();
        notify.success('Success', 'Bin deleted successfully');
      } catch (error) {
        notify.error('Error', 'Failed to delete bin');
      }
    }
  };

  const handleTriggerCollection = async (binId: string, options?: any) => {
    try {
      await dispatch(triggerCollection({ binId, options })).unwrap();
      notify.success('Success', 'Collection triggered successfully');
    } catch (error) {
      notify.error('Error', 'Failed to trigger collection');
    }
  };

  const handleEmptyBin = async (binId: string, collectionData?: any) => {
    try {
      await dispatch(emptyBin({ binId, collectionData })).unwrap();
      notify.success('Success', 'Bin emptied successfully');
    } catch (error) {
      notify.error('Error', 'Failed to empty bin');
    }
  };

  const handleUpdateFillLevel = async (binId: string, fillLevel: number) => {
    try {
      await dispatch(updateFillLevel({ binId, fillLevel })).unwrap();
      notify.success('Success', 'Fill level updated');
    } catch (error) {
      notify.error('Error', 'Failed to update fill level');
    }
  };

  const handleStartMaintenance = async (binId: string) => {
    try {
      await dispatch(setMaintenanceMode({
        binId,
        maintenanceData: {
          type: 'inspection',
          description: 'Routine inspection',
          estimated_duration: 30
        }
      })).unwrap();
      notify.success('Success', 'Maintenance mode activated');
    } catch (error) {
      notify.error('Error', 'Failed to start maintenance');
    }
  };

  const handleCompleteMaintenance = async (binId: string) => {
    try {
      await dispatch(completeMaintenance({ binId })).unwrap();
      notify.success('Success', 'Maintenance completed');
    } catch (error) {
      notify.error('Error', 'Failed to complete maintenance');
    }
  };

  const activeFilters = Object.keys(filters).length > 0;
  
  // Calculate statistics
  const stats = {
    total: bins.length,
    needingCollection: bins.filter(b => b.fill_percentage >= 80).length,
    full: bins.filter(b => b.fill_percentage >= 95).length,
    maintenance: bins.filter(b => b.status === 'maintenance').length,
    byType: {
      general: bins.filter(b => b.type === 'general').length,
      recyclable: bins.filter(b => b.type === 'recyclable').length,
      hazardous: bins.filter(b => b.type === 'hazardous').length,
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bin Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Monitor and manage waste collection bins
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md border transition-colors ${
              activeFilters || showFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            <span>Filters</span>
            {activeFilters && (
              <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full dark:bg-blue-800 dark:text-blue-100">
                {Object.keys(filters).length}
              </span>
            )}
          </button>

          <button
            onClick={handleCreateBin}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Bin</span>
          </button>
        </div>
      </div>

      {/* Alerts Banner */}
      {stats.full > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900 dark:border-red-700">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Urgent: {stats.full} bin{stats.full !== 1 ? 's' : ''} requiring immediate collection
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                These bins are at or near capacity and may overflow soon.
              </p>
            </div>
            <button 
              onClick={() => dispatch(setFilters({ fill_percentage_range: [95, 100] }))}
              className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
            >
              View Critical Bins
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onFiltersChange={(newFilters) => dispatch(setFilters(newFilters))}
          onClearFilters={() => dispatch(clearFilters())}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Bins</div>
          <div className="mt-2 text-xs text-gray-500">
            G: {stats.byType.general} | R: {stats.byType.recyclable} | H: {stats.byType.hazardous}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.needingCollection}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Need Collection</div>
          <div className="text-xs text-gray-500">≥80% full</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600">
            {stats.full}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Critical</div>
          <div className="text-xs text-gray-500">≥95% full</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-orange-600">
            {stats.maintenance}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Maintenance</div>
          <div className="text-xs text-gray-500">Under repair</div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {bins.length} bin{bins.length !== 1 ? 's' : ''}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-md ${
              view === 'grid'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-md ${
              view === 'list'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setView('map')}
            className={`p-2 rounded-md ${
              view === 'map'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bins Display */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading bins...</p>
        </div>
      ) : bins.length === 0 ? (
        <div className="text-center py-12">
          <TrashIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No bins found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {activeFilters ? 'Try adjusting your filters' : 'Get started by adding your first bin'}
          </p>
          {!activeFilters && (
            <div className="mt-6">
              <button
                onClick={handleCreateBin}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Bin
              </button>
            </div>
          )}
        </div>
      ) : view === 'map' ? (
        <BinMap bins={bins} onBinSelect={handleViewBin} />
      ) : (
        <div className={view === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
        }>
          {bins.map((bin) => (
            <BinCard
              key={bin.id}
              bin={bin}
              view={view}
              onView={() => handleViewBin(bin)}
              onEdit={() => handleEditBin(bin)}
              onDelete={() => handleDeleteBin(bin.id)}
              onTriggerCollection={(options) => handleTriggerCollection(bin.id, options)}
              onEmpty={(data) => handleEmptyBin(bin.id, data)}
              onUpdateFillLevel={(level) => handleUpdateFillLevel(bin.id, level)}
              onStartMaintenance={() => handleStartMaintenance(bin.id)}
              onCompleteMaintenance={() => handleCompleteMaintenance(bin.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showBinModal && (
        <BinModal
          mode={modalMode}
          bin={modalMode === 'edit' ? selectedBin : null}
          onClose={() => setShowBinModal(false)}
          onSave={async (binData) => {
            try {
              if (modalMode === 'create') {
                await dispatch(createBin(binData)).unwrap();
                notify.success('Success', 'Bin created successfully');
              } else if (selectedBin) {
                await dispatch(updateBin({ 
                  binId: selectedBin.id, 
                  updateData: binData 
                })).unwrap();
                notify.success('Success', 'Bin updated successfully');
              }
              setShowBinModal(false);
            } catch (error) {
              notify.error('Error', `Failed to ${modalMode} bin`);
            }
          }}
        />
      )}

      {showBinDetails && selectedBin && (
        <BinDetails
          bin={selectedBin}
          onClose={() => setShowBinDetails(false)}
          onEdit={() => {
            setShowBinDetails(false);
            handleEditBin(selectedBin);
          }}
          onTriggerCollection={(options) => {
            handleTriggerCollection(selectedBin.id, options);
            setShowBinDetails(false);
          }}
        />
      )}
    </div>
  );
};

export default BinManagement;