import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";

export function useSongModal() {
  const openSongPlayer = (item: any) => {
    useCopyrightFreeOverlayStore.getState().open(item);
  };

  const openSongOptions = (item: any) => {
    useCopyrightFreeOverlayStore.getState().open(item, {
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
