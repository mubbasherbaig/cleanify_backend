import apiService from './api';
import simulationService from './simulationService';
import trucksService from './trucksService';
import binsService from './binsService';
import optimizationService from './optimizationService';
import { ChartData, ApiResponse } from '@/types';

class AnalyticsService {
  // Dashboard analytics
  async getDashboardData(): Promise<{
    overview: any;
    charts: any;
    metrics: any;
  }> {
    try {
      const [
        simulationStats,
        truckStats,
        binStats,
        optimizationStats
      ] = await Promise.all([
        simulationService.getStatistics(),
        trucksService.getStatistics(),
        binsService.getStatistics(),
        optimizationService.getStatistics()
      ]);

      const overview = {
        simulation: simulationStats.data || {},
        trucks: truckStats.statistics || {},
        bins: binStats.statistics || {},
        optimization: optimizationStats.statistics || {}
      };

      const charts = await this.generateDashboardCharts(overview);
      const metrics = this.calculateKeyMetrics(overview);

      return { overview, charts, metrics };
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      return {
        overview: {},
        charts: {},
        metrics: {}
      };
    }
  }

  // Performance metrics
  async getPerformanceAnalytics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    efficiency: ChartData;
    throughput: ChartData;
    utilization: ChartData;
    costs: ChartData;
  }> {
    try {
      // In a real implementation, this would fetch historical data
      // For now, we'll generate sample data
      const timePoints = this.generateTimePoints(timeRange);
      
      const efficiency = this.generateEfficiencyData(timePoints);
      const throughput = this.generateThroughputData(timePoints);
      const utilization = this.generateUtilizationData(timePoints);
      const costs = this.generateCostData(timePoints);

      return { efficiency, throughput, utilization, costs };
    } catch (error) {
      console.error('Failed to get performance analytics:', error);
      return {
        efficiency: { labels: [], datasets: [] },
        throughput: { labels: [], datasets: [] },
        utilization: { labels: [], datasets: [] },
        costs: { labels: [], datasets: [] }
      };
    }
  }

  // Fleet analytics
  async getFleetAnalytics(): Promise<{
    utilization: any;
    maintenance: any;
    efficiency: any;
    routes: any;
  }> {
    try {
      const [truckStats, routes] = await Promise.all([
        trucksService.getStatistics(),
        optimizationService.getCurrentRoutes()
      ]);

      const utilization = this.analyzeFleetUtilization(truckStats.statistics);
      const maintenance = this.analyzeMaintenanceData(truckStats.statistics);
      const efficiency = await trucksService.calculateFleetEfficiency();
      const routeAnalysis = this.analyzeRoutes(routes.routes);

      return {
        utilization,
        maintenance,
        efficiency,
        routes: routeAnalysis
      };
    } catch (error) {
      console.error('Failed to get fleet analytics:', error);
      return {
        utilization: {},
        maintenance: {},
        efficiency: {},
        routes: {}
      };
    }
  }

  // Collection analytics
  async getCollectionAnalytics(): Promise<{
    binDistribution: ChartData;
    collectionTrends: ChartData;
    wasteTypes: ChartData;
    efficiency: any;
  }> {
    try {
      const [binStats, distributionData] = await Promise.all([
        binsService.getStatistics(),
        binsService.getDistributionAnalysis()
      ]);

      const binDistribution = this.createDistributionChart(distributionData);
      const collectionTrends = this.generateCollectionTrends();
      const wasteTypes = this.createWasteTypeChart(distributionData.byType);
      const efficiency = this.calculateCollectionEfficiency(binStats.statistics);

      return {
        binDistribution,
        collectionTrends,
        wasteTypes,
        efficiency
      };
    } catch (error) {
      console.error('Failed to get collection analytics:', error);
      return {
        binDistribution: { labels: [], datasets: [] },
        collectionTrends: { labels: [], datasets: [] },
        wasteTypes: { labels: [], datasets: [] },
        efficiency: {}
      };
    }
  }

  // Cost analysis
  async getCostAnalysis(): Promise<{
    operationalCosts: ChartData;
    fuelCosts: ChartData;
    maintenanceCosts: ChartData;
    savings: any;
    recommendations: string[];
  }> {
    try {
      const [truckStats, optimizationStats] = await Promise.all([
        trucksService.getStatistics(),
        optimizationService.getStatistics()
      ]);

      // Generate cost analysis based on operational data
      const operationalCosts = this.generateOperationalCostChart();
      const fuelCosts = this.generateFuelCostChart(truckStats.statistics);
      const maintenanceCosts = this.generateMaintenanceCostChart(truckStats.statistics);
      const savings = this.calculateOptimizationSavings(optimizationStats.statistics);
      const recommendations = this.generateCostRecommendations(truckStats.statistics);

      return {
        operationalCosts,
        fuelCosts,
        maintenanceCosts,
        savings,
        recommendations
      };
    } catch (error) {
      console.error('Failed to get cost analysis:', error);
      return {
        operationalCosts: { labels: [], datasets: [] },
        fuelCosts: { labels: [], datasets: [] },
        maintenanceCosts: { labels: [], datasets: [] },
        savings: {},
        recommendations: []
      };
    }
  }

  // Trend analysis
  async getTrendAnalysis(metric: string, period: string): Promise<{
    trend: ChartData;
    prediction: ChartData;
    insights: string[];
  }> {
    try {
      // Generate trend data based on the metric
      const trend = this.generateTrendData(metric, period);
      const prediction = this.generatePredictionData(metric, period);
      const insights = this.generateTrendInsights(trend);

      return { trend, prediction, insights };
    } catch (error) {
      console.error('Failed to get trend analysis:', error);
      return {
        trend: { labels: [], datasets: [] },
        prediction: { labels: [], datasets: [] },
        insights: []
      };
    }
  }

  // Report generation
  async generateReport(type: 'performance' | 'fleet' | 'collection' | 'cost', options?: any): Promise<{
    title: string;
    summary: any;
    sections: any[];
    recommendations: string[];
    charts: any[];
  }> {
    try {
      switch (type) {
        case 'performance':
          return this.generatePerformanceReport(options);
        case 'fleet':
          return this.generateFleetReport(options);
        case 'collection':
          return this.generateCollectionReport(options);
        case 'cost':
          return this.generateCostReport(options);
        default:
          throw new Error(`Unknown report type: ${type}`);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      return {
        title: 'Error Report',
        summary: { error: 'Failed to generate report' },
        sections: [],
        recommendations: [],
        charts: []
      };
    }
  }

  // Helper methods
  private async generateDashboardCharts(overview: any): Promise<any> {
    return {
      truckUtilization: this.createTruckUtilizationChart(overview.trucks),
      binStatus: this.createBinStatusChart(overview.bins),
      collections: this.createCollectionsChart(overview.simulation),
      efficiency: this.createEfficiencyChart(overview.optimization)
    };
  }

  private calculateKeyMetrics(overview: any): any {
    return {
      totalCollections: overview.simulation?.total_collections || 0,
      fleetUtilization: overview.trucks?.performance_metrics?.route_efficiency || 0,
      avgFillLevel: overview.bins?.average_fill_level || 0,
      optimizationEfficiency: overview.optimization?.current_state?.optimization_efficiency || 0
    };
  }

  private generateTimePoints(range: string): string[] {
    const now = new Date();
    const points: string[] = [];
    
    let count: number;
    let interval: number;
    
    switch (range) {
      case 'hour':
        count = 12;
        interval = 5 * 60 * 1000; // 5 minutes
        break;
      case 'day':
        count = 24;
        interval = 60 * 60 * 1000; // 1 hour
        break;
      case 'week':
        count = 7;
        interval = 24 * 60 * 60 * 1000; // 1 day
        break;
      case 'month':
        count = 30;
        interval = 24 * 60 * 60 * 1000; // 1 day
        break;
      default:
        count = 24;
        interval = 60 * 60 * 1000;
    }

    for (let i = count - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * interval);
      points.push(time.toISOString());
    }

    return points;
  }

  private generateEfficiencyData(timePoints: string[]): ChartData {
    return {
      labels: timePoints.map(t => new Date(t).toLocaleTimeString()),
      datasets: [{
        label: 'Efficiency %',
        data: timePoints.map(() => Math.floor(Math.random() * 20) + 70),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      }]
    };
  }

  private generateThroughputData(timePoints: string[]): ChartData {
    return {
      labels: timePoints.map(t => new Date(t).toLocaleTimeString()),
      datasets: [{
        label: 'Collections',
        data: timePoints.map(() => Math.floor(Math.random() * 10) + 5),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true
      }]
    };
  }

  private generateUtilizationData(timePoints: string[]): ChartData {
    return {
      labels: timePoints.map(t => new Date(t).toLocaleTimeString()),
      datasets: [{
        label: 'Truck Utilization %',
        data: timePoints.map(() => Math.floor(Math.random() * 30) + 60),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true
      }]
    };
  }

  private generateCostData(timePoints: string[]): ChartData {
    return {
      labels: timePoints.map(t => new Date(t).toLocaleTimeString()),
      datasets: [{
        label: 'Cost per Collection',
        data: timePoints.map(() => Math.floor(Math.random() * 20) + 80),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true
      }]
    };
  }

  private analyzeFleetUtilization(truckStats: any): any {
    return {
      current: truckStats?.performance_metrics?.route_efficiency || 0,
      target: 85,
      trend: 'improving',
      recommendations: [
        'Consider redistributing routes for better balance',
        'Monitor idle trucks and assign additional tasks'
      ]
    };
  }

  private analyzeMaintenanceData(truckStats: any): any {
    return {
      scheduled: truckStats?.maintenance_metrics?.trucks_in_maintenance || 0,
      overdue: truckStats?.maintenance_metrics?.trucks_needing_maintenance || 0,
      upcoming: 2, // Placeholder
      costs: {
        monthly: 5000,
        quarterly: 15000
      }
    };
  }

  private analyzeRoutes(routes: any): any {
    const routeCount = Object.keys(routes || {}).length;
    const avgDistance = 25; // Placeholder
    const avgTime = 180; // Placeholder
    
    return {
      active: routeCount,
      averageDistance: avgDistance,
      averageTime: avgTime,
      efficiency: routeCount > 0 ? 82 : 0
    };
  }

  private createDistributionChart(data: any): ChartData {
    return {
      labels: ['Active', 'Full', 'Maintenance', 'Collected'],
      datasets: [{
        label: 'Bin Status Distribution',
        data: [
          data.byStatus?.active || 0,
          data.byStatus?.full || 0,
          data.byStatus?.maintenance || 0,
          data.byStatus?.collected || 0
        ],
        backgroundColor: [
          '#10b981',
          '#ef4444',
          '#f59e0b',
          '#6b7280'
        ]
      }]
    };
  }

  private generateCollectionTrends(): ChartData {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toLocaleDateString();
    }).reverse();

    return {
      labels: last7Days,
      datasets: [{
        label: 'Collections per Day',
        data: last7Days.map(() => Math.floor(Math.random() * 50) + 100),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      }]
    };
  }

  private createWasteTypeChart(typeData: any): ChartData {
    return {
      labels: ['General', 'Recyclable', 'Hazardous'],
      datasets: [{
        label: 'Waste Type Distribution',
        data: [
          typeData?.general || 0,
          typeData?.recyclable || 0,
          typeData?.hazardous || 0
        ],
        backgroundColor: [
          '#6b7280',
          '#10b981',
          '#ef4444'
        ]
      }]
    };
  }

  private calculateCollectionEfficiency(binStats: any): any {
    return {
      rate: binStats?.collection_efficiency || 0,
      target: 95,
      improvement: 2.5
    };
  }

  private generateOperationalCostChart(): ChartData {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    return {
      labels: months,
      datasets: [{
        label: 'Operational Costs',
        data: months.map(() => Math.floor(Math.random() * 10000) + 20000),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      }]
    };
  }

  private generateFuelCostChart(truckStats: any): ChartData {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    return {
      labels: months,
      datasets: [{
        label: 'Fuel Costs',
        data: months.map(() => Math.floor(Math.random() * 5000) + 8000),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true
      }]
    };
  }

  private generateMaintenanceCostChart(truckStats: any): ChartData {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    return {
      labels: months,
      datasets: [{
        label: 'Maintenance Costs',
        data: months.map(() => Math.floor(Math.random() * 3000) + 2000),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true
      }]
    };
  }

  private calculateOptimizationSavings(optimizationStats: any): any {
    return {
      monthly: 8500,
      quarterly: 25500,
      annual: 102000,
      sources: [
        { type: 'Fuel efficiency', amount: 3500 },
        { type: 'Route optimization', amount: 3000 },
        { type: 'Reduced overtime', amount: 2000 }
      ]
    };
  }

  private generateCostRecommendations(truckStats: any): string[] {
    return [
      'Implement predictive maintenance to reduce emergency repairs',
      'Optimize routes to reduce fuel consumption by 15%',
      'Consider fleet renewal for trucks with high maintenance costs',
      'Implement driver training to improve fuel efficiency'
    ];
  }

  private generateTrendData(metric: string, period: string): ChartData {
    const timePoints = this.generateTimePoints(period);
    
    return {
      labels: timePoints.map(t => new Date(t).toLocaleDateString()),
      datasets: [{
        label: metric,
        data: timePoints.map(() => Math.floor(Math.random() * 100)),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      }]
    };
  }

  private generatePredictionData(metric: string, period: string): ChartData {
    const futurePoints = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      return date.toLocaleDateString();
    });

    return {
      labels: futurePoints,
      datasets: [{
        label: `Predicted ${metric}`,
        data: futurePoints.map(() => Math.floor(Math.random() * 100)),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderDash: [5, 5],
        fill: true
      }]
    };
  }

  private generateTrendInsights(trend: ChartData): string[] {
    return [
      'Performance has improved by 12% over the last week',
      'Peak efficiency occurs during morning hours (8-11 AM)',
      'Weekend performance is 20% lower than weekdays',
      'Weather conditions significantly impact collection times'
    ];
  }

  private async generatePerformanceReport(options: any): Promise<any> {
    const performance = await this.getPerformanceAnalytics();
    
    return {
      title: 'Performance Analysis Report',
      summary: {
        period: options?.period || 'Last 30 days',
        overallEfficiency: 82,
        improvementAreas: 3,
        keyInsights: 'Fleet utilization increased by 15%'
      },
      sections: [
        { title: 'Efficiency Trends', data: performance.efficiency },
        { title: 'Throughput Analysis', data: performance.throughput },
        { title: 'Utilization Metrics', data: performance.utilization }
      ],
      recommendations: [
        'Optimize morning routes for peak efficiency',
        'Address low-performing vehicles',
        'Implement predictive maintenance schedule'
      ],
      charts: [performance.efficiency, performance.throughput, performance.utilization]
    };
  }

  private async generateFleetReport(options: any): Promise<any> {
    const fleet = await this.getFleetAnalytics();
    
    return {
      title: 'Fleet Management Report',
      summary: fleet.efficiency,
      sections: [
        { title: 'Fleet Utilization', data: fleet.utilization },
        { title: 'Maintenance Overview', data: fleet.maintenance },
        { title: 'Route Analysis', data: fleet.routes }
      ],
      recommendations: [
        'Schedule maintenance for 3 vehicles',
        'Redistribute routes for better balance',
        'Consider fleet expansion in high-demand areas'
      ],
      charts: []
    };
  }

  private async generateCollectionReport(options: any): Promise<any> {
    const collection = await this.getCollectionAnalytics();
    
    return {
      title: 'Collection Analytics Report',
      summary: collection.efficiency,
      sections: [
        { title: 'Bin Distribution', data: collection.binDistribution },
        { title: 'Collection Trends', data: collection.collectionTrends },
        { title: 'Waste Type Analysis', data: collection.wasteTypes }
      ],
      recommendations: [
        'Increase collection frequency for high-fill areas',
        'Optimize bin placement based on usage patterns',
        'Implement smart bin monitoring'
      ],
      charts: [collection.binDistribution, collection.collectionTrends, collection.wasteTypes]
    };
  }

  private async generateCostReport(options: any): Promise<any> {
    const cost = await this.getCostAnalysis();
    
    return {
      title: 'Cost Analysis Report',
      summary: cost.savings,
      sections: [
        { title: 'Operational Costs', data: cost.operationalCosts },
        { title: 'Fuel Expenses', data: cost.fuelCosts },
        { title: 'Maintenance Costs', data: cost.maintenanceCosts }
      ],
      recommendations: cost.recommendations,
      charts: [cost.operationalCosts, cost.fuelCosts, cost.maintenanceCosts]
    };
  }

  private createTruckUtilizationChart(truckStats: any): ChartData {
    return {
      labels: ['Idle', 'En Route', 'Collecting', 'Maintenance'],
      datasets: [{
        label: 'Truck Status',
        data: [
          truckStats?.status_distribution?.idle || 0,
          truckStats?.status_distribution?.en_route || 0,
          truckStats?.status_distribution?.collecting || 0,
          truckStats?.status_distribution?.maintenance || 0
        ],
        backgroundColor: ['#6b7280', '#3b82f6', '#10b981', '#f59e0b']
      }]
    };
  }

  private createBinStatusChart(binStats: any): ChartData {
    return {
      labels: ['Active', 'Full', 'Maintenance'],
      datasets: [{
        label: 'Bin Status',
        data: [
          binStats?.active_bins || 0,
          binStats?.full_bins || 0,
          binStats?.maintenance_bins || 0
        ],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b']
      }]
    };
  }

  private createCollectionsChart(simStats: any): ChartData {
    return {
      labels: ['Today', 'This Week', 'This Month'],
      datasets: [{
        label: 'Collections',
        data: [
          simStats?.total_collections || 0,
          (simStats?.total_collections || 0) * 7,
          (simStats?.total_collections || 0) * 30
        ],
        backgroundColor: '#3b82f6'
      }]
    };
  }

  private createEfficiencyChart(optStats: any): ChartData {
    return {
      labels: ['Route Efficiency', 'Capacity Utilization', 'Time Efficiency'],
      datasets: [{
        label: 'Efficiency %',
        data: [85, 78, 82], // Placeholder values
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b']
      }]
    };
  }
}

// Create and export singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;