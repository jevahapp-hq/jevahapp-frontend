import AsyncStorage from '@react-native-async-storage/async-storage';

// Jevah Backend API Base URL
const JEVAH_API_BASE_URL = "https://jevahapp-backend.onrender.com/api/auth";

class AuthService {
  private baseURL: string = JEVAH_API_BASE_URL;

  // Forgot Password - Step 1
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

  // Verify Reset Code - Step 2
  async verifyResetCode(email: string, code: string) {
    try {
      console.log("🔍 Verifying reset code for:", email, "code:", code);
      
      const response = await fetch(`${this.baseURL}/verify-reset-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: email.trim(),
          code: code.trim()
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

  // Reset Password - Step 3
  async resetPasswordWithCode(email: string, code: string, newPassword: string) {
    try {
      console.log("🔍 Resetting password for:", email);
      
      const response = await fetch(`${this.baseURL}/reset-password-with-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
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
      console.error("❌ Error in resetPasswordWithCode:", error);
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
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await response.json();
      console.log("✅ Login response:", data);

      if (response.ok && data.token) {
        // Store token and user data
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('token', data.token);
        
        if (data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
        }
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
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    try {
      console.log("🔍 Registering user:", userData.email);
      
      const response = await fetch(`${this.baseURL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userData.email.trim().toLowerCase(),
          password: userData.password.trim(),
          firstName: userData.firstName.trim(),
          lastName: userData.lastName.trim(),
        }),
      });

      const data = await response.json();
      console.log("✅ Register response:", data);

      if (response.ok && data.token) {
        // Store token and user data
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('token', data.token);
        
        if (data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
        }
      }

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

  // Logout
  async logout() {
    try {
      await AsyncStorage.multiRemove(['userToken', 'token', 'user']);
      console.log("✅ User logged out successfully");
    } catch (error) {
      console.error("❌ Error in logout:", error);
    }
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

export default new AuthService();


