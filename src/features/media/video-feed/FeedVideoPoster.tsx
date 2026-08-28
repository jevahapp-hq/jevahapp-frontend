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
 * Feed poster: blurred cover fills the box (no black bars), sharp frame sits
 * on top uncropped. Same pattern as YouTube / X when the file isn't the box ratio.
 */
export function FeedVideoPoster({
  item,
  height = FEED_VIDEO_PLAYER_HEIGHT,
  onAspectRatio,
}: {
  item?: MediaItem | null;
  height?: number;
  onAspectRatio?: (aspect: number) => void;
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
          <Image
            source={{ uri }}
            style={styles.img}
            contentFit="cover"
            blurRadius={28}
            cachePolicy={cachePolicy}
            recyclingKey={`${uri}-blur`}
          />
          <View style={styles.dim} pointerEvents="none" />
          <Image
            source={{ uri }}
            style={styles.img}
            contentFit="contain"
            cachePolicy={cachePolicy}
            recyclingKey={uri}
            onLoad={(e) => {
              const w = e.source?.width;
              const h = e.source?.height;
              if (w > 0 && h > 0) onAspectRatio?.(w / h);
            }}
          />
        </>
      ) : null}
      <FeedMediaTypeOverlay item={item} contentType={item?.contentType} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#121212",
  },
  img: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
});
