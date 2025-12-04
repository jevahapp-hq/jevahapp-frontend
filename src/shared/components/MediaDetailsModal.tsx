import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useUserProfile } from "../../../app/hooks/useUserProfile";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

interface MediaDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  mediaItem: any | null;
}

export default function MediaDetailsModal({
  visible,
  onClose,
  mediaItem,
}: MediaDetailsModalProps) {
  // ✅ Hook must be called before any early returns
  const { user } = useUserProfile();
  const [currentUserIdFromStorage, setCurrentUserIdFromStorage] = useState<string | null>(null);

  // Fallback: Get user ID from AsyncStorage if hook hasn't loaded yet
  useEffect(() => {
    const getUserIdFromStorage = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          const userId = userObj._id || userObj.id;
          if (userId) {
            setCurrentUserIdFromStorage(String(userId).trim());
          }
        }
      } catch (error) {
        console.error("❌ Error getting user ID from storage:", error);
      }
    };
    getUserIdFromStorage();
  }, []);

  const {
    title,
    description,
    contentType,
    speaker,
    uploadedBy,
    userId,
    createdAt,
    views,
    viewCount,
    likes,
    likeCount,
  } = mediaItem || {};

  const displayTitle = title || "Untitled";
  const displayContentType =
    (contentType || "media").toString().replace(/_/g, " ");

  // Determine the author display name
  const displaySpeaker = useMemo(() => {
    // Get current user ID first (prioritize hook, fallback to storage)
    const currentUserId = (user?._id || user?.id || currentUserIdFromStorage) as string | null | undefined;

    // Get the author ID from various possible fields (priority order)
    let authorId: string | null = null;
    
    if (typeof uploadedBy === "object" && uploadedBy?._id) {
      authorId = String(uploadedBy._id);
    } else if (typeof uploadedBy === "string" && uploadedBy.trim()) {
      authorId = uploadedBy.trim();
    } else if (userId) {
      authorId = String(userId).trim();
    } else if (speaker && typeof speaker === "string") {
      // Check if speaker is an ID (MongoDB ObjectId format or similar)
      const looksLikeId = /^[0-9a-fA-F]{24}$/.test(speaker.trim());
      if (looksLikeId) {
        authorId = speaker.trim();
      }
    }

    // Check if the video is by the current user (compare IDs)
    if (currentUserId && authorId) {
      const currentUserIdStr = String(currentUserId).trim();
      const authorIdStr = String(authorId).trim();
      if (currentUserIdStr === authorIdStr) {
        return "you";
      }
    }

    // If uploadedBy is an object with firstName/lastName, use that
    if (typeof uploadedBy === "object" && uploadedBy) {
      if (uploadedBy.firstName || uploadedBy.lastName) {
        const fullName = `${uploadedBy.firstName || ""} ${uploadedBy.lastName || ""}`.trim();
        if (fullName) {
          return fullName;
        }
      }
      if (uploadedBy.name) {
        return uploadedBy.name;
      }
    }

    // If speaker is a name (not an ID), use it
    if (speaker && typeof speaker === "string") {
      // Check if speaker looks like an ID (MongoDB ObjectId format or similar)
      const looksLikeId = /^[0-9a-fA-F]{24}$/.test(speaker.trim()) || speaker.trim().length < 3;
      if (!looksLikeId) {
        return speaker;
      }
    }

    // Fallback to "Unknown"
    return "Unknown";
  }, [uploadedBy, userId, speaker, user, mediaItem, currentUserIdFromStorage]);

  const displayViews = viewCount ?? views;
  const displayLikes = likeCount ?? likes;

  let createdLabel = "";
  try {
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        createdLabel = d.toLocaleDateString();
      }
    }
  } catch {
    // ignore bad dates
  }

  // Early return check after hooks
  if (!visible || !mediaItem) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1 }}
        />

        <View
          style={{
            maxHeight: SCREEN_HEIGHT * 0.7,
            width: SCREEN_WIDTH,
            backgroundColor: "white",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 24,
          }}
        >
          {/* Handle bar */}
          <View
            style={{
              width: 36,
              height: 4,
              backgroundColor: "#D1D5DB",
              alignSelf: "center",
              borderRadius: 2,
              marginBottom: 16,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#1D2939",
                fontFamily: "Rubik-SemiBold",
                flex: 1,
                marginRight: 12,
              }}
              numberOfLines={2}
            >
              {displayTitle}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                backgroundColor: "#E5E7EB",
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Meta tags */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: "#EEF2FF",
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: "#4F46E5",
                  fontFamily: "Rubik-SemiBold",
                }}
              >
                {displayContentType.toUpperCase()}
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: "#ECFDF3",
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: "#166534",
                  fontFamily: "Rubik-SemiBold",
                }}
              >
                By {displaySpeaker}
              </Text>
            </View>

            {!!createdLabel && (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: "#F9FAFB",
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: "#4B5563",
                    fontFamily: "Rubik",
                  }}
                >
                  {createdLabel}
                </Text>
              </View>
            )}
          </View>

          {/* Stats row */}
          {(displayViews != null || displayLikes != null) && (
            <View
              style={{
                flexDirection: "row",
                marginBottom: 12,
              }}
            >
              {displayViews != null && (
                <View style={{ marginRight: 16, flexDirection: "row" }}>
                  <Ionicons name="eye-outline" size={14} color="#6B7280" />
                  <Text
                    style={{
                      marginLeft: 4,
                      fontSize: 12,
                      color: "#4B5563",
                      fontFamily: "Rubik",
                    }}
                  >
                    {displayViews} views
                  </Text>
                </View>
              )}
              {displayLikes != null && (
                <View style={{ flexDirection: "row" }}>
                  <Ionicons name="heart-outline" size={14} color="#DC2626" />
                  <Text
                    style={{
                      marginLeft: 4,
                      fontSize: 12,
                      color: "#4B5563",
                      fontFamily: "Rubik",
                    }}
                  >
                    {displayLikes} likes
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <Text
              style={{
                fontSize: 13,
                color: "#4B5563",
                fontFamily: "Rubik",
                lineHeight: 18,
              }}
            >
              {description && description.trim().length > 0
                ? description
                : "No description has been added for this content yet."}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}




