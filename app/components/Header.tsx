import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Platform, Text, TouchableOpacity, View } from "react-native";
import { API_BASE_URL } from "../utils/api";

const defaultAvatar = require("../../assets/images/image (5).png");

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

  return (
    <>
      {/* Status bar spacing for iOS */}
      {Platform.OS === 'ios' && (
        <View className="h-12 bg-white" />
      )}
      
      {/* Main header container */}
      <View className="w-full bg-white px-4 py-3 shadow-sm">
        <View className="flex-row justify-between items-center">
          {/* Left side - User info */}
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.push("/auth/Logout")}>
              <Image
                source={
                  typeof user?.avatar === "string" &&
                  user.avatar.startsWith("http")
                    ? { uri: user.avatar.trim() }
                    : defaultAvatar
                }
                className="w-[38px] h-[38px] rounded-[8px]"
              />
            </TouchableOpacity>

            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-rubik font-medium text-[#090E24]">
                {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
              </Text>
              <Text className="text-[10px] text-[#090E24] font-rubik font-medium">
                {user?.section?.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Right side - Action buttons */}
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => router.push("/ExploreSearch/ExploreSearch")}
              className="p-2"
            >
              <Ionicons name="search-outline" size={24} color="#090E24" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/noitfication/NotificationsScreen")}
              className="p-2"
            >
              <Ionicons name="notifications-outline" size={24} color="#090E24" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/downloads/DownloadsScreen")}
              className="p-2"
            >
              <Ionicons name="download-outline" size={24} color="#090E24" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Gray horizontal line under the component */}
      <View className="w-full h-[1px] bg-gray-300" />
    </>
  );
}
