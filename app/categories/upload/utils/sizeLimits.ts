import { FileInfo, detectFileType } from "./fileTypeDetection";

export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_BOOK_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Validate file size based on actual file type and selected content type.
 * Returns error messages (empty if valid).
 */
export function validateFileSizeLimits(
  file: FileInfo,
  selectedType: string
): string[] {
  if (!file.size) return [];

  const errors: string[] = [];
  const actualFileType = detectFileType(file);

  // For videos content type
  if (selectedType === "videos") {
    if (file.size > MAX_VIDEO_SIZE) {
      errors.push("Video file size exceeds 100MB limit");
    }
  }
  // For music and podcasts content types (should be audio)
  else if (selectedType === "music" || selectedType === "podcasts") {
    if (actualFileType === "audio" && file.size > MAX_AUDIO_SIZE) {
      errors.push("Audio file size exceeds 50MB limit");
    }
  }
  // For sermon content type (can be audio or video)
  else if (selectedType === "sermon") {
    if (actualFileType === "video" && file.size > MAX_VIDEO_SIZE) {
      errors.push("Video file size exceeds 100MB limit");
    } else if (actualFileType === "audio" && file.size > MAX_AUDIO_SIZE) {
      errors.push("Audio file size exceeds 50MB limit");
    }
  }
  else if (selectedType === "gif") {
    if (file.size > 20 * 1024 * 1024) {
      errors.push("GIF file size exceeds 20MB limit");
    }
  }
  // For books and ebook content types (should be ebooks)
  else if (selectedType === "books" || selectedType === "ebook") {
    if (file.size > MAX_BOOK_SIZE) {
      errors.push("Book file size exceeds 50MB limit");
    }
  }

  return errors;
}
