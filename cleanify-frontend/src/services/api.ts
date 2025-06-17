import { ApiResponse, ApiError, RequestConfig } from '@/types';

class ApiService {
  private baseURL: string;
  private defaultTimeout: number;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    this.defaultTimeout = 30000; // 30 seconds
  }

  private async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...headers
    };

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(timeout)
    };

    if (body && method !== 'GET') {
      requestConfig.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestConfig);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError({
          message: errorData.error || errorData.message || `HTTP ${response.status}`,
          status: response.status,
          details: errorData
        });
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new ApiError({
          message: 'Request timeout',
          status: 408
        });
      }

      throw new ApiError({
        message: error instanceof Error ? error.message : 'Network error',
        status: 0
      });
    }
  }

  // HTTP methods
  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body: data });
  }

  async put<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body: data });
  }

  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  // Configuration methods
  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  setTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

// Custom error class
class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(config: { message: string; status: number; code?: string; details?: any }) {
    super(config.message);
    this.name = 'ApiError';
    this.status = config.status;
    this.code = config.code;
    this.details = config.details;
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService;
export { ApiError };