import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Toast, Modal, LoadingState } from '@/types/ui';

interface UIState {
  // Theme and appearance
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;
  
  // Loading states
  loading: LoadingState;
  
  // Toasts and notifications
  toasts: Toast[];
  
  // Modals
  modals: Modal[];
  
  // Navigation
  activeTab: string;
  breadcrumbs: Array<{ label: string; path?: string }>;
  
  // Layout preferences
  layout: {
    density: 'compact' | 'comfortable' | 'spacious';
    showTips: boolean;
    animationsEnabled: boolean;
  };
  
  // Filters and search
  filters: Record<string, any>;
  searchQuery: string;
  searchResults: any[];
  
  // View preferences
  view: {
    dashboard: {
      cardSize: 'small' | 'medium' | 'large';
      refreshInterval: number;
    };
    fleet: {
      viewMode: 'grid' | 'list' | 'map';
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    };
    bins: {
      viewMode: 'grid' | 'list' | 'map';
      groupBy: 'type' | 'status' | 'location' | 'none';
    };
    routes: {
      showDetails: boolean;
      animateMovement: boolean;
    };
  };
  
  // Connection status
  connection: {
    isOnline: boolean;
    socketConnected: boolean;
    lastPing: number | null;
  };
}

const initialState: UIState = {
  theme: 'light',
  sidebarCollapsed: false,
  
  loading: {
    isLoading: false,
    message: undefined,
    progress: undefined,
  },
  
  toasts: [],
  modals: [],
  
  activeTab: 'dashboard',
  breadcrumbs: [{ label: 'Dashboard' }],
  
  layout: {
    density: 'comfortable',
    showTips: true,
    animationsEnabled: true,
  },
  
  filters: {},
  searchQuery: '',
  searchResults: [],
  
  view: {
    dashboard: {
      cardSize: 'medium',
      refreshInterval: 30000, // 30 seconds
    },
    fleet: {
      viewMode: 'grid',
      sortBy: 'id',
      sortOrder: 'asc',
    },
    bins: {
      viewMode: 'grid',
      groupBy: 'none',
    },
    routes: {
      showDetails: true,
      animateMovement: true,
    },
  },
  
  connection: {
    isOnline: true,
    socketConnected: false,
    lastPing: null,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme and appearance
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload;
    },
    
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    
    // Loading states
    setLoading: (state, action: PayloadAction<Partial<LoadingState>>) => {
      state.loading = { ...state.loading, ...action.payload };
    },
    
    startLoading: (state, action: PayloadAction<{ message?: string; progress?: number }>) => {
      state.loading = {
        isLoading: true,
        message: action.payload.message,
        progress: action.payload.progress,
      };
    },
    
    stopLoading: (state) => {
      state.loading = {
        isLoading: false,
        message: undefined,
        progress: undefined,
      };
    },
    
    updateLoadingProgress: (state, action: PayloadAction<number>) => {
      if (state.loading.isLoading) {
        state.loading.progress = action.payload;
      }
    },
    
    // Toasts
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const toast: Toast = {
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        duration: 5000,
        ...action.payload,
      };
      state.toasts.push(toast);
    },
    
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
    
    clearToasts: (state) => {
      state.toasts = [];
    },
    
    // Modals
    openModal: (state, action: PayloadAction<Omit<Modal, 'id' | 'isOpen'>>) => {
      const modal: Modal = {
        id: `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isOpen: true,
        size: 'md',
        ...action.payload,
      };
      state.modals.push(modal);
    },
    
    closeModal: (state, action: PayloadAction<string>) => {
      const modal = state.modals.find(m => m.id === action.payload);
      if (modal) {
        modal.isOpen = false;
      }
    },
    
    removeModal: (state, action: PayloadAction<string>) => {
      state.modals = state.modals.filter(modal => modal.id !== action.payload);
    },
    
    clearModals: (state) => {
      state.modals = [];
    },
    
    // Navigation
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    
    setBreadcrumbs: (state, action: PayloadAction<Array<{ label: string; path?: string }>>) => {
      state.breadcrumbs = action.payload;
    },
    
    // Layout preferences
    setDensity: (state, action: PayloadAction<'compact' | 'comfortable' | 'spacious'>) => {
      state.layout.density = action.payload;
    },
    
    toggleTips: (state) => {
      state.layout.showTips = !state.layout.showTips;
    },
    
    toggleAnimations: (state) => {
      state.layout.animationsEnabled = !state.layout.animationsEnabled;
    },
    
    // Filters and search
    setFilter: (state, action: PayloadAction<{ key: string; value: any }>) => {
      state.filters[action.payload.key] = action.payload.value;
    },
    
    removeFilter: (state, action: PayloadAction<string>) => {
      delete state.filters[action.payload];
    },
    
    clearFilters: (state) => {
      state.filters = {};
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    setSearchResults: (state, action: PayloadAction<any[]>) => {
      state.searchResults = action.payload;
    },
    
    clearSearch: (state) => {
      state.searchQuery = '';
      state.searchResults = [];
    },
    
    // View preferences
    setDashboardCardSize: (state, action: PayloadAction<'small' | 'medium' | 'large'>) => {
      state.view.dashboard.cardSize = action.payload;
    },
    
    setDashboardRefreshInterval: (state, action: PayloadAction<number>) => {
      state.view.dashboard.refreshInterval = action.payload;
    },
    
    setFleetViewMode: (state, action: PayloadAction<'grid' | 'list' | 'map'>) => {
      state.view.fleet.viewMode = action.payload;
    },
    
    setFleetSort: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.view.fleet.sortBy = action.payload.sortBy;
      state.view.fleet.sortOrder = action.payload.sortOrder;
    },
    
    setBinsViewMode: (state, action: PayloadAction<'grid' | 'list' | 'map'>) => {
      state.view.bins.viewMode = action.payload;
    },
    
    setBinsGroupBy: (state, action: PayloadAction<'type' | 'status' | 'location' | 'none'>) => {
      state.view.bins.groupBy = action.payload;
    },
    
    toggleRouteDetails: (state) => {
      state.view.routes.showDetails = !state.view.routes.showDetails;
    },
    
    toggleRouteAnimation: (state) => {
      state.view.routes.animateMovement = !state.view.routes.animateMovement;
    },
    
    // Connection status
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.connection.isOnline = action.payload;
    },
    
    setSocketConnection: (state, action: PayloadAction<boolean>) => {
      state.connection.socketConnected = action.payload;
    },
    
    updatePing: (state, action: PayloadAction<number>) => {
      state.connection.lastPing = action.payload;
    },
    
    // Bulk operations
    updateViewPreferences: (state, action: PayloadAction<Partial<UIState['view']>>) => {
      state.view = { ...state.view, ...action.payload };
    },
    
    updateLayoutPreferences: (state, action: PayloadAction<Partial<UIState['layout']>>) => {
      state.layout = { ...state.layout, ...action.payload };
    },
    
    // Reset to defaults
    resetUIPreferences: (state) => {
      state.theme = initialState.theme;
      state.layout = { ...initialState.layout };
      state.view = { ...initialState.view };
      state.sidebarCollapsed = initialState.sidebarCollapsed;
    },
    
    // Bulk state updates
    updateUIState: (state, action: PayloadAction<Partial<UIState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  // Theme and appearance
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  
  // Loading states
  setLoading,
  startLoading,
  stopLoading,
  updateLoadingProgress,
  
  // Toasts
  addToast,
  removeToast,
  clearToasts,
  
  // Modals
  openModal,
  closeModal,
  removeModal,
  clearModals,
  
  // Navigation
  setActiveTab,
  setBreadcrumbs,
  
  // Layout preferences
  setDensity,
  toggleTips,
  toggleAnimations,
  
  // Filters and search
  setFilter,
  removeFilter,
  clearFilters,
  setSearchQuery,
  setSearchResults,
  clearSearch,
  
  // View preferences
  setDashboardCardSize,
  setDashboardRefreshInterval,
  setFleetViewMode,
  setFleetSort,
  setBinsViewMode,
  setBinsGroupBy,
  toggleRouteDetails,
  toggleRouteAnimation,
  
  // Connection status
  setOnlineStatus,
  setSocketConnection,
  updatePing,
  
  // Bulk operations
  updateViewPreferences,
  updateLayoutPreferences,
  resetUIPreferences,
  updateUIState,
} = uiSlice.actions;

export default uiSlice.reducer;