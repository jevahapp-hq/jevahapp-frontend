import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { getUserAvatarFromContent } from "../../utils/userValidation";

interface ReelsSpeakerInfoProps {
  enrichedVideoData: any;
  source?: string;
  menuVisible: boolean;
  onMenuToggle: () => void;
  getSpeakerName: (videoData: any, fallback?: string) => string;
  getResponsiveSpacing: (small: number, medium: number, large: number) => number;
  getResponsiveSize: (small: number, medium: number, large: number) => number;
  getResponsiveFontSize: (small: number, medium: number, large: number) => number;
  triggerHapticFeedback: () => void;
  /** Current user - when content is from current user, use their avatar/name (fixes "Unknown" when in session) */
  currentUser?: { _id?: string; id?: string; avatar?: string | null; avatarUpload?: string | null } | null;
  getAvatarUrl?: (user: any) => string | null;
}

export const ReelsSpeakerInfo: React.FC<ReelsSpeakerInfoProps> = ({
  enrichedVideoData,
  source,
  menuVisible,
  onMenuToggle,
  getSpeakerName,
  getResponsiveSpacing,
  getResponsiveSize,
  getResponsiveFontSize,
  triggerHapticFeedback,
  currentUser,
  getAvatarUrl,
}) => {
  const contentUploaderId = typeof enrichedVideoData?.uploadedBy === "string"
    ? enrichedVideoData.uploadedBy?.trim()
    : enrichedVideoData?.uploadedBy?._id || enrichedVideoData?.uploadedBy?.id;
  const isCurrentUserContent = currentUser && contentUploaderId &&
    String(contentUploaderId) === String(currentUser._id || currentUser.id);
  const avatarSource = isCurrentUserContent && getAvatarUrl && currentUser
    ? (getAvatarUrl(currentUser) ? { uri: getAvatarUrl(currentUser)! } : getUserAvatarFromContent(enrichedVideoData))
    : getUserAvatarFromContent(enrichedVideoData);
  return (
    <View
      style={{
        position: "absolute",
        bottom: getResponsiveSpacing(130, 150, 170),
        left: getResponsiveSpacing(12, 16, 20),
        right: getResponsiveSpacing(12, 16, 20),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 20,
      }}
    >
      {/* Avatar and Name Row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
        }}
      >
        {/* Avatar */}
        <TouchableOpacity
          style={{
            width: getResponsiveSize(28, 32, 36),
            height: getResponsiveSize(28, 32, 36),
            borderRadius: getResponsiveSize(14, 16, 18),
            backgroundColor: "#f3f4f6",
            alignItems: "center",
            justifyContent: "center",
            marginRight: getResponsiveSpacing(8, 10, 12),
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.3)",
          }}
          activeOpacity={0.8}
          accessibilityLabel={`${getSpeakerName(enrichedVideoData, "Creator")} profile picture`}
          accessibilityRole="image"
        >
          <Image
            source={avatarSource}
            style={{
              width: getResponsiveSize(20, 24, 28),
              height: getResponsiveSize(20, 24, 28),
              borderRadius: getResponsiveSize(10, 12, 14),
            }}
            resizeMode="cover"
          />
        </TouchableOpacity>

        {/* Speaker Name and Time */}
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Text
              style={{
                fontSize: getResponsiveFontSize(12, 14, 16),
                color: "#FFFFFF",
                fontWeight: "600",
                fontFamily: "Rubik-SemiBold",
                textShadowColor: "rgba(0, 0, 0, 0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
                marginRight: getResponsiveSpacing(6, 8, 10),
              }}
              numberOfLines={1}
              accessibilityLabel={
                source === "AccountScreen"
                  ? `Video: ${enrichedVideoData.title || "Untitled"}`
                  : `Posted by ${getSpeakerName(enrichedVideoData, "Creator")}`
              }
            >
              {source === "AccountScreen"
                ? enrichedVideoData.title || "Untitled Video"
                : getSpeakerName(enrichedVideoData, "Creator")}
            </Text>
            <Text
              style={{
                fontSize: getResponsiveFontSize(9, 10, 11),
                color: "#D0D5DD",
                fontFamily: "Rubik",
                textShadowColor: "rgba(0, 0, 0, 0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
              accessibilityLabel={`Posted ${enrichedVideoData.timeAgo || "recently"}`}
            >
              {enrichedVideoData.timeAgo || "No Time"}
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Button */}
      <TouchableOpacity
        onPress={() => {
          triggerHapticFeedback();
          onMenuToggle();
        }}
        style={{
          width: getResponsiveSize(28, 32, 36),
          height: getResponsiveSize(28, 32, 36),
          borderRadius: getResponsiveSize(14, 16, 18),
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
        activeOpacity={0.7}
        accessibilityLabel="More options menu"
        accessibilityRole="button"
      >
        <Ionicons
          name="ellipsis-vertical"
          size={getResponsiveSize(14, 16, 18)}
          color="#3A3E50"
        />
      </TouchableOpacity>
    </View>
  );
};

