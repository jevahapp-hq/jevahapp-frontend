import { API_CONFIG } from '../../shared/constants';
import { ApiResponse } from '../../shared/types';

class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add auth token if available
    const authToken = await this.getAuthToken();
    if (authToken) {
      defaultHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      timeout: this.timeout,
    };

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${response.status} ${response.statusText}`, errorText);
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log(`✅ API Success: ${options.method || 'GET'} ${url}`);
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(`❌ API Exception: ${options.method || 'GET'} ${url}`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Get authentication token
  private async getAuthToken(): Promise<string | null> {
    try {
      // Import TokenUtils dynamically to avoid circular dependencies
      const TokenUtils = await import('../../../app/utils/tokenUtils');
      return await TokenUtils.default.getAuthToken();
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>(url.pathname + url.search, {
      method: 'GET',
    });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Upload file
  async upload<T>(
    endpoint: string,
    file: any,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const authToken = await this.getAuthToken();
    
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      console.log(`📤 Upload Request: POST ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        timeout: this.timeout,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Upload Error: ${response.status} ${response.statusText}`, errorText);
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log(`✅ Upload Success: POST ${url}`);
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(`❌ Upload Exception: POST ${url}`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Test endpoint availability
  async testEndpoint(endpoint: string): Promise<boolean> {
    try {
      const response = await this.get(endpoint);
      return response.success;
    } catch (error) {
      console.warn(`Endpoint test failed for ${endpoint}:`, error);
      return false;
    }
  }

  // Retry with exponential backoff
  async retry<T>(
    fn: () => Promise<ApiResponse<T>>,
    maxAttempts: number = API_CONFIG.RETRY_ATTEMPTS
  ): Promise<ApiResponse<T>> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error;
      }
      
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;