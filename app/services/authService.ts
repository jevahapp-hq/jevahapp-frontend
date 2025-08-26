import AsyncStorage from '@react-native-async-storage/async-storage';

// Jevah Backend API Base URL
const JEVAH_API_BASE_URL = "https://jevahapp-backend.onrender.com/api/auth";

class AuthService {
  private baseURL: string = JEVAH_API_BASE_URL;

  // Forgot Password - Step 1: Send reset code to email
  async forgotPassword(email: string) {
    try {
      console.log("🔍 Sending forgot password request for:", email);
      
      const response = await fetch(`${this.baseURL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();
      console.log("📧 Forgot password response:", data);

      return { 
        success: response.ok, 
        data,
        status: response.status 
      };
    } catch (error) {
      console.error("❌ Error in forgotPassword:", error);
      return { 
        success: false, 
        error: "Network error occurred",
        status: 0 
      };
    }
  }

  // Verify Reset Code - Step 2: Validate the 6-digit code
  async verifyResetCode(email: string, code: string) {
    try {
      console.log("🔍 Verifying reset code for:", email);
      
      const response = await fetch(`${this.baseURL}/verify-reset-code`, {
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
        error: "Network error occurred",
        status: 0 
      };
    }
  }

  // Reset Password - Step 3: Reset password with email, token, and new password
  async resetPassword(email: string, token: string, newPassword: string) {
    try {
      console.log("🔍 Resetting password for:", email);
      
      const response = await fetch(`${this.baseURL}/reset-password`, {
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
        error: "Network error occurred",
        status: 0 
      };
    }
  }

  // Login with Jevah backend
  async login(email: string, password: string) {
    try {
      console.log("🔍 Logging in user:", email);
      
      const response = await fetch(`${this.baseURL}/login`, {
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
      }

      return { 
        success: response.ok, 
        data,
        status: response.status 
      };
    } catch (error) {
      console.error("❌ Error in login:", error);
      return { 
        success: false, 
        error: "Network error occurred",
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


