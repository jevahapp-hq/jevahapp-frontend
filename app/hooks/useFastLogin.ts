import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import authService from '../services/authService';
import { NetworkUtils, logErrorDetails } from '../utils/networkUtils';
import { performanceOptimizer } from '../utils/performance';

interface LoginState {
  isLoading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

export const useFastLogin = () => {
  const [state, setState] = useState<LoginState>({
    isLoading: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const validateCredentials = useCallback((credentials: LoginCredentials): string | null => {
    const { email, password } = credentials;

    if (!email.trim()) {
      return 'Email is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      return 'Invalid email format';
    }

    if (!password) {
      return 'Password is required';
    }

    if (password.length < 6 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return 'Password must be at least 6 characters with letters and numbers';
    }

    return null;
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    // Clear previous error immediately
    setState(prev => ({ ...prev, error: null }));

    // Quick validation
    const validationError = validateCredentials(credentials);
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }));
      return false;
    }

    // Start loading immediately
    setState(prev => ({ ...prev, isLoading: true }));

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Check network connectivity before attempting login
      console.log("🔍 Checking network connectivity before login...");
      const networkStatus = await NetworkUtils.checkConnectivity();
      if (!networkStatus.isConnected) {
        setState(prev => ({ 
          ...prev, 
          error: "No internet connection. Please check your network settings and try again." 
        }));
        return false;
      }

      // Normalize inputs
      const normalizedEmail = credentials.email.trim().toLowerCase();
      const normalizedPassword = credentials.password.trim();

      console.log("🔍 Attempting login with network connectivity confirmed...");

      // Attempt login
      const result = await authService.login(normalizedEmail, normalizedPassword);

      if (!result.success) {
        const message = result.data?.message || result.error || 'Invalid email or password';
        console.log("❌ Login failed:", message);
        setState(prev => ({ ...prev, error: message }));
        return false;
      }

      // Quick user data validation
      if (result.data?.user) {
        if (!result.data.user.firstName || !result.data.user.lastName) {
          setState(prev => ({ 
            ...prev, 
            error: 'Incomplete user profile. Please contact support.' 
          }));
          return false;
        }
      }

      console.log("✅ Login successful, preloading critical data...");

      // Preload critical data for faster navigation
      performanceOptimizer.preloadCriticalData().catch(() => {
        // Silent fail for preloading
      });

      // Navigate immediately
      router.replace("/categories/HomeScreen");
      return true;

    } catch (error: any) {
      console.error("❌ Login error:", error);
      logErrorDetails(error, 'useFastLogin');
      
      if (error.name === 'AbortError') {
        setState(prev => ({ 
          ...prev, 
          error: "Login request timed out. Please check your connection and try again." 
        }));
      } else if (NetworkUtils.isNetworkError(error)) {
        setState(prev => ({ 
          ...prev, 
          error: NetworkUtils.getNetworkErrorMessage(error)
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          error: error.message || "Login failed. Please try again." 
        }));
      }
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [validateCredentials]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null });
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    ...state,
    login,
    clearError,
    reset
  };
};
