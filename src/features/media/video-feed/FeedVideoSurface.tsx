import { VideoView, type VideoPlayer } from "expo-video";
import { StyleSheet, View } from "react-native";
import { FEED_VIDEO_PLAYER_HEIGHT } from "./feedVideoConfig";

interface FeedVideoSurfaceProps {
  player: VideoPlayer;
  visible: boolean;
  onFirstFrameRender: () => void;
  height?: number;
  width?: number;
  /**
   * Feed cards cover-fill the 400px box. Fullscreen (Reels) also cover-fills
   * the phone viewport and clips overflow so media never paints off-screen.
   */
  contentFit?: "contain" | "cover";
}

/**
 * APK player: full thumbnail width, cover-fill. No opacity, overflow clip,
 * or extra surfaceType — those blank the picture while audio still plays.
 * Immediate parent stays transparent so Android SurfaceView can punch through.
 */
export function FeedVideoSurface({
  player,
  visible: _visible,
  onFirstFrameRender,
  height = FEED_VIDEO_PLAYER_HEIGHT,
  width,
  contentFit = "cover",
}: FeedVideoSurfaceProps) {
  return (
    <View
      style={[
        styles.host,
        { height },
        width != null ? { width } : null,
        contentFit === "contain" ? styles.containHost : null,
      ]}
      collapsable={false}
      pointerEvents="none"
    >
      <VideoView
        player={player}
        style={styles.video}
        contentFit={contentFit}
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        useExoShutter={false}
        pointerEvents="none"
        onFirstFrameRender={onFirstFrameRender}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "transparent",
  },
  containHost: {
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
});
