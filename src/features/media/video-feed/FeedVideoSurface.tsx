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
   * Feed cards contain-fit so heads stay in frame.
   */
  contentFit?: "contain" | "cover";
  /**
   * Feed cards place the surface in normal flow at a fixed size.
   * An absolute surface that changes position paints into the wrong card.
   */
  inline?: boolean;
  /**
   * When true the Android surface stays visible. With it off, the surface
   * stays invisible until a first-frame callback that sometimes never arrives,
   * so the reel plays audio on a black page.
   */
  useExoShutter?: boolean;
}

/**
 * Feed cards pass a fixed picture size (inline) and use a texture view so a
 * resized surface cannot draw into the card above or below. Do not change
 * that size after mount.
 * Do NOT use opacity or absoluteFill on VideoView — those blank the picture
 * on Android while audio still plays.
 */
export function FeedVideoSurface({
  player,
  visible: _visible,
  onFirstFrameRender,
  height = FEED_VIDEO_PLAYER_HEIGHT,
  width,
  contentFit = "cover",
  inline = false,
  useExoShutter = false,
}: FeedVideoSurfaceProps) {
  return (
    <View
      style={[
        inline ? styles.inlineHost : styles.host,
        { height },
        width != null ? { width } : null,
        contentFit === "contain" ? styles.containHost : null,
      ]}
      collapsable={false}
      pointerEvents="none"
    >
      <VideoView
        player={player}
        style={[styles.video, inline ? { width: width ?? "100%", height } : null]}
        contentFit={contentFit}
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        useExoShutter={useExoShutter}
        surfaceType={inline ? "textureView" : "surfaceView"}
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
    backgroundColor: "#000",
  },
  inlineHost: {
    backgroundColor: "#000",
  },
  containHost: {
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
});
