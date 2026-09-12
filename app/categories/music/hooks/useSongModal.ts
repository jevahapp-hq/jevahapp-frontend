import { stopAndDismissNowPlaying } from "@/shared/audio/stopNowPlaying";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";

function stampPlaybackSource(item: any) {
  if (!item || typeof item !== "object") return item;
  if (item.lane === "artist" || item.contentType === "artist-music") {
    return {
      ...item,
      source: item.source === "copyright-free" ? "library" : item.source || "library",
      contentType: item.contentType || "artist-music",
    };
  }
  return item;
}

/** Bring the tapped track up as a true full-screen now-playing surface. */
export function openFullNowPlaying(item: any, queue?: any[]) {
  if (!item) return;
  const store = useCopyrightFreeOverlayStore.getState();
  const nextQueue =
    Array.isArray(queue) && queue.length > 0
      ? queue
      : store.songs.length
        ? store.songs
        : undefined;
  store.open(stampPlaybackSource(item), { queue: nextQueue });
}

export function useSongModal() {
  const openSongPlayer = (item: any) => {
    openFullNowPlaying(item);
  };

  const openSongOptions = (item: any) => {
    useCopyrightFreeOverlayStore.getState().open(stampPlaybackSource(item), {
      initialAction: "options",
    });
  };

  const closeSongModal = () => {
    stopAndDismissNowPlaying();
  };

  return {
    openSongPlayer,
    openSongOptions,
    closeSongModal,
  };
}
