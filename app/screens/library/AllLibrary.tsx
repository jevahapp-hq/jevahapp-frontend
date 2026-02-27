/**
 * AllLibrary - User's saved content (videos, audio, ebooks)
 * Modular: uses hooks and components for maintainability
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DeleteMediaConfirmation } from "../../components/DeleteMediaConfirmation";
import SuccessCard from "../../components/SuccessCard";
import { convertToDownloadableItem } from "../../utils/downloadUtils";
import {
  useAllLibraryData,
  useAllLibraryHandlers,
  useAllLibraryPlayback,
} from "./AllLibrary/hooks";
import { AllLibraryBookModal } from "./AllLibrary/components/AllLibraryBookModal";
import { AllLibraryMediaCard } from "./AllLibrary/components/AllLibraryMediaCard";

export default function AllLibrary({ contentType }: { contentType?: string }) {
  const router = useRouter();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const data = useAllLibraryData({ contentType });
  const {
    filteredItems,
    loading,
    error,
    refreshing,
    onRefresh,
    savedItemIds,
    setSavedItemIds,
    showOverlay,
    setShowOverlay,
    isItemSaved,
    refreshSavedState,
    setSavedItems,
  } = data;

  const dotsRefs = useRef<Record<string, any>>({});
  const playback = useAllLibraryPlayback();
  const {
    playingVideos,
    playingAudio,
    videoRefs,
    togglePlay,
    toggleAudioPlay,
    seekVideo,
    seekAudio,
    toggleAudioMute,
  } = playback;

  const handlers = useAllLibraryHandlers({
    savedItems: data.savedItems,
      setSavedItems,
    savedItemIds,
      setSavedItemIds,
    setShowOverlay,
    isItemSaved,
      refreshSavedState,
    setSuccessMessage,
    setShowSuccessCard,
    setMenuOpenId,
  });

  const { handleDownload } = handlers;

  const renderMediaCard = useCallback(
    ({ item }: any) => {
      const itemId = item._id || item.id;
      return (
        <AllLibraryMediaCard
          item={item}
          isPlaying={playingVideos[itemId] ?? false}
          isAudioPlaying={playingAudio === itemId}
          showVideoOverlay={showOverlay[itemId] ?? true}
          videoRefs={videoRefs}
          dotsRefs={dotsRefs}
          menuOpenId={menuOpenId}
          setMenuOpenId={setMenuOpenId}
          setMenuPos={setMenuPos}
          onTogglePlay={(id) => togglePlay(id, setShowOverlay)}
          onToggleAudioPlay={toggleAudioPlay}
          onOpenBook={handlers.openBook}
          onOpenBookInPdfViewer={handlers.openBookInPdfViewer}
          onCheckOwnership={handlers.checkItemOwnership}
          onShare={handlers.handleShare}
          onDownloadRequest={async (i: any) => {
            const ct = i.contentType === "music" ? "audio" : i.contentType;
            await handleDownload(convertToDownloadableItem(i, ct as any));
          }}
          onRemoveFromLibrary={handlers.handleRemoveFromLibrary}
          onDeletePress={handlers.handleDeletePress}
          isOwner={handlers.isOwnerMap[itemId] ?? false}
          setPlayingVideos={playback.setPlayingVideos}
          setShowOverlay={setShowOverlay}
          router={router}
        />
      );
    },
    [
      playingVideos,
      playingAudio,
      showOverlay,
      menuOpenId,
      togglePlay,
      toggleAudioPlay,
      setShowOverlay,
      handlers,
      playback.setPlayingVideos,
      handleDownload,
      router,
      videoRefs,
      dotsRefs,
    ]
  );

  const keyExtractor = useCallback(
    (item: any, index: number) => item._id || item.id || `item-${index}`,
    []
  );

  const renderErrorBanner = () =>
    error ? (
      <View className="mx-4 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <View className="flex-row items-center">
          <Ionicons name="warning-outline" size={20} color="#F59E0B" />
          <Text className="text-yellow-800 text-sm font-rubik ml-2 flex-1">
            {error}
          </Text>
        </View>
      </View>
    ) : null;

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-10">
      <Ionicons name="bookmark-outline" size={48} color="#98A2B3" />
      <Text className="text-[#98A2B3] text-lg font-rubik-medium mt-4">
        No saved content yet
      </Text>
      <Text className="text-[#D0D5DD] text-sm font-rubik text-center mt-2 px-6">
        Content you save will appear here for easy access
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View className="flex-1 justify-center items-center py-10">
      <Ionicons name="refresh" size={48} color="#98A2B3" />
      <Text className="text-[#98A2B3] text-lg font-rubik-medium mt-4">
        Loading your library...
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {showSuccessCard && (
        <SuccessCard
          message={successMessage}
          onClose={() => setShowSuccessCard(false)}
          duration={3000}
        />
      )}

      {loading ? (
        renderLoadingState()
      ) : filteredItems.length === 0 ? (
        <>
          {renderErrorBanner()}
          {renderEmptyState()}
        </>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderMediaCard}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={renderErrorBanner}
          contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 12 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={7}
        />
      )}

      {handlers.selectedItemForDelete && (
        <DeleteMediaConfirmation
          visible={handlers.showDeleteModal}
          mediaId={
            handlers.selectedItemForDelete._id ||
            handlers.selectedItemForDelete.id ||
            ""
          }
          mediaTitle={
            handlers.selectedItemForDelete.title || "this media"
          }
          onClose={() => {
            handlers.setShowDeleteModal(false);
            handlers.setSelectedItemForDelete(null);
          }}
          onSuccess={handlers.handleDeleteConfirm}
        />
      )}

      <AllLibraryBookModal
        visible={handlers.bookModalVisible}
        selectedBook={handlers.selectedBook}
        bookAnimation={handlers.bookAnimation}
        onClose={handlers.closeBook}
        onReadNow={handlers.openBookInPdfViewer}
      />
    </SafeAreaView>
  );
}
