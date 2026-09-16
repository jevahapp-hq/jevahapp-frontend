import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Dimensions, StyleSheet, View } from "react-native";
import { FeedMediaTypeOverlay } from "../../../shared/components/FeedMediaTypeOverlay";
import { getLiteImageCachePolicy } from "../../../shared/lite/liteProfile";
import type { MediaItem } from "../../../shared/types";
import { optimizeImageUrl } from "../../../shared/utils/imageOptimizer";
import { fixOverEncodedMediaUrl } from "../../../shared/utils/videoUrlManager";
import { FEED_VIDEO_PLAYER_HEIGHT } from "./feedVideoConfig";
import { useVideoFrameSnapshot } from "./videoFrameSnapshotCache";

function isLikelyVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|avi|mkv|m3u8|webm)(\?|#|$)/i.test(url);
}

function isLikelyImageUrl(url: string): boolean {
  return (
    /\.(jpg|jpeg|png|gif|webp|avif)(\?|#|$)/i.test(url) ||
    url.toLowerCase().includes("/image/upload/")
  );
}

function deriveCloudinaryPoster(videoUrl: string): string | null {
  if (!videoUrl.includes("/upload/")) return null;
  if (isLikelyImageUrl(videoUrl)) return videoUrl;
  return videoUrl.replace("/upload/", "/upload/so_1/") + ".jpg";
}

function uriFrom(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim();
    if (!t.startsWith("http")) return null;
    const fixed = fixOverEncodedMediaUrl(t);
    if (isLikelyVideoUrl(fixed)) return deriveCloudinaryPoster(fixed);
    return fixed;
  }
  if (value && typeof value === "object" && "uri" in value) {
    const u = String((value as { uri?: string }).uri || "").trim();
    if (!u.startsWith("http")) return null;
    const fixed = fixOverEncodedMediaUrl(u);
    if (isLikelyVideoUrl(fixed)) return deriveCloudinaryPoster(fixed);
    return fixed;
  }
  return null;
}

export function posterUriFromMedia(item?: MediaItem | null): string | null {
  if (!item) return null;
  const extras = item as MediaItem & {
    thumbnail?: unknown;
    coverImageUrl?: unknown;
    coverImage?: unknown;
    posterUrl?: unknown;
    previewUrl?: unknown;
  };
  return (
    uriFrom(item.thumbnailUrl) ||
    uriFrom(extras.thumbnail) ||
    uriFrom(item.imageUrl) ||
    uriFrom(extras.coverImageUrl) ||
    uriFrom(extras.coverImage) ||
    uriFrom(extras.posterUrl) ||
    uriFrom(extras.previewUrl) ||
    deriveCloudinaryPoster(
      fixOverEncodedMediaUrl(
        typeof item.fileUrl === "string" ? item.fileUrl : ""
      )
    ) ||
    deriveCloudinaryPoster(
      fixOverEncodedMediaUrl(
        typeof (item as { playbackUrl?: string }).playbackUrl === "string"
          ? String((item as { playbackUrl?: string }).playbackUrl)
          : ""
      )
    )
  );
}

/**
 * Cover the decoder until a real frame paints: last paused frame if we have
 * one, otherwise the server thumbnail. Used as the feed/Reels loading still.
 */
export function FeedVideoStill({
  item,
  url,
  height = FEED_VIDEO_PLAYER_HEIGHT,
  contentFit = "cover",
}: {
  item?: MediaItem | null;
  url?: string | null;
  height?: number;
  contentFit?: "cover" | "contain";
}) {
  const snapshot = useVideoFrameSnapshot(url ?? null);
  if (snapshot) {
    return (
      <Image
        source={snapshot}
        style={{ width: "100%", height }}
        contentFit={contentFit}
        cachePolicy={getLiteImageCachePolicy()}
        priority="high"
      />
    );
  }
  return (
    <FeedVideoPoster
      item={item}
      height={height}
      contentFit={contentFit}
      showBadge={false}
      showGradients={false}
    />
  );
}

/**
 * APK card: thumbnail paints first at full width. Cover-fill is clipped to
 * the 400px box. Fullscreen callers should use FittedMediaImage instead.
 */
export function FeedVideoPoster({
  item,
  height = FEED_VIDEO_PLAYER_HEIGHT,
  showBadge = true,
  showGradients = true,
  contentFit = "cover",
}: {
  item?: MediaItem | null;
  height?: number;
  showBadge?: boolean;
  showGradients?: boolean;
  contentFit?: "cover" | "contain";
}) {
  const raw = posterUriFromMedia(item);
  const uri = raw
    ? optimizeImageUrl(raw, Dimensions.get("window").width, height) || raw
    : null;
  const cachePolicy = getLiteImageCachePolicy();

  return (
    <View style={[styles.wrap, { height }]} collapsable={false}>
      {uri ? (
        <Image
          source={{ uri: raw || uri }}
          style={styles.img}
          contentFit={contentFit}
          contentPosition="center"
          cachePolicy={cachePolicy}
          recyclingKey={raw || uri}
          priority="high"
        />
      ) : null}
      {showGradients ? (
        <>
          <LinearGradient
            colors={["rgba(40,18,12,0.55)", "transparent"]}
            style={styles.topFade}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["transparent", "rgba(40,18,12,0.72)"]}
            style={styles.bottomFade}
            pointerEvents="none"
          />
        </>
      ) : null}
      {showBadge ? (
        <FeedMediaTypeOverlay
          item={item}
          contentType={item?.contentType}
          showCenter={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#1A0E0A",
  },
  img: {
    ...StyleSheet.absoluteFillObject,
  },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 88,
  },
  bottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
  },
});
