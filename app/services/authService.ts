import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthApiUrl } from '../utils/apiConfig';
import { NetworkUtils, logErrorDetails } from '../utils/networkUtils';

class AuthService {
  private baseURL: string = getAuthApiUrl();

  // Enhanced fetch with better error handling
  private async enhancedFetch(url: string, options: RequestInit = {}) {
    let timeoutId: number | null = null;
    
    try {
      console.log(`🔍 Making request to: ${url}`);
      
      // Check network connectivity first
      const networkStatus = await NetworkUtils.checkConnectivity();
      if (!networkStatus.isConnected) {
        throw new Error("No internet connection. Please check your network settings.");
      }

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      console.log(`✅ Request successful: ${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      logErrorDetails(error, `authService request to ${url}`);
      
      if (NetworkUtils.isNetworkError(error)) {
        throw new Error(NetworkUtils.getNetworkErrorMessage(error));
      }
      
      throw error;
    }
  }

  // Forgot Password - Step 1: Send reset code to email
  async forgotPassword(email: string) {
    try {
      console.log("🔍 Sending forgot password request for:", email);
      console.log("🔍 API URL:", `${this.baseURL}/forgot-password`);
      
      const response = await this.enhancedFetch(`${this.baseURL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();
      console.log("📧 Forgot password response:", data);
      console.log("📧 Response status:", response.status);
      console.log("📧 Response ok:", response.ok);

      return { 
        success: response.ok, 
        data,
        status: response.status 
      };
    } catch (error) {
      console.error("❌ Error in forgotPassword:", error);
      return { 
        success: false, 
        error: NetworkUtils.getNetworkErrorMessage(error),
        status: 0 
      };
    }
  }

  // Verify Reset Code - Step 2: Validate the 6-digit code
  async verifyResetCode(email: string, code: string) {
    try {
      console.log("🔍 Verifying reset code for:", email);
      
      const response = await this.enhancedFetch(`${this.baseURL}/verify-reset-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
        }),
      });

      const data = await response.json();
      console.log("✅ Verify reset code response:", data);

      return { 
        success: response.ok, 
        data,
        status: response.status 
      };
    } catch (error) {
      console.error("❌ Error in verifyResetCode:", error);
      return { 
        success: false, 
        error: NetworkUtils.getNetworkErrorMessage(error),
        status: 0 
      };
    }
  }

  // Reset Password - Step 3: Reset password with email, token, and new password
  async resetPassword(email: string, token: string, newPassword: string) {
    try {
      console.log("🔍 Resetting password for:", email);
      
      const response = await this.enhancedFetch(`${this.baseURL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          token: token.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await response.json();
      console.log("✅ Reset password response:", data);

      return { 
        success: response.ok, 
        data,
        status: response.status 
      };
    } catch (error) {
      console.error("❌ Error in resetPassword:", error);
      return { 
        success: false, 
        error: NetworkUtils.getNetworkErrorMessage(error),
        status: 0 
      };
    }
  }

  // Login with Jevah backend
  async login(email: string, password: string) {
    try {
      console.log("🔍 Logging in user:", email);
      console.log("🔍 API URL:", `${this.baseURL}/login`);
      
      const response = await this.enhancedFetch(`${this.baseURL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();
      console.log("✅ Login response:", data);

      if (response.ok && data.token) {
        await AsyncStorage.setItem("token", data.token);
        console.log("💾 Token stored in AsyncStorage");
        
        // Also store user data if available
        if (data.user) {
          console.log("🔍 Login user data:", {
            section: data.user.section,
            sectionType: typeof data.user.section,
            userKeys: Object.keys(data.user),
            fullUserData: data.user
          });
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
          console.log("💾 User data stored in AsyncStorage");
        }
      }

      return { 
        success: response.ok, 
        data,
        status: response.status 
      };
    } catch (error) {
      console.error("❌ Error in login:", error);
      logErrorDetails(error, 'authService login');
      return { 
        success: false, 
        error: NetworkUtils.getNetworkErrorMessage(error),
        status: 0 
      };
    }
  }

  // Register with Jevah backend
  async register(userData: any) {
    try {
      console.log("🔍 Registering new user:", userData.email);
      
      const response = await fetch(`${this.baseURL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      console.log("✅ Register response:", data);

      return { 
        success: response.ok, 
        data,
        status: response.status 
      };
    } catch (error) {
      console.error("❌ Error in register:", error);
      return { 
        success: false, 
        error: "Network error occurred",
        status: 0 
      };
    }
  }

  // Verify Email Code - For email verification during signup
  async verifyEmailCode(email: string, code: string) {
    try {
      console.log("🔍 Verifying email code for:", email);
      
      const response = await fetch(`${this.baseURL}/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
        }),
      });

      const data = await response.json();
      console.log("✅ Verify email response:", data);

      return { 
        success: response.ok, 
        data,
        status: response.status 
      };
    } catch (error: any) {
      console.error("❌ Error in verifyEmailCode:", error);
      return { 
        success: false, 
        error: "Network error occurred",
        status: 0 
      };
    }
  }

  // Resend Email Verification Code
  async resendEmailVerification(email: string) {
    try {
      console.log("🔍 Resending email verification for:", email);
      
      const response = await fetch(`${this.baseURL}/resend-email-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();
      console.log("✅ Resend email verification response:", data);

      return { 
        success: response.ok, 
        data,
        status: response.status 
      };
    } catch (error: any) {
      console.error("❌ Error in resendEmailVerification:", error);
      return { 
        success: false, 
        error: "Network error occurred",
        status: 0 
      };
    }
  }

  // Logout - Clear stored token
  async logout() {
    try {
      await AsyncStorage.removeItem("token");
      console.log("🗑️ Token removed from AsyncStorage");
      return { success: true };
    } catch (error) {
      console.error("❌ Error in logout:", error);
      return { success: false };
    }
  }

  // Get stored token
  async getToken() {
    try {
      const token = await AsyncStorage.getItem("token");
      console.log("🔑 Retrieved token from AsyncStorage:", token ? "exists" : "not found");
      return token;
    } catch (error) {
      console.error("❌ Error getting token:", error);
      return null;
    }
  }
}

export default new AuthService();


