import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../utils/dataFetching";

// User type based on the new API response structure
export type User = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string | null;
  avatarUpload?: string | null;
  bio?: string | null;
  section?: string;
  role?: string;
  isProfileComplete?: boolean;
  isEmailVerified?: boolean;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const useUserProfile = () => {
  const queryClient = useQueryClient();
  
  // Try to load from AsyncStorage first for instant display
  const [initialUser, setInitialUser] = useState<User | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);

  // Load from AsyncStorage on mount for instant display
  useEffect(() => {
    const loadFromStorage = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setInitialUser(parsedUser);
        }
      } catch (error) {
        // Silent fail
      } finally {
        setStorageLoaded(true);
      }
    };
    loadFromStorage();
  }, []);

  // Use React Query for automatic caching (0ms on revisit!)
  const {
    data: user,
    isLoading: queryLoading,
    error: queryError,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const userData = await apiClient.getUserProfile();

      if (!userData || !userData.user) {
        throw new Error("No user data received");
      }

      // Ensure section is set if missing and handle optional fields
      const userWithSection = {
        ...userData.user,
        id: userData.user.id || userData.user._id || "",
        firstName: userData.user.firstName || "",
        lastName: userData.user.lastName || "",
        email: userData.user.email || "",
        section: userData.user.section || "adult",
        role: userData.user.role || "learner",
        isProfileComplete: userData.user.isProfileComplete || false,
        isEmailVerified: userData.user.isEmailVerified || false,
        avatar: userData.user.avatar || null,
        avatarUpload: userData.user.avatarUpload || null,
        isOnline: userData.user.isOnline || false,
        createdAt: userData.user.createdAt || "",
        updatedAt: userData.user.updatedAt || "",
      };

      // Only accept if it has at least one of first/last name to avoid seeded defaults
      if (
        !userWithSection.firstName &&
        !userWithSection.lastName &&
        !userWithSection.email
      ) {
        throw new Error("Incomplete user profile (to avoid stale default)");
      }

      // Save to AsyncStorage for persistence
      await AsyncStorage.setItem("user", JSON.stringify(userWithSection));

      // Cache user profile by userId for content enrichment
      const userId = userWithSection.id || userWithSection._id;
      if (userId) {
        try {
          const { userProfileCache } = await import("../utils/dataFetching");
          userProfileCache.cacheUserProfile(userId, userWithSection);
        } catch (error) {
          console.warn("⚠️ Failed to cache user profile:", error);
        }
      }

      // Refresh any media that was stuck with "Anonymous User"
      try {
        const { useMediaStore } = await import("../store/useUploadStore");
        await useMediaStore.getState().forceRefreshWithCompleteUserData();
      } catch (error) {
        console.error("❌ Failed to trigger media refresh:", error);
      }

      // Refresh interaction stats after profile fetch
      try {
        const { useInteractionStore } = await import(
          "../store/useInteractionStore"
        );
        await useInteractionStore.getState().refreshAllStatsAfterLogin();
      } catch (error) {
        console.warn("⚠️ Failed to refresh interaction stats after profile fetch:", error);
      }

      return userWithSection;
    },
    enabled: storageLoaded, // Wait for storage to load first
    staleTime: 15 * 60 * 1000, // 15 minutes - matches backend cache
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnMount: false, // Use cache if available - 0ms on revisit!
    refetchOnWindowFocus: false,
    // Use initial data from AsyncStorage for instant display
    initialData: initialUser || undefined,
    // Fallback to AsyncStorage on error
    retryOnMount: false,
  });

  // Use React Query data, fallback to initialUser from storage
  const finalUser = user || initialUser;
  const loading = !storageLoaded || (queryLoading && !initialUser);
  
  // Handle errors with fallback to storage
  const error = queryError
    ? (() => {
        const errorMessage = (queryError as Error).message || "Failed to fetch user profile";
        
        // Handle specific error types
        if (
          errorMessage.includes("Unauthorized") ||
          errorMessage.includes("401")
        ) {
          return "Session expired. Please login again.";
        } else if (errorMessage.includes("Network error")) {
          return "Network error. Please check your connection and try again.";
        } else if (errorMessage.includes("User profile not found")) {
          return "User profile not found. Please contact support.";
        } else if (errorMessage.includes("Authentication failed")) {
          return "Authentication failed. Please login again.";
        }
        
        return errorMessage;
      })()
    : null;

  const getToken = async (): Promise<string | null> => {
    let token = await AsyncStorage.getItem("userToken");
    if (!token) {
      token = await AsyncStorage.getItem("token");
    }
    if (!token) {
      try {
        const { default: SecureStore } = await import("expo-secure-store");
        token = await SecureStore.getItemAsync("jwt");
      } catch (secureStoreError) {
        // Silent fallback
      }
    }
    return token;
  };

  const clearTokens = async () => {
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("token");
    try {
      const { default: SecureStore } = await import("expo-secure-store");
      await SecureStore.deleteItemAsync("jwt");
    } catch (secureStoreError) {
      // Silent fallback
    }
  };

  const fetchUserProfile = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  const refreshUserProfile = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  const updateUserProfile = useCallback((updatedUser: Partial<User>) => {
    if (finalUser) {
      const newUser = { ...finalUser, ...updatedUser };
      // Update React Query cache
      queryClient.setQueryData(["user-profile"], newUser);
      // Update AsyncStorage
      AsyncStorage.setItem("user", JSON.stringify(newUser));
    }
  }, [finalUser, queryClient]);

  const clearUserProfile = useCallback(async () => {
    // Clear React Query cache
    queryClient.setQueryData(["user-profile"], null);
    queryClient.removeQueries({ queryKey: ["user-profile"] });
    // Clear AsyncStorage
    await AsyncStorage.removeItem("user");
    await clearTokens();
  }, [queryClient]);

  const getAvatarUrl = useCallback((user: User) => {
    return user.avatarUpload || user.avatar || null;
  }, []);

  const getFullName = useCallback((user: User) => {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  }, []);

  const isProfileComplete = useCallback(() => {
    return finalUser?.isProfileComplete || false;
  }, [finalUser]);

  const isEmailVerified = useCallback(() => {
    return finalUser?.isEmailVerified || false;
  }, [finalUser]);

  const getUserSection = useCallback(() => {
    return finalUser?.section || "adult";
  }, [finalUser]);

  const getUserRole = useCallback(() => {
    return finalUser?.role || "learner";
  }, [finalUser]);

  return {
    user: finalUser,
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
