// pages/FleetManagement/FleetManagement.tsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  fetchTrucks, 
  setFilters, 
  clearFilters,
  setSelectedTruck,
  createTruck,
  updateTruck,
  deleteTruck,
  assignRoute,
  clearRoute,
  startMaintenance,
  completeMaintenance
} from '@/store/slices/trucksSlice';
import { 
  PlusIcon, 
  FunnelIcon, 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MapIcon,
  WrenchIcon
} from '@heroicons/react/24/outline';
import { TruckFilters, TruckStatus, Truck } from '@/types/truck';
import { useNotification } from '@/hooks/useNotification';

// Components
import TruckCard from './components/TruckCard';
import TruckModal from './components/TruckModal';
import FilterPanel from './components/FilterPanel';
import TruckDetails from './components/TruckDetails';

const FleetManagement: React.FC = () => {
  const dispatch = useDispatch();
  const notify = useNotification();
  
  const { trucks, selectedTruck, filters, isLoading, error } = useSelector(
    (state: RootState) => state.trucks
  );

  // Local state
  const [showFilters, setShowFilters] = useState(false);
  const [showTruckModal, setShowTruckModal] = useState(false);
  const [showTruckDetails, setShowTruckDetails] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // Fetch trucks on mount and when filters change
  useEffect(() => {
    dispatch(fetchTrucks(filters));
  }, [dispatch, filters]);

  // Handle error notifications
  useEffect(() => {
    if (error) {
      notify.error('Fleet Management Error', error);
    }
  }, [error, notify]);

  const handleCreateTruck = () => {
    setModalMode('create');
    setSelectedTruck(null);
    setShowTruckModal(true);
  };

  const handleEditTruck = (truck: Truck) => {
    setModalMode('edit');
    dispatch(setSelectedTruck(truck));
    setShowTruckModal(true);
  };

  const handleViewTruck = (truck: Truck) => {
    dispatch(setSelectedTruck(truck));
    setShowTruckDetails(true);
  };

  const handleDeleteTruck = async (truckId: string) => {
    if (window.confirm('Are you sure you want to delete this truck?')) {
      try {
        await dispatch(deleteTruck(truckId)).unwrap();
        notify.success('Success', 'Truck deleted successfully');
      } catch (error) {
        notify.error('Error', 'Failed to delete truck');
      }
    }
  };

  const handleAssignRoute = async (truckId: string, binIds: string[]) => {
    try {
      await dispatch(assignRoute({ truck_id: truckId, bin_ids: binIds })).unwrap();
      notify.success('Success', 'Route assigned successfully');
    } catch (error) {
      notify.error('Error', 'Failed to assign route');
    }
  };

  const handleClearRoute = async (truckId: string) => {
    try {
      await dispatch(clearRoute(truckId)).unwrap();
      notify.success('Success', 'Route cleared successfully');
    } catch (error) {
      notify.error('Error', 'Failed to clear route');
    }
  };

  const handleStartMaintenance = async (truckId: string) => {
    try {
      await dispatch(startMaintenance({
        truckId,
        maintenanceData: {
          type: 'scheduled',
          description: 'Routine maintenance',
          estimated_duration: 120
        }
      })).unwrap();
      notify.success('Success', 'Maintenance started');
    } catch (error) {
      notify.error('Error', 'Failed to start maintenance');
    }
  };

  const handleCompleteMaintenance = async (truckId: string) => {
    try {
      await dispatch(completeMaintenance(truckId)).unwrap();
      notify.success('Success', 'Maintenance completed');
    } catch (error) {
      notify.error('Error', 'Failed to complete maintenance');
    }
  };

  const activeFilters = Object.keys(filters).length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Fleet Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage your fleet of collection trucks
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
            onClick={handleCreateTruck}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Truck</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onFiltersChange={(newFilters) => dispatch(setFilters(newFilters))}
          onClearFilters={() => dispatch(clearFilters())}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {trucks.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Trucks</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600">
            {trucks.filter(t => t.status === 'idle' || t.status === 'en_route').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Available</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600">
            {trucks.filter(t => t.status === 'collecting' || t.status === 'en_route').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-yellow-600">
            {trucks.filter(t => t.status === 'maintenance').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Maintenance</div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {trucks.length} truck{trucks.length !== 1 ? 's' : ''}
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
        </div>
      </div>

      {/* Trucks Display */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading trucks...</p>
        </div>
      ) : trucks.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No trucks found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {activeFilters ? 'Try adjusting your filters' : 'Get started by adding your first truck'}
          </p>
          {!activeFilters && (
            <div className="mt-6">
              <button
                onClick={handleCreateTruck}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Truck
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={view === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
        }>
          {trucks.map((truck) => (
            <TruckCard
              key={truck.id}
              truck={truck}
              view={view}
              onView={() => handleViewTruck(truck)}
              onEdit={() => handleEditTruck(truck)}
              onDelete={() => handleDeleteTruck(truck.id)}
              onAssignRoute={(binIds) => handleAssignRoute(truck.id, binIds)}
              onClearRoute={() => handleClearRoute(truck.id)}
              onStartMaintenance={() => handleStartMaintenance(truck.id)}
              onCompleteMaintenance={() => handleCompleteMaintenance(truck.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showTruckModal && (
        <TruckModal
          mode={modalMode}
          truck={modalMode === 'edit' ? selectedTruck : null}
          onClose={() => setShowTruckModal(false)}
          onSave={async (truckData) => {
            try {
              if (modalMode === 'create') {
                await dispatch(createTruck(truckData)).unwrap();
                notify.success('Success', 'Truck created successfully');
              } else if (selectedTruck) {
                await dispatch(updateTruck({ 
                  truckId: selectedTruck.id, 
                  updateData: truckData 
                })).unwrap();
                notify.success('Success', 'Truck updated successfully');
              }
              setShowTruckModal(false);
            } catch (error) {
              notify.error('Error', `Failed to ${modalMode} truck`);
            }
          }}
        />
      )}

      {showTruckDetails && selectedTruck && (
        <TruckDetails
          truck={selectedTruck}
          onClose={() => setShowTruckDetails(false)}
          onEdit={() => {
            setShowTruckDetails(false);
            handleEditTruck(selectedTruck);
          }}
        />
      )}
    </div>
  );
};

export default FleetManagement;