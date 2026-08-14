/**
 * Peek-owned playback chrome while comments are open.
 *
 * In-card play/seek live on the 400px player. After the feed shifts into the
 * peek, that chrome sits under the card footer / sheet. This HUD is a sibling
 * of the sheet, laid out in the visible peek band: always-on play/pause,
 * seek just above the handle.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MediaPlayButton } from "../../../src/shared/components/MediaPlayButton";
import { VideoProgressBar } from "../../../src/shared/components/VideoProgressBar";
import {
  getVideoPlaybackSnapshot,
  resolveRegisteredVideoKey,
  useGlobalVideoStore,
  type VideoPlaybackSnapshot,
} from "../../store/useGlobalVideoStore";
import { COMMENT_PEEK_HUD_STRIP } from "../commentSheetLayout";

const EMPTY_SNAP: VideoPlaybackSnapshot = {
  progress: 0,
  currentMs: 0,
  durationMs: 0,
};

export function CommentPeekPlaybackHud({
  peekHeight,
  contentId,
}: {
  peekHeight: number;
  contentId?: string;
}) {
  const currentlyPlayingVideo = useGlobalVideoStore(
    (s) => s.currentlyPlayingVideo
  );
  const currentlyVisibleVideo = useGlobalVideoStore(
    (s) => s.currentlyVisibleVideo
  );
  const playingVideos = useGlobalVideoStore((s) => s.playingVideos);
  const mutedVideos = useGlobalVideoStore((s) => s.mutedVideos);
  const playVideoGlobally = useGlobalVideoStore((s) => s.playVideoGlobally);
  const pauseVideo = useGlobalVideoStore((s) => s.pauseVideo);
  const toggleVideoMute = useGlobalVideoStore((s) => s.toggleVideoMute);
  const seekVideo = useGlobalVideoStore((s) => s.seekVideo);

  const lastKeyRef = useRef("");
  const resolved =
    resolveRegisteredVideoKey(contentId) ||
    currentlyPlayingVideo ||
    currentlyVisibleVideo ||
    lastKeyRef.current ||
    "";
  const videoKey = resolved;

  useEffect(() => {
    if (resolved) lastKeyRef.current = resolved;
  }, [resolved]);

  const isPlaying = !!(videoKey && playingVideos[videoKey]);
  const isMuted = !!(videoKey && mutedVideos[videoKey]);

  const [snap, setSnap] = useState<VideoPlaybackSnapshot>(EMPTY_SNAP);

  useEffect(() => {
    if (!videoKey) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const next = getVideoPlaybackSnapshot(videoKey);
      if (!next) return;
      setSnap((prev) =>
        prev.progress === next.progress &&
        prev.currentMs === next.currentMs &&
        prev.durationMs === next.durationMs
          ? prev
          : next
      );
    };
    tick();
    const id = setInterval(tick, 400);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [videoKey]);

  const onTogglePlay = useCallback(() => {
    if (!videoKey) return;
    const playing = useGlobalVideoStore.getState().playingVideos[videoKey];
    if (playing) pauseVideo(videoKey);
    else playVideoGlobally(videoKey);
  }, [videoKey, pauseVideo, playVideoGlobally]);

  const onSeek = useCallback(
    (percent: number) => {
      if (!videoKey) return;
      seekVideo(videoKey, percent);
      setSnap((prev) => ({
        progress: percent,
        currentMs: percent * (prev.durationMs || 0),
        durationMs: prev.durationMs,
      }));
    },
    [videoKey, seekVideo]
  );

  const onToggleMute = useCallback(() => {
    if (!videoKey) return;
    toggleVideoMute(videoKey);
  }, [videoKey, toggleVideoMute]);

  if (!videoKey) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.root, { height: peekHeight }]}
    >
      <View style={styles.tapTarget} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? "Pause video" : "Play video"}
          onPress={onTogglePlay}
          style={StyleSheet.absoluteFill}
        />
        <MediaPlayButton
          isPlaying={isPlaying}
          onPress={onTogglePlay}
          showOverlay
          size="medium"
        />
      </View>

      <View
        pointerEvents="auto"
        style={[styles.seekWrap, { height: COMMENT_PEEK_HUD_STRIP }]}
      >
        <VideoProgressBar
          progress={Math.max(0, Math.min(1, snap.progress || 0))}
          currentMs={snap.currentMs}
          durationMs={snap.durationMs}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onSeekToPercent={onSeek}
          mutePosition="right"
          bottomOffset={16}
          showControls
          showFloatingLabel
          enlargeOnDrag
          knobSize={8}
          knobSizeDragging={12}
          trackHeights={{ normal: 4, dragging: 8 }}
          seekSyncTicks={4}
          seekMsTolerance={200}
          minProgressEpsilon={0.005}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    elevation: 2,
  },
  tapTarget: {
    ...StyleSheet.absoluteFillObject,
    bottom: COMMENT_PEEK_HUD_STRIP,
  },
  seekWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
  },
});
