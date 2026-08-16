/**
 * Content Helper Utilities
 * Shared utilities for working with content items across the application
 */

import { enrichContentWithUserData } from "../../../app/utils/dataFetching";
import { enrichContentWithAuthor, resolveAuthorName, stampPayloadAuthor } from "../author";
import { getTimeAgo as getTimeAgoFromTimeUtils } from "../../../app/utils/timeUtils";
import { getUserAvatarFromContent as getUserAvatarFromUserValidation, getUserDisplayNameFromContent as getUserDisplayNameFromUserValidation } from "../../../app/utils/userValidation";
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
    const enrichedItem = enrichContentWithAuthor(
      enrichContentWithUserData(item)
    );

    const stamped = stampPayloadAuthor(enrichedItem);
    const resolvedName = resolveAuthorName(stamped, "");
    const speaker = resolvedName || undefined;

    return {
      _id: stamped._id || stamped.id,
      contentType: (() => {
        const raw = String(stamped.contentType || "media").toLowerCase();
        if (stamped.isGif === true || raw === "gif" || raw === "gifs") {
          return "gif";
        }
        return stamped.contentType || "media";
      })(),
      fileUrl: stamped.fileUrl || stamped.file || stamped.url || "",
      // Preserve backend streaming hints so the player can pick the fastest
      // startable source (e.g. HLS) instead of always falling back to the
      // raw fileUrl, and so media-type detection has mimeType to work with.
      playbackUrl: stamped.playbackUrl,
      hlsUrl: stamped.hlsUrl,
      mimeType: stamped.mimeType || stamped.mimetype,
      title: stamped.title || "Untitled",
      speaker,
      uploadedByName: resolvedName || stamped.uploadedByName,
      // Preserve the full uploadedBy object if it exists (with firstName, lastName, etc.), otherwise keep as string
      uploadedBy: typeof stamped.uploadedBy === "object" && stamped.uploadedBy !== null
        ? stamped.uploadedBy  // Preserve the full object with all user data
        : stamped.uploadedBy,  // Keep as string if it's a string ID
      description: stamped.description || stamped.title || "",
      speakerAvatar: stamped.speakerAvatar || stamped.author?.avatar || stamped.uploadedBy?.avatar || stamped.authorInfo?.avatar,
      views: stamped.views || stamped.viewCount || stamped.totalViews || 0,
      sheared: stamped.sheared || stamped.shares || stamped.shareCount || stamped.totalShares || 0,
      saved: stamped.saved || stamped.saves || 0,
      comment: stamped.comment || stamped.comments || stamped.commentCount || 0,
      favorite: stamped.favorite || stamped.likes || stamped.likeCount || stamped.totalLikes || 0,
      imageUrl: stamped.imageUrl || stamped.thumbnailUrl || stamped.fileUrl,
      thumbnailUrl: stamped.thumbnailUrl || stamped.imageUrl,
      createdAt: stamped.createdAt || stamped.created_at || new Date().toISOString(),
      duration: stamped.duration,
      fileMimeType: stamped.fileMimeType || stamped.mimeType,
      moderationStatus: stamped.moderationStatus,
      processingStatus: (() => {
        const raw =
          stamped.processingStatus ||
          stamped.status ||
          undefined;
        if (raw == null || raw === "") return undefined;
        const s = String(raw).toLowerCase();
        if (s === "queued") return "pending";
        return s;
      })(),
      // Additional fields
      likes: stamped.likes || stamped.likeCount || stamped.totalLikes || 0,
      shares: stamped.shares || stamped.shareCount || stamped.totalShares || 0,
      saves: stamped.saves || 0,
      comments: stamped.comments || stamped.commentCount || 0,
      authorInfo: stamped.authorInfo || stamped.author,
      author: stamped.author || stamped.authorInfo,
      userId: stamped.userId || stamped.user_id,
      artistName: stamped.artistName,
      viewCount: stamped.viewCount || stamped.totalViews || stamped.views || 0,
      totalViews: stamped.totalViews || stamped.viewCount || stamped.views || 0,
      shareCount: stamped.shareCount || stamped.totalShares || stamped.shares || 0,
      totalShares: stamped.totalShares || stamped.shareCount || stamped.shares || 0,
      likeCount: stamped.likeCount || stamped.totalLikes || stamped.likes || 0,
      totalLikes: stamped.totalLikes || stamped.likeCount || stamped.likes || 0,
      commentCount: stamped.commentCount || stamped.comments || 0,
      // Preserve user interaction flags from API so likes/saves persist after login (VideoCard uses these as fallback)
      hasLiked: Boolean(stamped.hasLiked ?? stamped.userInteraction?.hasLiked ?? false),
      hasBookmarked: Boolean(stamped.hasBookmarked ?? stamped.hasSaved ?? stamped.userInteraction?.hasBookmarked ?? false),
      hasViewed: Boolean(stamped.hasViewed ?? stamped.userInteraction?.hasViewed ?? false),
      hasShared: Boolean(stamped.hasShared ?? stamped.userInteraction?.hasShared ?? false),
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
      return (
        itemType === "video" ||
        itemType === "videos" ||
        itemType === "sermon" ||
        itemType === "gif" ||
        itemType === "gifs"
      );
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

    if (contentType === "video" || contentType === "videos" || contentType === "gif" || contentType === "gifs") {
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
 * Check if a URI is valid (non-empty string)
 * @param uri - The URI to validate
 * @returns true if the URI is valid, false otherwise
 */
export const isValidUri = (uri: any): boolean => {
  return (
    typeof uri === "string" &&
    uri.trim().length > 0 &&
    (/^(https?|file):\/\//.test(uri.trim()) || uri.trim().startsWith("/"))
  );
};
