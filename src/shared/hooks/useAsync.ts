import { useState, useEffect, useCallback } from 'react';
import { AsyncState, AsyncStatus } from '../types';

export interface UseAsyncOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  onFinally?: () => void;
}

export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions<T> = {}
) {
  const { immediate = true, onSuccess, onError, onFinally } = options;
  
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
  });

  const execute = useCallback(async (...args: any[]) => {
    setState({ status: 'loading' });
    
    try {
      const data = await asyncFunction(...args);
      setState({ status: 'success', data });
      onSuccess?.(data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ status: 'error', error: errorMessage });
      onError?.(errorMessage);
      throw error;
    } finally {
      onFinally?.();
    }
  }, [asyncFunction, onSuccess, onError, onFinally]);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.status === 'loading',
    isIdle: state.status === 'idle',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
  };
}

export function useAsyncCallback<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions<T> = {}
) {
  return useAsync(asyncFunction, { ...options, immediate: false });
}


