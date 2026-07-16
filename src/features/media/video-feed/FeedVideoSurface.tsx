import { VideoView, type VideoPlayer } from "expo-video";
import { StyleSheet, View } from "react-native";
import { FEED_VIDEO_PLAYER_HEIGHT } from "./feedVideoConfig";

interface FeedVideoSurfaceProps {
  player: VideoPlayer;
  visible: boolean;
  onFirstFrameRender: () => void;
  height?: number;
}

/**
 * Fixed-size clipped surface. Never escapes the cell (no off-screen bleed),
 * which was stacking videos on top of neighboring FlashList rows.
 */
export function FeedVideoSurface({
  player,
  visible,
  onFirstFrameRender,
  height = FEED_VIDEO_PLAYER_HEIGHT,
}: FeedVideoSurfaceProps) {
  return (
    <View
      style={[styles.host, { height }]}
      pointerEvents="none"
      collapsable={false}
    >
      <VideoView
        player={player}
        style={[styles.video, { opacity: visible ? 1 : 0 }]}
        contentFit="cover"
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
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
});
