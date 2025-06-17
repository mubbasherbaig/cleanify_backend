import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from './useToast';
import { ApiError } from '@/types';

interface UseApiOptions {
  showToast?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  immediate?: boolean;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  success: boolean;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
  cancel: () => void;
}

export const useApi = <T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T> => {
  const {
    showToast = false,
    onSuccess,
    onError,
    immediate = false,
  } = options;

  const { showSuccess, showError } = useToast();
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const cancelTokenRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (cancelTokenRef.current) {
        cancelTokenRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(async (...args: any[]): Promise<T> => {
    // Cancel any ongoing request
    if (cancelTokenRef.current) {
      cancelTokenRef.current.abort();
    }

    // Create new cancel token
    cancelTokenRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      success: false,
    }));

    try {
      const result = await apiFunction(...args);

      if (!mountedRef.current) {
        throw new Error('Component unmounted');
      }

      setState({
        data: result,
        loading: false,
        error: null,
        success: true,
      });

      if (showToast) {
        showSuccess('Success', 'Operation completed successfully');
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error: any) {
      if (!mountedRef.current || error.name === 'AbortError') {
        return Promise.reject(error);
      }

      const apiError: ApiError = {
        message: error.message || 'An unexpected error occurred',
        status: error.status || 500,
        code: error.code || 'UNKNOWN_ERROR',
        details: error.details,
      };

      setState({
        data: null,
        loading: false,
        error: apiError,
        success: false,
      });

      if (showToast) {
        showError('Error', apiError.message);
      }

      if (onError) {
        onError(apiError);
      }

      throw apiError;
    } finally {
      cancelTokenRef.current = null;
    }
  }, [apiFunction, showToast, showSuccess, showError, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false,
    });
  }, []);

  const cancel = useCallback(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.abort();
      cancelTokenRef.current = null;
    }
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset,
    cancel,
  };
};

// Specialized API hooks
export const useMutation = <T = any>(
  mutationFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) => {
  return useApi(mutationFunction, { ...options, immediate: false });
};

export const useQuery = <T = any>(
  queryFunction: () => Promise<T>,
  options: UseApiOptions & { enabled?: boolean; refetchInterval?: number } = {}
) => {
  const { enabled = true, refetchInterval, ...apiOptions } = options;
  const api = useApi(queryFunction, { ...apiOptions, immediate: enabled });

  // Auto-refetch
  useEffect(() => {
    if (refetchInterval && enabled && !api.loading) {
      const interval = setInterval(() => {
        api.execute();
      }, refetchInterval);

      return () => clearInterval(interval);
    }
  }, [refetchInterval, enabled, api.loading, api.execute]);

  const refetch = useCallback(() => {
    return api.execute();
  }, [api.execute]);

  return {
    ...api,
    refetch,
  };
};

// Hook for handling pagination
export const usePaginatedApi = <T = any>(
  apiFunction: (page: number, limit: number, ...args: any[]) => Promise<{ data: T[]; total: number }>,
  options: UseApiOptions & { initialPage?: number; pageSize?: number } = {}
) => {
  const { initialPage = 1, pageSize = 20, ...apiOptions } = options;
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(pageSize);

  const api = useApi(
    useCallback((...args: any[]) => apiFunction(page, limit, ...args), [apiFunction, page, limit]),
    apiOptions
  );

  const nextPage = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(1, prev - 1));
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const changePageSize = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing page size
  }, []);

  // Re-execute when page or limit changes
  useEffect(() => {
    if (api.data || api.error) {
      api.execute();
    }
  }, [page, limit]);

  const totalPages = api.data ? Math.ceil(api.data.total / limit) : 0;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    ...api,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    changePageSize,
  };
};

// Hook for optimistic updates
export const useOptimisticMutation = <T = any>(
  mutationFunction: (...args: any[]) => Promise<T>,
  optimisticUpdate: (currentData: T | null, args: any[]) => T,
  options: UseApiOptions = {}
) => {
  const api = useMutation(mutationFunction, options);
  const [optimisticData, setOptimisticData] = useState<T | null>(null);

  const executeOptimistic = useCallback(async (...args: any[]) => {
    // Apply optimistic update
    const optimisticResult = optimisticUpdate(api.data, args);
    setOptimisticData(optimisticResult);

    try {
      const result = await api.execute(...args);
      setOptimisticData(null); // Clear optimistic data on success
      return result;
    } catch (error) {
      setOptimisticData(null); // Revert optimistic update on error
      throw error;
    }
  }, [api, optimisticUpdate]);

  return {
    ...api,
    data: optimisticData || api.data,
    execute: executeOptimistic,
  };
};

// Hook for parallel API calls
export const useParallelApi = <T = any>(
  apiFunctions: (() => Promise<T>)[],
  options: UseApiOptions = {}
) => {
  const [state, setState] = useState<{
    data: T[] | null;
    loading: boolean;
    error: ApiError | null;
    success: boolean;
  }>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const { showToast = false, onSuccess, onError } = options;
  const { showSuccess, showError } = useToast();

  const execute = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      success: false,
    }));

    try {
      const results = await Promise.all(apiFunctions.map(fn => fn()));

      setState({
        data: results,
        loading: false,
        error: null,
        success: true,
      });

      if (showToast) {
        showSuccess('Success', 'All operations completed successfully');
      }

      if (onSuccess) {
        onSuccess(results);
      }

      return results;
    } catch (error: any) {
      const apiError: ApiError = {
        message: error.message || 'One or more operations failed',
        status: error.status || 500,
        code: error.code || 'PARALLEL_ERROR',
        details: error.details,
      };

      setState({
        data: null,
        loading: false,
        error: apiError,
        success: false,
      });

      if (showToast) {
        showError('Error', apiError.message);
      }

      if (onError) {
        onError(apiError);
      }

      throw apiError;
    }
  }, [apiFunctions, showToast, showSuccess, showError, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
};

export default useApi;