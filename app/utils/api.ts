import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { environmentManager } from './environmentManager';

// Prioritize environment variable over environment manager
let API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || environmentManager.getCurrentUrl();

// Log the API URL source for debugging
if (process.env.EXPO_PUBLIC_API_URL) {
  console.log('🌐 Using EXPO_PUBLIC_API_URL from environment:', process.env.EXPO_PUBLIC_API_URL);
} else {
  console.log('🌐 Using API URL from environment manager:', environmentManager.getCurrentUrl());
}

// Update API URL when environment changes (only if no environment variable is set)
if (!process.env.EXPO_PUBLIC_API_URL) {
  environmentManager.addListener((environment) => {
    API_BASE_URL = environmentManager.getCurrentUrl();
    console.log('🌐 Environment switched to:', environment, 'URL:', API_BASE_URL);
    
    // Update axios base URL
    apiAxios.defaults.baseURL = API_BASE_URL;
  });
}

// Log the current API URL for debugging
console.log('🌐 Final API Base URL:', API_BASE_URL);

// Configure axios defaults for better timeout handling
axios.defaults.timeout = 15000; // 15 seconds timeout

// Add retry interceptor with proper typing
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    if (!config) {
      return Promise.reject(error);
    }
    
    // Add retry configuration to config
    const retryConfig = config as any;
    retryConfig.retry = retryConfig.retry || 3;
    retryConfig.retryDelay = retryConfig.retryDelay || 1000;
    retryConfig.retryCount = retryConfig.retryCount || 0;
    
    if (retryConfig.retryCount >= retryConfig.retry) {
      return Promise.reject(error);
    }
    
    retryConfig.retryCount += 1;
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay));
    
    return axios(config);
  }
);

// Create a configured axios instance for API calls
export const apiAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to automatically add auth token
apiAxios.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token') || 
                   await AsyncStorage.getItem('userToken') || 
                   await AsyncStorage.getItem('authToken');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced API utility functions
export class APIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Get authorization header with user token
  async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return headers;
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  }

  // Generic API request method
  async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: any;
      headers?: HeadersInit;
      requireAuth?: boolean;
    } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers: customHeaders = {},
      requireAuth = true
    } = options;

    try {
      const authHeaders = requireAuth ? await this.getAuthHeaders() : { 'Content-Type': 'application/json' };
      const headers = { ...authHeaders, ...customHeaders };

      const config: RequestInit = {
        method,
        headers,
      };

      if (body && method !== 'GET') {
        config.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as unknown as T;
      }
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    const response = await this.request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      requireAuth: false,
    });

    // Store token and user data
    await AsyncStorage.setItem('userToken', response.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));

    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    username: string;
    fullName?: string;
  }): Promise<{ user: any; token: string }> {
    const response = await this.request<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: userData,
      requireAuth: false,
    });

    // Store token and user data
    await AsyncStorage.setItem('userToken', response.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear local storage regardless of API success
      await AsyncStorage.multiRemove(['userToken', 'user']);
    }
  }

  async refreshToken(): Promise<string> {
    const response = await this.request<{ token: string }>('/api/auth/refresh', {
      method: 'POST',
    });

    await AsyncStorage.setItem('userToken', response.token);
    return response.token;
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return !!token;
    } catch (error) {
      return false;
    }
  }

  // Get current user data
  async getCurrentUser(): Promise<any> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
}

// Export function to get current API base URL
export function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL || environmentManager.getCurrentUrl();
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;
