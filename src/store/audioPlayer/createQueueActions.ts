import { releaseAudioPlayer } from "../../shared/audio/releaseAudioPlayer";
import { getAudioPlaybackClock, resetAudioPlaybackClock, writeAudioPlaybackClock } from "./audioProgressStore";
import { pickNextPlayableIndex } from "./queueAdvance";
import { detachStatusSubscription } from "./statusSubscription";
import type {
  AudioPlayerGet,
  AudioPlayerSet,
  GlobalAudioPlayerState,
} from "./types";

export function createQueueActions(
  get: AudioPlayerGet,
  set: AudioPlayerSet
): Pick<
  GlobalAudioPlayerState,
  | "next"
  | "previous"
  | "playAtIndex"
  | "clear"
  | "setRepeatMode"
  | "toggleShuffle"
> {
  return {
    next: async (opts) => {
      const fromUser = Boolean(opts?.fromUser);
      const { queue, currentIndex, setTrack, repeatMode, duration } = get();
      const clock = getAudioPlaybackClock();
      const position = clock.position ?? get().position;
      const effectiveDuration = clock.duration || duration;
      const failed = get().__failedTrackIds || {};
      const nextIndex = pickNextPlayableIndex({
        length: queue.length,
        currentIndex,
        repeatMode,
        fromUser,
        isFailed: (i) => {
          const id = queue[i]?.id;
          return !id || !!failed[id];
        },
      });

      // Soft ranking skip if the user taps next early — not when looping
      if (fromUser && nextIndex !== currentIndex) {
        try {
          const current = queue[currentIndex];
          if (current?.id && (position || 0) < 15000) {
            const { enqueueFeedEvent } = await import(
              "../../../src/shared/feed/feedRanker"
            );
            enqueueFeedEvent({
              contentId: String(current.id),
              contentType: "music",
              eventType: "skip",
              watchMs: Math.round(position || 0),
              source: "music_for_you",
            });
          }
        } catch {
          // soft-fail
        }
      }

      if (nextIndex === currentIndex && nextIndex >= 0) {
        const sound = get().soundInstance;
        const currentTrack = queue[currentIndex];
        if (sound?.isLoaded) {
          try {
            await sound.seekTo(0);
          } catch {
            if (currentTrack) await setTrack(currentTrack, true);
            return;
          }
          const dur = effectiveDuration || get().duration;
          resetAudioPlaybackClock(currentTrack?.id ?? null, dur);
          writeAudioPlaybackClock({
            trackId: currentTrack?.id ?? null,
            position: 0,
            progress: 0,
            duration: dur,
          });
          sound.play();
          set({
            isPlaying: true,
            isSessionActive: true,
            position: 0,
            progress: 0,
          });
          return;
        }
        if (currentTrack) {
          await setTrack(currentTrack, true);
        }
        return;
      }

      if (nextIndex >= 0) {
        set({ currentIndex: nextIndex });
        await setTrack(queue[nextIndex], true);
      } else if (queue.length > 0) {
        const reachedNaturalEnd =
          effectiveDuration > 0 &&
          position >= Math.max(0, effectiveDuration - 1000);
        if (reachedNaturalEnd) {
          writeAudioPlaybackClock({
            position: effectiveDuration,
            progress: 1,
            duration: effectiveDuration,
          });
          set({
            isPlaying: false,
            position: effectiveDuration,
            progress: 1,
          });
        } else {
          await get().stop();
        }
      } else {
        await get().stop();
      }
    },

    previous: async () => {
      const { queue, currentIndex, setTrack } = get();
      if (queue.length > 0 && currentIndex > 0) {
        const prevIndex = currentIndex - 1;
        const prevTrack = queue[prevIndex];
        set({ currentIndex: prevIndex });
        await setTrack(prevTrack);
        await get().play();
      } else {
        // Beginning of queue - restart current track
        await get().seek(0);
      }
    },

    playAtIndex: async (index: number) => {
      const { queue, setTrack } = get();
      if (!Array.isArray(queue) || queue.length === 0) return;
      if (!Number.isFinite(index)) return;

      const clampedIndex = Math.max(0, Math.min(index, queue.length - 1));
      const track = queue[clampedIndex];
      if (!track) return;

      set({ currentIndex: clampedIndex });
      await setTrack(track);
      await get().play();
    },

    clear: async () => {
      const sound = get().soundInstance;
      detachStatusSubscription(get, set);
      resetAudioPlaybackClock();
      // Hide the mini bar immediately — never wait on pause/unload.
      set({
        currentTrack: null,
        soundInstance: null,
        isPlaying: false,
        isSessionActive: false,
        queue: [],
        currentIndex: -1,
        originalQueue: [],
        position: 0,
        duration: 0,
        progress: 0,
        __completionTimeout: false,
        __statusSubscription: null,
      });
      if (!sound) return;
      try {
        releaseAudioPlayer(sound);
      } catch {
        // already torn down
      }
    },

    setRepeatMode: (mode: "none" | "all" | "one") => {
      set({ repeatMode: mode });
    },

    toggleShuffle: () => {
      const { queue, originalQueue, currentIndex, isShuffled, currentTrack } =
        get();

      if (isShuffled) {
        // Unshuffle: restore original queue order
        if (originalQueue.length > 0 && currentTrack) {
          // Find current track's position in original queue
          const originalIndex = originalQueue.findIndex(
            (t) => t.id === currentTrack.id
          );
          if (originalIndex !== -1) {
            set({
              queue: [...originalQueue],
              currentIndex: originalIndex,
              isShuffled: false,
            });
          } else {
            set({ isShuffled: false });
          }
        } else {
          set({ isShuffled: false });
        }
      } else {
        // Shuffle: randomize queue while keeping current song in place
        if (
          queue.length > 0 &&
          currentTrack &&
          currentIndex >= 0 &&
          currentIndex < queue.length
        ) {
          // Save original queue if not already saved
          const original = originalQueue.length > 0 ? originalQueue : [...queue];

          // Create shuffled queue - separate current track from others
          const otherTracks = queue.filter((_, idx) => idx !== currentIndex);

          // Fisher-Yates shuffle for other tracks
          for (let i = otherTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
          }

          // Reconstruct queue with current track in same position
          const shuffled = [
            ...otherTracks.slice(0, currentIndex),
            currentTrack,
            ...otherTracks.slice(currentIndex),
          ];

          set({
            queue: shuffled,
            originalQueue: original,
            currentIndex: currentIndex, // Keep current index
            isShuffled: true,
          });
        } else {
          // No current track or invalid index - just shuffle everything
          const original = originalQueue.length > 0 ? originalQueue : [...queue];
          const shuffled = [...queue];

          // Fisher-Yates shuffle
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }

          set({
            queue: shuffled,
            originalQueue: original,
            isShuffled: true,
          });
        }
      }
    },
  };
}
