import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addToast, removeToast, clearToasts } from '@/store/slices/uiSlice';
import { Toast } from '@/types/ui';

interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface UseToastReturn {
  showToast: (options: ToastOptions) => string;
  showSuccess: (title: string, message?: string) => string;
  showError: (title: string, message?: string) => string;
  showWarning: (title: string, message?: string) => string;
  showInfo: (title: string, message?: string) => string;
  hideToast: (toastId: string) => void;
  clearAll: () => void;
}

export const useToast = (): UseToastReturn => {
  const dispatch = useDispatch();

  const showToast = useCallback((options: ToastOptions): string => {
    const toastData: Omit<Toast, 'id'> = {
      type: options.type,
      title: options.title,
      message: options.message,
      duration: options.duration || 5000,
      action: options.action,
    };

    dispatch(addToast(toastData));
    
    // Return a mock ID for consistency (actual ID is generated in the slice)
    return `toast-${Date.now()}`;
  }, [dispatch]);

  const showSuccess = useCallback((title: string, message?: string): string => {
    return showToast({
      type: 'success',
      title,
      message,
    });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string): string => {
    return showToast({
      type: 'error',
      title,
      message,
      duration: 8000, // Longer duration for errors
    });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string): string => {
    return showToast({
      type: 'warning',
      title,
      message,
      duration: 6000,
    });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string): string => {
    return showToast({
      type: 'info',
      title,
      message,
    });
  }, [showToast]);

  const hideToast = useCallback((toastId: string) => {
    dispatch(removeToast(toastId));
  }, [dispatch]);

  const clearAll = useCallback(() => {
    dispatch(clearToasts());
  }, [dispatch]);

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
    clearAll,
  };
};

export default useToast;