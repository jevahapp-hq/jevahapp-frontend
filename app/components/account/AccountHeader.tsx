import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

type AccountHeaderProps = {
  user: any;
  getAvatarUrl: (user: any) => string | null | undefined;
  getFullName: (user: any) => string;
  getUserSection: () => string;
  onPressProfile: () => void;
};

export default function AccountHeader({
  user,
  getAvatarUrl,
  getFullName,
  getUserSection,
  onPressProfile,
}: AccountHeaderProps) {
  const [avatarError, setAvatarError] = useState(false);
  const avatarUrl = user ? getAvatarUrl(user) ?? undefined : undefined;

  return (
    <View className="flex-row items-center justify-between w-full px-4 py-3 border-b border-gray-100">
      {/* Left Side - User Profile */}
      <TouchableOpacity
        onPress={onPressProfile}
        className="flex-row items-center flex-1"
        activeOpacity={0.7}
      >
        <View className="relative">
          {user && avatarUrl && !avatarError ? (
            <Image
              source={{ uri: avatarUrl }}
              className="w-10 h-10 rounded-lg"
              style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <View
              className="w-10 h-10 rounded-lg justify-center items-center"
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "#F3F4F6",
              }}
            >
              <Text className="text-gray-600 font-semibold text-sm">
                {user?.firstName?.[0]?.toUpperCase() ||
                  user?.lastName?.[0]?.toUpperCase() ||
                  "U"}
              </Text>
            </View>
          )}
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-[15px] font-semibold text-[#3B3B3B] leading-5">
              {user ? getFullName(user) : "Loading..."}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color="#6B7280"
              style={{ marginLeft: 8 }}
            />
          </View>
          <Text className="text-[12px] text-[#3B3B3B] font-medium mt-0.5">
            {user ? getUserSection().toUpperCase() : "USER"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Right Side - Action Buttons */}
      <View className="flex-row items-center space-x-3">
        <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-gray-50">
          <Ionicons name="send" size={20} color="#3B3B3B" />
        </TouchableOpacity>
        <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-gray-50">
          <Ionicons name="notifications-outline" size={20} color="#3B3B3B" />
        </TouchableOpacity>
        <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-gray-50">
          <Ionicons name="menu-outline" size={20} color="#3B3B3B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}


