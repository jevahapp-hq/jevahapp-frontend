/**
 * Reels video surface — expo-video + the same global session as the home feed.
 * Cards are views; play/pause/mute go through useGlobalVideoStore.
 */
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { VideoPlayer } from "expo-video";
import { MutableRefObject, memo, useEffect, useRef, useSyncExternalStore } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useVideoPlaybackControl } from "../../../src/shared/hooks/useVideoPlaybackControl";
import { handleVideoError, isRetryableVideoSourceError } from "../../../src/shared/utils/videoUrlManager";
import {
  DarkSnapshotFill,
  FeedVideoSurface,
  useInstantFeedVideoPlayer,
} from "../../../src/features/media/video-feed";
import { setCachedDurationMs } from "../../../src/features/media/components/VideoCard/player/durationCache";
import {
  peekFeedVideoAspect,
  useFeedVideoAspect,
} from "../../../src/features/media/video-feed/useFeedVideoAspect";
import {
  snapshotPlayerFrame,
  useVideoFrameSnapshot,
} from "../../../src/features/media/video-feed/videoFrameSnapshotCache";
import { reelDisplayFrame, reelFrameNeedsBackdrop } from "../reelFrame";
import {
  enqueueReelPlayerJob,
  reelPlayerCommandQuiet,
  silenceReelPlayersExcept,
} from "../reelPlayerQueue";
import {
  publishReelPlayhead,
  reelResumeSeekSeconds,
} from "../reelPlayheadStore";
import contentInteractionAPI from "../../utils/contentInteractionAPI";
import { qualifiesPlaybackView } from "../../utils/contentInteraction/viewQualification";
import {
  androidReelMayHear,
  getAudibleReel,
  reelManuallyPaused,
  reelSoundStopped,
  subscribeAudibleReel,
} from "../reelAudible";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";

interface ReelsVideoPlayerProps {
  videoKey: string;
  contentId: string;
  videoUrl: string;
  posterUri?: string | null;
  screenHeight: number;
  screenWidth: number;
  isActive: boolean;
  /** The next page. It stays decoded and silent so the swipe is instant. */
  warmNext?: boolean;
  isMuted: boolean;
  videoVolume: number;
  isPlaying: boolean;
  videoRefs: MutableRefObject<Record<string, VideoPlayer>>;
  onToggleVideoPlay: () => void;
  setVideoDuration: (d: number) => void;
  setVideoPosition: (p: number) => void;
  setLocalPosition: (p: number) => void;
  setLocalDuration: (d: number) => void;
  isDragging: boolean;
  globalVideoStore: any;
  showPauseOverlay: boolean;
  getResponsiveSize: (s: number, m: number, l: number) => number;
  triggerHapticFeedback: () => void;
}

/** The reel you scrolled off must stop. Mute alone leaves its audio running. */
function silenceKeepingFrame(player: VideoPlayer, _key: string): void {
  player.muted = true;
  player.volume = 0;
  player.pause();
}

function hearReel(
  player: VideoPlayer,
  key: string,
  endedRef: MutableRefObject<boolean>,
  muted: boolean,
  volume: number
): void {
  const restartAt = reelResumeSeekSeconds(endedRef.current);
  if (restartAt != null) {
    endedRef.current = false;
    player.currentTime = restartAt;
    publishReelPlayhead(key, restartAt * 1000);
  }
  // Pause first so this player takes the audio session from the one you left.
  // Unmuting a decoder that is already playing leaves this clip silent.
  player.pause();
  player.muted = muted;
  player.volume = muted ? 0 : volume;
  player.play();
}

const ReelsVideoPlayer = memo(
  ({
    videoKey,
    contentId,
    videoUrl,
    posterUri: _posterUri,
    screenHeight,
    screenWidth,
    isActive,
    warmNext = false,
    isMuted,
    videoVolume,
    isPlaying,
    videoRefs,
    onToggleVideoPlay: _onToggleVideoPlay,
    setVideoDuration,
    setVideoPosition: _setVideoPosition,
    setLocalDuration,
    isDragging,
    globalVideoStore,
    showPauseOverlay: _showPauseOverlay,
    getResponsiveSize,
    triggerHapticFeedback: _triggerHapticFeedback,
  }: ReelsVideoPlayerProps) => {
    const lastUpdateRef = useRef(0);
    const hasTrackedViewRef = useRef(false);
    const playerRef = useRef<VideoPlayer | null>(null);

    /**
     * Values the native listeners read but must NOT re-subscribe on.
     *
     * These used to be effect dependencies, and the effect also *wrote* two of
     * them (`localDuration`, `videoPosition`), so each write tore down and
     * rebuilt three listeners and scheduled another write — the
     * "Maximum update depth exceeded" loop. Reading them from refs keeps the
     * subscription stable for the life of the player.
     */
    const isActiveRef = useRef(isActive);
    isActiveRef.current = isActive;
    const isDraggingRef = useRef(isDragging);
    isDraggingRef.current = isDragging;

    /**
     * What we last pushed to the parent. Previously the effect compared against
     * the parent's `videoPosition` prop, but `memo` below intentionally ignores
     * that prop, so the closure held a stale 0 forever and the throttle check
     * was always true — pushing a parent setState every 400ms indefinitely.
     * The child tracking its own last-published value is both correct and local.
     */
    const lastPushedPositionRef = useRef(-1);
    const lastPushedDurationRef = useRef(-1);
    const handedThisReel = useSyncExternalStore(
      subscribeAudibleReel,
      () => {
        const key = getAudibleReel();
        if (key == null) return isActive && androidReelMayHear(videoKey);
        return key === videoKey;
      },
      () => isActive && androidReelMayHear(videoKey)
    );
    const shouldHearRef = useRef(false);
    const resumeAtRef = useRef(0);
    const endedRef = useRef(false);
    const warmNextRef = useRef(warmNext);
    warmNextRef.current = warmNext;
    const isMutedRef = useRef(isMuted);
    isMutedRef.current = isMuted;
    const volumeRef = useRef(videoVolume);
    volumeRef.current = videoVolume;
    const nativeFirstFrameRef = useRef(false);
    const durationSecRef = useRef(0);

    const {
      player,
      firstFrameReady,
      nativeFirstFrame,
      handleFirstFrameRender,
    } = useInstantFeedVideoPlayer({
      source: videoUrl,
      loop: true,
      // Seek to the feed playhead before the first paint. Seeking after
      // the frame is visible clears the surface and leaves Reels black.
      restorePlayhead: true,
      timeUpdateEventInterval: 0.25,
      // Every mounted reel keeps a decoder. Sound is decided below.
      // Pausing the page you left is what turned the next swipe black.
      mutedPrime: true,
      idle: !isActive,
      nonBlockingSeekCheck: true,
      revealDelayMs: 32,
    });
    nativeFirstFrameRef.current = nativeFirstFrame;

    playerRef.current = player;
    const measuredAspect = useFeedVideoAspect(player, videoUrl);
    const fitted = reelDisplayFrame(
      measuredAspect ?? peekFeedVideoAspect(videoUrl),
      screenWidth,
      screenHeight
    );
    // Before the list re-renders, the scroll handoff is the source of truth.
    // Once this page is active, a tap pause (`isPlaying` false) must stick.
    const shouldHear = handedThisReel && (isActive ? isPlaying : true);
    shouldHearRef.current = shouldHear;
    const showSnapshotBands = reelFrameNeedsBackdrop(
      fitted,
      screenWidth,
      screenHeight
    );
    const heldFrame = useVideoFrameSnapshot(videoUrl);
    const frameTop = Math.max(0, Math.round((screenHeight - fitted.height) / 2));
    const frameLeft = Math.max(0, Math.round((screenWidth - fitted.width) / 2));
    useVideoPlaybackControl({
      videoKey,
      videoRef: playerRef,
      playbackReady: firstFrameReady,
      syncPlayback: false,
    });

    useEffect(() => {
      hasTrackedViewRef.current = false;
    }, [contentId]);

    useEffect(() => {
      if (player) {
        videoRefs.current[videoKey] = player;
      }
      return () => {
        delete videoRefs.current[videoKey];
        const leaving = player;
        enqueueReelPlayerJob(videoKey, "pause", () => {
          try {
            leaving.muted = true;
            leaving.volume = 0;
            leaving.pause();
          } catch {
            // Released native player.
          }
        });
      };
    }, [player, videoKey, videoRefs]);

    useEffect(() => {
      if (!player) return;
      const key = videoKey;
      // Pauses run before plays, and the call itself waits until after paint,
      // so the like and pause buttons are not stuck behind ExoPlayer.
      if (!shouldHear) {
        const warming = warmNextRef.current && !nativeFirstFrameRef.current;
        enqueueReelPlayerJob(key, warming ? "warm" : "pause", () => {
          if (shouldHearRef.current) return;
          try {
            silenceKeepingFrame(player, key);
          } catch {
            // Released native player.
          }
        });
        return;
      }
      enqueueReelPlayerJob(key, "hear", () => {
        if (!shouldHearRef.current || reelManuallyPaused(key)) {
          try {
            silenceKeepingFrame(player, key);
          } catch {
            // Released native player.
          }
          return;
        }
        try {
          silenceReelPlayersExcept(key, videoRefs.current);
          hearReel(
            player,
            key,
            endedRef,
            isMutedRef.current,
            volumeRef.current
          );
        } catch {
          // Released native player.
        }
        // The reel you left can reclaim the audio session. Take it back
        // without starting that clip again.
        setTimeout(() => {
          if (!shouldHearRef.current || reelManuallyPaused(key)) return;
          if (getAudibleReel() !== key || reelSoundStopped()) return;
          try {
            silenceReelPlayersExcept(key, videoRefs.current);
            const wantMuted = isMutedRef.current;
            player.muted = wantMuted;
            player.volume = wantMuted ? 0 : volumeRef.current;
            player.play();
          } catch {
            // Released native player.
          }
        }, 32);
      });
    }, [player, shouldHear, isMuted, videoVolume, videoKey]);

    useEffect(() => {
      if (!player) return;
      const apply = () => {
        const key = videoKey;
        const hear = getAudibleReel() === key && !reelManuallyPaused(key);
        if (!hear) {
          enqueueReelPlayerJob(key, "pause", () => {
            if (getAudibleReel() === key) return;
            try {
              silenceKeepingFrame(player, key);
            } catch {
              // Released native player.
            }
          });
          return;
        }
        enqueueReelPlayerJob(key, "hear", () => {
          if (getAudibleReel() !== key || reelManuallyPaused(key)) return;
          try {
            silenceReelPlayersExcept(key, videoRefs.current);
            hearReel(
              player,
              key,
              endedRef,
              isMutedRef.current,
              volumeRef.current
            );
          } catch {
            // Released native player.
          }
        });
      };
      return subscribeAudibleReel(apply);
    }, [player, videoKey]);

    useEffect(() => {
      if (!player || !shouldHear || !nativeFirstFrame) return;
      const grab = () => snapshotPlayerFrame(videoUrl, player);
      const first = setTimeout(grab, 400);
      const interval = setInterval(grab, 2000);
      return () => {
        clearTimeout(first);
        clearInterval(interval);
      };
    }, [player, shouldHear, nativeFirstFrame, videoUrl]);

    useEffect(() => {
      if (!player) return;
      let sub: { remove: () => void } | undefined;
      try {
        sub = player.addListener("playingChange", ({ isPlaying: nativePlaying }) => {
          const handedHere = getAudibleReel() === videoKey;
          if (nativePlaying && !handedHere && getAudibleReel() != null) {
            try {
              silenceKeepingFrame(player, videoKey);
            } catch {
              // Released native player.
            }
            return;
          }
          // Our own pause/play echoes back through this event. Handling it
          // inline called pause() again and stalled the button that was tapped.
          if (reelPlayerCommandQuiet()) return;
          if (nativePlaying) {
            if (
              handedHere ||
              (getAudibleReel() == null &&
                shouldHearRef.current &&
                !reelSoundStopped())
            ) {
              return;
            }
            enqueueReelPlayerJob(videoKey, "pause", () => {
              if (getAudibleReel() === videoKey) return;
              if (shouldHearRef.current && !reelSoundStopped()) return;
              try {
                silenceKeepingFrame(player, videoKey);
              } catch {
                // Released native player.
              }
            });
            return;
          }
          // Android drops the surface when the title and buttons attach,
          // and ExoPlayer pauses. A tap pause sets the manual flag first,
          // so this must not start the clip again.
          if (reelSoundStopped()) return;
          if (getAudibleReel() != null && !handedHere) return;
          if (!shouldHearRef.current && !handedHere) return;
          if (reelManuallyPaused(videoKey)) return;
          if (
            isActiveRef.current &&
            useGlobalVideoStore.getState().playingVideos[videoKey] === false
          ) {
            return;
          }
          const now = Date.now();
          if (now - resumeAtRef.current < 80) return;
          resumeAtRef.current = now;
          enqueueReelPlayerJob(videoKey, "hear", () => {
            const audibleNow = getAudibleReel();
            if (reelSoundStopped()) return;
            if (audibleNow != null && audibleNow !== videoKey) return;
            if (!shouldHearRef.current && audibleNow !== videoKey) return;
            if (reelManuallyPaused(videoKey)) return;
            if (
              isActiveRef.current &&
              useGlobalVideoStore.getState().playingVideos[videoKey] === false
            ) {
              return;
            }
            try {
              player.play();
            } catch {
              // Released native player.
            }
          });
        });
      } catch {
        return;
      }
      return () => {
        try {
          sub?.remove();
        } catch {
          // Released native player.
        }
      };
    }, [player, videoKey]);

    useEffect(() => {
      if (!player) return;

      const applyDuration = (durationSec: number) => {
        if (!Number.isFinite(durationSec) || durationSec <= 0) return;
        const durationMs = Math.min(durationSec * 1000, 24 * 60 * 60 * 1000);
        // expo-video refines `duration` repeatedly while buffering (and for
        // every HLS segment), so publish only real changes.
        if (lastPushedDurationRef.current === durationMs) return;
        lastPushedDurationRef.current = durationMs;
        setLocalDuration(durationMs);
        setVideoDuration(durationMs);
        // Shared with the feed cards so both surfaces agree on the timer.
        setCachedDurationMs(contentId, durationMs);
      };

      const statusSub = player.addListener("statusChange", ({ status, error }) => {
        if (status === "error" || error) {
          // HLS + useCaching throws on iOS; the player retries without cache.
          if (isRetryableVideoSourceError(error)) return;
          handleVideoError(error as any, videoUrl, videoKey);
          globalVideoStore.pauseVideo(videoKey);
          return;
        }
        if (status === "readyToPlay" && durationSecRef.current <= 0) {
          try {
            const next = Number(player.duration);
            if (next > 0) {
              durationSecRef.current = next;
              applyDuration(next);
            }
          } catch {
            // Released native player.
          }
        }
      });

      const timeSub = player.addListener("timeUpdate", ({ currentTime }) => {
        const seconds = currentTime || 0;
        if (seconds > 0.5) endedRef.current = false;
        const onThisPage =
          isActiveRef.current || getAudibleReel() === videoKey;
        if (!onThisPage) return;
        const positionMs = Math.max(0, seconds * 1000);
        const durationMs = durationSecRef.current * 1000;
        const dragging = isDraggingRef.current;

        if (!dragging) {
          publishReelPlayhead(videoKey, positionMs, durationMs || undefined);
        }

        const now = Date.now();
        if (now - lastUpdateRef.current > 1000) {
          lastUpdateRef.current = now;
          if (durationMs > 0) applyDuration(durationSecRef.current);
          if (
            !dragging &&
            Math.abs(positionMs - lastPushedPositionRef.current) > 1000
          ) {
            lastPushedPositionRef.current = positionMs;
          }
          const pct = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;
          globalVideoStore.setVideoProgress(videoKey, pct);
        }

        if (
          !hasTrackedViewRef.current &&
          shouldHearRef.current &&
          durationMs > 0
        ) {
          const progress = durationMs > 0 ? positionMs / durationMs : 0;
          const { qualifies, finished } = qualifiesPlaybackView({
            family: "video",
            isPlaying: true,
            positionMs,
            progress,
            durationMs,
          });
          if (qualifies || finished) {
            hasTrackedViewRef.current = true;
            contentInteractionAPI
              .recordView(contentId, "media", {
                durationMs: finished ? durationMs : positionMs,
                progressPct: Math.round(progress * 100),
                isComplete: finished,
                source: "reels",
              })
              .then((result) => {
                if (result.counted === false) {
                  hasTrackedViewRef.current = false;
                }
              })
              .catch(() => {
                hasTrackedViewRef.current = false;
              });
          }
        }
      });

      const endSub = player.addListener("playToEnd", () => {
        // The live player stays mounted. The next time this page is audible
        // it restarts at 0.1s instead of reloading from a thumbnail.
        endedRef.current = true;
      });

      return () => {
        statusSub.remove();
        timeSub.remove();
        endSub.remove();
      };
      // Subscribe once per player/source. Everything else is read via refs.
    }, [
      player,
      videoKey,
      videoUrl,
      contentId,
      globalVideoStore,
      setLocalDuration,
      setVideoDuration,
    ]);

    const surfaceStyle = {
      width: screenWidth,
      height: screenHeight,
    };
    const iconSize = getResponsiveSize(50, 60, 70);
    const iconTop = Math.max(0, Math.round((screenHeight - iconSize) / 2));

    return (
      <View
        pointerEvents={Platform.OS === "android" ? "none" : "auto"}
        style={[styles.host, surfaceStyle]}
        collapsable={false}
      >
        {showSnapshotBands && heldFrame ? (
          <DarkSnapshotFill source={heldFrame} />
        ) : null}
        <View
          pointerEvents="box-none"
          collapsable={false}
          style={{
            position: "absolute",
            top: frameTop,
            left: frameLeft,
            width: fitted.width,
            height: fitted.height,
            overflow: "hidden",
          }}
        >
            {player && fitted.width > 0 && fitted.height > 0 ? (
              <FeedVideoSurface
                inline
                visible
                transparent={false}
                useExoShutter={Platform.OS === "android"}
                player={player}
                width={fitted.width}
                height={fitted.height}
                contentFit="cover"
                onFirstFrameRender={handleFirstFrameRender}
              />
            ) : null}
            {heldFrame && !nativeFirstFrame ? (
              <Image
                source={heldFrame}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory"
                priority="high"
              />
            ) : null}
        </View>

        {isActive && reelManuallyPaused(videoKey) && !isPlaying && (
          <View
            pointerEvents="none"
            style={[styles.overlay, { top: iconTop, height: iconSize }]}
          >
            <MaterialIcons
              name="play-arrow"
              size={iconSize}
              color="rgba(255, 255, 255, 0.6)"
            />
          </View>
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.videoUrl === next.videoUrl &&
    prev.posterUri === next.posterUri &&
    prev.screenHeight === next.screenHeight &&
    prev.screenWidth === next.screenWidth &&
    prev.isActive === next.isActive &&
    prev.warmNext === next.warmNext &&
    prev.isMuted === next.isMuted &&
    prev.isPlaying === next.isPlaying &&
    prev.isDragging === next.isDragging
);

export default ReelsVideoPlayer;

const styles = StyleSheet.create({
  host: {
    backgroundColor: "#000",
    position: "relative",
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    elevation: 30,
  },
});
