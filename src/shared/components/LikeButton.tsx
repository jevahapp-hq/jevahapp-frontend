import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import contentInteractionAPI from "../../../app/utils/contentInteractionAPI";

interface LikeButtonProps {
  contentType: string;
  contentId: string;
  initialLiked?: boolean;
  initialLikeCount?: number;
  onLikeChange?: (liked: boolean, count: number) => void;
  size?: number;
  color?: string;
  likedColor?: string;
  showCount?: boolean;
  disabled?: boolean;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  contentType,
  contentId,
  initialLiked = false,
  initialLikeCount = 0,
  onLikeChange,
  size = 20,
  color = "#9CA3AF",
  likedColor = "#FF1744",
  showCount = true,
  disabled = false,
}) => {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didInteractRef = useRef(false);
  const lastContentIdRef = useRef<string>(contentId);

  // Treat props as "initial" values.
  // We only re-sync from props when the contentId changes (new card)
  // OR when the user hasn't interacted yet. This prevents the common flicker:
  // user taps like (optimistic red) → parent re-renders with stale initialLiked=false
  // → this effect overwrites local state and flips back.
  useEffect(() => {
    const contentChanged = lastContentIdRef.current !== contentId;
    if (contentChanged) {
      lastContentIdRef.current = contentId;
      didInteractRef.current = false;
      setLiked(initialLiked);
      setLikeCount(initialLikeCount);
      return;
    }

    if (!didInteractRef.current) {
      setLiked(initialLiked);
      setLikeCount(initialLikeCount);
    }
  }, [contentId, initialLiked, initialLikeCount]);

  const toggleLike = useCallback(async () => {
    if (loading || disabled) return;

    setLoading(true);
    setError(null);
    didInteractRef.current = true;

    // Optimistic update
    const previousLiked = liked;
    const previousCount = likeCount;
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);

    setLiked(newLiked);
    setLikeCount(newCount);
    onLikeChange?.(newLiked, newCount);

    try {
      // Use unified contentInteractionAPI (handles type mapping/auth/fallbacks)
      const apiResult = await contentInteractionAPI.toggleLike(
        contentId,
        contentType
      );

      if (typeof apiResult?.liked === "boolean") {
        // Update with API result (server or fallback)
        const serverLiked = apiResult.liked ?? newLiked;
        const serverCount = apiResult.totalLikes ?? newCount;

        setLiked(serverLiked);
        setLikeCount(serverCount);
        onLikeChange?.(serverLiked, serverCount);

        // Track analytics
        try {
          // Import analytics dynamically to avoid circular deps
          const { trackEvent } = await import("../../../app/utils/analytics");
          trackEvent("content_liked", {
            contentType,
            contentId,
            liked: serverLiked,
            likeCount: serverCount,
            timestamp: new Date().toISOString(),
          });
        } catch (analyticsError) {
          console.warn("Analytics tracking failed:", analyticsError);
        }
      } else {
        // Revert optimistic update on failure
        setLiked(previousLiked);
        setLikeCount(previousCount);
        onLikeChange?.(previousLiked, previousCount);

        const errorMessage = "Failed to update like status";
        setError(errorMessage);
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setLiked(previousLiked);
      setLikeCount(previousCount);
      onLikeChange?.(previousLiked, previousCount);

      const errorMessage = error.message || "Network error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    disabled,
    liked,
    likeCount,
    contentType,
    contentId,
    onLikeChange,
  ]);

  const currentColor = liked ? likedColor : color;
  const iconName = liked ? "heart" : "heart-outline";

  return (
    <TouchableOpacity
      onPress={toggleLike}
      disabled={loading || disabled}
      style={{
        flexDirection: "row",
        alignItems: "center",
        opacity: loading || disabled ? 0.6 : 1,
        padding: 4,
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentColor} />
      ) : (
        <Ionicons name={iconName as any} size={size} color={currentColor} />
      )}

      {showCount && likeCount > 0 && (
        <Text
          style={{
            marginLeft: 4,
            fontSize: 10,
            color: currentColor,
            fontWeight: "normal",
          }}
        >
          {likeCount}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default LikeButton;
