import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../utils/api";
import { PerformanceMonitor, PerformanceOptimizer } from "../utils/performance";
import MobileHeader from "./MobileHeader";

type User = {
  firstName: string;
  lastName: string;
  avatar: string;
  section: string;
};

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      PerformanceMonitor.startTimer('header-user-fetch');
      setIsLoading(true);
      
      try {
        // Use performance optimizer for user data fetching
        const userData = await PerformanceOptimizer.optimizedFetch('user-profile', async () => {
          let token = await AsyncStorage.getItem("userToken");
          if (!token) {
            token = await AsyncStorage.getItem("token");
          }
          if (!token) {
            try {
              const { default: SecureStore } = await import('expo-secure-store');
              token = await SecureStore.getItemAsync('jwt');
            } catch (secureStoreError) {
              // Silent fallback
            }
          }
          
          if (!token) {
            return null;
          }

          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          // Handle different possible response structures
          const userData = data.user || data.data || null;
          
          if (userData && userData.firstName && userData.lastName) {
            await AsyncStorage.setItem("user", JSON.stringify(userData));
            // Refresh any media that was stuck with "Anonymous User"
            try {
              const { useMediaStore } = await import("../store/useUploadStore");
              await useMediaStore.getState().forceRefreshWithCompleteUserData();
            } catch (error) {
              console.error("❌ Failed to trigger media refresh:", error);
            }
          }
          
          return userData;
        }, {
          cacheDuration: 5 * 60 * 1000, // 5 minutes cache
          background: true,
        });

        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error("❌ Failed to fetch user:", error);
        // Try to load user from AsyncStorage as fallback
        try {
          const storedUser = await AsyncStorage.getItem("user");
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            console.log("📱 Loaded user from AsyncStorage fallback:", parsedUser);
          }
        } catch (storageError) {
          // Silent fallback
        }
      } finally {
        setIsLoading(false);
        PerformanceMonitor.endTimer('header-user-fetch');
      }
    };

    fetchUser();
  }, []);



  const refreshUserData = async () => {
    try {
      setIsLoading(true);
      let token = await AsyncStorage.getItem("userToken");
      if (!token) {
        token = await AsyncStorage.getItem("token");
      }
      if (!token) {
        try {
          const { default: SecureStore } = await import('expo-secure-store');
          token = await SecureStore.getItemAsync('jwt');
        } catch (secureStoreError) {
          // Silent fallback
        }
      }
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user || data.data || null;
        if (userData) {
          setUser(userData);
          await AsyncStorage.setItem("user", JSON.stringify(userData));
        }
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setIsLoading(false);
    }
  };

  const rightActions = [
    {
      icon: "search-outline",
      onPress: () => router.push("/ExploreSearch/ExploreSearch"),
    },
    {
      icon: "notifications-outline",
      onPress: () => router.push("/noitfication/NotificationsScreen"),
      badge: true,
    },
    {
      icon: "download-outline",
      onPress: () => router.push("/downloads/DownloadsScreen"),
    },
  

  ];

  return (
    <MobileHeader
      type="main"
      user={user ? {
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        section: user.section,
        isOnline: true,
      } : isLoading ? {
        firstName: "Loading...",
        lastName: "",
        section: "USER",
        isOnline: false,
      } : undefined}
      rightActions={rightActions}
    />
  );
}
