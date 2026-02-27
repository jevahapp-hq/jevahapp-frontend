/**
 * ContentCard - Modular content card for video, audio, and image.
 * Composes hooks and subcomponents to stay under 500 lines.
 */
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Video } from "expo-av";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import ContentCardFooter from "../ContentCardFooter";
import { useInteractionStore } from "../../store/useInteractionStore";
import { useContentCardHandlers, useContentCardMedia, useContentCardSocket, useContentCardState } from "./hooks";
import type { ContentCardProps } from "./types";
import { ContentCardAudioView, ContentCardImageView, ContentCardVideoView } from "./components";

const SAMPLE_COMMENTS = [
  { id: "1", userName: "User", avatar: "", timestamp: "3HRS AGO", comment: "Amazing content! God is working!", likes: 45, isLiked: false },
  { id: "2", userName: "Another User", avatar: "", timestamp: "24HRS", comment: "This really touched my heart.", likes: 23, isLiked: false },
];

const ContentCard: React.FC<ContentCardProps> = ({
  content,
  onLike,
  onComment,
  onShare,
  onAuthorPress,
  onSaveToLibrary,
  socketManager,
}) => {
  const modalKey = `content-${content._id}`;
  const key = modalKey;

  const state = useContentCardState(content);
  const {
    mappedContent,
    isLiked,
    likeCount,
    commentCount,
    shareCount,
    isBookmarked,
    isItemInLibrary,
    isVideoPlaying,
    showVideoOverlay,
    videoLoadError,
    isRefreshingUrl,
    contentStats,
    setContentStats,
    setViewCounted,
    isLive,
    viewerCount,
    setViewerCount,
    likeAnimation,
    heartAnimation,
    commentAnimation,
    livePulseAnimation,
    setIsLiked,
    setLikeCount,
    setCommentCount,
    setShareCount,
    setIsBookmarked,
    setIsVideoPlaying,
    setShowVideoOverlay,
    setVideoLoadError,
    safeLibraryStore,
  } = state;

  const { safeVideoUri } = useContentCardMedia(
    content.contentType,
    mappedContent.mediaUrl,
    mappedContent.thumbnailUrl
  );

  const handlers = useContentCardHandlers({
    content,
    onLike,
    onComment,
    onShare,
    onSaveToLibrary,
    socketManager,
    key,
    modalKey,
    isLiked,
    likeCount,
    isItemInLibrary,
    viewCounted: state.viewCounted,
    contentStats,
    setContentStats,
    setIsLiked,
    setLikeCount,
    setShareCount,
    setIsBookmarked,
    setViewCounted,
    isVideoPlaying,
    setIsVideoPlaying,
    setShowVideoOverlay,
    setVideoLoadError,
    setIsRefreshingUrl: state.setIsRefreshingUrl,
    likeAnimation,
    heartAnimation,
    commentAnimation,
    safeLibraryStore,
  });

  useContentCardSocket({
    socketManager: socketManager || null,
    contentId: content._id,
    setIsLiked,
    setLikeCount,
    setCommentCount,
    setShareCount,
    setViewerCount,
    animateLike: handlers.animateLike,
  });

  const { comments } = useInteractionStore();
  const currentComments = comments[content._id] || [];
  const formattedComments = useMemo(
    () =>
      currentComments.length > 0
        ? currentComments.map((c: any) => ({
            id: c.id,
            userName: c.username || "Anonymous",
            avatar: c.userAvatar || "",
            timestamp: c.timestamp,
            comment: c.comment,
            likes: c.likes || 0,
            isLiked: c.isLiked || false,
          }))
        : SAMPLE_COMMENTS,
    [currentComments]
  );

  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (isLive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(livePulseAnimation, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
          Animated.timing(livePulseAnimation, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLive, livePulseAnimation]);

  useEffect(() => {
    if (content.contentType !== "video") return;
    const shouldPlay = isVideoPlaying;
    const t = setTimeout(() => {
      if (videoRef.current) {
        if (shouldPlay) videoRef.current.playAsync().catch(() => {});
        else videoRef.current.pauseAsync().catch(() => {});
      }
    }, 100);
    return () => clearTimeout(t);
  }, [isVideoPlaying, content.contentType]);

  const renderMediaContent = () => {
    if (content.contentType === "video") {
      return (
        <ContentCardVideoView
          content={content}
          safeVideoUri={safeVideoUri}
          videoRef={videoRef}
          modalKey={modalKey}
          isVideoPlaying={isVideoPlaying}
          showVideoOverlay={showVideoOverlay}
          videoLoadError={videoLoadError}
          isRefreshingUrl={isRefreshingUrl}
          isLiked={isLiked}
          likeCount={likeCount}
          commentCount={commentCount}
          isBookmarked={isBookmarked}
          isItemInLibrary={isItemInLibrary}
          likeAnimation={likeAnimation}
          heartAnimation={heartAnimation}
          commentAnimation={commentAnimation}
          formattedComments={formattedComments}
          onTogglePlay={handlers.toggleVideoPlay}
          onLongPress={handlers.handleLongPress}
          onLike={handlers.handleFavorite}
          onComment={handlers.handleComment}
          onSaveToLibrary={handlers.handleSaveToLibrary}
          onVideoUrlRefresh={handlers.handleVideoUrlRefresh}
          onToggleMute={handlers.toggleMute}
          setIsVideoPlaying={setIsVideoPlaying}
          setShowVideoOverlay={setShowVideoOverlay}
          setVideoLoadError={setVideoLoadError}
        />
      );
    }
    if (content.contentType === "audio") {
      return (
        <ContentCardAudioView
          content={content}
          mediaUrl={mappedContent.mediaUrl}
          thumbnailUri={mappedContent.thumbnailUrl || mappedContent.mediaUrl}
          modalKey={modalKey}
          isLiked={isLiked}
          likeCount={likeCount}
          commentCount={commentCount}
          isBookmarked={isBookmarked}
          isItemInLibrary={isItemInLibrary}
          likeAnimation={likeAnimation}
          commentAnimation={commentAnimation}
          formattedComments={formattedComments}
          onLike={handlers.handleFavorite}
          onComment={handlers.handleComment}
          onSaveToLibrary={handlers.handleSaveToLibrary}
        />
      );
    }
    return (
      <ContentCardImageView
        content={content}
        thumbnailUri={mappedContent.thumbnailUrl || mappedContent.mediaUrl}
        modalKey={modalKey}
        isLiked={isLiked}
        likeCount={likeCount}
        commentCount={commentCount}
        isBookmarked={isBookmarked}
        isItemInLibrary={isItemInLibrary}
        likeAnimation={likeAnimation}
        commentAnimation={commentAnimation}
        formattedComments={formattedComments}
        onLike={handlers.handleFavorite}
        onComment={handlers.handleComment}
        onSaveToLibrary={handlers.handleSaveToLibrary}
      />
    );
  };

  return (
    <View key={modalKey} className="flex flex-col mb-10">
      {renderMediaContent()}

      <ContentCardFooter
        content={content}
        contentStats={contentStats}
        viewCount={mappedContent.viewCount}
        shareCount={mappedContent.shareCount}
        isLive={isLive}
        viewerCount={viewerCount}
        livePulseAnimation={livePulseAnimation}
        onShare={handlers.handleShare}
        onMenuPress={() => state.setModalVisible(!state.modalVisible)}
        getTimeAgo={handlers.getTimeAgo}
      />

      {state.modalVisible && (
        <>
          <TouchableWithoutFeedback onPress={() => state.setModalVisible(false)}>
            <View className="absolute inset-0 z-40" />
          </TouchableWithoutFeedback>

          <View className="absolute bottom-24 right-16 bg-white shadow-md rounded-lg p-3 z-50 w-[170px] h-[180]">
            <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-[#1D2939] font-rubik ml-2">View Details</Text>
              <Ionicons name="eye-outline" size={22} color="#1D2939" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlers.handleShare}
              className="py-2 border-b border-gray-200 flex-row items-center justify-between"
            >
              <Text className="text-[#1D2939] font-rubik ml-2">Share</Text>
              <Feather name="send" size={22} color="#1D2939" />
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-between mt-6"
              onPress={handlers.handleSaveToLibrary}
            >
              <Text className="text-[#1D2939] font-rubik ml-2">
                {isBookmarked ? "Remove from Library" : "Save to Library"}
              </Text>
              <MaterialIcons
                name={isBookmarked ? "bookmark" : "bookmark-border"}
                size={22}
                color="#1D2939"
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

export default React.memo(ContentCard);
