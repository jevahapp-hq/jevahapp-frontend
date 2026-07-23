import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity } from "react-native";
import contentInteractionAPI from "../../../app/utils/contentInteractionAPI";
import { ensureAuthenticatedForInteraction } from "../../../app/utils/auth/requireAuthForInteraction";
import { isRateLimitError } from "../../../app/utils/contentInteraction/errors";
import { createGestureIdempotencyKey } from "../../../app/utils/contentInteraction/idempotency";
import { formatCount } from "../utils/formatCount";

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
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const didInteractRef = useRef(false);
  const lastContentIdRef = useRef<string>(contentId);
  const lastAlertAtRef = useRef(0);

  useEffect(() => {
    const contentChanged = lastContentIdRef.current !== contentId;
    if (contentChanged) {
      lastContentIdRef.current = contentId;
      didInteractRef.current = false;
      setLiked(initialLiked);
      setLikeCount(initialLikeCount);
      setCooldownUntil(0);
      return;
    }

    if (!didInteractRef.current) {
      setLiked(initialLiked);
      setLikeCount(initialLikeCount);
    }
  }, [contentId, initialLiked, initialLikeCount]);

  const notifyRateLimited = useCallback(
    (message: string, retryAfterMs: number) => {
      setCooldownUntil(Date.now() + retryAfterMs);
      setError(message);
      if (Date.now() - lastAlertAtRef.current > 2500) {
        lastAlertAtRef.current = Date.now();
        Alert.alert("Slow down", message);
      }
    },
    []
  );

  const toggleLike = useCallback(async () => {
    if (loading || disabled) return;
    if (Date.now() < cooldownUntil) {
      notifyRateLimited(
        "Please wait a moment before liking again.",
        cooldownUntil - Date.now()
      );
      return;
    }

    // Guest: open login; do not flip the heart.
    const auth = await ensureAuthenticatedForInteraction({
      action: "like",
    });
    if (!auth.ok) return;

    setLoading(true);
    setError(null);
    didInteractRef.current = true;

    const previousLiked = liked;
    const previousCount = likeCount;
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
    const idempotencyKey = createGestureIdempotencyKey();

    setLiked(newLiked);
    setLikeCount(newCount);
    onLikeChange?.(newLiked, newCount);

    try {
      const apiResult = await contentInteractionAPI.toggleLike(
        contentId,
        contentType,
        {
          idempotencyKey,
          baselineLiked: previousLiked,
          expectedLiked: newLiked,
          expectedTotalLikes: newCount,
        }
      );

      if (typeof apiResult?.liked === "boolean") {
        const serverLiked = apiResult.liked ?? newLiked;
        const serverCount = apiResult.totalLikes ?? newCount;

        setLiked(serverLiked);
        setLikeCount(serverCount);
        onLikeChange?.(serverLiked, serverCount);

        try {
          const { trackEvent } = await import("../../../app/utils/analytics");
          trackEvent("content_liked", {
            contentType,
            contentId,
            liked: serverLiked,
            likeCount: serverCount,
            offlineQueued: Boolean(apiResult.offlineQueued),
            timestamp: new Date().toISOString(),
          });
        } catch (analyticsError) {
          console.warn("Analytics tracking failed:", analyticsError);
        }
      } else {
        setLiked(previousLiked);
        setLikeCount(previousCount);
        onLikeChange?.(previousLiked, previousCount);
        setError("Failed to update like status");
      }
    } catch (error: any) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      onLikeChange?.(previousLiked, previousCount);

      if (isRateLimitError(error)) {
        notifyRateLimited(
          error.message || "Please wait a moment before liking again.",
          typeof error.retryAfterMs === "number" ? error.retryAfterMs : 3000
        );
      } else {
        setError(error.message || "Network error occurred");
      }
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    disabled,
    cooldownUntil,
    liked,
    likeCount,
    contentType,
    contentId,
    onLikeChange,
    notifyRateLimited,
  ]);

  const currentColor = liked ? likedColor : color;
  const iconName = liked ? "heart" : "heart-outline";
  const isCoolingDown = Date.now() < cooldownUntil;

  return (
    <TouchableOpacity
      onPress={toggleLike}
      disabled={loading || disabled || isCoolingDown}
      style={{
        flexDirection: "row",
        alignItems: "center",
        opacity: loading || disabled || isCoolingDown ? 0.6 : 1,
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
          {formatCount(likeCount)}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default LikeButton;
