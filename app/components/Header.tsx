import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../utils/api";
import MobileHeader from "./MobileHeader";

type User = {
  firstName: string;
  lastName: string;
  avatar: string;
  section: string;
};

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("👤 User API response:", data);
        
        // 🔄 If API returns complete user data, save it to AsyncStorage
        if (data.data && data.data.firstName && data.data.lastName) {
          setUser(data.data);
          await AsyncStorage.setItem("user", JSON.stringify(data.data));
          console.log("✅ Updated AsyncStorage with complete API user data:", {
            firstName: data.data.firstName,
            lastName: data.data.lastName,
            hasAvatar: !!data.data.avatar
          });
          
          // 🔄 Now that we have complete user data, refresh any media that was stuck with "Anonymous User"
          try {
            const { useMediaStore } = await import("../store/useUploadStore");
            await useMediaStore.getState().forceRefreshWithCompleteUserData();
            console.log("✅ Triggered media refresh with complete user data");
          } catch (error) {
            console.error("❌ Failed to trigger media refresh:", error);
          }
        } else {
          console.warn("⚠️ API returned incomplete user data:", data.data);
          setUser(data.data); // Still set in UI, but don't save to AsyncStorage
        }
      } catch (error) {
        console.error("❌ Failed to fetch user:", error);
      }
    };

    fetchUser();
  }, []);

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
      } : undefined}
      rightActions={rightActions}
    />
  );
}
