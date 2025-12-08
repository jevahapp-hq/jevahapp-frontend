/**
 * Content Helper Utilities
 * Shared utilities for working with content items across the application
 */

import { getTimeAgo as getTimeAgoFromTimeUtils } from "../../../app/utils/timeUtils";
import { getUserAvatarFromContent as getUserAvatarFromUserValidation, getUserDisplayNameFromContent as getUserDisplayNameFromUserValidation } from "../../../app/utils/userValidation";
import { ContentType, MediaItem } from "../types";

/**
 * Transform API response to MediaItem format
 */
export const transformApiResponseToMediaItem = (item: any): MediaItem => {
  if (!item) {
    throw new Error("Cannot transform null or undefined item");
  }

  return {
    _id: item._id || item.id,
    contentType: item.contentType || "media",
    fileUrl: item.fileUrl || item.file || item.url || "",
    title: item.title || "Untitled",
    speaker: item.speaker || item.author?.firstName || item.uploadedBy?.firstName,
    uploadedBy: typeof item.uploadedBy === "object" 
      ? item.uploadedBy._id || item.uploadedBy 
      : item.uploadedBy,
    description: item.description || item.title || "",
    speakerAvatar: item.speakerAvatar || item.author?.avatar || item.uploadedBy?.avatar,
    views: item.views || item.viewCount || item.totalViews || 0,
    sheared: item.sheared || item.shares || item.shareCount || item.totalShares || 0,
    saved: item.saved || item.saves || 0,
    comment: item.comment || item.comments || item.commentCount || 0,
    favorite: item.favorite || item.likes || item.likeCount || item.totalLikes || 0,
    imageUrl: item.imageUrl || item.thumbnailUrl || item.fileUrl,
    thumbnailUrl: item.thumbnailUrl || item.imageUrl,
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    duration: item.duration,
    // Additional fields
    likes: item.likes || item.likeCount || item.totalLikes || 0,
    shares: item.shares || item.shareCount || item.totalShares || 0,
    saves: item.saves || 0,
    comments: item.comments || item.commentCount || 0,
    authorInfo: item.authorInfo || item.author,
    author: item.author || item.authorInfo,
    viewCount: item.viewCount || item.totalViews || item.views || 0,
    totalViews: item.totalViews || item.viewCount || item.views || 0,
    shareCount: item.shareCount || item.totalShares || item.shares || 0,
    totalShares: item.totalShares || item.shareCount || item.shares || 0,
    likeCount: item.likeCount || item.totalLikes || item.likes || 0,
    totalLikes: item.totalLikes || item.likeCount || item.likes || 0,
    commentCount: item.commentCount || item.comments || 0,
  };
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
