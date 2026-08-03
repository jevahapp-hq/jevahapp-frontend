import { useState } from "react";

export function useSongModal() {
  const [showSongModal, setShowSongModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [songModalInitialAction, setSongModalInitialAction] = useState<
    "options" | "playlist" | null
  >(null);

  const openSongPlayer = (item: any) => {
    setSelectedSong(item);
    setSongModalInitialAction(null);
    setShowSongModal(true);
  };

  const openSongOptions = (item: any) => {
    setSelectedSong(item);
    setSongModalInitialAction("options");
    setShowSongModal(true);
  };

  const closeSongModal = () => {
    setShowSongModal(false);
    setSelectedSong(null);
    setSongModalInitialAction(null);
  };

  return {
    showSongModal,
    selectedSong,
    songModalInitialAction,
    openSongPlayer,
    openSongOptions,
    closeSongModal,
  };
}
