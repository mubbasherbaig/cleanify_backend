import { TIME_FORMATS } from './constants';

// Number formatters
export const formatNumber = (
  value: number,
  options: Intl.NumberFormatOptions = {}
): string => {
  return new Intl.NumberFormat('en-US', options).format(value);
};

export const formatCurrency = (
  value: number,
  currency: string = 'USD'
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatPercentage = (
  value: number,
  decimals: number = 1
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

export const formatDecimal = (
  value: number,
  decimals: number = 2
): string => {
  return formatNumber(value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const formatInteger = (value: number): string => {
  return formatNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

// Unit formatters
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${formatInteger(meters)} m`;
  }
  return `${formatDecimal(meters / 1000, 1)} km`;
};

export const formatWeight = (kg: number): string => {
  if (kg < 1000) {
    return `${formatDecimal(kg, 1)} kg`;
  }
  return `${formatDecimal(kg / 1000, 2)} t`;
};

export const formatVolume = (liters: number): string => {
  if (liters < 1000) {
    return `${formatDecimal(liters, 1)} L`;
  }
  return `${formatDecimal(liters / 1000, 2)} m³`;
};

export const formatSpeed = (kmh: number): string => {
  return `${formatDecimal(kmh, 1)} km/h`;
};

export const formatFuelConsumption = (litersPer100km: number): string => {
  return `${formatDecimal(litersPer100km, 1)} L/100km`;
};

// Time formatters
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

export const formatTime = (date: Date | string, format: string = TIME_FORMATS.TIME_12H): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case TIME_FORMATS.TIME_12H:
      return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    case TIME_FORMATS.TIME_24H:
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    default:
      return dateObj.toLocaleTimeString('en-US');
  }
};

export const formatDate = (date: Date | string, format: string = TIME_FORMATS.DATE_SHORT): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case TIME_FORMATS.DATE_SHORT:
      return dateObj.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    case TIME_FORMATS.DATE_LONG:
      return dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    case TIME_FORMATS.ISO_DATE:
      return dateObj.toISOString().split('T')[0];
    default:
      return dateObj.toLocaleDateString('en-US');
  }
};

export const formatDateTime = (date: Date | string, format: string = TIME_FORMATS.DATETIME_SHORT): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case TIME_FORMATS.DATETIME_SHORT:
      return `${formatDate(dateObj, TIME_FORMATS.DATE_SHORT)} ${formatTime(dateObj, TIME_FORMATS.TIME_12H)}`;
    case TIME_FORMATS.DATETIME_LONG:
      return `${formatDate(dateObj, TIME_FORMATS.DATE_LONG)} ${formatTime(dateObj, TIME_FORMATS.TIME_12H)}`;
    case TIME_FORMATS.ISO_DATETIME:
      return dateObj.toISOString();
    default:
      return dateObj.toLocaleString('en-US');
  }
};

export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  return formatDate(dateObj);
};

export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Status formatters
export const formatTruckStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    idle: 'Idle',
    en_route: 'En Route',
    collecting: 'Collecting',
    returning: 'Returning',
    maintenance: 'Maintenance',
    offline: 'Offline'
  };
  return statusMap[status] || status;
};

export const formatBinStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: 'Active',
    full: 'Full',
    maintenance: 'Maintenance',
    collected: 'Collected'
  };
  return statusMap[status] || status;
};

export const formatWasteType = (type: string): string => {
  const typeMap: Record<string, string> = {
    general: 'General Waste',
    recyclable: 'Recyclable',
    hazardous: 'Hazardous Waste'
  };
  return typeMap[type] || type;
};

export const formatPriority = (priority: number): string => {
  const priorityMap: Record<number, string> = {
    1: 'Low',
    2: 'Medium',
    3: 'High'
  };
  return priorityMap[priority] || `Priority ${priority}`;
};

// Coordinate formatters
export const formatCoordinate = (coord: number, type: 'lat' | 'lng', decimals: number = 6): string => {
  const formatted = formatDecimal(Math.abs(coord), decimals);
  const direction = type === 'lat' 
    ? (coord >= 0 ? 'N' : 'S')
    : (coord >= 0 ? 'E' : 'W');
  return `${formatted}° ${direction}`;
};

export const formatCoordinates = (lat: number, lng: number, decimals: number = 6): string => {
  return `${formatCoordinate(lat, 'lat', decimals)}, ${formatCoordinate(lng, 'lng', decimals)}`;
};

// File size formatter
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${formatDecimal(size, unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

// URL formatter
export const formatUrl = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

// Phone number formatter
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
};

// Text formatters
export const formatTitle = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatCamelCase = (text: string): string => {
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

export const formatKebabCase = (text: string): string => {
  return text
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
};

export const formatSnakeCase = (text: string): string => {
  return text
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
};

export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
};

// ID formatters
export const formatTruckId = (id: string): string => {
  return `Truck ${id.toUpperCase()}`;
};

export const formatBinId = (id: string): string => {
  return `Bin ${id.toUpperCase()}`;
};

export const formatDepotId = (id: string): string => {
  return `Depot ${id.toUpperCase()}`;
};

// Efficiency formatters
export const formatEfficiency = (value: number): string => {
  if (value >= 90) return `${formatPercentage(value)} (Excellent)`;
  if (value >= 75) return `${formatPercentage(value)} (Good)`;
  if (value >= 60) return `${formatPercentage(value)} (Fair)`;
  return `${formatPercentage(value)} (Poor)`;
};

export const formatUtilization = (current: number, capacity: number): string => {
  const percentage = (current / capacity) * 100;
  return `${formatDecimal(current, 1)} / ${formatDecimal(capacity, 1)} (${formatPercentage(percentage)})`;
};

// Custom formatters for specific use cases
export const formatRouteProgress = (current: number, total: number): string => {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return `${current} of ${total} (${formatPercentage(percentage)})`;
};

export const formatCollectionRate = (collections: number, timeHours: number): string => {
  const rate = timeHours > 0 ? collections / timeHours : 0;
  return `${formatDecimal(rate, 1)} collections/hour`;
};

export const formatFuelLevel = (level: number): string => {
  const status = level < 20 ? ' (Low)' : level < 50 ? ' (Medium)' : ' (Full)';
  return `${formatPercentage(level)}${status}`;
};

export const formatMaintenanceDue = (dueDate: Date | string): string => {
  const dateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} days`;
  }
  if (diffDays === 0) {
    return 'Due today';
  }
  if (diffDays === 1) {
    return 'Due tomorrow';
  }
  return `Due in ${diffDays} days`;
};