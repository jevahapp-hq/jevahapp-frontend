import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View, Alert } from "react-native";
import { apiClient } from "../../utils/dataFetching";

type ProfileSummaryProps = {
  user: any;
  getAvatarUrl: (user: any) => string | null | undefined;
  getFullName: (user: any) => string;
  onEdit: () => void;
  onLogout: () => void;
  onProfileUpdate?: () => void; // Callback to refresh profile after update
};

export default function ProfileSummary({
  user,
  getAvatarUrl,
  getFullName,
  onEdit,
  onLogout,
  onProfileUpdate,
}: ProfileSummaryProps) {
  const [avatarError, setAvatarError] = useState(false);
  const [updatingBio, setUpdatingBio] = useState(false);
  const avatarUrl = user ? getAvatarUrl(user) ?? undefined : undefined;

  const handleAddBio = () => {
    Alert.prompt(
      user?.bio ? "Edit Bio" : "Add Bio",
      "Enter your bio (max 500 characters)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (bioText) => {
            if (!bioText) return;
            if (bioText.length > 500) {
              Alert.alert("Error", "Bio must be less than 500 characters");
              return;
            }
            try {
              setUpdatingBio(true);
              await apiClient.updateUserProfile({ bio: bioText });
              // Call refresh callback if provided
              if (onProfileUpdate) {
                onProfileUpdate();
              }
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to update bio");
            } finally {
              setUpdatingBio(false);
            }
          },
        },
      ],
      "plain-text",
      user?.bio || ""
    );
  };

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

        {user?.bio ? (
          <View className="px-4 mb-2">
            <Text className="text-[#3B3B3B] text-sm text-center">{user.bio}</Text>
            <TouchableOpacity
              onPress={handleAddBio}
              disabled={updatingBio}
              className="mt-2"
            >
              <Text className="text-[#FEA74E] font-medium text-center">
                {updatingBio ? "Updating..." : "Edit bio"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            className="mb-2"
            onPress={handleAddBio}
            disabled={updatingBio}
          >
            <Text className="text-[#FEA74E] font-medium">
              {updatingBio ? "Updating..." : "+ Add bio"}
            </Text>
          </TouchableOpacity>
        )}
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


