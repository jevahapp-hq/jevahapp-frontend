import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, View } from "react-native";
import { useCopyrightFreeOverlayStore } from "../../store/useCopyrightFreeOverlayStore";
import { ArtistsLaneBanner } from "./components/ArtistsLaneBanner";
import { MusicDiscoverShelf } from "./components/MusicDiscoverShelf";
import { MusicEmptyState } from "./components/MusicEmptyState";
import { MusicFilterModal } from "./components/MusicFilterModal";
import { MusicHeader } from "./components/MusicHeader";
import { MusicSongsList } from "./components/MusicSongsList";
import { useMusicPlayPress } from "./hooks/useMusicPlayPress";
import { useOpenArtistProfile } from "./hooks/useOpenArtistProfile";
import { useSongModal } from "./hooks/useSongModal";
import {
    MusicLaneTabs,
    type MusicLane,
} from "./MusicLaneTabs";
import type { DisplayMode } from "./types";
import { useMusicCatalog } from "./useMusicCatalog";

export default function Music() {
  const router = useRouter();
  const [musicLane, setMusicLane] = useState<MusicLane>("copyright-free");
  const {
    songs,
    setSongs,
    loading,
    loadingMore,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    loadSongs,
    loadMoreArtists,
    usingMusicForYou,
  } = useMusicCatalog(musicLane);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("list");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const { width: SCREEN_WIDTH } = Dimensions.get("window");

  const openArtistProfile = useOpenArtistProfile();
  const handlePlayPress = useMusicPlayPress(songs);
  const { openSongPlayer, openSongOptions } = useSongModal();

  useEffect(() => {
    useCopyrightFreeOverlayStore.getState().setQueue(songs);
    if (songs[0]) {
      useCopyrightFreeOverlayStore.getState().warm(songs[0]);
    }
  }, [songs]);

  const showEmpty = loading || !!error || songs.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <MusicLaneTabs
        lane={musicLane}
        onChange={(next) => {
          setMusicLane(next);
          setSelectedCategory(null);
          setSearchQuery("");
          setSongs([]);
        }}
      />

      <MusicHeader
        showSearchInput={showSearchInput}
        searchQuery={searchQuery}
        displayMode={displayMode}
        onShowSearch={() => setShowSearchInput(true)}
        onHideSearch={() => setShowSearchInput(false)}
        onSearchChange={setSearchQuery}
        onOpenFilter={() => setShowFilterModal(true)}
        onDisplayModeChange={setDisplayMode}
      />

      {musicLane === "copyright-free" ? (
        <MusicDiscoverShelf screenWidth={SCREEN_WIDTH} />
      ) : (
        <ArtistsLaneBanner personalized={usingMusicForYou} />
      )}

      {showEmpty ? (
        <MusicEmptyState
          loading={loading}
          error={error}
          musicLane={musicLane}
          onBecomeCreator={() => router.push("/creators")}
        />
      ) : (
        <MusicSongsList
          songs={songs}
          displayMode={displayMode}
          musicLane={musicLane}
          loading={loading}
          loadingMore={loadingMore}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          screenWidth={SCREEN_WIDTH}
          onOpenPlayer={openSongPlayer}
          onPlayPress={handlePlayPress}
          onOpenOptions={openSongOptions}
          onOpenArtistProfile={openArtistProfile}
          onRefresh={loadSongs}
          onLoadMoreArtists={loadMoreArtists}
        />
      )}

      <MusicFilterModal
        visible={showFilterModal}
        categories={categories}
        selectedCategory={selectedCategory}
        onClose={() => setShowFilterModal(false)}
        onSelectCategory={setSelectedCategory}
      />
    </View>
  );
}
