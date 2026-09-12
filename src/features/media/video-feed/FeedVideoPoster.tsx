import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Dimensions, StyleSheet, View } from "react-native";
import { FeedMediaTypeOverlay } from "../../../shared/components/FeedMediaTypeOverlay";
import { getLiteImageCachePolicy } from "../../../shared/lite/liteProfile";
import type { MediaItem } from "../../../shared/types";
import { optimizeImageUrl } from "../../../shared/utils/imageOptimizer";
import { FEED_VIDEO_PLAYER_HEIGHT } from "./feedVideoConfig";

function uriFrom(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim();
    return t.startsWith("http") ? t : null;
  }
  if (value && typeof value === "object" && "uri" in value) {
    const u = String((value as { uri?: string }).uri || "").trim();
    return u.startsWith("http") ? u : null;
  }
  return null;
}

export function posterUriFromMedia(item?: MediaItem | null): string | null {
  if (!item) return null;
  return (
    uriFrom(item.thumbnailUrl) ||
    uriFrom(item.imageUrl) ||
    null
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
        <>
          {contentFit === "cover" ? (
            <Image
              source={{ uri }}
              style={styles.tallerBackdrop}
              contentFit="cover"
              cachePolicy={cachePolicy}
              recyclingKey={`${uri}-back`}
              priority="high"
            />
          ) : null}
          <Image
            source={{ uri: raw || uri }}
            style={styles.img}
            contentFit={contentFit}
            contentPosition="center"
            cachePolicy={cachePolicy}
            recyclingKey={raw || uri}
            priority="high"
          />
        </>
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
  tallerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    transform: [{ scaleY: 1.18 }],
  },
  img: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
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
