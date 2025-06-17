// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Application Routes
export const ROUTES = {
  DASHBOARD: '/',
  FLEET_MANAGEMENT: '/fleet',
  BIN_MANAGEMENT: '/bins',
  ROUTE_OPTIMIZATION: '/optimization',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings'
};

// Simulation Constants
export const SIMULATION = {
  MIN_SPEED: 1,
  MAX_SPEED: 10,
  DEFAULT_SPEED: 1,
  TICK_INTERVAL: 200, // milliseconds
  EMIT_FREQUENCY: 1,
  MAX_EVENTS: 1000
};

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: [74.3587, 31.5204] as [number, number], // Lahore, Pakistan
  DEFAULT_ZOOM: 12,
  MIN_ZOOM: 8,
  MAX_ZOOM: 18,
  CLUSTER_RADIUS: 50,
  MARKER_SIZES: {
    SMALL: 8,
    MEDIUM: 12,
    LARGE: 16
  }
};

// Truck Configuration
export const TRUCK_CONFIG = {
  DEFAULT_CAPACITY: 1000, // kg
  DEFAULT_SPEED: 50, // km/h
  DEFAULT_FUEL_CONSUMPTION: 0.1, // L/km
  FUEL_WARNING_THRESHOLD: 20, // %
  MAINTENANCE_WARNING_THRESHOLD: 10, // %
  LOAD_WARNING_THRESHOLD: 90 // %
};

// Bin Configuration
export const BIN_CONFIG = {
  DEFAULT_CAPACITY: 100, // kg
  DEFAULT_FILL_RATE: 5, // kg/hour
  DEFAULT_THRESHOLD: 80, // %
  URGENCY_THRESHOLD: 90, // %
  OVERFLOW_THRESHOLD: 100 // %
};

// Status Colors
export const STATUS_COLORS = {
  TRUCK: {
    IDLE: '#6b7280',
    EN_ROUTE: '#3b82f6',
    COLLECTING: '#10b981',
    RETURNING: '#8b5cf6',
    MAINTENANCE: '#f59e0b',
    OFFLINE: '#ef4444'
  },
  BIN: {
    ACTIVE: '#10b981',
    FULL: '#ef4444',
    MAINTENANCE: '#f59e0b',
    COLLECTED: '#6b7280'
  },
  DEPOT: {
    ACTIVE: '#10b981',
    MAINTENANCE: '#f59e0b',
    FULL: '#ef4444',
    OFFLINE: '#ef4444'
  }
};

// Waste Type Colors
export const WASTE_TYPE_COLORS = {
  GENERAL: '#6b7280',
  RECYCLABLE: '#10b981',
  HAZARDOUS: '#ef4444'
};

// Chart Colors
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
  PURPLE: '#8b5cf6',
  PINK: '#ec4899',
  GRAY: '#6b7280',
  PALETTE: [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#ec4899',
    '#6b7280'
  ]
};

// Form Validation
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-\(\)]+$/,
  COORDINATE_REGEX: /^-?\d+\.?\d*$/
};

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const;

// Notification Durations
export const NOTIFICATION_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
  PERSISTENT: 0
};

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'cleanify_theme',
  LANGUAGE: 'cleanify_language',
  USER_PREFERENCES: 'cleanify_user_preferences',
  MAP_VIEWPORT: 'cleanify_map_viewport',
  SIDEBAR_STATE: 'cleanify_sidebar_state',
  LAST_VISITED_PAGE: 'cleanify_last_page'
};

// Theme Constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
} as const;

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536
};

// Time Formats
export const TIME_FORMATS = {
  TIME_12H: 'h:mm A',
  TIME_24H: 'HH:mm',
  DATE_SHORT: 'MM/DD/YYYY',
  DATE_LONG: 'MMMM DD, YYYY',
  DATETIME_SHORT: 'MM/DD/YYYY h:mm A',
  DATETIME_LONG: 'MMMM DD, YYYY h:mm:ss A',
  ISO_DATE: 'YYYY-MM-DD',
  ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss'
};

// Event Types
export const EVENT_TYPES = {
  SIMULATION: {
    STARTED: 'simulation_started',
    PAUSED: 'simulation_paused',
    STOPPED: 'simulation_stopped',
    SPEED_CHANGED: 'speed_changed',
    TIME_CHANGED: 'time_changed'
  },
  TRUCK: {
    CREATED: 'truck_created',
    UPDATED: 'truck_updated',
    DELETED: 'truck_deleted',
    STATUS_CHANGED: 'truck_status_changed',
    ROUTE_ASSIGNED: 'truck_route_assigned',
    MAINTENANCE_STARTED: 'truck_maintenance_started',
    MAINTENANCE_COMPLETED: 'truck_maintenance_completed',
    BREAKDOWN: 'truck_breakdown'
  },
  BIN: {
    CREATED: 'bin_created',
    UPDATED: 'bin_updated',
    DELETED: 'bin_deleted',
    COLLECTED: 'bin_collected',
    OVERFLOW: 'bin_overflow',
    MAINTENANCE: 'bin_maintenance'
  },
  OPTIMIZATION: {
    STARTED: 'optimization_started',
    COMPLETED: 'optimization_completed',
    FAILED: 'optimization_failed',
    ROUTE_UPDATED: 'route_updated'
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  TRUCK_CREATED: 'Truck created successfully',
  TRUCK_UPDATED: 'Truck updated successfully',
  TRUCK_DELETED: 'Truck deleted successfully',
  BIN_CREATED: 'Bin created successfully',
  BIN_UPDATED: 'Bin updated successfully',
  BIN_DELETED: 'Bin deleted successfully',
  OPTIMIZATION_COMPLETED: 'Route optimization completed successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  DATA_EXPORTED: 'Data exported successfully',
  DATA_IMPORTED: 'Data imported successfully'
};

// Optimization Constants
export const OPTIMIZATION = {
  ALGORITHMS: {
    AUTO: 'auto',
    GREEDY: 'greedy',
    DYNAMIC_PROGRAMMING: 'dp',
    LOCAL_SEARCH: 'local_search',
    GUIDED_LOCAL_SEARCH: 'guided_local_search'
  },
  DEFAULT_TIME_LIMIT: 30, // seconds
  MAX_TIME_LIMIT: 300, // seconds
  MIN_TIME_LIMIT: 5, // seconds
  DEFAULT_RADAR_INTERVAL: 2, // minutes
  URGENCY_THRESHOLD: 85 // %
};

// Traffic Constants
export const TRAFFIC = {
  MODES: {
    AUTO: 'auto',
    MANUAL: 'manual'
  },
  MIN_MULTIPLIER: 1.0,
  MAX_MULTIPLIER: 2.0,
  DEFAULT_MULTIPLIER: 1.0,
  RUSH_HOURS: {
    MORNING: [7, 9],
    EVENING: [17, 19]
  }
};

// Threshold Constants
export const THRESHOLD = {
  MODES: {
    STATIC: 'static',
    DYNAMIC: 'dynamic'
  },
  DEFAULT_STATIC: {
    GENERAL: 80,
    RECYCLABLE: 85,
    HAZARDOUS: 70
  },
  MIN_THRESHOLD: 0,
  MAX_THRESHOLD: 100
};

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: {
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENT: ['application/pdf', 'text/csv', 'application/json'],
    EXCEL: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
  }
};

// Data Limits
export const DATA_LIMITS = {
  MAX_TRUCKS: 100,
  MAX_BINS: 1000,
  MAX_ROUTES_PER_TRUCK: 50,
  MAX_EVENTS_DISPLAY: 100,
  MAX_CHART_POINTS: 1000,
  PAGINATION_SIZE: 20
};

// Animation Durations
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000
};

// Z-Index Levels
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1010,
  FIXED: 1020,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  TOAST: 1080
};

// Performance Thresholds
export const PERFORMANCE = {
  GOOD_EFFICIENCY: 85,
  ACCEPTABLE_EFFICIENCY: 70,
  POOR_EFFICIENCY: 50,
  GOOD_UTILIZATION: 80,
  ACCEPTABLE_UTILIZATION: 60,
  POOR_UTILIZATION: 40
};

// Date/Time Constants
export const DATE_TIME = {
  BUSINESS_HOURS: [8, 18],
  WEEKEND_DAYS: [0, 6], // Sunday, Saturday
  WORKING_DAYS: [1, 2, 3, 4, 5], // Monday to Friday
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7
};

// Export type for theme values
export type Theme = typeof THEMES[keyof typeof THEMES];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];