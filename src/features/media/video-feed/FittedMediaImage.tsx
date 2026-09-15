import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { getLiteImageCachePolicy } from "../../../shared/lite/liteProfile";
import { optimizeImageUrl } from "../../../shared/utils/imageOptimizer";

type NumericSize = number;

/**
 * Image layer for video surfaces. Contain + center keeps portrait, landscape,
 * square, and very large assets inside the viewport without distortion.
 * Overflow is clipped on this wrapper only so Android VideoView punch-through
 * on a sibling surface is not affected.
 */
export function FittedMediaImage({
  uri,
  source,
  width,
  height,
  contentFit = "contain",
  contentPosition = "center",
  style,
}: {
  uri?: string | null;
  source?: { uri?: string } | number | null | object;
  width: NumericSize;
  height: NumericSize;
  contentFit?: "contain" | "cover" | "fill";
  contentPosition?: "center" | "top" | "bottom";
  style?: StyleProp<ViewStyle>;
}) {
  const numericW = width > 0 ? width : 1;
  const numericH = height > 0 ? height : 1;
  const rawUri =
    uri ||
    (source && typeof source === "object" && "uri" in source
      ? source.uri
      : null);
  // Contain: request by width only so the CDN does not crop/zoom to the box.
  const displayUri =
    typeof rawUri === "string" && rawUri
      ? optimizeImageUrl(
          rawUri,
          numericW,
          contentFit === "contain" ? undefined : numericH
        ) || rawUri
      : null;

  if (!displayUri && !source) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.clip,
        {
          width: numericW,
          height: numericH,
          maxWidth: numericW,
          maxHeight: numericH,
        },
        style,
      ]}
    >
      <Image
        source={(displayUri ? { uri: displayUri } : source) as any}
        style={styles.img}
        contentFit={contentFit}
        contentPosition={contentPosition}
        cachePolicy={getLiteImageCachePolicy()}
        recyclingKey={displayUri || undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  img: {
    ...StyleSheet.absoluteFillObject,
  },
});
