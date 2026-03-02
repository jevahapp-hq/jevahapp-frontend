/**
 * Upload Screen Constants
 * Extracted from upload.tsx for better modularity
 */

export const API_BASE_URL = "https://api.jevahapp.com";

/** Max file sizes in bytes for client-side check (must be <= server/nginx limits) */
export const MAX_FILE_SIZE_BYTES = {
  music: 50 * 1024 * 1024,   // 50 MB
  videos: 300 * 1024 * 1024,  // 300 MB
  sermon: 300 * 1024 * 1024,  // 300 MB (video/audio)
  books: 100 * 1024 * 1024,   // 100 MB
  ebook: 100 * 1024 * 1024,   // 100 MB
  podcasts: 100 * 1024 * 1024,
} as Record<string, number>;

export const getMaxFileSizeBytes = (contentType: string): number =>
  MAX_FILE_SIZE_BYTES[contentType] ?? 100 * 1024 * 1024;

export const categories = [
  "Worship",
  "Inspiration",
  "Youth",
  "Teachings",
  "Marriage",
  "Counselling",
];

export const contentTypes = [
  { label: "Music", value: "music" },
  { label: "Videos", value: "videos" },
  { label: "Books", value: "books" },
  { label: "Ebook", value: "ebook" },
  { label: "Podcasts", value: "podcasts" },
  { label: "Sermons", value: "sermon" },
];

