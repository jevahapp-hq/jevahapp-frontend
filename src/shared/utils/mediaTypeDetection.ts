/**
 * Media Type Detection Utilities
 * Centralized logic for determining if content is audio, video, or other media type
 * This ensures consistent behavior across all components
 */

import { MediaItem } from "../types";

export type MediaType = "video" | "audio" | "ebook" | "unknown";

/**
 * Video file extensions
 */
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m3u8"];

/**
 * Audio file extensions
 */
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".wma"];

/**
 * Ebook file extensions
 */
const EBOOK_EXTENSIONS = [".pdf", ".epub", ".mobi"];

/**
 * Video MIME type prefixes
 */
const VIDEO_MIME_PREFIXES = ["video/"];

/**
 * Audio MIME type prefixes
 */
const AUDIO_MIME_PREFIXES = ["audio/"];

/**
 * Ebook MIME types
 */
const EBOOK_MIME_TYPES = [
  "application/pdf",
  "application/epub",
  "application/epub+zip",
  "application/x-mobipocket-ebook",
];

/**
 * Detect media type from a MediaItem
 * Uses contentType, fileUrl, and mimeType to determine the actual media type
 * 
 * @param item - The media item to analyze
 * @returns The detected media type
 */
export const detectMediaType = (item: MediaItem | null | undefined): MediaType => {
  if (!item) return "unknown";

  const contentType = (item.contentType || "").toLowerCase();
  const fileUrl = (item.fileUrl || "").toLowerCase();
  const mimeType = (item.mimeType || "").toLowerCase();

  // Check MIME type first (most reliable)
  if (mimeType) {
    if (VIDEO_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
      return "video";
    }
    if (AUDIO_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
      return "audio";
    }
    if (EBOOK_MIME_TYPES.some((type) => mimeType.includes(type))) {
      return "ebook";
    }
  }

  // Check file extension
  const hasVideoExtension = VIDEO_EXTENSIONS.some((ext) => fileUrl.includes(ext));
  const hasAudioExtension = AUDIO_EXTENSIONS.some((ext) => fileUrl.includes(ext));
  const hasEbookExtension = EBOOK_EXTENSIONS.some((ext) => fileUrl.includes(ext));

  if (hasVideoExtension) return "video";
  if (hasAudioExtension) return "audio";
  if (hasEbookExtension) return "ebook";

  // Check contentType as fallback
  if (contentType.includes("video") || contentType === "videos" || contentType === "live") {
    return "video";
  }
  if (contentType.includes("audio") || contentType === "music") {
    return "audio";
  }
  if (
    contentType.includes("ebook") ||
    contentType.includes("book") ||
    contentType.includes("pdf")
  ) {
    return "ebook";
  }

  // Special handling for sermons - can be audio or video
  if (contentType === "sermon" || contentType === "devotional") {
    // If it has video extensions, it's a video sermon
    if (hasVideoExtension) return "video";
    // Otherwise, assume audio sermon
    return "audio";
  }

  return "unknown";
};

/**
 * Check if a media item is a video
 */
export const isVideo = (item: MediaItem | null | undefined): boolean => {
  return detectMediaType(item) === "video";
};

/**
 * Check if a media item is audio
 */
export const isAudio = (item: MediaItem | null | undefined): boolean => {
  return detectMediaType(item) === "audio";
};

/**
 * Check if a media item is an ebook
 */
export const isEbook = (item: MediaItem | null | undefined): boolean => {
  return detectMediaType(item) === "ebook";
};

/**
 * Check if a sermon is an audio sermon (not video)
 */
export const isAudioSermon = (item: MediaItem | null | undefined): boolean => {
  if (!item) return false;
  const contentType = (item.contentType || "").toLowerCase();
  if (contentType !== "sermon" && contentType !== "devotional") return false;
  return detectMediaType(item) === "audio";
};

/**
 * Check if a sermon is a video sermon
 */
export const isVideoSermon = (item: MediaItem | null | undefined): boolean => {
  if (!item) return false;
  const contentType = (item.contentType || "").toLowerCase();
  if (contentType !== "sermon" && contentType !== "devotional") return false;
  return detectMediaType(item) === "video";
};


