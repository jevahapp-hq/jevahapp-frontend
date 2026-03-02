/**
 * File Type Detection Utilities
 * Extracted from upload.tsx for better modularity
 */

export type FileType = "video" | "audio" | "ebook" | "unknown";

export interface FileInfo {
  name?: string;
  mimeType?: string;
  uri?: string;
  size?: number;
  type?: string;
}

/**
 * Get MIME type from filename
 */
export const getMimeTypeFromName = (filename: string): string => {
  if (filename.endsWith(".mp4")) return "video/mp4";
  if (filename.endsWith(".mov")) return "video/quicktime";
  if (filename.endsWith(".mp3")) return "audio/mpeg";
  if (filename.endsWith(".wav")) return "audio/wav";
  if (filename.endsWith(".pdf")) return "application/pdf";
  if (filename.endsWith(".epub")) return "application/epub+zip";
  return "application/octet-stream";
};

/**
 * Detect actual file type from file extension and mime type
 */
export const detectFileType = (file: FileInfo | null): FileType => {
  if (!file) return "unknown";

  const fileExtension = file.name?.split(".").pop()?.toLowerCase() || "";
  const mimeType = file.mimeType || "";

  // Video formats
  const videoFormats = ["mp4", "mov", "avi", "mkv", "webm"];
  const videoMimes = ["video/"];

  // Audio formats
  const audioFormats = ["mp3", "wav", "aac", "m4a", "ogg", "flac", "wma"];
  const audioMimes = ["audio/"];

  // Ebook formats
  const ebookFormats = ["pdf", "epub", "mobi"];
  const ebookMimes = [
    "application/pdf",
    "application/epub",
    "application/epub+zip",
    "application/x-mobipocket-ebook",
  ];

  // Check by mime type first (more reliable)
  if (mimeType) {
    if (videoMimes.some((mime) => mimeType.toLowerCase().startsWith(mime))) {
      return "video";
    }
    if (audioMimes.some((mime) => mimeType.toLowerCase().startsWith(mime))) {
      return "audio";
    }
    if (ebookMimes.some((mime) => mimeType.toLowerCase().includes(mime.toLowerCase()))) {
      return "ebook";
    }
  }

  // Fallback to file extension
  if (videoFormats.includes(fileExtension)) {
    return "video";
  }
  if (audioFormats.includes(fileExtension)) {
    return "audio";
  }
  if (ebookFormats.includes(fileExtension)) {
    return "ebook";
  }

  return "unknown";
};

/**
 * Check if file is an image
 */
export const isImage = (name: string): boolean => {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
};

