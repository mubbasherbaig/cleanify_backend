// pages/Analytics/Analytics.tsx
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  ChartBarIcon, 
  TruckIcon, 
  TrashIcon, 
  MapIcon,
  CalendarIcon,
  ArrowDownIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';
import analyticsService from '@/services/analyticsService';

// Components
import PerformanceDashboard from './components/PerformanceDashboard';
import CollectionAnalytics from './components/CollectionAnalytics';
import EfficiencyMetrics from './components/EfficiencyMetrics';
import TrendAnalysis from './components/TrendAnalysis';
import CostAnalysis from './components/CostAnalysis';
import PredictiveAnalytics from './components/PredictiveAnalytics';

const Analytics: React.FC = () => {
  const { trucks, statistics: truckStats } = useSelector((state: RootState) => state.trucks);
  const { bins, statistics: binStats } = useSelector((state: RootState) => state.bins);
  const { statistics: optimizationStats } = useSelector((state: RootState) => state.optimization);
  const { state: simulationState } = useSelector((state: RootState) => state.simulation);

  // Local state
  const [activeTab, setActiveTab] = useState<'overview' | 'collections' | 'efficiency' | 'trends' | 'costs' | 'predictions'>('overview');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await analyticsService.getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'collections', name: 'Collections', icon: TrashIcon },
    { id: 'efficiency', name: 'Efficiency', icon: TruckIcon },
    { id: 'trends', name: 'Trends', icon: ArrowUpIcon },
    { id: 'costs', name: 'Costs', icon: CalendarIcon },
    { id: 'predictions', name: 'Predictions', icon: MapIcon },
  ];

  const timeRanges = [
    { value: 'day', label: 'Last 24 Hours' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
  ];

  // Calculate key metrics
  const keyMetrics = {
    totalCollections: truckStats?.efficiency_metrics.collections_per_hour || 0,
    averageEfficiency: optimizationStats?.current_state.optimization_efficiency || 0,
    activeVehicles: truckStats?.active_trucks || 0,
    binsAtCapacity: binStats?.bins_needing_collection || 0,
    fuelEfficiency: truckStats?.efficiency_metrics.fuel_efficiency || 0,
    costPerCollection: 45.50, // Mock data
    predictedCollections: 156, // Mock data
    carbonFootprint: 2.3, // Mock data (tons CO2)
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    trend?: { value: number; isPositive: boolean };
  }> = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-md ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {title}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {value}
              </p>
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
            {trend && (
              <div className={`flex items-center text-sm font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? (
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 mr-1" />
                )}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Comprehensive insights into your waste management operations
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Collections"
          value={keyMetrics.totalCollections}
          subtitle={`${timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This week' : 'This month'}`}
          icon={TrashIcon}
          color="bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Fleet Efficiency"
          value={`${Math.round(keyMetrics.averageEfficiency * 100)}%`}
          subtitle="Route optimization"
          icon={TruckIcon}
          color="bg-green-50 text-green-600 dark:bg-green-900 dark:text-green-300"
          trend={{ value: 5.2, isPositive: true }}
        />
        <MetricCard
          title="Active Vehicles"
          value={keyMetrics.activeVehicles}
          subtitle={`${trucks.length} total fleet`}
          icon={MapIcon}
          color="bg-purple-50 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
          trend={{ value: 2.1, isPositive: false }}
        />
        <MetricCard
          title="Cost per Collection"
          value={`$${keyMetrics.costPerCollection}`}
          subtitle="Average operational cost"
          icon={CalendarIcon}
          color="bg-yellow-50 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300"
          trend={{ value: 8.3, isPositive: false }}
        />
      </div>

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
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Loading analytics data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <PerformanceDashboard
              timeRange={timeRange}
              truckStats={truckStats}
              binStats={binStats}
              optimizationStats={optimizationStats}
              simulationState={simulationState}
            />
          )}

          {activeTab === 'collections' && (
            <CollectionAnalytics
              timeRange={timeRange}
              bins={bins}
              trucks={trucks}
            />
          )}

          {activeTab === 'efficiency' && (
            <EfficiencyMetrics
              timeRange={timeRange}
              truckStats={truckStats}
              optimizationStats={optimizationStats}
            />
          )}

          {activeTab === 'trends' && (
            <TrendAnalysis
              timeRange={timeRange}
              dashboardData={dashboardData}
            />
          )}

          {activeTab === 'costs' && (
            <CostAnalysis
              timeRange={timeRange}
              trucks={trucks}
              bins={bins}
            />
          )}

          {activeTab === 'predictions' && (
            <PredictiveAnalytics
              timeRange={timeRange}
              binStats={binStats}
              truckStats={truckStats}
            />
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrashIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Environmental Impact
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {keyMetrics.carbonFootprint} tons CO₂ saved
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TruckIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Fuel Efficiency
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {keyMetrics.fuelEfficiency} km/L average
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-purple-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Predicted Collections
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {keyMetrics.predictedCollections} next 24h
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;