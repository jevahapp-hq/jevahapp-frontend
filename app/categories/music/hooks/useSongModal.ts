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

export function useSongModal() {
  const openSongPlayer = (item: any) => {
    useCopyrightFreeOverlayStore.getState().open(stampPlaybackSource(item));
  };

  const openSongOptions = (item: any) => {
    useCopyrightFreeOverlayStore.getState().open(stampPlaybackSource(item), {
      initialAction: "options",
    });
  };

  const closeSongModal = () => {
    useCopyrightFreeOverlayStore.getState().close();
  };

  return {
    openSongPlayer,
    openSongOptions,
    closeSongModal,
  };
}
