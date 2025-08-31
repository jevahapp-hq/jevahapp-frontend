import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { apiClient } from "../utils/dataFetching";
import { NetworkUtils, logErrorDetails } from "../utils/networkUtils";

// User type based on the new API response structure
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
  avatarUpload: string | null;
  section: string;
  role: string;
  isProfileComplete: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export const useUserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = async (): Promise<string | null> => {
    try {
      let token = await AsyncStorage.getItem("userToken");
      if (!token) {
        token = await AsyncStorage.getItem("token");
      }
      if (!token) {
        try {
          const { default: SecureStore } = await import('expo-secure-store');
          token = await SecureStore.getItemAsync('jwt');
        } catch (secureStoreError) {
          console.log("🔍 SecureStore not available, continuing without it");
        }
      }
      console.log("🔑 Token found:", token ? "Yes" : "No");
      return token;
    } catch (error) {
      console.error("❌ Error getting token:", error);
      return null;
    }
  };

  const clearTokens = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("token");
      try {
        const { default: SecureStore } = await import('expo-secure-store');
        await SecureStore.deleteItemAsync('jwt');
      } catch (secureStoreError) {
        console.log("🔍 SecureStore not available for clearing");
      }
      console.log("🗑️ Tokens cleared successfully");
    } catch (error) {
      console.error("❌ Error clearing tokens:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Fetching user profile...");
      
      // Check network connectivity first
      const token = await getToken();
      if (!token) {
        console.warn("⚠️ No authentication token found");
        setError("No authentication token. Please login again.");
        return;
      }

      // Check network connectivity before making API call
      const networkStatus = await NetworkUtils.checkConnectivity();
      if (!networkStatus.isConnected) {
        throw new Error("No internet connection. Please check your network settings.");
      }

      // Try to fetch user profile with better error handling
      let userData;
      try {
        userData = await apiClient.getUserProfile();
        console.log("✅ User profile fetched successfully:", userData);
      } catch (apiError: any) {
        console.error("❌ API call failed:", apiError);
        logErrorDetails(apiError, 'getUserProfile API call');
        
        // Handle specific error types using NetworkUtils
        if (NetworkUtils.isNetworkError(apiError)) {
          throw new Error(NetworkUtils.getNetworkErrorMessage(apiError));
        }
        
        if (NetworkUtils.isAuthError(apiError)) {
          await clearTokens();
          throw new Error("Session expired. Please login again.");
        }
        
        // Re-throw the original error if it's not a known type
        throw apiError;
      }
      
      if (userData && userData.user) {
        console.log("🔍 User section data:", {
          section: userData.user.section,
          sectionType: typeof userData.user.section,
          userKeys: Object.keys(userData.user),
          fullUserData: userData.user
        });
        
        // Ensure section is set if missing
        const userWithSection = {
          ...userData.user,
          section: userData.user.section || "adult" // Default to adult if section is missing
        };
        
        setUser(userWithSection);
        
        // Store the complete user data
        try {
          await AsyncStorage.setItem("user", JSON.stringify(userWithSection));
          console.log("💾 User data stored in AsyncStorage");
        } catch (storageError) {
          console.error("❌ Failed to store user data:", storageError);
        }
        
        // Refresh any media that was stuck with "Anonymous User"
        try {
          const { useMediaStore } = await import("../store/useUploadStore");
          await useMediaStore.getState().forceRefreshWithCompleteUserData();
        } catch (error) {
          console.error("❌ Failed to trigger media refresh:", error);
        }
      } else {
        console.warn("⚠️ No user data received from API");
        setError("No user data received from server");
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch user profile:", error);
      logErrorDetails(error, 'fetchUserProfile');
      
      // Set appropriate error message using NetworkUtils
      const errorMessage = NetworkUtils.getNetworkErrorMessage(error);
      setError(errorMessage);
      
      // Try to load user from AsyncStorage as fallback
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log("📱 Loaded user from AsyncStorage fallback:", parsedUser);
        } else {
          console.log("📱 No user data found in AsyncStorage");
        }
      } catch (storageError) {
        console.error("❌ Failed to load user from AsyncStorage:", storageError);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    await fetchUserProfile();
  };

  const updateUserProfile = (updatedUser: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedUser };
      setUser(newUser);
      AsyncStorage.setItem("user", JSON.stringify(newUser));
    }
  };

  const clearUserProfile = async () => {
    setUser(null);
    setError(null);
    await AsyncStorage.removeItem("user");
    await clearTokens();
  };

  const getAvatarUrl = (user: User) => {
    return user.avatarUpload || user.avatar || null;
  };

  const getFullName = (user: User) => {
    return `${user.firstName} ${user.lastName}`.trim();
  };

  const isProfileComplete = () => {
    return user?.isProfileComplete || false;
  };

  const isEmailVerified = () => {
    return user?.isEmailVerified || false;
  };

  const getUserSection = () => {
    return user?.section || "adults";
  };

  const getUserRole = () => {
    return user?.role || "learner";
  };

  // Load user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  return {
    user,
    loading,
    error,
    fetchUserProfile,
    refreshUserProfile,
    updateUserProfile,
    clearUserProfile,
    getAvatarUrl,
    getFullName,
    isProfileComplete,
    isEmailVerified,
    getUserSection,
    getUserRole,
  };
};




