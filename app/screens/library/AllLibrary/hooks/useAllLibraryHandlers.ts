/**
 * useAllLibraryHandlers - Library actions: remove, share, save, like, delete, book
 */
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Animated, Share } from "react-native";
import { useDeleteMedia } from "../../../../hooks/useDeleteMedia";
import { useInteractionStore } from "../../../../store/useInteractionStore";
import { useLibraryStore } from "../../../../store/useLibraryStore";
import allMediaAPI from "../../../../utils/allMediaAPI";
import { useDownloadHandler } from "../../../../utils/downloadUtils";

interface UseAllLibraryHandlersProps {
  savedItems: any[];
  setSavedItems: React.Dispatch<React.SetStateAction<any[]>>;
  savedItemIds: Set<string>;
  setSavedItemIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowOverlay: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isItemSaved: (id: string) => boolean;
  refreshSavedState: () => void;
  setSuccessMessage: (msg: string) => void;
  setShowSuccessCard: (show: boolean) => void;
  setMenuOpenId: (id: string | null) => void;
}

export function useAllLibraryHandlers({
  savedItems,
  setSavedItems,
  savedItemIds,
  setSavedItemIds,
  setShowOverlay,
  isItemSaved,
  refreshSavedState,
  setSuccessMessage,
  setShowSuccessCard,
  setMenuOpenId,
}: UseAllLibraryHandlersProps) {
  const router = useRouter();
  const libraryStore = useLibraryStore();
  const { toggleLike, toggleSave } = useInteractionStore();
  const { handleDownload } = useDownloadHandler();
  const { deleteMediaItem, checkOwnership } = useDeleteMedia();

  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [bookAnimation] = useState(new Animated.Value(0));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItemForDelete, setSelectedItemForDelete] = useState<any>(null);
  const [isOwnerMap, setIsOwnerMap] = useState<Record<string, boolean>>({});

  const removeFromSaved = useCallback(
    (itemId: string) => {
      setSavedItems((prev) =>
        prev.filter((s) => (s._id || s.id) !== itemId)
      );
      setSavedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    },
    [setSavedItems, setSavedItemIds]
  );

  const handleRemoveFromLibrary = useCallback(
    async (item: any) => {
      const itemId = item._id || item.id;

      try {
        const response = await allMediaAPI.unbookmarkContent(itemId);

        if (response.success) {
          await libraryStore.removeFromLibrary(itemId);
          removeFromSaved(itemId);
        } else {
          await libraryStore.removeFromLibrary(itemId);
          removeFromSaved(itemId);
        }
      } catch {
        try {
          await libraryStore.removeFromLibrary(itemId);
          removeFromSaved(itemId);
        } catch (localError) {
          console.error("Failed to remove from library:", localError);
        }
      }
      setMenuOpenId(null);
    },
    [libraryStore, removeFromSaved, setMenuOpenId]
  );

  const handleShare = useCallback(async (item: any) => {
    try {
      const mediaUrl = item.mediaUrl || item.fileUrl || "";
      await Share.share({
        title: item.title,
        message: `Check out this ${item.contentType}: ${item.title}\n${mediaUrl}`,
        url: mediaUrl,
      });
      setMenuOpenId(null);
    } catch {
      setMenuOpenId(null);
    }
  }, [setMenuOpenId]);

  const handleSaveToLibrary = useCallback(
    async (item: any) => {
      const itemId = item._id || item.id;
      const isCurrentlySaved = isItemSaved(itemId);

      if (isCurrentlySaved) {
        Alert.alert(
          "Remove from Library",
          `Are you sure you want to remove "${item.title}" from your library?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: async () => {
                try {
                  await handleRemoveFromLibrary(item);
                  setSuccessMessage("Removed from library!");
                  setShowSuccessCard(true);
                } catch {
                  Alert.alert("Error", "Failed to remove item from library.");
                }
              },
            },
          ]
        );
      } else {
        try {
          await toggleSave(itemId, "media");

          const libraryItem = {
            id: itemId,
            contentType: item.contentType || "unknown",
            fileUrl: item.mediaUrl || item.fileUrl || "",
            title: item.title || "Untitled",
            speaker: item.speaker || item.uploadedBy || "",
            uploadedBy: item.uploadedBy || "",
            description: item.description || "",
            createdAt: item.createdAt || new Date().toISOString(),
            speakerAvatar: item.speakerAvatar || item.imageUrl,
            views: item.views || 0,
            sheared: item.sheared || 0,
            saved: 1,
            comment: item.comment || 0,
            favorite: item.favorite || 0,
            imageUrl: item.imageUrl || item.thumbnailUrl,
          };

          await libraryStore.addToLibrary(libraryItem);
          setSavedItems((prev) => {
            const exists = prev.some((s) => (s._id || s.id) === itemId);
            return exists ? prev : [item, ...prev];
          });
          setSavedItemIds((prev) => new Set([...prev, itemId]));
          refreshSavedState();
          Alert.alert("Success", `"${item.title}" has been added to your library`);
        } catch {
          Alert.alert("Error", "Failed to save item to library.");
        }
      }
    },
    [
      isItemSaved,
      handleRemoveFromLibrary,
      toggleSave,
      libraryStore,
      refreshSavedState,
      setSavedItems,
      setSavedItemIds,
      setSuccessMessage,
      setShowSuccessCard,
    ]
  );

  const handleLike = useCallback(
    async (itemId: string) => {
      try {
        await toggleLike(itemId, "media");
      } catch {
        Alert.alert("Error", "Failed to like content");
      }
    },
    [toggleLike]
  );

  const checkItemOwnership = useCallback(
    async (item: any) => {
      const itemId = item._id || item.id;
      if (!isOwnerMap[itemId]) {
        const uploadedBy =
          item.uploadedBy || item.author?._id || item.authorInfo?._id;
        const isOwner = await checkOwnership(uploadedBy);
        setIsOwnerMap((prev) => ({ ...prev, [itemId]: isOwner }));
      }
    },
    [checkOwnership, isOwnerMap]
  );

  const handleDeletePress = useCallback((item: any) => {
    setSelectedItemForDelete(item);
    setShowDeleteModal(true);
    setMenuOpenId(null);
  }, [setMenuOpenId]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedItemForDelete) return;

    const itemId = selectedItemForDelete._id || selectedItemForDelete.id;
    const success = await deleteMediaItem(itemId);

    if (success) {
      removeFromSaved(itemId);
      await libraryStore.removeFromLibrary(itemId);
      setShowDeleteModal(false);
      setSelectedItemForDelete(null);
      setSuccessMessage("Media deleted successfully!");
      setShowSuccessCard(true);
    }
  }, [
    selectedItemForDelete,
    deleteMediaItem,
    libraryStore,
    removeFromSaved,
    setShowSuccessCard,
    setSuccessMessage,
  ]);

  const openBook = useCallback((book: any) => {
    setSelectedBook(book);
    setBookModalVisible(true);
    Animated.timing(bookAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [bookAnimation]);

  const closeBook = useCallback(() => {
    Animated.timing(bookAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setBookModalVisible(false);
      setSelectedBook(null);
    });
  }, [bookAnimation]);

  const openBookInPdfViewer = useCallback(
    (book: any) => {
      const pdfUrl = book.mediaUrl || book.fileUrl || "";
      if (typeof pdfUrl === "string" && /^https?:\/\//.test(pdfUrl)) {
        router.push({
          pathname: "/reader/PdfViewer",
          params: {
            url: pdfUrl,
            ebookId: book?._id || book?.id || "",
            title: book.title || "Untitled",
            desc: book.description || "",
          },
        });
        closeBook();
      } else {
        Alert.alert("Error", "PDF URL is not available for this book");
      }
    },
    [router, closeBook]
  );

  return {
    handleRemoveFromLibrary,
    handleShare,
    handleSaveToLibrary,
    handleLike,
    handleDeletePress,
    handleDeleteConfirm,
    checkItemOwnership,
    openBook,
    closeBook,
    openBookInPdfViewer,
    handleDownload,
    bookModalVisible,
    selectedBook,
    bookAnimation,
    showDeleteModal,
    setShowDeleteModal,
    selectedItemForDelete,
    setSelectedItemForDelete,
    isOwnerMap,
  };
}
