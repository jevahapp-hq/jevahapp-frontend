import { useEffect, useState } from "react";
import { useLibraryStore } from "../store/useLibraryStore";

interface SafeLibraryStore {
  isItemSaved: (itemId: string) => boolean;
  addToLibrary: (item: any) => Promise<void>;
  removeFromLibrary: (itemId: string) => Promise<void>;
  savedItems: any[];
  isLoaded: boolean;
}

export const useSafeLibraryStore = (): SafeLibraryStore => {
  const [isReady, setIsReady] = useState(false);
  const [storeError, setStoreError] = useState<Error | null>(null);

  // Get the actual store - this should always work if the store is properly initialized
  let actualStore: any = null;
  try {
    actualStore = useLibraryStore();
  } catch (error) {
    console.warn("⚠️ Failed to get library store:", error);
    setStoreError(error as Error);
  }

  // Fallback store that never fails
  const fallbackStore: SafeLibraryStore = {
    isItemSaved: () => false,
    addToLibrary: async () => {
      console.warn("⚠️ Library store not available - addToLibrary ignored");
    },
    removeFromLibrary: async () => {
      console.warn(
        "⚠️ Library store not available - removeFromLibrary ignored"
      );
    },
    savedItems: [],
    isLoaded: false,
  };

  // Check if store is properly initialized
  useEffect(() => {
    if (actualStore && typeof actualStore.isItemSaved === "function") {
      setIsReady(true);
      setStoreError(null);
    } else {
      setIsReady(false);
    }
  }, [actualStore]);

  // Return the actual store if ready and valid, otherwise fallback
  if (isReady && actualStore && typeof actualStore.isItemSaved === "function") {
    return actualStore;
  }

  return fallbackStore;
};
