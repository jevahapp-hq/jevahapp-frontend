import { Image, type ImageLoadEventData, type ImageSource } from "expo-image";
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { DarkSnapshotFill } from "../../../src/features/media/video-feed/DarkSnapshotFill";
import {
  reelDisplayFrame,
  reelFrameNeedsBackdrop,
  type ReelDisplayFrame,
} from "../reelFrame";
import { rememberReelImageAspect } from "../reelMedia";

const FRAME_TIMING = {
  duration: 240,
  easing: Easing.out(Easing.cubic),
};

/**
 * Full-screen reel page. The sharp picture keeps its ratio and eases when
 * that ratio changes. A blurred copy fills whatever the picture does not
 * cover. The page itself stays full screen so the pager does not jump.
 */
export const ReelMediaStage = memo(function ReelMediaStage({
  mediaKey,
  boxWidth,
  boxHeight,
  aspect,
  blurUri,
  blurSource,
  children,
}: {
  mediaKey: string;
  boxWidth: number;
  boxHeight: number;
  aspect: number | null;
  blurUri?: string | null;
  blurSource?: object | number | null;
  children: (frame: ReelDisplayFrame, settled: boolean) => ReactNode;
}) {
  const frame = reelDisplayFrame(aspect, boxWidth, boxHeight);
  const width = useSharedValue(frame.width);
  const height = useSharedValue(frame.height);
  const mediaKeyRef = useRef(mediaKey);
  const [settledSize, setSettledSize] = useState({
    width: frame.width,
    height: frame.height,
  });
  const publishSettled = useCallback((nextWidth: number, nextHeight: number) => {
    setSettledSize((current) =>
      Math.abs(current.width - nextWidth) < 2 &&
      Math.abs(current.height - nextHeight) < 2
        ? current
        : { width: nextWidth, height: nextHeight }
    );
  }, []);

  useEffect(() => {
    const identityChanged = mediaKeyRef.current !== mediaKey;
    mediaKeyRef.current = mediaKey;
    const nextWidth = frame.width;
    const nextHeight = frame.height;
    const already =
      Math.abs(width.value - nextWidth) < 2 &&
      Math.abs(height.value - nextHeight) < 2;
    if (identityChanged || already) {
      width.value = nextWidth;
      height.value = nextHeight;
      publishSettled(nextWidth, nextHeight);
      return;
    }
    setSettledSize({ width: -1, height: -1 });
    width.value = withTiming(nextWidth, FRAME_TIMING, (finished) => {
      if (finished) runOnJS(publishSettled)(nextWidth, nextHeight);
    });
    height.value = withTiming(nextHeight, FRAME_TIMING);
  }, [frame.width, frame.height, mediaKey, width, height, publishSettled]);

  const windowStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: height.value,
  }));

  const showBackdrop = reelFrameNeedsBackdrop(frame, boxWidth, boxHeight);
  const settled =
    Math.abs(settledSize.width - frame.width) < 2 &&
    Math.abs(settledSize.height - frame.height) < 2;
  const blur = blurSource || (blurUri ? { uri: blurUri } : null);

  return (
    <View
      style={[styles.cell, { width: boxWidth, height: boxHeight }]}
      collapsable={false}
    >
      {showBackdrop && blur ? (
        <DarkSnapshotFill source={blur as ImageSource} />
      ) : null}
      <View pointerEvents="box-none" style={styles.center}>
        <Animated.View
          pointerEvents="box-none"
          collapsable={false}
          style={[styles.window, windowStyle]}
        >
          {children(frame, settled)}
        </Animated.View>
      </View>
    </View>
  );
});

export function ReelSharpPicture({
  uri,
  source,
  contentFit,
  onAspect,
}: {
  uri?: string | null;
  source?: object | number | null;
  contentFit: ReelDisplayFrame["contentFit"];
  /** Pictures report their real ratio. Video posters must not. */
  onAspect?: (aspect: number) => void;
}) {
  const resolved = uri ? { uri } : source;
  if (!resolved) return null;
  return (
    <Image
      source={resolved as never}
      style={StyleSheet.absoluteFill}
      contentFit={contentFit}
      contentPosition="center"
      cachePolicy="memory-disk"
      pointerEvents="none"
      onLoad={
        onAspect
          ? (event: ImageLoadEventData) => {
              const nextWidth = event.source?.width;
              const nextHeight = event.source?.height;
              if (!(nextWidth > 0) || !(nextHeight > 0)) return;
              const aspect = nextWidth / nextHeight;
              if (uri) rememberReelImageAspect(uri, aspect);
              onAspect(aspect);
            }
          : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  cell: {
    backgroundColor: "#000",
    overflow: "hidden",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  window: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
});
