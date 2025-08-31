import Constants from 'expo-constants';

// Get API base URL with fallback for different environments
export const getApiBaseUrl = (): string => {
  // Check for environment variable first
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envApiUrl) {
    console.log('🌐 Using API URL from environment variable:', envApiUrl);
    return envApiUrl;
  }

  // Check for Expo config
  const configApiUrl = Constants.expoConfig?.extra?.API_URL;
  if (configApiUrl) {
    console.log('🌐 Using API URL from Expo config:', configApiUrl);
    return configApiUrl;
  }

  // Development vs Production fallback
  if (__DEV__) {
    // For development, try localhost with common ports
    const localhostUrl = 'http://localhost:8081/api';
    console.log('🌐 Using localhost API URL for development:', localhostUrl);
    return localhostUrl;
  } else {
    // For production, use the hosted backend
    const productionUrl = 'https://jevahapp-backend.onrender.com/api';
    console.log('🌐 Using production API URL:', productionUrl);
    return productionUrl;
  }
};

// Get auth-specific API URL
export const getAuthApiUrl = (): string => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/auth`;
};

// Get content-specific API URL
export const getContentApiUrl = (): string => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/content`;
};

// Test API connectivity
export const testApiConnectivity = async (): Promise<boolean> => {
  try {
    const authUrl = getAuthApiUrl();
    console.log('🔍 Testing API connectivity to:', authUrl);
    
    const response = await fetch(`${authUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'testpassword'
      }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    console.log('✅ API connectivity test successful:', response.status);
    return true;
  } catch (error) {
    console.error('❌ API connectivity test failed:', error);
    return false;
  }
};

// Configuration object for easy access
export const apiConfig = {
  baseUrl: getApiBaseUrl(),
  authUrl: getAuthApiUrl(),
  contentUrl: getContentApiUrl(),
  isDev: __DEV__,
  testConnectivity: testApiConnectivity
};
