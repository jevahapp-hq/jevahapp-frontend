import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, View } from "react-native";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
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
import { filterCatalogSongs } from "./musicFormatters";
import type { DisplayMode } from "./types";
import { useCatalogMusicWhilePageOpen } from "./useCatalogMusicWhilePageOpen";
import { useMusicCatalog } from "./useMusicCatalog";

export default function Music({ active = true }: { active?: boolean }) {
  useCatalogMusicWhilePageOpen(active);
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

  const visibleSongs = useMemo(
    () => filterCatalogSongs(songs, searchQuery, selectedCategory),
    [songs, searchQuery, selectedCategory]
  );
  const openArtistProfile = useOpenArtistProfile();
  const handlePlayPress = useMusicPlayPress(visibleSongs);
  const { openSongPlayer, openSongOptions } = useSongModal();

  useEffect(() => {
    useCopyrightFreeOverlayStore.getState().setQueue(visibleSongs);
    if (visibleSongs[0]) {
      useCopyrightFreeOverlayStore.getState().warm(visibleSongs[0]);
    }
  }, [visibleSongs]);

  const showEmpty = visibleSongs.length === 0;
  const emptyIsLoading = loading && songs.length === 0;

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
          loading={emptyIsLoading}
          error={songs.length === 0 ? error : null}
          musicLane={musicLane}
          onBecomeCreator={() => router.push("/creators")}
        />
      ) : (
        <MusicSongsList
          songs={visibleSongs}
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
