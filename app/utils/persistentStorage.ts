// utils/persistentStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Video stats persistence (global across all users for social media behavior)
export const persistStats = async (stats: Record<string, any>) => {
  try {
    await AsyncStorage.setItem("globalVideoStats", JSON.stringify(stats));
    console.log("✅ Global video stats persisted successfully");
  } catch (err) {
    console.error("❌ Failed to persist global stats:", err);
  }
};

export const getPersistedStats = async (): Promise<Record<string, any>> => {
  try {
    const stored = await AsyncStorage.getItem("globalVideoStats");
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error("❌ Failed to load global stats:", err);
    return {};
  }
};

// ✅ Previously viewed videos persistence (global)
export const persistViewed = async (items: any[]) => {
  try {
    await AsyncStorage.setItem("globalViewedVideos", JSON.stringify(items));
    console.log("✅ Global viewed videos persisted successfully");
  } catch (err) {
    console.error("❌ Failed to save global viewed videos:", err);
  }
};

export const getViewed = async (): Promise<any[]> => {
  try {
    const stored = await AsyncStorage.getItem("globalViewedVideos");
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error("❌ Failed to load global viewed videos:", err);
    return [];
  }
};

// 🎵 Audio previously viewed persistence (separate from videos)
export const persistViewedAudio = async (items: any[]) => {
  try {
    await AsyncStorage.setItem("globalViewedAudio", JSON.stringify(items));
    console.log("✅ Global viewed audio persisted successfully");
  } catch (err) {
    console.error("❌ Failed to save global viewed audio:", err);
  }
};

export const getViewedAudio = async (): Promise<any[]> => {
  try {
    const stored = await AsyncStorage.getItem("globalViewedAudio");
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error("❌ Failed to load global viewed audio:", err);
    return [];
  }
};

// 🎬 NEW: Media list persistence (the key to social media behavior)
export const persistMediaList = async (mediaList: any[]) => {
  try {
    await AsyncStorage.setItem("globalMediaList", JSON.stringify(mediaList));
    console.log(`✅ Global media list persisted successfully (${mediaList.length} items)`);
  } catch (err) {
    console.error("❌ Failed to persist global media list:", err);
  }
};

export const getPersistedMediaList = async (): Promise<any[]> => {
  try {
    const stored = await AsyncStorage.getItem("globalMediaList");
    if (!stored) {
      console.log("✅ No stored media list found, returning empty array");
      return [];
    }
    
    const result = JSON.parse(stored);
    if (!Array.isArray(result)) {
      console.warn("⚠️ Stored media list is not an array, returning empty array");
      return [];
    }
    
    console.log(`✅ Global media list loaded successfully (${result.length} items)`);
    return result;
  } catch (err) {
    console.error("❌ Failed to load global media list:", err);
    return [];
  }
};

// 🎯 Global favorite counts (shared across all users)
export const persistGlobalFavoriteCounts = async (favoriteCounts: Record<string, number>) => {
  try {
    await AsyncStorage.setItem("globalFavoriteCounts", JSON.stringify(favoriteCounts));
    console.log("✅ Global favorite counts persisted successfully");
  } catch (err) {
    console.error("❌ Failed to persist global favorite counts:", err);
  }
};

export const getGlobalFavoriteCounts = async (): Promise<Record<string, number>> => {
  try {
    const stored = await AsyncStorage.getItem("globalFavoriteCounts");
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error("❌ Failed to load global favorite counts:", err);
    return {};
  }
};

// 👤 User-specific favorites (per user, for showing red color)
export const getUserId = async (): Promise<string> => {
  try {
    const userStr = await AsyncStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user._id || user.id || user.email || "anonymous";
    }
    return "anonymous";
  } catch (err) {
    console.error("❌ Failed to get user ID:", err);
    return "anonymous";
  }
};

export const persistUserFavorites = async (userId: string, favorites: Record<string, boolean>) => {
  try {
    await AsyncStorage.setItem(`userFavorites_${userId}`, JSON.stringify(favorites));
    console.log(`✅ User favorites persisted for user ${userId}`);
  } catch (err) {
    console.error(`❌ Failed to persist user favorites for ${userId}:`, err);
  }
};

export const getUserFavorites = async (userId: string): Promise<Record<string, boolean>> => {
  try {
    const stored = await AsyncStorage.getItem(`userFavorites_${userId}`);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error(`❌ Failed to load user favorites for ${userId}:`, err);
    return {};
  }
};

// 🎯 Combined favorite operations
export const toggleFavorite = async (contentKey: string): Promise<{ isUserFavorite: boolean; globalCount: number }> => {
  try {
    const userId = await getUserId();
    
    // Get current user favorites and global counts
    const userFavorites = await getUserFavorites(userId);
    const globalCounts = await getGlobalFavoriteCounts();
    
    // Toggle user favorite
    const wasUserFavorite = userFavorites[contentKey] || false;
    const isUserFavorite = !wasUserFavorite;
    
    // Update global count based on user action
    const currentGlobalCount = globalCounts[contentKey] || 0;
    const newGlobalCount = isUserFavorite 
      ? currentGlobalCount + 1 
      : Math.max(0, currentGlobalCount - 1);
    
    // Save updates
    userFavorites[contentKey] = isUserFavorite;
    globalCounts[contentKey] = newGlobalCount;
    
    await persistUserFavorites(userId, userFavorites);
    await persistGlobalFavoriteCounts(globalCounts);
    
    console.log(`🎯 Favorite toggled for ${contentKey}:`, {
      userId,
      isUserFavorite,
      globalCount: newGlobalCount
    });
    
    return { isUserFavorite, globalCount: newGlobalCount };
  } catch (err) {
    console.error("❌ Failed to toggle favorite:", err);
    return { isUserFavorite: false, globalCount: 0 };
  }
};

export const getFavoriteState = async (contentKey: string): Promise<{ isUserFavorite: boolean; globalCount: number }> => {
  try {
    const userId = await getUserId();
    const userFavorites = await getUserFavorites(userId);
    const globalCounts = await getGlobalFavoriteCounts();
    
    return {
      isUserFavorite: userFavorites[contentKey] || false,
      globalCount: globalCounts[contentKey] || 0
    };
  } catch (err) {
    console.error("❌ Failed to get favorite state:", err);
    return { isUserFavorite: false, globalCount: 0 };
  }
};

// 🧹 Utility to clear all data (for debugging)
export const clearAllPersistedData = async () => {
  try {
    await AsyncStorage.multiRemove([
      "globalVideoStats",
      "globalViewedVideos", 
      "globalMediaList",
      "globalFavoriteCounts",
      // Keep old keys for backward compatibility during transition
      "videoStats",
      "viewedVideos"
    ]);
    
    // Clear all user favorites
    const allKeys = await AsyncStorage.getAllKeys();
    const userFavoriteKeys = allKeys.filter(key => key.startsWith("userFavorites_"));
    if (userFavoriteKeys.length > 0) {
      await AsyncStorage.multiRemove(userFavoriteKeys);
    }
    
    console.log("✅ All persisted data cleared");
  } catch (err) {
    console.error("❌ Failed to clear persisted data:", err);
  }
};

// Default export for route compatibility
export default function PersistentStorage() {
  return null;
}