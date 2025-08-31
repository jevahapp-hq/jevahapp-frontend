// Try to import NetInfo, but provide fallback if not available
let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch (error) {
  console.log('⚠️ NetInfo package not available, using fallback network detection');
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isWifi: boolean;
  isCellular: boolean;
}

export class NetworkUtils {
  /**
   * Check if the device has an active internet connection
   */
  static async checkConnectivity(): Promise<NetworkStatus> {
    try {
      // Use NetInfo if available
      if (NetInfo) {
        const state = await NetInfo.fetch();
        
        const networkStatus: NetworkStatus = {
          isConnected: state.isConnected ?? false,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
          isWifi: state.type === 'wifi',
          isCellular: state.type === 'cellular',
        };

        console.log('🌐 Network status (NetInfo):', networkStatus);
        return networkStatus;
      } else {
        // Fallback: test connectivity by making a simple request
        return await this.checkConnectivityFallback();
      }
    } catch (error) {
      console.error('❌ Error checking network connectivity:', error);
      return await this.checkConnectivityFallback();
    }
  }

  /**
   * Fallback connectivity check using a simple fetch request
   */
  private static async checkConnectivityFallback(): Promise<NetworkStatus> {
    try {
      console.log('🔍 Using fallback network detection...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      const networkStatus: NetworkStatus = {
        isConnected: response.ok,
        isInternetReachable: response.ok,
        type: 'unknown',
        isWifi: false,
        isCellular: false,
      };

      console.log('🌐 Network status (fallback):', networkStatus);
      return networkStatus;
    } catch (error) {
      console.log('❌ Fallback network check failed:', error);
      return {
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
        isWifi: false,
        isCellular: false,
      };
    }
  }

  /**
   * Test if the API server is reachable
   */
  static async testApiConnectivity(): Promise<boolean> {
    try {
      console.log('🔍 Testing API connectivity...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://jevahapp-backend.onrender.com/api/health', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      const isReachable = response.ok;
      console.log(`✅ API connectivity test: ${isReachable ? 'SUCCESS' : 'FAILED'} (${response.status})`);
      
      return isReachable;
    } catch (error) {
      console.error('❌ API connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Get a user-friendly network error message
   */
  static getNetworkErrorMessage(error: any): string {
    if (!error) return 'Unknown network error';

    const errorMessage = error.message || error.toString();

    if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
      return 'Request timeout. Please check your connection and try again.';
    }

    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return 'Authentication failed. Please login again.';
    }

    if (errorMessage.includes('403')) {
      return 'Access denied. You don\'t have permission for this action.';
    }

    if (errorMessage.includes('404')) {
      return 'Resource not found. Please contact support.';
    }

    if (errorMessage.includes('500')) {
      return 'Server error. Please try again later.';
    }

    if (errorMessage.includes('TypeError')) {
      return 'Network error. Please check your connection and try again.';
    }

    return errorMessage || 'Network error occurred. Please try again.';
  }

  /**
   * Check if the error is a network-related error
   */
  static isNetworkError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || error.toString();
    
    return (
      errorMessage.includes('Network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('AbortError') ||
      errorMessage.includes('TypeError') ||
      error.name === 'TypeError'
    );
  }

  /**
   * Check if the error is an authentication error
   */
  static isAuthError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || error.toString();
    
    return (
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Authentication')
    );
  }

  /**
   * Log detailed error information for debugging
   */
  static logErrorDetails(error: any, context: string = 'Unknown'): void {
    console.error(`❌ Error in ${context}:`, {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      type: typeof error,
      context: context,
      timestamp: new Date().toISOString(),
    });
  }
}

// Export convenience functions
export const checkConnectivity = () => NetworkUtils.checkConnectivity();
export const testApiConnectivity = () => NetworkUtils.testApiConnectivity();
export const getNetworkErrorMessage = (error: any) => NetworkUtils.getNetworkErrorMessage(error);
export const isNetworkError = (error: any) => NetworkUtils.isNetworkError(error);
export const isAuthError = (error: any) => NetworkUtils.isAuthError(error);
export const logErrorDetails = (error: any, context?: string) => NetworkUtils.logErrorDetails(error, context);
