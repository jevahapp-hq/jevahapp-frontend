import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

type ProfileSummaryProps = {
  user: any;
  getAvatarUrl: (user: any) => string | null | undefined;
  getFullName: (user: any) => string;
  onEdit: () => void;
  onLogout: () => void;
};

export default function ProfileSummary({
  user,
  getAvatarUrl,
  getFullName,
  onEdit,
  onLogout,
}: ProfileSummaryProps) {
  const [avatarError, setAvatarError] = useState(false);
  const avatarUrl = user ? getAvatarUrl(user) ?? undefined : undefined;

  return (
    <View className="px-4 py-8">
      {/* Profile Picture and Edit Button Row */}
      <View className="flex-row items-center mb-4">
        {/* Left spacer - tiny nudge back left */}
        <View style={{ flex: 1.02 }} />

        {/* Main Profile Picture - Moved further left */}
        <View className="relative">
          {user && avatarUrl && !avatarError ? (
            <Image
              source={{ uri: avatarUrl }}
              className="w-24 h-24 rounded-full"
              style={{ borderWidth: 3, borderColor: "#E5E7EB" }}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <View
              className="w-24 h-24 rounded-full justify-center items-center"
              style={{
                borderWidth: 3,
                borderColor: "#E5E7EB",
                backgroundColor: "#F3F4F6",
              }}
            >
              <Text className="text-gray-600 font-semibold text-3xl">
                {user?.firstName?.[0]?.toUpperCase() ||
                  user?.lastName?.[0]?.toUpperCase() ||
                  "U"}
              </Text>
            </View>
          )}
        </View>

        {/* Right spacer - tiny increase to balance */}
        <View style={{ flex: 0.98 }} className="items-end">
          <TouchableOpacity
            className="flex-row items-center bg-gray-400 px-4 py-2 rounded-full"
            activeOpacity={0.7}
            onPress={onEdit}
          >
            <Text className="font-medium" style={{ color: "#0A332D" }}>
              Edit
            </Text>
            <Ionicons
              name="pencil-outline"
              size={16}
              style={{ marginLeft: 6 }}
              color="#0A332D"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Name and Bio */}
      <View className="items-center">
        <Text className="text-2xl font-bold text-[#3B3B3B] mb-2">
          {user ? getFullName(user) : "Loading..."}
        </Text>

        <TouchableOpacity className="mb-2">
          <Text className="text-[#FEA74E] font-medium">+ Add bio</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button - Close to profile */}
      <View className="items-center">
        <TouchableOpacity
          onPress={onLogout}
          className="flex-row items-center bg-red-50 px-4 py-2 rounded-lg mt-1"
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={16} color="#EF4444" />
          <Text className="text-[#EF4444] font-medium ml-2">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


