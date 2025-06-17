import { VALIDATION, TRUCK_CONFIG, BIN_CONFIG, TRAFFIC, THRESHOLD } from './constants';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Basic validators
export const validateRequired = (value: any): ValidationResult => {
  const isValid = value !== null && value !== undefined && value !== '';
  return {
    isValid,
    error: isValid ? undefined : 'This field is required'
  };
};

export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const isValid = VALIDATION.EMAIL_REGEX.test(email);
  return {
    isValid,
    error: isValid ? undefined : 'Please enter a valid email address'
  };
};

export const validatePhone = (phone: string): ValidationResult => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  const isValid = VALIDATION.PHONE_REGEX.test(phone);
  return {
    isValid,
    error: isValid ? undefined : 'Please enter a valid phone number'
  };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < VALIDATION.MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters long`
    };
  }
  
  return { isValid: true };
};

export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }
  
  const isValid = password === confirmPassword;
  return {
    isValid,
    error: isValid ? undefined : 'Passwords do not match'
  };
};

// Numeric validators
export const validateNumber = (value: any, min?: number, max?: number): ValidationResult => {
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  if (min !== undefined && num < min) {
    return { isValid: false, error: `Value must be at least ${min}` };
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, error: `Value must be no more than ${max}` };
  }
  
  return { isValid: true };
};

export const validateInteger = (value: any, min?: number, max?: number): ValidationResult => {
  const num = parseInt(value);
  
  if (isNaN(num) || !Number.isInteger(parseFloat(value))) {
    return { isValid: false, error: 'Please enter a valid integer' };
  }
  
  if (min !== undefined && num < min) {
    return { isValid: false, error: `Value must be at least ${min}` };
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, error: `Value must be no more than ${max}` };
  }
  
  return { isValid: true };
};

export const validatePositiveNumber = (value: any): ValidationResult => {
  return validateNumber(value, 0.01);
};

export const validatePercentage = (value: any): ValidationResult => {
  return validateNumber(value, 0, 100);
};

// String validators
export const validateMinLength = (value: string, minLength: number): ValidationResult => {
  if (!value) {
    return { isValid: false, error: 'This field is required' };
  }
  
  const isValid = value.length >= minLength;
  return {
    isValid,
    error: isValid ? undefined : `Must be at least ${minLength} characters long`
  };
};

export const validateMaxLength = (value: string, maxLength: number): ValidationResult => {
  if (!value) {
    return { isValid: true }; // Optional field
  }
  
  const isValid = value.length <= maxLength;
  return {
    isValid,
    error: isValid ? undefined : `Must be no more than ${maxLength} characters long`
  };
};

export const validateName = (name: string): ValidationResult => {
  const requiredResult = validateRequired(name);
  if (!requiredResult.isValid) return requiredResult;
  
  return validateMaxLength(name, VALIDATION.MAX_NAME_LENGTH);
};

export const validateDescription = (description: string): ValidationResult => {
  return validateMaxLength(description, VALIDATION.MAX_DESCRIPTION_LENGTH);
};

// ID validators
export const validateId = (id: string): ValidationResult => {
  if (!id) {
    return { isValid: false, error: 'ID is required' };
  }
  
  if (id.trim().length === 0) {
    return { isValid: false, error: 'ID cannot be empty' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return {
      isValid: false,
      error: 'ID can only contain letters, numbers, hyphens, and underscores'
    };
  }
  
  return { isValid: true };
};

export const validateUniqueId = async (
  id: string,
  existingIds: string[],
  currentId?: string
): Promise<ValidationResult> => {
  const basicResult = validateId(id);
  if (!basicResult.isValid) return basicResult;
  
  const isDuplicate = existingIds.some(existingId => 
    existingId === id && existingId !== currentId
  );
  
  return {
    isValid: !isDuplicate,
    error: isDuplicate ? 'This ID is already in use' : undefined
  };
};

// Coordinate validators
export const validateLatitude = (lat: any): ValidationResult => {
  return validateNumber(lat, -90, 90);
};

export const validateLongitude = (lng: any): ValidationResult => {
  return validateNumber(lng, -180, 180);
};

export const validateCoordinate = (coord: any): ValidationResult => {
  if (!coord) {
    return { isValid: false, error: 'Coordinate is required' };
  }
  
  if (!VALIDATION.COORDINATE_REGEX.test(coord.toString())) {
    return { isValid: false, error: 'Please enter a valid coordinate' };
  }
  
  return { isValid: true };
};

export const validateCoordinates = (lat: any, lng: any): ValidationResult => {
  const latResult = validateLatitude(lat);
  if (!latResult.isValid) return latResult;
  
  const lngResult = validateLongitude(lng);
  if (!lngResult.isValid) return lngResult;
  
  return { isValid: true };
};

export const validateLocation = (location: [number, number]): ValidationResult => {
  if (!location || location.length !== 2) {
    return { isValid: false, error: 'Location must be [longitude, latitude]' };
  }
  
  return validateCoordinates(location[1], location[0]);
};

// Truck-specific validators
export const validateTruckId = (id: string): ValidationResult => {
  return validateId(id);
};

export const validateTruckCapacity = (capacity: any): ValidationResult => {
  const result = validatePositiveNumber(capacity);
  if (!result.isValid) return result;
  
  const num = parseFloat(capacity);
  if (num > 50000) { // 50 tons max
    return { isValid: false, error: 'Truck capacity cannot exceed 50,000 kg' };
  }
  
  return { isValid: true };
};

export const validateTruckSpeed = (speed: any): ValidationResult => {
  const result = validatePositiveNumber(speed);
  if (!result.isValid) return result;
  
  const num = parseFloat(speed);
  if (num > 200) { // 200 km/h max
    return { isValid: false, error: 'Truck speed cannot exceed 200 km/h' };
  }
  
  return { isValid: true };
};

export const validateFuelLevel = (level: any): ValidationResult => {
  return validatePercentage(level);
};

export const validateFuelConsumption = (consumption: any): ValidationResult => {
  const result = validatePositiveNumber(consumption);
  if (!result.isValid) return result;
  
  const num = parseFloat(consumption);
  if (num > 100) { // 100 L/km max (very high)
    return { isValid: false, error: 'Fuel consumption seems unrealistic (max 100 L/km)' };
  }
  
  return { isValid: true };
};

// Bin-specific validators
export const validateBinId = (id: string): ValidationResult => {
  return validateId(id);
};

export const validateBinCapacity = (capacity: any): ValidationResult => {
  const result = validatePositiveNumber(capacity);
  if (!result.isValid) return result;
  
  const num = parseFloat(capacity);
  if (num > 10000) { // 10 tons max for a bin
    return { isValid: false, error: 'Bin capacity cannot exceed 10,000 kg' };
  }
  
  return { isValid: true };
};

export const validateFillLevel = (level: any): ValidationResult => {
  return validatePercentage(level);
};

export const validateThreshold = (threshold: any): ValidationResult => {
  return validatePercentage(threshold);
};

export const validateFillRate = (rate: any): ValidationResult => {
  const result = validateNumber(rate, 0);
  if (!result.isValid) return result;
  
  const num = parseFloat(rate);
  if (num > 1000) { // 1000 kg/hour max
    return { isValid: false, error: 'Fill rate cannot exceed 1,000 kg/hour' };
  }
  
  return { isValid: true };
};

export const validatePriority = (priority: any): ValidationResult => {
  return validateInteger(priority, 1, 3);
};

// Simulation validators
export const validateSimulationSpeed = (speed: any): ValidationResult => {
  return validateInteger(speed, 1, 10);
};

export const validateTrafficMultiplier = (multiplier: any): ValidationResult => {
  return validateNumber(multiplier, TRAFFIC.MIN_MULTIPLIER, TRAFFIC.MAX_MULTIPLIER);
};

export const validateCollectionsPerDay = (collections: any): ValidationResult => {
  return validateInteger(collections, 1, 10);
};

export const validateWorkingHours = (startHour: any, endHour: any): ValidationResult => {
  const startResult = validateInteger(startHour, 0, 23);
  if (!startResult.isValid) return startResult;
  
  const endResult = validateInteger(endHour, 1, 24);
  if (!endResult.isValid) return endResult;
  
  const start = parseInt(startHour);
  const end = parseInt(endHour);
  
  if (start >= end) {
    return { isValid: false, error: 'End hour must be greater than start hour' };
  }
  
  return { isValid: true };
};

// Date/Time validators
export const validateDate = (date: any): ValidationResult => {
  if (!date) {
    return { isValid: false, error: 'Date is required' };
  }
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }
  
  return { isValid: true };
};

export const validateFutureDate = (date: any): ValidationResult => {
  const dateResult = validateDate(date);
  if (!dateResult.isValid) return dateResult;
  
  const dateObj = new Date(date);
  const now = new Date();
  
  if (dateObj <= now) {
    return { isValid: false, error: 'Date must be in the future' };
  }
  
  return { isValid: true };
};

export const validatePastDate = (date: any): ValidationResult => {
  const dateResult = validateDate(date);
  if (!dateResult.isValid) return dateResult;
  
  const dateObj = new Date(date);
  const now = new Date();
  
  if (dateObj >= now) {
    return { isValid: false, error: 'Date must be in the past' };
  }
  
  return { isValid: true };
};

export const validateDateRange = (startDate: any, endDate: any): ValidationResult => {
  const startResult = validateDate(startDate);
  if (!startResult.isValid) return startResult;
  
  const endResult = validateDate(endDate);
  if (!endResult.isValid) return endResult;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start >= end) {
    return { isValid: false, error: 'End date must be after start date' };
  }
  
  return { isValid: true };
};

// File validators
export const validateFileSize = (file: File, maxSizeMB: number = 10): ValidationResult => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    };
  }
  
  return { isValid: true };
};

export const validateFileType = (file: File, allowedTypes: string[]): ValidationResult => {
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed`
    };
  }
  
  return { isValid: true };
};

export const validateFile = (file: File, allowedTypes: string[], maxSizeMB: number = 10): ValidationResult => {
  const sizeResult = validateFileSize(file, maxSizeMB);
  if (!sizeResult.isValid) return sizeResult;
  
  const typeResult = validateFileType(file, allowedTypes);
  if (!typeResult.isValid) return typeResult;
  
  return { isValid: true };
};

// URL validators
export const validateUrl = (url: string): ValidationResult => {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }
  
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};

// Complex object validators
export const validateTruckData = (data: any): ValidationResult[] => {
  const results: ValidationResult[] = [];
  
  results.push({
    field: 'id',
    ...validateTruckId(data.id)
  } as ValidationResult & { field: string });
  
  results.push({
    field: 'capacity',
    ...validateTruckCapacity(data.capacity)
  } as ValidationResult & { field: string });
  
  if (data.speed !== undefined) {
    results.push({
      field: 'speed',
      ...validateTruckSpeed(data.speed)
    } as ValidationResult & { field: string });
  }
  
  if (data.fuel_level !== undefined) {
    results.push({
      field: 'fuel_level',
      ...validateFuelLevel(data.fuel_level)
    } as ValidationResult & { field: string });
  }
  
  if (data.fuel_consumption !== undefined) {
    results.push({
      field: 'fuel_consumption',
      ...validateFuelConsumption(data.fuel_consumption)
    } as ValidationResult & { field: string });
  }
  
  if (data.location) {
    results.push({
      field: 'location',
      ...validateLocation(data.location)
    } as ValidationResult & { field: string });
  }
  
  return results;
};

export const validateBinData = (data: any): ValidationResult[] => {
  const results: ValidationResult[] = [];
  
  results.push({
    field: 'id',
    ...validateBinId(data.id)
  } as ValidationResult & { field: string });
  
  results.push({
    field: 'location',
    ...validateLocation(data.location)
  } as ValidationResult & { field: string });
  
  results.push({
    field: 'static_threshold',
    ...validateThreshold(data.static_threshold)
  } as ValidationResult & { field: string });
  
  if (data.capacity !== undefined) {
    results.push({
      field: 'capacity',
      ...validateBinCapacity(data.capacity)
    } as ValidationResult & { field: string });
  }
  
  if (data.fill_level !== undefined) {
    results.push({
      field: 'fill_level',
      ...validateFillLevel(data.fill_level)
    } as ValidationResult & { field: string });
  }
  
  if (data.fill_rate !== undefined) {
    results.push({
      field: 'fill_rate',
      ...validateFillRate(data.fill_rate)
    } as ValidationResult & { field: string });
  }
  
  if (data.priority !== undefined) {
    results.push({
      field: 'priority',
      ...validatePriority(data.priority)
    } as ValidationResult & { field: string });
  }
  
  return results;
};

// Utility functions
export const getValidationErrors = (results: ValidationResult[]): string[] => {
  return results
    .filter(result => !result.isValid)
    .map(result => result.error!)
    .filter(Boolean);
};

export const hasValidationErrors = (results: ValidationResult[]): boolean => {
  return results.some(result => !result.isValid);
};

export const createFieldValidator = (validators: ((value: any) => ValidationResult)[]): (value: any) => ValidationResult => {
  return (value: any) => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true };
  };
};