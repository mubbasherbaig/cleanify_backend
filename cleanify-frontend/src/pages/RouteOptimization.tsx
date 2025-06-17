// pages/RouteOptimization/RouteOptimization.tsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  triggerOptimization, 
  analyzeOptimization, 
  fetchConfig, 
  updateConfig,
  fetchStatistics,
  simulateOptimization
} from '@/store/slices/optimizationSlice';
import { fetchTrucks } from '@/store/slices/trucksSlice';
import { fetchBins } from '@/store/slices/binsSlice';
import { 
  PlayIcon, 
  ChartBarIcon, 
  Cog6ToothIcon,
  MapIcon,
  TruckIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { OptimizationRequest } from '@/types/optimization';
import { useNotification } from '@/hooks/useNotification';

// Components
import OptimizationControls from './components/OptimizationControls';
import OptimizationResults from './components/OptimizationResults';
import OptimizationAnalysis from './components/OptimizationAnalysis';
import OptimizationConfig from './components/OptimizationConfig';
import RouteVisualization from './components/RouteVisualization';
import OptimizationHistory from './components/OptimizationHistory';

const RouteOptimization: React.FC = () => {
  const dispatch = useDispatch();
  const notify = useNotification();
  
  const { 
    lastResult, 
    config, 
    statistics, 
    analysis, 
    isOptimizing, 
    isAnalyzing, 
    error 
  } = useSelector((state: RootState) => state.optimization);
  
  const { trucks } = useSelector((state: RootState) => state.trucks);
  const { bins } = useSelector((state: RootState) => state.bins);

  // Local state
  const [activeTab, setActiveTab] = useState<'optimize' | 'analyze' | 'config' | 'history'>('optimize');
  const [selectedTrucks, setSelectedTrucks] = useState<string[]>([]);
  const [selectedBins, setSelectedBins] = useState<string[]>([]);
  const [optimizationParams, setOptimizationParams] = useState<OptimizationRequest>({});

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchTrucks());
    dispatch(fetchBins());
    dispatch(fetchConfig());
    dispatch(fetchStatistics());
  }, [dispatch]);

  // Handle error notifications
  useEffect(() => {
    if (error) {
      notify.error('Optimization Error', error);
    }
  }, [error, notify]);

  const handleOptimize = async () => {
    try {
      const request: OptimizationRequest = {
        ...optimizationParams,
        truck_ids: selectedTrucks.length > 0 ? selectedTrucks : undefined,
        bin_ids: selectedBins.length > 0 ? selectedBins : undefined,
      };
      
      await dispatch(triggerOptimization(request)).unwrap();
      notify.success('Success', 'Route optimization completed successfully');
    } catch (error) {
      notify.error('Error', 'Failed to optimize routes');
    }
  };

  const handleAnalyze = async () => {
    try {
      const request: OptimizationRequest = {
        truck_ids: selectedTrucks.length > 0 ? selectedTrucks : undefined,
        bin_ids: selectedBins.length > 0 ? selectedBins : undefined,
      };
      
      await dispatch(analyzeOptimization(request)).unwrap();
    } catch (error) {
      notify.error('Error', 'Failed to analyze optimization');
    }
  };

  const handleSimulate = async () => {
    try {
      const request: OptimizationRequest = {
        truck_ids: selectedTrucks.length > 0 ? selectedTrucks : undefined,
        bin_ids: selectedBins.length > 0 ? selectedBins : undefined,
      };
      
      await dispatch(simulateOptimization(request)).unwrap();
      notify.info('Simulation Complete', 'Optimization simulation completed');
    } catch (error) {
      notify.error('Error', 'Failed to simulate optimization');
    }
  };

  const availableTrucks = trucks.filter(truck => 
    truck.status === 'idle' || truck.status === 'en_route'
  );
  
  const binsNeedingCollection = bins.filter(bin => 
    bin.fill_percentage >= 70 && bin.status === 'active'
  );

  const tabs = [
    { id: 'optimize', name: 'Optimize', icon: PlayIcon },
    { id: 'analyze', name: 'Analysis', icon: ChartBarIcon },
    { id: 'config', name: 'Configuration', icon: Cog6ToothIcon },
    { id: 'history', name: 'History', icon: ClockIcon },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Route Optimization
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Optimize collection routes for maximum efficiency
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {availableTrucks.length}
            </div>
            <div className="text-xs text-gray-500">Available Trucks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {binsNeedingCollection.length}
            </div>
            <div className="text-xs text-gray-500">Bins Need Collection</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {statistics ? Math.round(statistics.current_state.optimization_efficiency * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500">Current Efficiency</div>
          </div>
        </div>
      </div>

      {/* Alert for urgent optimization */}
      {binsNeedingCollection.length > availableTrucks.length * 5 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900 dark:border-yellow-700">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                High Collection Demand
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {binsNeedingCollection.length} bins need collection with only {availableTrucks.length} available trucks. 
                Consider running optimization to maximize efficiency.
              </p>
            </div>
            <button 
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="ml-auto px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white rounded text-sm font-medium"
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize Now'}
            </button>
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
        {activeTab === 'optimize' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Controls */}
            <div className="lg:col-span-1 space-y-6">
              <OptimizationControls
                trucks={availableTrucks}
                bins={binsNeedingCollection}
                selectedTrucks={selectedTrucks}
                selectedBins={selectedBins}
                optimizationParams={optimizationParams}
                onTrucksChange={setSelectedTrucks}
                onBinsChange={setSelectedBins}
                onParamsChange={setOptimizationParams}
                onOptimize={handleOptimize}
                onAnalyze={handleAnalyze}
                onSimulate={handleSimulate}
                isOptimizing={isOptimizing}
                isAnalyzing={isAnalyzing}
              />
            </div>

            {/* Right Column - Results and Visualization */}
            <div className="lg:col-span-2 space-y-6">
              {lastResult ? (
                <>
                  <OptimizationResults result={lastResult} />
                  <RouteVisualization 
                    result={lastResult} 
                    trucks={trucks} 
                    bins={bins} 
                  />
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <MapIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No optimization results
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Run an optimization to see route results and visualizations
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analyze' && (
          <OptimizationAnalysis 
            analysis={analysis}
            trucks={trucks}
            bins={bins}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        )}

        {activeTab === 'config' && (
          <OptimizationConfig
            config={config}
            onConfigChange={(newConfig) => dispatch(updateConfig(newConfig))}
          />
        )}

        {activeTab === 'history' && (
          <OptimizationHistory statistics={statistics} />
        )}
      </div>
    </div>
  );
};

export default RouteOptimization;