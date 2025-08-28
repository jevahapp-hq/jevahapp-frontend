import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import authService from '../services/authService';
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
      // Normalize inputs
      const normalizedEmail = credentials.email.trim().toLowerCase();
      const normalizedPassword = credentials.password.trim();

      // Set timeout for the request
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, 10000); // 10 second timeout

      // Attempt login
      const result = await authService.login(normalizedEmail, normalizedPassword);

      clearTimeout(timeoutId);

      if (!result.success) {
        const message = result.data?.message || result.error || 'Invalid email or password';
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

      // Preload critical data for faster navigation
      performanceOptimizer.preloadCriticalData().catch(() => {
        // Silent fail for preloading
      });

      // Navigate immediately
      router.replace("/categories/HomeScreen");
      return true;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setState(prev => ({ 
          ...prev, 
          error: 'Request timeout. Please check your connection and try again.' 
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          error: 'An unexpected error occurred. Please try again.' 
        }));
      }
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
      abortControllerRef.current = null;
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
