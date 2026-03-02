import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { apiClient, avatarManager, dataSyncManager, handleApiError } from '../utils/dataFetching';

interface UseResponsiveDataOptions<T> {
  initialData?: T;
  cache?: boolean;
  cacheDuration?: number;
  retryCount?: number;
  timeout?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

interface UseResponsiveDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  setData: (data: T) => void;
}

// Screen dimensions for responsive behavior
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
const isLargeScreen = screenWidth >= 414;
const isTablet = screenWidth >= 768;

// Responsive data fetching hook
export function useResponsiveData<T>(
  fetchFunction: () => Promise<T>,
  options: UseResponsiveDataOptions<T> = {}
): UseResponsiveDataReturn<T> {
  const {
    initialData = null,
    cache = true,
    cacheDuration,
    retryCount = 3,
    timeout = 10000,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // Enhanced fetch with retry logic
  const enhancedFetch = useCallback(async (): Promise<T> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        // Cancel previous request if it exists
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        // Set timeout
        const timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
        }, timeout);

        const result = await fetchFunction();
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Fetch attempt ${attempt} failed:`, error);

        if (attempt === retryCount) {
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw lastError!;
  }, [fetchFunction, retryCount, timeout]);

  // Main fetch function
  const fetchData = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await enhancedFetch();
      setData(result);
      retryCountRef.current = 0;
      onSuccess?.(result);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      retryCountRef.current++;
      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  }, [loading, enhancedFetch, onSuccess, onError]);

  // Refetch function (ignores cache)
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      setData(result);
      retryCountRef.current = 0;
      onSuccess?.(result);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      retryCountRef.current++;
      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, onSuccess, onError]);

  // Refresh function (with cache)
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && !loading) {
      refreshTimeoutRef.current = setTimeout(() => {
        refresh();
      }, refreshInterval);

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    }
  }, [autoRefresh, loading, refresh, refreshInterval]);

  // Initial fetch
  useEffect(() => {
    if (!isInitialized) {
      fetchData();
      setIsInitialized(true);
    }
  }, [isInitialized, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    refresh,
    clearError,
    setData,
  };
}

// User data hook
export function useUserData() {
  return useResponsiveData(
    () => apiClient.getUserProfile(),
    {
      cache: true,
      cacheDuration: 5 * 60 * 1000, // 5 minutes
      autoRefresh: true,
      refreshInterval: 2 * 60 * 1000, // 2 minutes
    }
  );
}

// Media list hook
export function useMediaList(params: {
  contentType?: string;
  search?: string;
  limit?: number;
  page?: number;
} = {}) {
  return useResponsiveData(
    () => apiClient.getMediaList(params),
    {
      cache: true,
      cacheDuration: 2 * 60 * 1000, // 2 minutes
      autoRefresh: true,
      refreshInterval: 60 * 1000, // 1 minute
    }
  );
}

// Avatar hook
export function useAvatar(userId: string) {
  return useResponsiveData(
    () => avatarManager.getAvatarUrl(userId),
    {
      cache: true,
      cacheDuration: 30 * 60 * 1000, // 30 minutes
    }
  );
}

// Content stats hook
export function useContentStats(contentId: string) {
  return useResponsiveData(
    () => apiClient.getContentStats(contentId),
    {
      cache: true,
      cacheDuration: 60 * 1000, // 1 minute
      autoRefresh: true,
      refreshInterval: 30 * 1000, // 30 seconds
    }
  );
}

// Responsive loading states hook
export function useResponsiveLoading() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading,
    }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const clearLoading = useCallback((key: string) => {
    setLoadingStates(prev => {
      const newStates = { ...prev };
      delete newStates[key];
      return newStates;
    });
  }, []);

  const clearAllLoading = useCallback(() => {
    setLoadingStates({});
  }, []);

  return {
    loadingStates,
    setLoading,
    isLoading,
    clearLoading,
    clearAllLoading,
  };
}

// Responsive error handling hook
export function useResponsiveError() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = useCallback((key: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [key]: error,
    }));
  }, []);

  const getError = useCallback((key: string) => {
    return errors[key] || null;
  }, [errors]);

  const clearError = useCallback((key: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    setError,
    getError,
    clearError,
    clearAllErrors,
  };
}

// Responsive data synchronization hook
export function useResponsiveSync() {
  const [syncStates, setSyncStates] = useState<Record<string, boolean>>({});

  const syncUserData = useCallback(async () => {
    setSyncStates(prev => ({ ...prev, user: true }));
    try {
      await dataSyncManager.syncUserData();
    } finally {
      setSyncStates(prev => ({ ...prev, user: false }));
    }
  }, []);

  const syncMediaData = useCallback(async () => {
    setSyncStates(prev => ({ ...prev, media: true }));
    try {
      await dataSyncManager.syncMediaData();
    } finally {
      setSyncStates(prev => ({ ...prev, media: false }));
    }
  }, []);

  const isSyncing = useCallback((key: string) => {
    return syncStates[key] || false;
  }, [syncStates]);

  return {
    syncStates,
    syncUserData,
    syncMediaData,
    isSyncing,
  };
}

// Responsive screen detection hook
export function useResponsiveScreen() {
  const [screenInfo, setScreenInfo] = useState({
    width: screenWidth,
    height: screenHeight,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isTablet,
    orientation: screenWidth > screenHeight ? 'landscape' : 'portrait',
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newWidth = window.width;
      const newHeight = window.height;
      
      setScreenInfo({
        width: newWidth,
        height: newHeight,
        isSmallScreen: newWidth < 375,
        isMediumScreen: newWidth >= 375 && newWidth < 414,
        isLargeScreen: newWidth >= 414,
        isTablet: newWidth >= 768,
        orientation: newWidth > newHeight ? 'landscape' : 'portrait',
      });
    });

    return () => subscription?.remove();
  }, []);

  return screenInfo;
}

// Responsive network status hook
export function useResponsiveNetwork() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    // Check initial network status
    const checkNetworkStatus = async () => {
      try {
        const response = await fetch('https://www.google.com', { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };

    checkNetworkStatus();

    // Set up network status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    connectionType,
  };
}
