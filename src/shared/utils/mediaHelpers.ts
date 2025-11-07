/**
 * Media Helper Utilities
 * Shared utilities for working with media items across the application
 */

/**
 * Extract the uploadedBy value from a media item
 * Handles multiple formats: direct string, author._id, authorInfo._id
 */
export const getUploadedBy = (mediaItem: any): string | { _id: string } | undefined => {
  if (!mediaItem) return undefined;
  
  return (
    mediaItem.uploadedBy ||
    mediaItem.author?._id ||
    mediaItem.authorInfo?._id ||
    undefined
  );
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
 * Get author ID from media item (prioritizes authorInfo > author > uploadedBy)
 */
export const getAuthorId = (mediaItem: any): string | undefined => {
  if (!mediaItem) return undefined;
  
  return (
    mediaItem.authorInfo?._id ||
    mediaItem.author?._id ||
    (typeof mediaItem.uploadedBy === "string" && /^[0-9a-fA-F]{24}$/.test(mediaItem.uploadedBy)
      ? mediaItem.uploadedBy
      : undefined)
  );
};

