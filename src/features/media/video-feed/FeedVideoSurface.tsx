import { VideoView, type VideoPlayer } from "expo-video";
import { StyleSheet, View } from "react-native";
import { FEED_VIDEO_PLAYER_HEIGHT } from "./feedVideoConfig";

interface FeedVideoSurfaceProps {
  player: VideoPlayer;
  visible: boolean;
  onFirstFrameRender: () => void;
  height?: number;
  /** Fitted frame so the native player doesn't paint black letterbox over the blur. */
  fitWidth?: number;
  fitHeight?: number;
}

/**
 * Fixed-size clipped surface. Never escapes the cell.
 *
 * When fitWidth/fitHeight are set, the VideoView is the video's aspect (no crop)
 * and the rest of the box stays transparent so the blurred poster shows through.
 * Reels keeps full-screen cover.
 */
export function FeedVideoSurface({
  player,
  visible,
  onFirstFrameRender,
  height = FEED_VIDEO_PLAYER_HEIGHT,
  fitWidth,
  fitHeight,
}: FeedVideoSurfaceProps) {
  const fitted =
    typeof fitWidth === "number" &&
    typeof fitHeight === "number" &&
    fitWidth > 1 &&
    fitHeight > 1;

  return (
    <View
      style={[styles.host, { height }, fitted ? styles.hostCenter : null]}
      pointerEvents="none"
      collapsable={false}
    >
      <VideoView
        player={player}
        style={
          fitted
            ? { width: fitWidth, height: fitHeight, opacity: visible ? 1 : 0 }
            : [styles.videoFill, { opacity: visible ? 1 : 0 }]
        }
        contentFit={fitted ? "cover" : "contain"}
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        useExoShutter={false}
        onFirstFrameRender={onFirstFrameRender}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  hostCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  videoFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
});
