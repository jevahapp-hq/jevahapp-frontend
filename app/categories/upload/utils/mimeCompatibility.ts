import { FileInfo, detectFileType } from "./fileTypeDetection";

export const VALID_AUDIO_FORMATS = ["mp3", "wav", "aac", "m4a", "ogg", "flac"];
export const VALID_AUDIO_MIMES = [
  "audio/mpeg",
  "audio/wav",
  "audio/aac",
  "audio/mp4",
  "audio/ogg",
  "audio/flac",
  "audio/x-m4a",
];

export const VALID_VIDEO_FORMATS = ["mp4"];
export const VALID_VIDEO_MIMES = ["video/mp4"];

export const VALID_BOOK_FORMATS = ["pdf", "epub"];
export const VALID_BOOK_MIMES = [
  "application/pdf",
  "application/epub+zip",
  "application/epub",
];

function matchesFormatOrMime(
  fileExtension: string,
  mimeType: string,
  formats: string[],
  mimes: string[]
): boolean {
  return (
    formats.includes(fileExtension) ||
    mimes.some((mime) => mimeType.toLowerCase().includes(mime.toLowerCase()))
  );
}

/**
 * Validate selected content type against detected file type / formats.
 * Returns error messages (empty if compatible).
 */
export function validateMimeCompatibility(
  file: FileInfo,
  selectedType: string
): string[] {
  const errors: string[] = [];
  const actualFileType = detectFileType(file);
  const fileExtension = file.name?.split(".").pop()?.toLowerCase() || "";
  const mimeType = file.mimeType || "";

  // Validate based on selected content type and actual file type
  if (selectedType === "music" || selectedType === "podcasts") {
    // Music and Podcasts require audio files
    if (actualFileType === "video") {
      errors.push(
        "Invalid file type. You selected Music/Podcast but uploaded a video file. Please select a video content type or upload an audio file."
      );
    } else if (actualFileType === "ebook") {
      errors.push(
        "Invalid file type. You selected Music/Podcast but uploaded an ebook file. Please select Books/Ebook content type or upload an audio file."
      );
    } else if (
      actualFileType === "unknown" ||
      !matchesFormatOrMime(
        fileExtension,
        mimeType,
        VALID_AUDIO_FORMATS,
        VALID_AUDIO_MIMES
      )
    ) {
      errors.push(
        "Invalid audio format. Supported: MP3, WAV, AAC, M4A, OGG, FLAC"
      );
    }
  } else if (selectedType === "videos") {
    // Videos require video files
    if (actualFileType === "audio") {
      errors.push(
        "Invalid file type. You selected Videos but uploaded an audio file. Please select Music/Podcast/Sermon content type or upload a video file."
      );
    } else if (actualFileType === "ebook") {
      errors.push(
        "Invalid file type. You selected Videos but uploaded an ebook file. Please select Books/Ebook content type or upload a video file."
      );
    } else if (
      actualFileType === "unknown" ||
      !matchesFormatOrMime(
        fileExtension,
        mimeType,
        VALID_VIDEO_FORMATS,
        VALID_VIDEO_MIMES
      )
    ) {
      errors.push("Invalid video format. Supported: MP4");
    }
  } else if (selectedType === "books" || selectedType === "ebook") {
    // Books require ebook files
    if (actualFileType === "video") {
      errors.push(
        "Invalid file type. You selected Books/Ebook but uploaded a video file. Please select Videos content type or upload an ebook file."
      );
    } else if (actualFileType === "audio") {
      errors.push(
        "Invalid file type. You selected Books/Ebook but uploaded an audio file. Please select Music/Podcast/Sermon content type or upload an ebook file."
      );
    } else if (
      actualFileType === "unknown" ||
      !matchesFormatOrMime(
        fileExtension,
        mimeType,
        VALID_BOOK_FORMATS,
        VALID_BOOK_MIMES
      )
    ) {
      errors.push("Invalid book format. Supported: PDF, EPUB");
    }
  } else if (selectedType === "sermon") {
    // Sermons can be either audio or video
    if (actualFileType === "ebook") {
      errors.push(
        "Invalid file type. Sermons must be either audio or video files, not ebooks."
      );
    } else if (actualFileType === "video") {
      if (
        !matchesFormatOrMime(
          fileExtension,
          mimeType,
          VALID_VIDEO_FORMATS,
          VALID_VIDEO_MIMES
        )
      ) {
        errors.push("Invalid video format. Supported: MP4");
      }
    } else if (actualFileType === "audio") {
      if (
        !matchesFormatOrMime(
          fileExtension,
          mimeType,
          VALID_AUDIO_FORMATS,
          VALID_AUDIO_MIMES
        )
      ) {
        errors.push(
          "Invalid audio format. Supported: MP3, WAV, AAC, M4A, OGG, FLAC"
        );
      }
    } else if (actualFileType === "unknown") {
      errors.push(
        "Unable to detect file type. Please ensure you're uploading a valid audio or video file."
      );
    }
  }

  return errors;
}
