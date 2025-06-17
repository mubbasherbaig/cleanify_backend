import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { 
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

// Import slice reducers
import simulationReducer from './slices/simulationSlice';
import trucksReducer from './slices/trucksSlice';
import binsReducer from './slices/binsSlice';
import optimizationReducer from './slices/optimizationSlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';

// Define persist configuration
const persistConfig = {
  key: 'cleanify-root',
  version: 1,
  storage,
  whitelist: ['settings', 'auth', 'ui'], // Only persist these slices
  blacklist: ['simulation', 'trucks', 'bins', 'optimization'] // Don't persist real-time data
};

// Create root reducer
const rootReducer = combineReducers({
  simulation: simulationReducer,
  trucks: trucksReducer,
  bins: binsReducer,
  optimization: optimizationReducer,
  settings: settingsReducer,
  ui: uiReducer,
  auth: authReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with middleware
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
      immutableCheck: {
        // Ignore large state objects for performance
        ignoredPaths: ['simulation.snapshot', 'trucks.data', 'bins.data'],
      },
    }).concat([
      // Add custom middleware here if needed
    ]),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Infer types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Helper function to reset store
export const resetStore = () => {
  persistor.purge();
  store.dispatch({ type: 'RESET_ALL' });
};

// Export actions for easy access
export { default as simulationActions } from './slices/simulationSlice';
export { default as trucksActions } from './slices/trucksSlice';
export { default as binsActions } from './slices/binsSlice';
export { default as optimizationActions } from './slices/optimizationSlice';
export { default as settingsActions } from './slices/settingsSlice';
export { default as uiActions } from './slices/uiSlice';
export { default as authActions } from './slices/authSlice';

// Selector helpers
export const selectSimulation = (state: RootState) => state.simulation;
export const selectTrucks = (state: RootState) => state.trucks;
export const selectBins = (state: RootState) => state.bins;
export const selectOptimization = (state: RootState) => state.optimization;
export const selectSettings = (state: RootState) => state.settings;
export const selectUI = (state: RootState) => state.ui;
export const selectAuth = (state: RootState) => state.auth;

export default store;