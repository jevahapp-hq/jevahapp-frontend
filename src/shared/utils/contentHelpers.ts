/**
 * Content Helper Utilities
 * Shared utilities for working with content items across the application
 */

import { getTimeAgo as getTimeAgoFromTimeUtils } from "../../../app/utils/timeUtils";
import { getUserAvatarFromContent as getUserAvatarFromUserValidation, getUserDisplayNameFromContent as getUserDisplayNameFromUserValidation } from "../../../app/utils/userValidation";
import { enrichContentWithUserData } from "../../../app/utils/dataFetching";
import { ContentType, MediaItem } from "../types";

/**
 * Transform API response to MediaItem format
 * Enriches content with cached user data (fullname and avatar) if backend doesn't populate them
 */
export const transformApiResponseToMediaItem = (item: any): MediaItem | null => {
  // Return null instead of throwing - safer for map operations
  if (!item) {
    return null;
  }

  try {
    // Enrich content with cached user data (fullname and avatar)
    const enrichedItem = enrichContentWithUserData(item);

  return {
    _id: enrichedItem._id || enrichedItem.id,
    contentType: enrichedItem.contentType || "media",
    fileUrl: enrichedItem.fileUrl || enrichedItem.file || enrichedItem.url || "",
    title: enrichedItem.title || "Untitled",
    speaker: enrichedItem.speaker || enrichedItem.author?.firstName || enrichedItem.uploadedBy?.firstName,
    // Preserve the full uploadedBy object if it exists (with firstName, lastName, etc.), otherwise keep as string
    uploadedBy: typeof enrichedItem.uploadedBy === "object" && enrichedItem.uploadedBy !== null
      ? enrichedItem.uploadedBy  // Preserve the full object with all user data
      : enrichedItem.uploadedBy,  // Keep as string if it's a string ID
    description: enrichedItem.description || enrichedItem.title || "",
    speakerAvatar: enrichedItem.speakerAvatar || enrichedItem.author?.avatar || enrichedItem.uploadedBy?.avatar,
    views: enrichedItem.views || enrichedItem.viewCount || enrichedItem.totalViews || 0,
    sheared: enrichedItem.sheared || enrichedItem.shares || enrichedItem.shareCount || enrichedItem.totalShares || 0,
    saved: enrichedItem.saved || enrichedItem.saves || 0,
    comment: enrichedItem.comment || enrichedItem.comments || enrichedItem.commentCount || 0,
    favorite: enrichedItem.favorite || enrichedItem.likes || enrichedItem.likeCount || enrichedItem.totalLikes || 0,
    imageUrl: enrichedItem.imageUrl || enrichedItem.thumbnailUrl || enrichedItem.fileUrl,
    thumbnailUrl: enrichedItem.thumbnailUrl || enrichedItem.imageUrl,
    createdAt: enrichedItem.createdAt || enrichedItem.created_at || new Date().toISOString(),
    duration: enrichedItem.duration,
    // Additional fields
    likes: enrichedItem.likes || enrichedItem.likeCount || enrichedItem.totalLikes || 0,
    shares: enrichedItem.shares || enrichedItem.shareCount || enrichedItem.totalShares || 0,
    saves: enrichedItem.saves || 0,
    comments: enrichedItem.comments || enrichedItem.commentCount || 0,
    authorInfo: enrichedItem.authorInfo || enrichedItem.author,
    author: enrichedItem.author || enrichedItem.authorInfo,
    viewCount: enrichedItem.viewCount || enrichedItem.totalViews || enrichedItem.views || 0,
    totalViews: enrichedItem.totalViews || enrichedItem.viewCount || enrichedItem.views || 0,
    shareCount: enrichedItem.shareCount || enrichedItem.totalShares || enrichedItem.shares || 0,
    totalShares: enrichedItem.totalShares || enrichedItem.shareCount || enrichedItem.shares || 0,
    likeCount: enrichedItem.likeCount || enrichedItem.totalLikes || enrichedItem.likes || 0,
    totalLikes: enrichedItem.totalLikes || enrichedItem.likeCount || enrichedItem.likes || 0,
    commentCount: enrichedItem.commentCount || enrichedItem.comments || 0,
  };
  } catch (error) {
    // Log error but return null instead of crashing
    if (__DEV__) {
      console.warn("Error transforming media item:", error, item);
    }
    return null;
  }
};

/**
 * Get content key from a media item
 */
export const getContentKey = (item: MediaItem): string => {
  if (!item) return "";
  return item._id || item.fileUrl || item.title || "";
};

/**
 * Filter content by type
 */
export const filterContentByType = (
  items: MediaItem[],
  contentType: ContentType | "ALL"
): MediaItem[] => {
  if (!items || !Array.isArray(items)) return [];
  if (contentType === "ALL") return items;

  return items.filter((item) => {
    const itemType = (item.contentType || "").toLowerCase();
    const filterType = contentType.toLowerCase();

    // Handle aliases
    if (filterType === "video" || filterType === "videos") {
      return itemType === "video" || itemType === "videos" || itemType === "sermon";
    }
    if (filterType === "audio" || filterType === "music") {
      return itemType === "audio" || itemType === "music";
    }
    if (filterType === "ebook" || filterType === "e-books" || filterType === "books") {
      return (
        itemType === "ebook" ||
        itemType === "e-books" ||
        itemType === "books" ||
        itemType === "image" ||
        (item.fileUrl && /\.pdf$/i.test(item.fileUrl))
      );
    }
    if (filterType === "sermon") {
      return itemType === "sermon" || itemType === "devotional";
    }

    return itemType === filterType;
  });
};

/**
 * Categorize content into different types
 */
export const categorizeContent = (items: MediaItem[]) => {
  const categorized = {
    videos: [] as MediaItem[],
    music: [] as MediaItem[],
    ebooks: [] as MediaItem[],
    sermons: [] as MediaItem[],
  };

  items.forEach((item) => {
    const contentType = (item.contentType || "").toLowerCase();
    
    if (contentType === "video" || contentType === "videos") {
      categorized.videos.push(item);
    } else if (contentType === "audio" || contentType === "music") {
      categorized.music.push(item);
    } else if (
      contentType === "ebook" ||
      contentType === "e-books" ||
      contentType === "books" ||
      contentType === "image" ||
      (item.fileUrl && /\.pdf$/i.test(item.fileUrl))
    ) {
      categorized.ebooks.push(item);
    } else if (contentType === "sermon" || contentType === "devotional") {
      categorized.sermons.push(item);
    } else {
      // Default to videos for unknown types
      categorized.videos.push(item);
    }
  });

  return categorized;
};

/**
 * Get the most recent item from a list
 */
export const getMostRecentItem = (items: MediaItem[]): MediaItem | null => {
  if (!items || items.length === 0) return null;

  return items.reduce((mostRecent, current) => {
    const recentDate = new Date(mostRecent.createdAt || 0).getTime();
    const currentDate = new Date(current.createdAt || 0).getTime();
    return currentDate > recentDate ? current : mostRecent;
  });
};

/**
 * Get time ago string from a date string
 * Re-export from timeUtils for convenience
 */
export const getTimeAgo = getTimeAgoFromTimeUtils;

/**
 * Format time ago string from a date string
 * Alias for getTimeAgo for backward compatibility
 */
export const formatTimeAgo = getTimeAgoFromTimeUtils;

/**
 * Get user display name from content
 * Re-export from userValidation for convenience
 */
export const getUserDisplayNameFromContent = getUserDisplayNameFromUserValidation;

/**
 * Get user avatar from content
 * Re-export from userValidation for convenience
 */
export const getUserAvatarFromContent = getUserAvatarFromUserValidation;

/**
 * Check if a URI is valid (non-empty string starting with http:// or https://)
 * @param uri - The URI to validate
 * @returns true if the URI is valid, false otherwise
 */
export const isValidUri = (uri: any): boolean => {
  return (
    typeof uri === "string" &&
    uri.trim().length > 0 &&
    /^https?:\/\//.test(uri.trim())
  );
};
