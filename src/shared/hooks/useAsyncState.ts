import { useCallback, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface UseAsyncStateOptions {
  /**
   * Initial data value
   */
  initialData?: any;
  /**
   * Callback when async operation starts
   */
  onStart?: () => void;
  /**
   * Callback when async operation succeeds
   */
  onSuccess?: (data: any) => void;
  /**
   * Callback when async operation fails
   */
  onError?: (error: Error) => void;
  /**
   * Callback when async operation completes (success or error)
   */
  onFinally?: () => void;
}

/**
 * Hook for managing async operation state (loading, error, data)
 * Provides a DRY way to handle async operations throughout the app
 */
export function useAsyncState<T = any>(
  options: UseAsyncStateOptions = {}
): [
  AsyncState<T>,
  {
    execute: (asyncFn: () => Promise<T>) => Promise<T | null>;
    setData: (data: T | null) => void;
    setError: (error: Error | null) => void;
    setLoading: (loading: boolean) => void;
    reset: () => void;
  }
] {
  const { initialData = null, onStart, onSuccess, onError, onFinally } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (asyncFn: () => Promise<T>): Promise<T | null> => {
      try {
        onStart?.();
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const result = await asyncFn();
        setState({ data: result, loading: false, error: null });
        onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({ ...prev, loading: false, error: err }));
        onError?.(err);
        return null;
      } finally {
        onFinally?.();
      }
    },
    [onStart, onSuccess, onError, onFinally]
  );

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: Error | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  return [
    state,
    {
      execute,
      setData,
      setError,
      setLoading,
      reset,
    },
  ];
}

export default useAsyncState;






