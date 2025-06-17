import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG, ERROR_MESSAGES } from '@/utils/constants';
import { ApiResponse, ApiError } from '@/types';

class ApiService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication token if available
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request timestamp for monitoring
        config.metadata = { startTime: Date.now() };

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log response time for monitoring
        const duration = Date.now() - response.config.metadata?.startTime;
        if (duration > 2000) {
          console.warn(`Slow API response: ${response.config.url} took ${duration}ms`);
        }

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.client(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            await this.refreshToken();
            this.processQueue(null);
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError);
            this.logout();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private processQueue(error: any): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(null);
      }
    });

    this.failedQueue = [];
  }

  private handleError(error: AxiosError): ApiError {
    const defaultError: ApiError = {
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      status: 500
    };

    if (!error.response) {
      // Network error
      return {
        message: ERROR_MESSAGES.NETWORK_ERROR,
        status: 0,
        code: 'NETWORK_ERROR'
      };
    }

    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return {
          message: data?.error || ERROR_MESSAGES.VALIDATION_ERROR,
          status,
          code: 'VALIDATION_ERROR',
          details: data?.details
        };
      case 401:
        return {
          message: ERROR_MESSAGES.UNAUTHORIZED,
          status,
          code: 'UNAUTHORIZED'
        };
      case 403:
        return {
          message: 'Access forbidden',
          status,
          code: 'FORBIDDEN'
        };
      case 404:
        return {
          message: ERROR_MESSAGES.NOT_FOUND,
          status,
          code: 'NOT_FOUND'
        };
      case 408:
        return {
          message: ERROR_MESSAGES.TIMEOUT_ERROR,
          status,
          code: 'TIMEOUT'
        };
      case 500:
        return {
          message: ERROR_MESSAGES.SERVER_ERROR,
          status,
          code: 'SERVER_ERROR'
        };
      default:
        return {
          message: data?.error || defaultError.message,
          status,
          code: data?.code || 'UNKNOWN_ERROR',
          details: data?.details
        };
    }
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // File upload method
  async uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    };

    return this.post<T>(url, formData, config);
  }

  // Download file method
  async downloadFile(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.client.get(url, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      throw error;
    }
  }

  // Authentication methods
  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  private removeToken(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken
      });

      const { access_token, refresh_token: newRefreshToken } = response.data;
      
      this.setToken(access_token);
      if (newRefreshToken) {
        localStorage.setItem('refresh_token', newRefreshToken);
      }
    } catch (error) {
      this.removeToken();
      throw error;
    }
  }

  async login(credentials: { username: string; password: string }): Promise<any> {
    try {
      const response = await this.post('/auth/login', credentials);
      
      if (response.access_token) {
        this.setToken(response.access_token);
        if (response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  logout(): void {
    this.removeToken();
    // Redirect to login page or emit logout event
    window.location.href = '/login';
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.get('/health');
  }

  // Retry mechanism
  async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = API_CONFIG.RETRY_ATTEMPTS,
    delay: number = API_CONFIG.RETRY_DELAY
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          break;
        }

        // Don't retry for client errors (4xx), only server errors (5xx) and network errors
        if (error.status >= 400 && error.status < 500) {
          break;
        }

        // Exponential backoff
        const backoffDelay = delay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }

    throw lastError;
  }

  // Batch requests
  async batch(requests: Array<() => Promise<any>>): Promise<any[]> {
    try {
      return await Promise.all(requests.map(request => request()));
    } catch (error) {
      throw error;
    }
  }

  // Request cancellation
  createCancelToken(): AbortController {
    return new AbortController();
  }

  // Request with timeout
  async requestWithTimeout<T>(
    request: () => Promise<T>,
    timeout: number = API_CONFIG.TIMEOUT
  ): Promise<T> {
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const result = await request();
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (controller.signal.aborted) {
        throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
      }
      throw error;
    }
  }

  // Utility methods
  isOnline(): boolean {
    return navigator.onLine;
  }

  async ping(): Promise<number> {
    const start = Date.now();
    try {
      await this.get('/ping');
      return Date.now() - start;
    } catch (error) {
      throw error;
    }
  }

  // Cache management
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  async getWithCache<T>(
    url: string,
    ttl: number = 5 * 60 * 1000, // 5 minutes default
    config?: AxiosRequestConfig
  ): Promise<T> {
    const cacheKey = `${url}_${JSON.stringify(config)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const data = await this.get<T>(url, config);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });

    return data;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      Array.from(this.cache.keys())
        .filter(key => key.includes(pattern))
        .forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  // Request monitoring
  private requestLog: Array<{
    url: string;
    method: string;
    status: number;
    duration: number;
    timestamp: number;
  }> = [];

  getRequestLog(): typeof this.requestLog {
    return [...this.requestLog];
  }

  clearRequestLog(): void {
    this.requestLog = [];
  }

  // Configuration methods
  setBaseURL(baseURL: string): void {
    this.client.defaults.baseURL = baseURL;
  }

  setTimeout(timeout: number): void {
    this.client.defaults.timeout = timeout;
  }

  setHeader(key: string, value: string): void {
    this.client.defaults.headers.common[key] = value;
  }

  removeHeader(key: string): void {
    delete this.client.defaults.headers.common[key];
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService;