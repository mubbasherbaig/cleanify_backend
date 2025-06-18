import { useCallback } from 'react';
import { useToast } from './useToast';

export default function useNotifications() {
  const { showSuccess, showError } = useToast();

  const notifySuccess = useCallback((msg: string) => {
    showSuccess('Success', msg);
  }, [showSuccess]);

  const notifyError = useCallback((msg: string) => {
    showError('Error', msg);
  }, [showError]);

  return { notifySuccess, notifyError };
}