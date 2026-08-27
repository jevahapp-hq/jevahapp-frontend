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
    next: async () => {
      const { queue, currentIndex, setTrack, repeatMode, position } = get();

      // Soft ranking skip if leaving early
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

      // Handle repeat one: restart the same song unless it 404'd
      if (repeatMode === "one") {
        const currentTrack = queue[currentIndex];
        const failed = get().__failedTrackIds || {};
        if (currentTrack && !failed[currentTrack.id]) {
          await setTrack(currentTrack, true);
          return;
        }
      }

      const failed = get().__failedTrackIds || {};
      if (queue.length > 0) {
        const pick = (from: number, to: number) => {
          for (let i = from; i < to; i++) {
            const t = queue[i];
            if (t?.id && !failed[t.id]) return i;
          }
          return -1;
        };
        let nextIndex = pick(currentIndex + 1, queue.length);
        if (nextIndex < 0 && repeatMode === "all") {
          // Wrap the whole queue, including a 1-track list (repeat all).
          nextIndex = pick(0, queue.length);
        }
        if (nextIndex >= 0) {
          set({ currentIndex: nextIndex });
          await setTrack(queue[nextIndex], true);
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
      const { soundInstance, stop } = get();
      await stop();
      if (soundInstance) {
        try {
          await soundInstance.unloadAsync();
        } catch (error) {
          console.warn("Error unloading audio:", error);
        }
      }
      set({
        currentTrack: null,
        soundInstance: null,
        isSessionActive: false,
        queue: [],
        currentIndex: -1,
        originalQueue: [],
        position: 0,
        duration: 0,
        progress: 0,
        __completionTimeout: false,
      });
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
