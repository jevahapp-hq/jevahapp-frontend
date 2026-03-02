import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export interface LibraryItem {
  id: string;
  contentType: string; // "videos", "music", "sermon", "e-books", "live"
  fileUrl: string;
  title: string;
  speaker?: string;
  uploadedBy?: string;
  description?: string;
  createdAt: string;
  speakerAvatar?: string | number | { uri: string };
  views?: number;
  sheared?: number;
  saved?: number;
  comment?: number;
  favorite?: number;
  imageUrl?: string | { uri: string };
  thumbnailUrl?: string;
  originalKey?: string; // The key used in the original component
}

interface LibraryStore {
  savedItems: LibraryItem[];
  isLoaded: boolean;

  // Actions
  addToLibrary: (item: LibraryItem) => Promise<void>;
  removeFromLibrary: (itemId: string) => Promise<void>;
  isItemSaved: (itemId: string) => boolean;
  loadSavedItems: () => Promise<void>;
  getSavedItemsByType: (contentType: string) => LibraryItem[];
  getAllSavedItems: () => LibraryItem[];
}

const STORAGE_KEY = "userLibraryItems";

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  savedItems: [],
  isLoaded: false,

  addToLibrary: async (item: LibraryItem) => {
    const { savedItems } = get();
    const currentSavedItems = Array.isArray(savedItems) ? savedItems : [];

    // Check if item already exists
    const existingItem = currentSavedItems.find(
      (saved) => saved.id === item.id
    );
    if (existingItem) {
      console.log(`📚 Item already in library: ${item.title}`);
      return;
    }

    // Add timestamp for when it was saved
    const itemWithSaveTime = {
      ...item,
      savedAt: new Date().toISOString(),
    };

    const updatedItems = [itemWithSaveTime, ...currentSavedItems];

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
      set({ savedItems: updatedItems });
      console.log(`✅ Added to library: ${item.title} (${item.contentType})`);
    } catch (error) {
      console.error("❌ Failed to save item to library:", error);
      throw error; // Re-throw to let caller handle
    }
  },

  removeFromLibrary: async (itemId: string) => {
    const { savedItems } = get();
    const currentSavedItems = Array.isArray(savedItems) ? savedItems : [];
    const updatedItems = currentSavedItems.filter((item) => item.id !== itemId);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
      set({ savedItems: updatedItems });
      console.log(`🗑️ Removed from library: ${itemId}`);
    } catch (error) {
      console.error("❌ Failed to remove item from library:", error);
      throw error; // Re-throw to let caller handle
    }
  },

  isItemSaved: (itemId: string) => {
    const { savedItems } = get();
    return (
      Array.isArray(savedItems) && savedItems.some((item) => item.id === itemId)
    );
  },

  loadSavedItems: async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      const savedItems = savedData ? JSON.parse(savedData) : [];

      set({
        savedItems,
        isLoaded: true,
      });

      console.log(`📚 Loaded ${savedItems.length} items from library`);
    } catch (error) {
      console.error("❌ Failed to load saved items:", error);
      set({ savedItems: [], isLoaded: true });
    }
  },

  getSavedItemsByType: (contentType: string) => {
    const { savedItems } = get();
    return Array.isArray(savedItems)
      ? savedItems.filter(
          (item) => item.contentType.toLowerCase() === contentType.toLowerCase()
        )
      : [];
  },

  getAllSavedItems: () => {
    const { savedItems } = get();
    return Array.isArray(savedItems) ? savedItems : [];
  },
}));

// Default export for route compatibility
export default function UseLibraryStore() {
  return null;
}
