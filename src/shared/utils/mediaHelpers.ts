/**
 * Media Helper Utilities
 * Shared utilities for working with media items across the application
 */

/**
 * Extract the uploadedBy value from a media item
 * Handles multiple formats with priority order matching backend structure:
 * 1. uploadedBy (populated object or string) - for Media content
 * 2. author._id - for Devotional content
 * 3. authorInfo._id - fallback for other content types
 * 
 * Backend returns uploadedBy as populated object: { _id: "...", firstName: "...", lastName: "..." }
 */
export const getUploadedBy = (mediaItem: any): string | { _id: string } | undefined => {
  if (!mediaItem) return undefined;
  
  // Priority 1: uploadedBy (can be populated object or string)
  if (mediaItem.uploadedBy) {
    return mediaItem.uploadedBy;
  }
  
  // Priority 2: author._id (for Devotional content)
  if (mediaItem.author?._id) {
    return mediaItem.author._id;
  }
  
  // Priority 3: authorInfo._id (fallback)
  if (mediaItem.authorInfo?._id) {
    return mediaItem.authorInfo._id;
  }
  
  return undefined;
};

/**
 * Extract media ID from a media item
 * Handles both _id and id fields
 */
export const getMediaId = (mediaItem: any): string | undefined => {
  if (!mediaItem) return undefined;
  return mediaItem._id || mediaItem.id;
};

/**
 * Extract media title from a media item
 */
export const getMediaTitle = (mediaItem: any): string => {
  if (!mediaItem) return "Untitled";
  return mediaItem.title || mediaItem.name || "Untitled";
};

/**
 * Check if a media item has author information
 */
export const hasAuthorInfo = (mediaItem: any): boolean => {
  return !!(
    mediaItem?.authorInfo?._id ||
    mediaItem?.author?._id ||
    mediaItem?.uploadedBy
  );
};

/**
 * Get author ID from media item
 * Priority order matches backend structure:
 * 1. uploadedBy._id (populated object) or uploadedBy (string) - for Media content
 * 2. author._id - for Devotional content
 * 3. authorInfo._id - fallback for other content types
 */
export const getAuthorId = (mediaItem: any): string | undefined => {
  if (!mediaItem) return undefined;
  
  // Priority 1: uploadedBy._id (populated object) - BACKEND RETURNS THIS FOR MEDIA
  if (mediaItem.uploadedBy) {
    if (typeof mediaItem.uploadedBy === "object" && mediaItem.uploadedBy._id) {
      return String(mediaItem.uploadedBy._id);
    }
    if (typeof mediaItem.uploadedBy === "string" && /^[0-9a-fA-F]{24}$/.test(mediaItem.uploadedBy)) {
      return mediaItem.uploadedBy;
    }
  }
  
  // Priority 2: author._id (for Devotional content)
  if (mediaItem.author?._id) {
    return String(mediaItem.author._id);
  }
  
  // Priority 3: authorInfo._id (fallback)
  if (mediaItem.authorInfo?._id) {
    return String(mediaItem.authorInfo._id);
  }
  
  return undefined;
};

