import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import React, { RefObject } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useGlobalVideoStore } from "../../../store/useGlobalVideoStore";
import { ContentCardActionSidebar } from "../ContentCardActionSidebar";

interface ContentCardVideoViewProps {
  content: { _id: string; title: string };
  safeVideoUri: string;
  videoRef: RefObject<Video | null>;
  modalKey: string;
  isVideoPlaying: boolean;
  showVideoOverlay: boolean;
  videoLoadError: string | null;
  isRefreshingUrl: boolean;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  isBookmarked: boolean;
  isItemInLibrary: boolean;
  likeAnimation: Animated.Value;
  heartAnimation: Animated.Value;
  commentAnimation: Animated.Value;
  formattedComments: any[];
  onTogglePlay: () => void;
  onLongPress: () => void;
  onLike: () => void;
  onComment: () => void;
  onSaveToLibrary: () => void;
  onVideoUrlRefresh: () => void;
  onToggleMute: () => void;
  setIsVideoPlaying: (v: boolean) => void;
  setShowVideoOverlay: (v: boolean) => void;
  setVideoLoadError: (v: string | null) => void;
}

export function ContentCardVideoView({
  content,
  safeVideoUri,
  videoRef,
  modalKey,
  isVideoPlaying,
  showVideoOverlay,
  videoLoadError,
  isRefreshingUrl,
  isLiked,
  likeCount,
  commentCount,
  isBookmarked,
  isItemInLibrary,
  likeAnimation,
  heartAnimation,
  commentAnimation,
  formattedComments,
  onTogglePlay,
  onLongPress,
  onLike,
  onComment,
  onSaveToLibrary,
  onVideoUrlRefresh,
  onToggleMute,
  setIsVideoPlaying,
  setShowVideoOverlay,
  setVideoLoadError,
}: ContentCardVideoViewProps) {
  // ✅ Optimized: Use selectors to prevent unnecessary re-renders
  const isPlaying = useGlobalVideoStore((state) => state.playingVideos[modalKey]);
  const progress = useGlobalVideoStore((state) => state.progresses[modalKey]);
  const isMuted = useGlobalVideoStore((state) => state.mutedVideos[modalKey]);

  return (
    <View className="w-full h-[400px] overflow-hidden relative">
      <TouchableWithoutFeedback onPress={onTogglePlay} onLongPress={onLongPress}>
        <View style={StyleSheet.absoluteFillObject}>
          <Video
            ref={videoRef}
            source={{ uri: safeVideoUri }}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isVideoPlaying}
            isLooping={false}
            isMuted={false}
            useNativeControls={false}
            onLoad={() => {
              if (__DEV__) console.log(`✅ Video loaded: ${content.title}`);
            }}
            onError={(e) => {
              console.warn("Video failed to load in ContentCard:", content.title, e);
              setIsVideoPlaying(false);
              setShowVideoOverlay(true);
              setVideoLoadError(`Failed to load video: ${(e as any)?.nativeEvent?.message || "Unknown error"}`);
            }}
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded) return;
              if (status.didJustFinish) {
                setIsVideoPlaying(false);
                setShowVideoOverlay(true);
              }
            }}
          />
        </View>
      </TouchableWithoutFeedback>

      <ContentCardActionSidebar
        isLiked={isLiked}
        likeCount={likeCount}
        commentCount={commentCount}
        isBookmarked={isBookmarked}
        isItemInLibrary={isItemInLibrary}
        likeAnimation={likeAnimation}
        commentAnimation={commentAnimation}
        formattedComments={formattedComments}
        modalKey={modalKey}
        contentId={content._id}
        onLike={onLike}
        onComment={onComment}
        onSaveToLibrary={onSaveToLibrary}
      />

      {!isVideoPlaying && showVideoOverlay && (
        <>
          <View className="absolute inset-0 justify-center items-center">
            <View className="bg-white/70 p-4 rounded-full">
              <Ionicons name="play" size={40} color="#FEA74E" />
            </View>
          </View>
          <View className="absolute bottom-4 left-4 right-4">
            <Text className="text-white font-rubik-bold text-sm" numberOfLines={2}>
              {content.title}
            </Text>
          </View>
        </>
      )}

      {videoLoadError && (
        <View className="absolute inset-0 justify-center items-center bg-black/50">
          <View className="bg-white/90 p-4 rounded-lg mx-4 items-center">
            <Ionicons name="warning" size={32} color="#FF6B6B" />
            <Text className="text-red-600 font-rubik-bold text-sm mt-2 text-center">
              Video Unavailable
            </Text>
            <Text className="text-gray-600 font-rubik text-xs mt-1 text-center">{videoLoadError}</Text>
            <TouchableOpacity
              onPress={onVideoUrlRefresh}
              className="bg-[#FEA74E] px-4 py-2 rounded-lg mt-2"
              disabled={isRefreshingUrl}
            >
              <Text className="text-white font-rubik-bold text-xs">
                {isRefreshingUrl ? "Retrying..." : "Retry"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            marginTop: -40,
            marginLeft: -40,
            zIndex: 1000,
          },
          {
            opacity: heartAnimation,
            transform: [
              {
                scale: heartAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1.5],
                }),
              },
            ],
          },
        ]}
      >
        <MaterialIcons name="favorite" size={80} color="#e91e63" />
      </Animated.View>

      <View className="absolute top-4 left-4">
        <View className="bg-black/50 p-1 rounded-full">
          <Ionicons name="videocam" size={16} color="#FFFFFF" />
        </View>
      </View>

      {!isPlaying && (
        <View className="absolute bottom-16 left-3 right-3 px-4 py-2 rounded-md">
          <Text className="text-white font-semibold text-[14px]" numberOfLines={2}>
            {content.title}
          </Text>
        </View>
      )}

      {isVideoPlaying && (
        <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
          <View className="flex-1 h-1 bg-white/30 rounded-full relative">
            <View
              className="h-full bg-[#FEA74E] rounded-full"
              style={{ width: `${progress || 0}%` }}
            />
            <View
              style={{
                position: "absolute",
                left: `${progress || 0}%`,
                transform: [{ translateX: -6 }],
                top: -5,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#FEA74E",
              }}
            />
          </View>
          <TouchableOpacity onPress={onToggleMute}>
            <Ionicons
              name={isMuted ? "volume-mute" : "volume-high"}
              size={20}
              color="#FEA74E"
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
