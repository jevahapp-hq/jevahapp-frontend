import { Image, StyleSheet, View } from "react-native";
import type { MediaItem } from "../../../shared/types";
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

/** Always-on cover so unmounted / buffering cells are never a white hole. */
export function FeedVideoPoster({
  item,
  height = FEED_VIDEO_PLAYER_HEIGHT,
}: {
  item?: MediaItem | null;
  height?: number;
}) {
  const uri = posterUriFromMedia(item);
  return (
    <View style={[styles.wrap, { height }]} collapsable={false}>
      {uri ? (
        <Image source={{ uri }} style={styles.img} resizeMode="cover" />
      ) : null}
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
});
