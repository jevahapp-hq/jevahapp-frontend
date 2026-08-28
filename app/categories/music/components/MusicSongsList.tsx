import { Dimensions, FlatList, View } from "react-native";
import type { MusicLane } from "../MusicLaneTabs";
import type { DisplayMode } from "../types";
import { MusicCatalogSkeleton } from "./MusicCatalogSkeleton";
import { renderSongItem } from "./songItems";

type MusicSongsListProps = {
  songs: any[];
  displayMode: DisplayMode;
  musicLane: MusicLane;
  loading: boolean;
  loadingMore: boolean;
  searchQuery: string;
  selectedCategory: string | null;
  screenWidth?: number;
  onOpenPlayer: (item: any) => void;
  onPlayPress: (item: any) => Promise<void>;
  onOpenOptions: (item: any) => void;
  onOpenArtistProfile: (slug?: string) => void;
  onRefresh: (
    search?: string,
    category?: string | null,
    lane?: MusicLane
  ) => void;
  onLoadMoreArtists: () => void;
};

export function MusicSongsList({
  songs,
  displayMode,
  musicLane,
  loading,
  loadingMore,
  searchQuery,
  selectedCategory,
  screenWidth = Dimensions.get("window").width,
  onOpenPlayer,
  onPlayPress,
  onOpenOptions,
  onOpenArtistProfile,
  onRefresh,
  onLoadMoreArtists,
}: MusicSongsListProps) {
  return (
    <FlatList
      data={songs}
      renderItem={({ item }) =>
        renderSongItem({
          item,
          displayMode,
          onOpenPlayer,
          onPlayPress,
          onOpenOptions,
          onOpenArtistProfile,
          screenWidth,
        })
      }
      keyExtractor={(item) => item.id}
      key={`${displayMode}-${musicLane}`}
      numColumns={
        displayMode === "grid" ? 2 : displayMode === "small" ? 3 : 1
      }
      contentContainerStyle={{
        paddingBottom: 100, // Space for bottom nav
      }}
      showsVerticalScrollIndicator={false}
      onRefresh={() =>
        onRefresh(searchQuery || undefined, selectedCategory, musicLane)
      }
      refreshing={loading && !loadingMore}
      onEndReached={musicLane === "artists" ? onLoadMoreArtists : undefined}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? (
          <View style={{ paddingVertical: 4 }}>
            <MusicCatalogSkeleton showDiscover={false} rows={2} />
          </View>
        ) : null
      }
    />
  );
}
