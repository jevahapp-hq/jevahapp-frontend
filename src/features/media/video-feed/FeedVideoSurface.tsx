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
  visible: _visible,
  onFirstFrameRender,
  height = FEED_VIDEO_PLAYER_HEIGHT,
}: FeedVideoSurfaceProps) {
  // Always composited. Hiding with opacity:0 stopped iOS from painting /
  // firing onFirstFrameRender, which left Most Recent black + silent.
  // Snapshot underlay in VideoCardPlayerArea covers any brief black gap.
  return (
    <View
      style={[styles.host, { height }]}
      pointerEvents="none"
      collapsable={false}
    >
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        useExoShutter={false}
        // Multiple feed rows can have a mounted VideoView at once (grow-only
        // mounts + scroll transitions). Android's default `surfaceView` can
        // render one of them out of bounds/blank when views overlap - see
        // https://github.com/androidx/media/issues/1107. `textureView` is
        // slightly less power-efficient but avoids that failure mode.
        surfaceType="textureView"
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
