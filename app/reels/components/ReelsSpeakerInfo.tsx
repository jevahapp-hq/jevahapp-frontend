import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { getTimeAgo } from "../../../src/shared/utils/contentHelpers";
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
  /** Uploader-only: renders the pencil beside the description. */
  canEditDescription?: boolean;
  onEditDescription?: () => void;
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
  canEditDescription = false,
  onEditDescription,
}) => {
  const contentUploaderId = typeof enrichedVideoData?.uploadedBy === "string"
    ? enrichedVideoData.uploadedBy?.trim()
    : enrichedVideoData?.uploadedBy?._id || enrichedVideoData?.uploadedBy?.id;
  const isCurrentUserContent = currentUser && contentUploaderId &&
    String(contentUploaderId) === String(currentUser._id || currentUser.id);
  const avatarSource = isCurrentUserContent && getAvatarUrl && currentUser
    ? (getAvatarUrl(currentUser) ? { uri: getAvatarUrl(currentUser)! } : getUserAvatarFromContent(enrichedVideoData))
    : getUserAvatarFromContent(enrichedVideoData);

  const speakerName = getSpeakerName(enrichedVideoData, "Creator");
  const postedLabel = useMemo(() => {
    if (enrichedVideoData?.timeAgo) return enrichedVideoData.timeAgo;
    if (enrichedVideoData?.createdAt) {
      try {
        return getTimeAgo(String(enrichedVideoData.createdAt));
      } catch {
        return "Recently";
      }
    }
    return "Recently";
  }, [enrichedVideoData?.timeAgo, enrichedVideoData?.createdAt]);

  const title =
    typeof enrichedVideoData?.title === "string"
      ? enrichedVideoData.title.trim()
      : "";
  const description =
    typeof enrichedVideoData?.description === "string"
      ? enrichedVideoData.description.trim()
      : "";

  const textShadow = {
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as const;

  return (
    <View
      style={{
        position: "absolute",
        bottom: getResponsiveSpacing(118, 132, 148),
        left: getResponsiveSpacing(12, 16, 20),
        right: getResponsiveSpacing(12, 16, 20),
        zIndex: 20,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
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
              accessibilityLabel={`${speakerName} profile picture`}
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

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: getResponsiveFontSize(12, 14, 16),
                  color: "#FFFFFF",
                  fontFamily: "PlusJakartaSans-SemiBold",
                  ...textShadow,
                }}
                numberOfLines={1}
              >
                {speakerName}
              </Text>
              <Text
                style={{
                  marginTop: 2,
                  fontSize: getResponsiveFontSize(9, 10, 11),
                  color: "#E4E7EC",
                  fontFamily: "PlusJakartaSans",
                  ...textShadow,
                }}
                numberOfLines={1}
              >
                {postedLabel}
              </Text>
            </View>
          </View>

          {title ? (
            <Text
              style={{
                marginTop: getResponsiveSpacing(8, 10, 12),
                fontSize: getResponsiveFontSize(13, 14, 15),
                color: "#FFFFFF",
                fontFamily: "PlusJakartaSans-Bold",
                ...textShadow,
              }}
              numberOfLines={2}
            >
              {title}
            </Text>
          ) : null}

          {description ? (
            <View
              style={{
                marginTop: getResponsiveSpacing(4, 6, 8),
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: getResponsiveFontSize(11, 12, 13),
                  lineHeight: getResponsiveFontSize(16, 17, 18),
                  color: "rgba(255,255,255,0.92)",
                  fontFamily: "PlusJakartaSans",
                  ...textShadow,
                }}
                numberOfLines={3}
              >
                {description}
              </Text>
              {canEditDescription ? (
                <TouchableOpacity
                  onPress={onEditDescription}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                  style={{ paddingLeft: 8, paddingTop: 1 }}
                  accessibilityRole="button"
                  accessibilityLabel="Edit description"
                >
                  <Ionicons
                    name="pencil"
                    size={getResponsiveSize(13, 14, 16)}
                    color="rgba(255,255,255,0.9)"
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : canEditDescription ? (
            // Without this the owner of a description-less reel would have no
            // way to add one.
            <TouchableOpacity
              onPress={onEditDescription}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              style={{
                marginTop: getResponsiveSpacing(4, 6, 8),
                flexDirection: "row",
                alignItems: "center",
              }}
              accessibilityRole="button"
              accessibilityLabel="Add a description"
            >
              <Ionicons
                name="pencil"
                size={getResponsiveSize(12, 13, 14)}
                color="rgba(255,255,255,0.75)"
              />
              <Text
                style={{
                  marginLeft: 6,
                  fontSize: getResponsiveFontSize(11, 12, 13),
                  color: "rgba(255,255,255,0.75)",
                  fontFamily: "PlusJakartaSans-Medium",
                  ...textShadow,
                }}
              >
                Add a description
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

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
    </View>
  );
};

