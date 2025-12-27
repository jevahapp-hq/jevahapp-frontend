/**
 * Unified InteractionButtons Component
 * Consolidates duplicate InteractionButtons implementations
 * Supports both hook-based and prop-based patterns
 */

import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Share, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { UI_CONFIG } from "../../constants";
import { triggerButtonHaptic } from "../../utils/haptics";
import { getResponsiveSpacing } from "../../utils/responsive";

export interface UnifiedInteractionButtonsProps {
  // Content info
  contentId: string;
  contentType?: "video" | "audio" | "ebook" | "sermon" | "live" | "media";
  contentTitle?: string;
  contentUrl?: string;

  // Layout
  layout?: "vertical" | "horizontal";
  iconSize?: number;
  showCounts?: boolean;

  // Interaction handlers (if provided, use these instead of hooks)
  onLike?: () => void;
  onComment?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onDownload?: () => void;

  // State (if provided, use these instead of hooks)
  userLikeState?: boolean;
  userSaveState?: boolean;
  likeCount?: number;
  saveCount?: number;
  commentCount?: number;
  viewCount?: number;
  shareCount?: number;
  isDownloaded?: boolean;

  // Hook-based mode (optional - for backward compatibility)
  useHooks?: boolean;
  onCommentPress?: () => void;

  // Styling
  iconColor?: string;
  activeIconColor?: string;
  textColor?: string;
  className?: string;
}

/**
 * Unified InteractionButtons Component
 * Supports both prop-based and hook-based patterns
 * 
 * Memoized for performance - only re-renders when props actually change
 */
export const UnifiedInteractionButtons: React.FC<UnifiedInteractionButtonsProps> = React.memo(({
  contentId,
  contentType = "media",
  contentTitle,
  contentUrl,
  layout = "horizontal",
  iconSize = 28,
  showCounts = true,
  onLike,
  onComment,
  onSave,
  onShare,
  onDownload,
  userLikeState = false,
  userSaveState = false,
  likeCount = 0,
  saveCount = 0,
  commentCount = 0,
  viewCount = 0,
  shareCount = 0,
  isDownloaded = false,
  useHooks = false,
  onCommentPress,
  iconColor = UI_CONFIG.COLORS.TEXT_SECONDARY,
  activeIconColor,
  textColor = UI_CONFIG.COLORS.TEXT_SECONDARY,
  className = "",
}) => {
  const [isLoading, setIsLoading] = useState({
    like: false,
    save: false,
    share: false,
  });

  // Hook-based mode (for backward compatibility)
  let hookBasedState: any = {};
  if (useHooks) {
    try {
      // Dynamic imports to avoid circular dependencies
      const { useCommentModal } = require("../../../../app/context/CommentModalContext");
      const {
        useContentCount,
        useContentStats,
        useInteractionStore,
        useUserInteraction,
      } = require("../../../../app/store/useInteractionStore");

      const { toggleLike, toggleSave, recordShare, loadContentStats, comments } =
        useInteractionStore();
      const { showCommentModal } = useCommentModal();
      const contentStats = useContentStats(contentId);
      const isLiked = useUserInteraction(contentId, "liked");
      const isSaved = useUserInteraction(contentId, "saved");
      const likesCount = useContentCount(contentId, "likes");
      const savesCount = useContentCount(contentId, "saves");
      const sharesCount = useContentCount(contentId, "shares");
      const commentsCount = useContentCount(contentId, "comments");

      useEffect(() => {
        if (!contentStats) {
          loadContentStats(contentId);
        }
      }, [contentId, contentStats, loadContentStats]);

      hookBasedState = {
        toggleLike,
        toggleSave,
        recordShare,
        showCommentModal,
        comments,
        isLiked,
        isSaved,
        likesCount,
        savesCount,
        sharesCount,
        commentsCount,
      };
    } catch (error) {
      console.warn("Hook-based mode not available:", error);
    }
  }

  const isHorizontal = layout === "horizontal";
  const finalLikeState = hookBasedState.isLiked ?? userLikeState;
  const finalSaveState = hookBasedState.isSaved ?? userSaveState;
  const finalLikeCount = hookBasedState.likesCount ?? likeCount;
  const finalSaveCount = hookBasedState.savesCount ?? saveCount;
  const finalCommentCount = hookBasedState.commentsCount ?? commentCount;
  const finalViewCount = viewCount;

  /**
   * Handle like with optimistic update
   * The store (toggleLike) already handles optimistic updates internally,
   * but we ensure proper loading state and error handling
   */
  const handleLike = async () => {
    if (isLoading.like) return;
    triggerButtonHaptic();

    if (onLike) {
      onLike();
      return;
    }

    if (hookBasedState.toggleLike) {
      // Functional update for loading state
      setIsLoading((prev) => ({ ...prev, like: true }));
      try {
        // Store handles optimistic update automatically
        await hookBasedState.toggleLike(contentId, contentType);
      } catch (error) {
        console.error("Error toggling like:", error);
        // Store automatically handles rollback on error
      } finally {
        // Functional update ensures we update with latest state
        setIsLoading((prev) => ({ ...prev, like: false }));
      }
    }
  };

  const handleSave = async () => {
    if (isLoading.save) return;
    triggerButtonHaptic();

    if (onSave) {
      onSave();
      return;
    }

    if (hookBasedState.toggleSave) {
      setIsLoading((prev) => ({ ...prev, save: true }));
      try {
        await hookBasedState.toggleSave(contentId, contentType);
      } catch (error) {
        console.error("Error toggling save:", error);
      } finally {
        setIsLoading((prev) => ({ ...prev, save: false }));
      }
    }
  };

  const handleComment = () => {
    triggerButtonHaptic();

    if (onComment || onCommentPress) {
      (onComment || onCommentPress)?.();
      return;
    }

    if (hookBasedState.showCommentModal) {
      const currentComments = hookBasedState.comments?.[contentId] || [];
      const formattedComments = currentComments.map((comment: any) => ({
        id: comment.id,
        userName: comment.username || "Anonymous",
        avatar: comment.userAvatar || "",
        timestamp: comment.timestamp,
        comment: comment.comment,
        likes: comment.likes || 0,
        isLiked: comment.isLiked || false,
      }));
      hookBasedState.showCommentModal(formattedComments, contentId);
    }
  };

  const handleShare = async () => {
    if (isLoading.share) return;
    triggerButtonHaptic();

    if (onShare) {
      onShare();
      return;
    }

    if (hookBasedState.recordShare) {
      try {
        setIsLoading((prev) => ({ ...prev, share: true }));
        const shareOptions = {
          title: contentTitle || "Content",
          message: `Check out this ${contentType}: ${contentTitle || "content"}`,
          url: contentUrl || "",
        };

        const result = await Share.share(shareOptions);
        if (result.action === Share.sharedAction) {
          await hookBasedState.recordShare(
            contentId,
            contentType,
            result.activityType || "generic"
          );
        }
      } catch (error) {
        console.error("Error sharing content:", error);
      } finally {
        setIsLoading((prev) => ({ ...prev, share: false }));
      }
    }
  };

  const handleDownload = () => {
    triggerButtonHaptic();
    onDownload?.();
  };

  const containerStyle: ViewStyle = {
    flexDirection: isHorizontal ? "row" : "column",
    alignItems: "center",
    justifyContent: isHorizontal ? "space-between" : "center",
    paddingVertical: getResponsiveSpacing(4, 6, 8),
    paddingHorizontal: getResponsiveSpacing(8, 12, 16),
  };

  const buttonStyle: ViewStyle = {
    flexDirection: isHorizontal ? "row" : "column",
    alignItems: "center",
    marginRight: isHorizontal ? getResponsiveSpacing(12, 16, 20) : 0,
    marginBottom: isHorizontal ? 0 : getResponsiveSpacing(8, 12, 16),
  };

  const textStyle = {
    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XS,
    color: textColor,
    marginTop: isHorizontal ? 0 : getResponsiveSpacing(2, 4, 6),
    marginLeft: isHorizontal ? getResponsiveSpacing(4, 6, 8) : 0,
    fontFamily: "Rubik-SemiBold",
  };

  const likeColor = finalLikeState
    ? activeIconColor || UI_CONFIG.COLORS.ERROR
    : iconColor;
  const saveColor = finalSaveState
    ? activeIconColor || UI_CONFIG.COLORS.SECONDARY
    : iconColor;

  return (
    <View style={[containerStyle, className ? {} : {}]}>
      {/* Views (read-only) */}
      {showCounts && (
        <TouchableOpacity style={buttonStyle} disabled>
          <MaterialIcons name="visibility" size={iconSize} color={iconColor} />
          {showCounts && <Text style={textStyle}>{finalViewCount}</Text>}
        </TouchableOpacity>
      )}

      {/* Like */}
      <TouchableOpacity
        style={buttonStyle}
        onPress={handleLike}
        disabled={isLoading.like}
      >
        <MaterialIcons
          name={finalLikeState ? "favorite" : "favorite-border"}
          size={iconSize}
          color={likeColor}
          style={{
            textShadowColor: finalLikeState ? "rgba(255, 23, 68, 0.6)" : "transparent",
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: finalLikeState ? 10 : 0,
          }}
        />
        {showCounts && <Text style={textStyle}>{finalLikeCount}</Text>}
      </TouchableOpacity>

      {/* Comment */}
      <TouchableOpacity style={buttonStyle} onPress={handleComment}>
        <Ionicons name="chatbubble-outline" size={iconSize} color={iconColor} />
        {showCounts && <Text style={textStyle}>{finalCommentCount}</Text>}
      </TouchableOpacity>

      {/* Save */}
      <TouchableOpacity
        style={buttonStyle}
        onPress={handleSave}
        disabled={isLoading.save}
      >
        <MaterialIcons
          name={finalSaveState ? "bookmark" : "bookmark-border"}
          size={iconSize}
          color={saveColor}
        />
        {showCounts && <Text style={textStyle}>{finalSaveCount}</Text>}
      </TouchableOpacity>

      {/* Download (if handler provided) */}
      {onDownload && (
        <TouchableOpacity style={buttonStyle} onPress={handleDownload}>
          <Ionicons
            name={isDownloaded ? "checkmark-circle" : "download-outline"}
            size={iconSize}
            color={isDownloaded ? UI_CONFIG.COLORS.SUCCESS : iconColor}
          />
          {showCounts && (
            <Text style={textStyle}>{isDownloaded ? "Downloaded" : ""}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Share */}
      <TouchableOpacity
        style={buttonStyle}
        onPress={handleShare}
        disabled={isLoading.share}
      >
        <Ionicons name="share-outline" size={iconSize} color={iconColor} />
        {showCounts && shareCount > 0 && (
          <Text style={textStyle}>{shareCount}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memoization
  // Only re-render if these props change
  return (
    prevProps.contentId === nextProps.contentId &&
    prevProps.contentType === nextProps.contentType &&
    prevProps.userLikeState === nextProps.userLikeState &&
    prevProps.userSaveState === nextProps.userSaveState &&
    prevProps.likeCount === nextProps.likeCount &&
    prevProps.saveCount === nextProps.saveCount &&
    prevProps.commentCount === nextProps.commentCount &&
    prevProps.viewCount === nextProps.viewCount &&
    prevProps.shareCount === nextProps.shareCount &&
    prevProps.isDownloaded === nextProps.isDownloaded &&
    prevProps.layout === nextProps.layout &&
    prevProps.iconSize === nextProps.iconSize &&
    prevProps.showCounts === nextProps.showCounts &&
    prevProps.iconColor === nextProps.iconColor &&
    prevProps.activeIconColor === nextProps.activeIconColor &&
    prevProps.textColor === nextProps.textColor &&
    prevProps.useHooks === nextProps.useHooks &&
    // Note: Function props (onLike, onComment, etc.) are compared by reference
    // If parent creates new functions on each render, this will still re-render
    // Parent should use useCallback for these handlers
    prevProps.onLike === nextProps.onLike &&
    prevProps.onComment === nextProps.onComment &&
    prevProps.onSave === nextProps.onSave &&
    prevProps.onShare === nextProps.onShare &&
    prevProps.onDownload === nextProps.onDownload &&
    prevProps.onCommentPress === nextProps.onCommentPress
  );
});

UnifiedInteractionButtons.displayName = "UnifiedInteractionButtons";

export default UnifiedInteractionButtons;

