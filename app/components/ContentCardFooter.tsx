/**
 * ContentCardFooter Component
 * Extracted from ContentCard.tsx for better modularity
 * Can be used by ContentCard, VideoCard, MusicCard, and EbookCard
 */

import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, Image, Text, TouchableOpacity, View } from "react-native";
import { getUserAvatarFromContent, getUserDisplayNameFromContent } from "../utils/userValidation";

// Optional: Import AvatarWithInitialFallback for enhanced avatar support
let AvatarWithInitialFallback: any = null;
try {
  AvatarWithInitialFallback = require("../../src/shared/components/AvatarWithInitialFallback/AvatarWithInitialFallback")
    .AvatarWithInitialFallback;
} catch (e) {
  // Fallback if not available
}

interface ContentCardFooterProps {
  content: any;
  contentStats?: Record<string, any>;
  viewCount?: number;
  shareCount?: number;
  isLive?: boolean;
  viewerCount?: number;
  livePulseAnimation?: Animated.Value;
  onShare: () => void;
  onMenuPress: () => void;
  getTimeAgo: (createdAt: string) => string;
  // Optional: Use enhanced avatar component (used by VideoCard/MusicCard/EbookCard)
  useEnhancedAvatar?: boolean;
  // Optional: Custom menu button component (used by VideoCard/MusicCard/EbookCard)
  menuButton?: React.ReactNode;
  // Optional: Show stats inline instead of using CardFooterActions (for ContentCard)
  showInlineStats?: boolean;
  // Optional: Custom className for container
  containerClassName?: string;
  // Optional: Custom actions/children to render below author info (for VideoCard/MusicCard/EbookCard using CardFooterActions)
  children?: React.ReactNode;
}

/**
 * Helper function to format time ago
 * Can be moved to utilities if needed elsewhere
 */
export const getTimeAgo = (createdAt: string): string => {
  const now = new Date();
  const posted = new Date(createdAt);
  const diff = now.getTime() - posted.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}MIN AGO`;
  if (hours < 24) return `${hours}HRS AGO`;
  return `${days}DAYS AGO`;
};

export default function ContentCardFooter({
  content,
  contentStats,
  viewCount = 0,
  shareCount = 0,
  isLive = false,
  viewerCount = 0,
  livePulseAnimation,
  onShare,
  onMenuPress,
  getTimeAgo,
  useEnhancedAvatar = false,
  menuButton,
  showInlineStats = true,
  containerClassName = "flex-row items-center justify-between mt-1 px-3",
  children,
}: ContentCardFooterProps) {
  const contentKey = content._id || content.id;
  const stats = contentStats?.[contentKey];
  const displayViewCount = stats?.views ?? viewCount ?? 0;
  const displayShareCount = stats?.sheared ?? shareCount ?? 0;

  // Use enhanced avatar if available and requested
  const renderAvatar = () => {
    if (useEnhancedAvatar && AvatarWithInitialFallback) {
      return (
        <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1">
          <AvatarWithInitialFallback
            imageSource={getUserAvatarFromContent(content) as any}
            name={getUserDisplayNameFromContent(content)}
            size={30}
            fontSize={14}
            backgroundColor="transparent"
            textColor="#344054"
          />
        </View>
      );
    }

    // Default avatar (used by ContentCard)
    return (
      <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
        <Image
          source={getUserAvatarFromContent(content)}
          style={{ width: 30, height: 30, borderRadius: 999 }}
          resizeMode="cover"
          onError={(error) => {
            console.warn(
              "❌ Failed to load speaker avatar:",
              error.nativeEvent.error
            );
          }}
        />
      </View>
    );
  };

  // Render menu button (custom or default)
  const renderMenuButton = () => {
    if (menuButton) {
      return menuButton;
    }

    return (
      <TouchableOpacity onPress={onMenuPress} className="mr-2">
        <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <View className={containerClassName}>
      <View className="flex flex-row items-center">
        {renderAvatar()}
        <View className="ml-3">
          <View className="flex-row items-center">
            <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
              {getUserDisplayNameFromContent(content)}
            </Text>

            {/* Live Stream Indicator */}
            {isLive && livePulseAnimation && (
              <Animated.View
                style={{
                  transform: [{ scale: livePulseAnimation }],
                  marginLeft: 8,
                  marginTop: 2,
                }}
              >
                <View className="flex-row items-center bg-red-500 px-2 py-1 rounded-full">
                  <View className="w-2 h-2 bg-white rounded-full mr-1" />
                  <Text className="text-white text-[10px] font-rubik-semibold">
                    LIVE
                  </Text>
                </View>
              </Animated.View>
            )}

            <View className="flex flex-row mt-2 ml-2">
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                {getTimeAgo(content.createdAt)}
              </Text>
            </View>
          </View>

          {/* Render children (CardFooterActions for VideoCard/MusicCard/EbookCard) or inline stats (for ContentCard) */}
          {children ? (
            children
          ) : showInlineStats ? (
            <View className="flex-row mt-2">
              {displayViewCount > 0 && (
                <View className="flex-row items-center">
                  <AntDesign name="eye" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 mt-1 font-rubik">
                    {displayViewCount}
                  </Text>
                </View>
              )}

              {/* Live Viewer Count */}
              {isLive && viewerCount > 0 && (
                <View className="flex-row items-center ml-4">
                  <Ionicons name="people" size={16} color="#ef4444" />
                  <Text className="text-[10px] text-red-500 ml-1 font-rubik-semibold">
                    {viewerCount} watching
                  </Text>
                </View>
              )}
              {displayShareCount > 0 && (
                <TouchableOpacity
                  onPress={onShare}
                  className="flex-row items-center ml-4"
                >
                  <Feather name="send" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {displayShareCount}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>
      </View>
      {renderMenuButton()}
    </View>
  );
}
