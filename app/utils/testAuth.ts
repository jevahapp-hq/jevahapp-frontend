import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';

export const testAuthentication = async () => {
  console.log('🧪 Testing Authentication Status...');
  
  try {
    // Check current auth status
    const token = await AsyncStorage.getItem("token");
    const userRaw = await AsyncStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    
    console.log('📊 Current Auth Status:', {
      hasToken: !!token,
      hasUser: !!user,
      tokenLength: token?.length || 0,
      userKeys: user ? Object.keys(user) : null,
      userData: user ? {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        hasAvatar: !!user.avatar
      } : null
    });

    // Test auth service methods
    const isAuth = await authService.isAuthenticated();
    const storedUser = await authService.getUser();
    const storedToken = await authService.getToken();
    
    console.log('🔧 Auth Service Results:', {
      isAuthenticated: isAuth,
      storedUser: storedUser ? Object.keys(storedUser) : null,
      storedToken: !!storedToken
    });

    return {
      success: true,
      hasToken: !!token,
      hasUser: !!user,
      isAuthenticated: isAuth
    };
  } catch (error) {
    console.error('❌ Auth Test Failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const testAPIConnectivity = async () => {
  console.log('🌐 Testing API Connectivity...');
  
  try {
    const API_BASE_URL = "https://api.jevahapp.com";
    
    // Test basic connectivity
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'testpassword'
      })
    });
    
    console.log('📡 API Response Status:', response.status);
    
    return {
      success: true,
      status: response.status,
      isReachable: response.status < 500 // Any response means server is reachable
    };
  } catch (error) {
    console.error('❌ API Connectivity Test Failed:', error);
    return {
      success: false,
      error: error.message,
      isReachable: false
    };
  }
};

export const clearAuthForTesting = async () => {
  console.log('🧹 Clearing auth data for testing...');
  try {
    await authService.clearAuthData();
    console.log('✅ Auth data cleared successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to clear auth data:', error);
    return { success: false, error: error.message };
  }
};
