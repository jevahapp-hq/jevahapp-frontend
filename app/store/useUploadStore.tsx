// import { ImageSourcePropType } from "react-native";
// import { create } from "zustand";

// export interface MediaItem {
//   imageUrl: { uri: string; };
//   id: string;
//   title: string;
//   description: string;
//   uri: string;
//   category: string[];
//   type: string;
//   contentType: string;
//   fileUrl: string;
//   fileMimeType: string;
//   uploadedBy: string;
//   viewCount: number;
//   listenCount: number;
//   readCount: number;
//   downloadCount: number;
//   isLive: boolean;
//   concurrentViewers: number;
//   createdAt: string;
//   updatedAt: string;
//   topics: string[];
//   thumbnailUrl?: string;

//   // ✅ Add these for UI purposes:
//   timeAgo?: string;
//   speaker?: string;
//   speakerAvatar?: string | number;
//   favorite?: number;
//   saved?: number;
//   sheared?: number;
// }

// interface MediaState {
//   mediaList: MediaItem[];

//   addMedia: (item: MediaItem) => void;
//   setMediaList: (items: MediaItem[]) => void;
//   removeMedia: (id: string) => void;
//   clearMediaList: () => void;
// }

// export const useMediaStore = create<MediaState>((set) => ({
//   mediaList: [],

//   addMedia: (item: MediaItem) =>
//     set((state) => ({
//       mediaList: [item, ...state.mediaList].sort(
//         (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//       ),
//     })),

//   setMediaList: (items: MediaItem[]) =>
//     set({
//       mediaList: items.sort(
//         (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//       ),
//     }),

//   removeMedia: (id: string) =>
//     set((state) => ({
//       mediaList: state.mediaList.filter((item) => item.id !== id),
//     })),

//   clearMediaList: () => set({ mediaList: [] }),
// }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureResponderEvent } from "react-native";
import { create } from "zustand";
import allMediaAPI from "../utils/allMediaAPI";
import {
  getPersistedMediaList,
  persistMediaList,
} from "../utils/persistentStorage";
import { logUserDataStatus, normalizeUserData } from "../utils/userValidation";

export interface MediaItem {
  comments: number;
  shared: number;
  onPress: ((event: GestureResponderEvent) => void) | undefined;
  imageUrl: { uri: string };
  _id?: string;
  title: string;
  description: string;
  uri: string;
  category: string[];
  type: string;
  contentType: string;
  fileUrl: string;
  fileMimeType: string;
  uploadedBy: string;
  viewCount: number;
  listenCount: number;
  readCount: number;
  downloadCount: number;
  isLive: boolean;
  concurrentViewers: number;
  createdAt: string;
  updatedAt: string;
  topics: string[];
  thumbnailUrl?: string;
  timeAgo?: string;
  speaker?: string;
  speakerAvatar?: string | number;
  favorite?: number;
  saved?: number;
  sheared: number;
  comment: number;
}

interface MediaState {
  forceRefreshWithCompleteUserData(): unknown;
  mediaList: MediaItem[];
  isLoaded: boolean;
  addMedia: (item: MediaItem) => void;
  addMediaWithUserValidation: (
    item: Omit<MediaItem, "speaker" | "speakerAvatar" | "uploadedBy">
  ) => Promise<void>;
  setMediaList: (items: MediaItem[]) => void;
  removeMedia: (id: string) => void;
  clearMediaList: () => void;
  loadPersistedMedia: () => Promise<void>;
  refreshUserDataForExistingMedia: () => Promise<void>;

  // 🔊 Add this for global audio control
  stopAudioFn: (() => Promise<void>) | null;
  setStopAudioFn: (fn: (() => Promise<void>) | null) => void;
  clearStopAudioFn: () => void;

  // Default content state and methods
  defaultContent: any[];
  defaultContentLoading: boolean;
  defaultContentError: string | null;
  defaultContentPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fetchDefaultContent: (params?: {
    page?: number;
    limit?: number;
    contentType?: string;
  }) => Promise<void>;
  loadMoreDefaultContent: () => Promise<void>;
  refreshDefaultContent: () => Promise<void>;

  // TikTok-style all content state and methods
  allContent: any[];
  allContentLoading: boolean;
  allContentError: string | null;
  allContentTotal: number;
  fetchAllContent: (useAuth?: boolean) => Promise<void>;
  refreshAllContent: () => Promise<void>;
}

export const useMediaStore = create<MediaState>((set, get) => ({
  mediaList: [],
  isLoaded: false,

  // Default content state
  defaultContent: [],
  defaultContentLoading: false,
  defaultContentError: null,
  defaultContentPagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },

  // TikTok-style all content state
  allContent: [],
  allContentLoading: false,
  allContentError: null,
  allContentTotal: 0,

  // 🎬 Load persisted media on app startup and refresh user data
  loadPersistedMedia: async () => {
    try {
      console.log("🔄 Loading persisted media list...");
      const persistedMedia = await getPersistedMediaList();

      set({
        mediaList: persistedMedia.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        isLoaded: true,
      });

      console.log(
        `✅ Loaded ${persistedMedia.length} media items from storage`
      );

      // 🔄 Automatically refresh user data for existing media items
      if (persistedMedia.length > 0) {
        await get().refreshUserDataForExistingMedia();
      }
    } catch (error) {
      console.error("❌ Failed to load persisted media:", error);
      set({ isLoaded: true }); // Mark as loaded even if failed
    }
  },

  addMedia: (item: MediaItem) => {
    try {
      if (!item || !item.title) {
        console.warn("⚠️ Attempted to add invalid media item:", item);
        return;
      }

      const updatedList = [item, ...get().mediaList].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      set({ mediaList: updatedList });

      // 🚀 Persist immediately when media is added
      persistMediaList(updatedList);
      console.log(`✅ Added and persisted media: ${item.title}`);
    } catch (error) {
      console.error("❌ Error adding media:", error);
    }
  },

  // 🛡️ Enhanced function that validates user data before adding media
  addMediaWithUserValidation: async (
    item: Omit<MediaItem, "speaker" | "speakerAvatar" | "uploadedBy">
  ) => {
    try {
      console.log("🔍 Validating user data for media upload...");

      // Get fresh user data from AsyncStorage
      const userRaw = await AsyncStorage.getItem("user");
      const user = userRaw ? JSON.parse(userRaw) : null;

      // Normalize and validate user data
      const normalizedUser = normalizeUserData(user);
      logUserDataStatus(user, "Media Upload");

      // Create complete media item with validated user data
      const completeMediaItem: MediaItem = {
        ...item,
        uploadedBy: normalizedUser.fullName,
        speaker: normalizedUser.fullName,
        speakerAvatar:
          normalizedUser.avatar || require("../../assets/images/Avatar-1.png"),
      };

      console.log("✅ User data validated for upload:", {
        fullName: normalizedUser.fullName,
        hasAvatar: !!normalizedUser.avatar,
        title: item.title,
      });

      // Use the regular addMedia function with complete data
      get().addMedia(completeMediaItem);
    } catch (error) {
      console.error("❌ Failed to validate user data for media upload:", error);

      // Fallback: add media with anonymous user data
      const fallbackMediaItem: MediaItem = {
        ...item,
        uploadedBy: "Anonymous User",
        speaker: "Anonymous User",
        speakerAvatar: require("../../assets/images/Avatar-1.png"),
      };

      console.log("⚠️ Using fallback user data for upload");
      get().addMedia(fallbackMediaItem);
    }
  },

  // 🔄 Function to refresh user data for all existing media items
  refreshUserDataForExistingMedia: async () => {
    try {
      console.log("🔄 Refreshing user data for existing media items...");

      // Get fresh user data from AsyncStorage
      const userRaw = await AsyncStorage.getItem("user");
      const user = userRaw ? JSON.parse(userRaw) : null;

      if (!user) {
        console.log("⚠️ No user data found, skipping media refresh");
        return;
      }

      // 🛡️ CRITICAL FIX: Only refresh if user data is complete
      // Don't overwrite good data with incomplete data!
      const hasCompleteUserData = user.firstName && user.lastName;
      if (!hasCompleteUserData) {
        console.warn(
          "🚨 BLOCKED: User data is incomplete, skipping media refresh to prevent 'Anonymous User'"
        );
        console.warn("   Incomplete user data:", user);
        console.warn(
          "   This refresh would have caused all videos to show 'Anonymous User'"
        );
        console.warn("   Keeping existing media data unchanged.");
        console.warn(
          "   💡 Waiting for Header component to fetch complete data from API..."
        );
        return; // Don't refresh with incomplete data
      }

      // Normalize and validate user data
      const normalizedUser = normalizeUserData(user);
      logUserDataStatus(user, "Media Refresh");

      const currentMediaList = get().mediaList;

      if (currentMediaList.length === 0) {
        console.log("📱 No media items to refresh");
        return;
      }

      // Only update if we're actually improving the data or if it's a different user
      // Check if current media already has the SAME user's data
      const firstItem = currentMediaList[0];
      if (
        firstItem &&
        firstItem.uploadedBy &&
        firstItem.uploadedBy !== "Anonymous User"
      ) {
        // Check if the current user data matches what's already in media
        const currentUserFullName = normalizedUser.fullName;
        if (firstItem.uploadedBy === currentUserFullName) {
          console.log(
            "✅ Media items already have current user's data, no refresh needed"
          );
          return;
        } else {
          console.log(
            `🔄 Different user logged in: "${currentUserFullName}" vs existing "${firstItem.uploadedBy}"`
          );
          console.log("📱 Refreshing media with new user's data...");
          // Continue with refresh for new user
        }
      }

      // 🔄 Only update media items that need fixing or belong to current user
      const updatedMediaList = currentMediaList.map((item) => {
        // Only update if:
        // 1. The item shows "Anonymous User" (needs fixing), OR
        // 2. The item was uploaded by the current user (based on some identifier)
        // DON'T update items that belong to other users

        if (
          item.uploadedBy === "Anonymous User" ||
          item.speaker === "Anonymous User"
        ) {
          console.log(`🔧 Fixing anonymous item: ${item.title}`);
          return {
            ...item,
            uploadedBy: normalizedUser.fullName,
            speaker: normalizedUser.fullName,
            speakerAvatar:
              normalizedUser.avatar ||
              require("../../assets/images/Avatar-1.png"),
          };
        }

        // Keep other users' content unchanged
        return item;
      });

      // Update store and persist
      set({ mediaList: updatedMediaList });
      await persistMediaList(updatedMediaList);

      console.log(
        `✅ Refreshed user data for ${updatedMediaList.length} media items`,
        {
          fullName: normalizedUser.fullName,
          hasAvatar: !!normalizedUser.avatar,
        }
      );
    } catch (error) {
      console.error(
        "❌ Failed to refresh user data for existing media:",
        error
      );
    }
  },

  // 🔄 Force refresh when complete user data becomes available
  forceRefreshWithCompleteUserData: async () => {
    console.log("🔄 Force refreshing media with complete user data...");
    await get().refreshUserDataForExistingMedia();
  },

  setMediaList: (items: MediaItem[]) => {
    const sortedItems = items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    set({ mediaList: sortedItems });

    // 🚀 Persist immediately when media list is set
    persistMediaList(sortedItems);
    console.log(
      `✅ Set and persisted media list (${sortedItems.length} items)`
    );
  },

  removeMedia: (id: string) => {
    const updatedList = get().mediaList.filter((item) => item._id !== id);

    set({ mediaList: updatedList });

    // 🚀 Persist immediately when media is removed
    persistMediaList(updatedList);
    console.log(`✅ Removed and persisted media with id: ${id}`);
  },

  clearMediaList: () => {
    set({ mediaList: [] });

    // 🚀 Persist immediately when cleared
    persistMediaList([]);
    console.log("✅ Cleared and persisted empty media list");
  },

  // 🔊 Audio control functions
  stopAudioFn: null,
  setStopAudioFn: (fn: (() => Promise<void>) | null) =>
    set({ stopAudioFn: fn }),
  clearStopAudioFn: () => set({ stopAudioFn: null }),

  // Default content methods
  fetchDefaultContent: async (params = {}) => {
    set({ defaultContentLoading: true, defaultContentError: null });

    try {
      console.log("🚀 Store: Fetching default content with params:", params);
      const response = await allMediaAPI.getDefaultContent(params);

      if (response.success) {
        console.log(
          "✅ Store: Successfully fetched default content:",
          response.data
        );
        set({
          defaultContent: response.data.content,
          defaultContentPagination: response.data.pagination,
          defaultContentLoading: false,
        });
      } else {
        console.error(
          "❌ Store: Failed to fetch default content:",
          response.error
        );
        set({
          defaultContentError:
            response.error || "Failed to fetch default content",
          defaultContentLoading: false,
        });
      }
    } catch (error) {
      console.error(
        "❌ Store: Exception while fetching default content:",
        error
      );
      set({
        defaultContentError:
          error instanceof Error ? error.message : "Unknown error",
        defaultContentLoading: false,
      });
    }
  },

  loadMoreDefaultContent: async () => {
    const { defaultContentPagination, defaultContentLoading } = get();

    if (
      defaultContentLoading ||
      defaultContentPagination.page >= defaultContentPagination.pages
    ) {
      return;
    }

    set({ defaultContentLoading: true });

    try {
      const response = await allMediaAPI.getDefaultContent({
        page: defaultContentPagination.page + 1,
        limit: defaultContentPagination.limit,
      });

      if (response.success) {
        set((state) => ({
          defaultContent: [...state.defaultContent, ...response.data.content],
          defaultContentPagination: response.data.pagination,
          defaultContentLoading: false,
        }));
      }
    } catch (error) {
      console.error("Error loading more default content:", error);
      set({ defaultContentLoading: false });
    }
  },

  refreshDefaultContent: async () => {
    await get().fetchDefaultContent({ page: 1, limit: 10 });
  },

  // TikTok-style all content methods
  fetchAllContent: async (useAuth = false) => {
    set({ allContentLoading: true, allContentError: null });

    try {
      console.log("🚀 Store: Fetching all content (useAuth:", useAuth, ")");

      let response;
      if (useAuth) {
        response = await allMediaAPI.getAllContentWithAuth();
      } else {
        response = await allMediaAPI.getAllContentPublic();
      }

      if (response.success) {
        console.log(
          "✅ Store: Successfully fetched all content:",
          response.media?.length || 0,
          "items"
        );
        set({
          allContent: response.media || [],
          allContentTotal: response.total || 0,
          allContentLoading: false,
        });
      } else {
        console.error("❌ Store: Failed to fetch all content:", response.error);
        set({
          allContentError: response.error || "Failed to fetch all content",
          allContentLoading: false,
        });
      }
    } catch (error) {
      console.error("❌ Store: Exception while fetching all content:", error);
      set({
        allContentError:
          error instanceof Error ? error.message : "Unknown error",
        allContentLoading: false,
      });
    }
  },

  refreshAllContent: async () => {
    // Try authenticated first, fallback to public
    try {
      await get().fetchAllContent(true);
    } catch (error) {
      console.log("🔄 Auth failed, trying public endpoint...");
      await get().fetchAllContent(false);
    }
  },
}));

// Default export for route compatibility
export default function UseUploadStore() {
  return null;
}
