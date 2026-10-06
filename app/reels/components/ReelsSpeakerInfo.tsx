import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Platform, Text, TouchableOpacity, View } from "react-native";
import { getTimeAgo } from "../../../src/shared/utils/contentHelpers";
import { getUserAvatarFromContent } from "../../utils/userValidation";

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

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
      ? truncateWords(enrichedVideoData.title.trim(), 7)
      : "";
  const fullDescription =
    typeof enrichedVideoData?.description === "string"
      ? enrichedVideoData.description.trim()
      : "";
  const previewDescription = fullDescription
    ? truncateWords(fullDescription, 10)
    : "";
  const descriptionIsLong = previewDescription !== fullDescription;
  const videoId = enrichedVideoData?._id || enrichedVideoData?.id || "";
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  useEffect(() => {
    setDescriptionExpanded(false);
  }, [videoId]);
  const description = descriptionExpanded ? fullDescription : previewDescription;

  const profileRowHeight = getResponsiveSize(36, 40, 44);
  const actionColumnWidth = getResponsiveSize(44, 48, 52);
  const titleSlotHeight = getResponsiveFontSize(13, 14, 15) * 2 + 4;
  const descriptionSlotHeight = getResponsiveFontSize(16, 17, 18) * 2;
  const titleGap = getResponsiveSpacing(8, 10, 12);
  const descriptionGap = getResponsiveSpacing(4, 6, 8);
  const captionHeight =
    profileRowHeight + titleGap + titleSlotHeight + descriptionGap + descriptionSlotHeight;
  const textShadow = {
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as const;

  return (
    <View
      style={{
        position: "absolute",
        bottom: getResponsiveSpacing(102, 114, 128),
        left: getResponsiveSpacing(12, 16, 20),
        right: getResponsiveSpacing(8, 10, 12),
        height: captionHeight,
        zIndex: Platform.OS === "android" ? 40 : 20,
        elevation: Platform.OS === "android" ? 32 : 0,
      }}
    >
      <View style={{ marginRight: actionColumnWidth }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: profileRowHeight,
            }}
          >
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

          <View style={{ height: titleSlotHeight, marginTop: titleGap }}>
            {title ? (
              <Text
                style={{
                  fontSize: getResponsiveFontSize(13, 14, 15),
                  color: "#FFFFFF",
                  fontFamily: "PlusJakartaSans-Bold",
                  ...textShadow,
                }}
              >
                {title}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              height: descriptionSlotHeight,
              marginTop: descriptionGap,
              overflow: "visible",
            }}
          >
          {description ? (
            <View
              style={{
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
              >
                {descriptionExpanded ? null : description}
                {descriptionIsLong && !descriptionExpanded ? (
                  <Text
                    onPress={() => setDescriptionExpanded(true)}
                    style={{
                      fontFamily: "PlusJakartaSans-SemiBold",
                      color: "#FFFFFF",
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Show full description"
                  >
                    {" more"}
                  </Text>
                ) : null}
              </Text>
              {canEditDescription ? (
                <TouchableOpacity
                  delayPressIn={0}
                  onPressIn={onEditDescription}
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
              delayPressIn={0}
              onPressIn={onEditDescription}
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
          {descriptionExpanded ? (
            <Text
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                fontSize: getResponsiveFontSize(11, 12, 13),
                lineHeight: getResponsiveFontSize(16, 17, 18),
                color: "rgba(255,255,255,0.92)",
                fontFamily: "PlusJakartaSans",
                ...textShadow,
              }}
            >
              {fullDescription}
              <Text
                onPress={() => setDescriptionExpanded(false)}
                style={{
                  fontFamily: "PlusJakartaSans-SemiBold",
                  color: "#FFFFFF",
                }}
                accessibilityRole="button"
                accessibilityLabel="Show less description"
              >
                {"  less"}
              </Text>
            </Text>
          ) : null}
          </View>
      </View>

      <TouchableOpacity
        delayPressIn={0}
        onPressIn={() => {
          triggerHapticFeedback();
          onMenuToggle();
        }}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: actionColumnWidth,
          height: profileRowHeight,
          alignItems: "center",
          justifyContent: "center",
        }}
        activeOpacity={0.7}
        accessibilityLabel="More options menu"
        accessibilityRole="button"
      >
        <View
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
        >
          <Ionicons
            name="ellipsis-vertical"
            size={getResponsiveSize(14, 16, 18)}
            color="#3A3E50"
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};
