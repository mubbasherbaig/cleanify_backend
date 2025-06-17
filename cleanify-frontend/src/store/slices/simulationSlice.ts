import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { SimulationState, SimulationEvent, SimulationSnapshot, PerformanceMetrics } from '@/types';
import simulationService from '@/services/simulationService';

interface SimulationStoreState {
  // Current simulation state
  isRunning: boolean;
  isPaused: boolean;
  speed: number;
  currentTime: string;
  tickCount: number;
  uptime: number;
  
  // Snapshot data
  snapshot: SimulationSnapshot | null;
  lastSnapshotTime: string | null;
  
  // Events
  events: SimulationEvent[];
  maxEvents: number;
  
  // Statistics
  statistics: {
    totalCollections: number;
    totalDistance: number;
    activeTrucks: number;
    binsNeedingCollection: number;
    collectionEfficiency: number;
    fuelConsumption: number;
  };
  
  // Performance metrics
  performance: PerformanceMetrics | null;
  
  // Configuration
  config: {
    autoOptimization: boolean;
    autoBinFilling: boolean;
    truckBreakdownProbability: number;
    binOverflowEnabled: boolean;
    emitFrequency: number;
  };
  
  // Traffic settings
  traffic: {
    mode: 'auto' | 'manual';
    multiplier: number;
    events: any[];
  };
  
  // Loading states
  loading: {
    starting: boolean;
    stopping: boolean;
    updating: boolean;
    snapshotting: boolean;
  };
  
  // Error handling
  error: string | null;
  lastError: string | null;
  
  // Real-time updates
  realTimeEnabled: boolean;
  lastUpdateTime: number;
}

const initialState: SimulationStoreState = {
  isRunning: false,
  isPaused: false,
  speed: 1,
  currentTime: new Date().toISOString(),
  tickCount: 0,
  uptime: 0,
  
  snapshot: null,
  lastSnapshotTime: null,
  
  events: [],
  maxEvents: 100,
  
  statistics: {
    totalCollections: 0,
    totalDistance: 0,
    activeTrucks: 0,
    binsNeedingCollection: 0,
    collectionEfficiency: 0,
    fuelConsumption: 0,
  },
  
  performance: null,
  
  config: {
    autoOptimization: true,
    autoBinFilling: true,
    truckBreakdownProbability: 0.001,
    binOverflowEnabled: true,
    emitFrequency: 1,
  },
  
  traffic: {
    mode: 'auto',
    multiplier: 1.0,
    events: [],
  },
  
  loading: {
    starting: false,
    stopping: false,
    updating: false,
    snapshotting: false,
  },
  
  error: null,
  lastError: null,
  
  realTimeEnabled: true,
  lastUpdateTime: Date.now(),
};

// Async thunks
export const startSimulation = createAsyncThunk(
  'simulation/start',
  async (_, { rejectWithValue }) => {
    try {
      const response = await simulationService.start();
      if (!response.success) {
        throw new Error(response.error || 'Failed to start simulation');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const pauseSimulation = createAsyncThunk(
  'simulation/pause',
  async (_, { rejectWithValue }) => {
    try {
      const response = await simulationService.pause();
      if (!response.success) {
        throw new Error(response.error || 'Failed to pause simulation');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const stopSimulation = createAsyncThunk(
  'simulation/stop',
  async (_, { rejectWithValue }) => {
    try {
      const response = await simulationService.stop();
      if (!response.success) {
        throw new Error(response.error || 'Failed to stop simulation');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const setSimulationSpeed = createAsyncThunk(
  'simulation/setSpeed',
  async (speed: number, { rejectWithValue }) => {
    try {
      const response = await simulationService.setSpeed(speed);
      if (!response.success) {
        throw new Error(response.error || 'Failed to set simulation speed');
      }
      return { speed, response };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSimulationStatus = createAsyncThunk(
  'simulation/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await simulationService.getStatus();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch simulation status');
      }
      return response.status;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSimulationSnapshot = createAsyncThunk(
  'simulation/fetchSnapshot',
  async (_, { rejectWithValue }) => {
    try {
      const response = await simulationService.getSnapshot();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch simulation snapshot');
      }
      return response.snapshot;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateSimulationConfig = createAsyncThunk(
  'simulation/updateConfig',
  async (config: Partial<SimulationStoreState['config']>, { rejectWithValue }) => {
    try {
      const response = await simulationService.updateConfig(config);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update simulation config');
      }
      return config;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const simulationSlice = createSlice({
  name: 'simulation',
  initialState,
  reducers: {
    // Real-time updates
    updateFromSocket: (state, action: PayloadAction<Partial<SimulationStoreState>>) => {
      Object.assign(state, action.payload);
      state.lastUpdateTime = Date.now();
    },
    
    updateSimulationTick: (state, action: PayloadAction<{
      sim_time: string;
      tick_count: number;
      active_trucks: number;
      bins_needing_collection: number;
      traffic_multiplier: number;
    }>) => {
      const { sim_time, tick_count, active_trucks, bins_needing_collection, traffic_multiplier } = action.payload;
      
      state.currentTime = sim_time;
      state.tickCount = tick_count;
      state.statistics.activeTrucks = active_trucks;
      state.statistics.binsNeedingCollection = bins_needing_collection;
      state.traffic.multiplier = traffic_multiplier;
      state.lastUpdateTime = Date.now();
    },
    
    // Events management
    addEvent: (state, action: PayloadAction<SimulationEvent>) => {
      state.events.unshift(action.payload);
      
      // Keep only the latest events
      if (state.events.length > state.maxEvents) {
        state.events = state.events.slice(0, state.maxEvents);
      }
    },
    
    clearEvents: (state) => {
      state.events = [];
    },
    
    setMaxEvents: (state, action: PayloadAction<number>) => {
      state.maxEvents = action.payload;
      
      // Trim events if necessary
      if (state.events.length > state.maxEvents) {
        state.events = state.events.slice(0, state.maxEvents);
      }
    },
    
    // Statistics updates
    updateStatistics: (state, action: PayloadAction<Partial<SimulationStoreState['statistics']>>) => {
      Object.assign(state.statistics, action.payload);
    },
    
    incrementCollections: (state, action: PayloadAction<number>) => {
      state.statistics.totalCollections += action.payload;
    },
    
    addDistance: (state, action: PayloadAction<number>) => {
      state.statistics.totalDistance += action.payload;
    },
    
    // Configuration updates
    updateConfig: (state, action: PayloadAction<Partial<SimulationStoreState['config']>>) => {
      Object.assign(state.config, action.payload);
    },
    
    toggleAutoOptimization: (state) => {
      state.config.autoOptimization = !state.config.autoOptimization;
    },
    
    toggleAutoBinFilling: (state) => {
      state.config.autoBinFilling = !state.config.autoBinFilling;
    },
    
    // Traffic management
    updateTrafficSettings: (state, action: PayloadAction<Partial<SimulationStoreState['traffic']>>) => {
      Object.assign(state.traffic, action.payload);
    },
    
    setTrafficMode: (state, action: PayloadAction<'auto' | 'manual'>) => {
      state.traffic.mode = action.payload;
    },
    
    setTrafficMultiplier: (state, action: PayloadAction<number>) => {
      state.traffic.multiplier = action.payload;
    },
    
    addTrafficEvent: (state, action: PayloadAction<any>) => {
      state.traffic.events.push(action.payload);
    },
    
    removeTrafficEvent: (state, action: PayloadAction<string>) => {
      state.traffic.events = state.traffic.events.filter(event => event.id !== action.payload);
    },
    
    clearTrafficEvents: (state) => {
      state.traffic.events = [];
    },
    
    // Performance updates
    updatePerformance: (state, action: PayloadAction<PerformanceMetrics>) => {
      state.performance = action.payload;
    },
    
    // Real-time control
    enableRealTime: (state) => {
      state.realTimeEnabled = true;
    },
    
    disableRealTime: (state) => {
      state.realTimeEnabled = false;
    },
    
    // Error handling
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.lastError = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Manual state updates
    setRunning: (state, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload;
    },
    
    setPaused: (state, action: PayloadAction<boolean>) => {
      state.isPaused = action.payload;
    },
    
    setSpeed: (state, action: PayloadAction<number>) => {
      state.speed = Math.max(1, Math.min(10, action.payload));
    },
    
    // Snapshot management
    setSnapshot: (state, action: PayloadAction<SimulationSnapshot>) => {
      state.snapshot = action.payload;
      state.lastSnapshotTime = new Date().toISOString();
    },
    
    clearSnapshot: (state) => {
      state.snapshot = null;
      state.lastSnapshotTime = null;
    },
    
    // Reset functionality
    resetSimulation: (state) => {
      return {
        ...initialState,
        config: state.config, // Preserve configuration
        realTimeEnabled: state.realTimeEnabled,
      };
    },
    
    resetStatistics: (state) => {
      state.statistics = { ...initialState.statistics };
    },
  },
  extraReducers: (builder) => {
    // Start simulation
    builder
      .addCase(startSimulation.pending, (state) => {
        state.loading.starting = true;
        state.error = null;
      })
      .addCase(startSimulation.fulfilled, (state) => {
        state.loading.starting = false;
        state.isRunning = true;
        state.isPaused = false;
        state.error = null;
      })
      .addCase(startSimulation.rejected, (state, action) => {
        state.loading.starting = false;
        state.error = action.payload as string;
      });

    // Pause simulation
    builder
      .addCase(pauseSimulation.pending, (state) => {
        state.loading.updating = true;
      })
      .addCase(pauseSimulation.fulfilled, (state) => {
        state.loading.updating = false;
        state.isPaused = !state.isPaused;
      })
      .addCase(pauseSimulation.rejected, (state, action) => {
        state.loading.updating = false;
        state.error = action.payload as string;
      });

    // Stop simulation
    builder
      .addCase(stopSimulation.pending, (state) => {
        state.loading.stopping = true;
      })
      .addCase(stopSimulation.fulfilled, (state) => {
        state.loading.stopping = false;
        state.isRunning = false;
        state.isPaused = false;
      })
      .addCase(stopSimulation.rejected, (state, action) => {
        state.loading.stopping = false;
        state.error = action.payload as string;
      });

    // Set speed
    builder
      .addCase(setSimulationSpeed.pending, (state) => {
        state.loading.updating = true;
      })
      .addCase(setSimulationSpeed.fulfilled, (state, action) => {
        state.loading.updating = false;
        state.speed = action.payload.speed;
      })
      .addCase(setSimulationSpeed.rejected, (state, action) => {
        state.loading.updating = false;
        state.error = action.payload as string;
      });

    // Fetch status
    builder
      .addCase(fetchSimulationStatus.pending, (state) => {
        state.loading.updating = true;
      })
      .addCase(fetchSimulationStatus.fulfilled, (state, action) => {
        state.loading.updating = false;
        const status = action.payload;
        state.isRunning = status.is_running;
        state.isPaused = status.is_paused;
        state.speed = status.speed;
        state.currentTime = status.current_time;
        state.tickCount = status.tick_count;
        state.uptime = status.uptime_seconds;
        state.traffic.multiplier = status.traffic_multiplier;
        state.statistics.activeTrucks = status.active_trucks;
        state.statistics.binsNeedingCollection = status.bins_needing_collection;
      })
      .addCase(fetchSimulationStatus.rejected, (state, action) => {
        state.loading.updating = false;
        state.error = action.payload as string;
      });

    // Fetch snapshot
    builder
      .addCase(fetchSimulationSnapshot.pending, (state) => {
        state.loading.snapshotting = true;
      })
      .addCase(fetchSimulationSnapshot.fulfilled, (state, action) => {
        state.loading.snapshotting = false;
        state.snapshot = action.payload;
        state.lastSnapshotTime = new Date().toISOString();
      })
      .addCase(fetchSimulationSnapshot.rejected, (state, action) => {
        state.loading.snapshotting = false;
        state.error = action.payload as string;
      });

    // Update config
    builder
      .addCase(updateSimulationConfig.pending, (state) => {
        state.loading.updating = true;
      })
      .addCase(updateSimulationConfig.fulfilled, (state, action) => {
        state.loading.updating = false;
        Object.assign(state.config, action.payload);
      })
      .addCase(updateSimulationConfig.rejected, (state, action) => {
        state.loading.updating = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  updateFromSocket,
  updateSimulationTick,
  addEvent,
  clearEvents,
  setMaxEvents,
  updateStatistics,
  incrementCollections,
  addDistance,
  updateConfig,
  toggleAutoOptimization,
  toggleAutoBinFilling,
  updateTrafficSettings,
  setTrafficMode,
  setTrafficMultiplier,
  addTrafficEvent,
  removeTrafficEvent,
  clearTrafficEvents,
  updatePerformance,
  enableRealTime,
  disableRealTime,
  setError,
  clearError,
  setRunning,
  setPaused,
  setSpeed,
  setSnapshot,
  clearSnapshot,
  resetSimulation,
  resetStatistics,
} = simulationSlice.actions;

export default simulationSlice.reducer;