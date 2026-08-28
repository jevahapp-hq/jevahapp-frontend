import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ContentInteractionClient } from "./client";
import { devLog } from "./logging";
import type { ContentStats } from "./types";

export async function syncWithLibraryStore(
  contentId: string,
  isSaved: boolean
): Promise<void> {
  try {
    const { useLibraryStore } = await import("@/store/useLibraryStore");
    const libraryStore = useLibraryStore.getState();

    if (isSaved) {
      // Item was saved but library store management is handled in components
      // This ensures the API and library store stay in sync
      devLog(
        `✅ Content ${contentId} saved - library sync handled by component`
      );
    } else {
      // Item was unsaved, remove from library store
      await libraryStore.removeFromLibrary(contentId);
      devLog(`🗑️ Content ${contentId} removed from library`);
    }
  } catch (error) {
    console.error("Error syncing with library store:", error);
  }
}

export async function fallbackGetSaveState(
  ctx: ContentInteractionClient,
  contentId: string
): Promise<{ saved: boolean; totalSaves: number }> {
  try {
    const userId = await ctx.getCurrentUserId();
    const key = `userSaves_${userId}`;
    const savesStr = await AsyncStorage.getItem(key);
    const saves = savesStr ? JSON.parse(savesStr) : {};

    const isSaved = saves[contentId] || false;
    const totalSaves = Object.values(saves).filter(Boolean).length;

    devLog(
      `🔍 FALLBACK SAVE STATE: User ${userId}, content ${contentId}, saved: ${isSaved}, totalSaves: ${totalSaves}`
    );

    return {
      saved: isSaved,
      totalSaves: totalSaves,
    };
  } catch (error) {
    console.error("Fallback get save state failed:", error);
    return { saved: false, totalSaves: 0 };
  }
}

export async function fallbackToggleLike(
  ctx: ContentInteractionClient,
  contentId: string
): Promise<{ liked: boolean; totalLikes: number }> {
  try {
    const userId = await ctx.getCurrentUserId();
    const key = `userLikes_${userId}`;
    const likesStr = await AsyncStorage.getItem(key);
    const likes = likesStr ? JSON.parse(likesStr) : {};

    const isLiked = likes[contentId] || false;
    likes[contentId] = !isLiked;

    await AsyncStorage.setItem(key, JSON.stringify(likes));

    return {
      liked: !isLiked,
      totalLikes: Object.values(likes).filter(Boolean).length,
    };
  } catch (error) {
    console.error("Fallback like toggle failed:", error);
    return { liked: false, totalLikes: 0 };
  }
}

export async function fallbackToggleSave(
  ctx: ContentInteractionClient,
  contentId: string
): Promise<{ saved: boolean; totalSaves: number }> {
  try {
    const userId = await ctx.getCurrentUserId();
    const key = `userSaves_${userId}`;
    const savesStr = await AsyncStorage.getItem(key);
    const saves = savesStr ? JSON.parse(savesStr) : {};

    const isSaved = saves[contentId] || false;
    const newSavedState = !isSaved;
    saves[contentId] = newSavedState;

    await AsyncStorage.setItem(key, JSON.stringify(saves));

    // Sync with library store
    await syncWithLibraryStore(contentId, newSavedState);

    return {
      saved: newSavedState,
      totalSaves: Object.values(saves).filter(Boolean).length,
    };
  } catch (error) {
    console.error("Fallback save toggle failed:", error);
    return { saved: false, totalSaves: 0 };
  }
}

export async function fallbackGetStats(
  ctx: ContentInteractionClient,
  contentId: string
): Promise<ContentStats> {
  try {
    const userId = await ctx.getCurrentUserId();
    const likesStr = await AsyncStorage.getItem(`userLikes_${userId}`);
    const savesStr = await AsyncStorage.getItem(`userSaves_${userId}`);

    const likes = likesStr ? JSON.parse(likesStr) : {};
    const saves = savesStr ? JSON.parse(savesStr) : {};

    return {
      contentId,
      likes: 0,
      saves: 0,
      shares: 0,
      views: 0,
      comments: 0,
      userInteractions: {
        liked: likes[contentId] || false,
        saved: saves[contentId] || false,
        shared: false,
        viewed: false,
      },
    };
  } catch (error) {
    console.error("Fallback get stats failed:", error);
    return {
      contentId,
      likes: 0,
      saves: 0,
      shares: 0,
      views: 0,
      comments: 0,
      userInteractions: {
        liked: false,
        saved: false,
        shared: false,
        viewed: false,
      },
    };
  }
}
