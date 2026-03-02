/**
 * Upload Validation Utilities
 * Extracted from upload.tsx for better modularity
 */

import { FileInfo, detectFileType } from "./fileTypeDetection";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UploadFormData {
  file: FileInfo | null;
  title: string;
  selectedCategory: string;
  selectedType: string;
}

/**
 * Format friendly rejection messages for moderation errors
 */
export const formatFriendlyRejectionMessage = (
  status: string | undefined,
  reason: string | undefined,
  flags: string[] | undefined,
  defaultMessage: string
): { title: string; message: string; isReview: boolean } => {
  const isReview = status === "under_review";

  // Friendly title
  const title = isReview ? "📋 Under Review" : "💡 Upload Needs Adjustment";

  // Build friendly message
  let message = "";

  if (isReview) {
    message =
      "Your content is being reviewed by our team. We'll notify you once it's approved!";
    if (reason) {
      message += `\n\nNote: ${reason}`;
    }
  } else {
    // Friendly rejection message
    if (reason) {
      // Use the reason as the main message, make it friendlier
      message = reason.endsWith(".") ? reason.slice(0, -1) : reason;
      message += ". Don't worry, you can make adjustments and try again!";
    } else if (flags && flags.length > 0) {
      // Format flags into friendly message
      const friendlyFlags = flags.map((flag) => {
        const formatted = flag.replace(/_/g, " ").toLowerCase();
        // Make flags more user-friendly
        if (formatted.includes("explicit")) return "inappropriate language";
        if (formatted.includes("violence")) return "violent content";
        if (formatted.includes("hateful")) return "harmful content";
        if (formatted.includes("not gospel"))
          return "content doesn't align with gospel values";
        return formatted;
      });

      if (friendlyFlags.length === 1) {
        message = `We noticed ${friendlyFlags[0]} in your content. Please review and adjust before uploading again.`;
      } else {
        message = `We noticed some content that needs adjustment: ${friendlyFlags.slice(0, 2).join(" and ")}. Please review and try again!`;
      }
    } else {
      // Default friendly message
      message =
        "Your content needs a few adjustments to meet our community guidelines. No worries - you can edit and try again!";
    }
  }

  return { title, message, isReview };
};

/**
 * Validate media eligibility before upload
 */
export const validateMediaEligibility = (
  formData: UploadFormData
): ValidationResult => {
  const { file, title, selectedCategory, selectedType } = formData;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!file) {
    errors.push("Please select a media file");
  }

  if (!title || title.trim().length === 0) {
    errors.push("Title is required");
  } else if (title.length > 100) {
    errors.push("Title must be 100 characters or less");
  }

  if (!selectedCategory) {
    errors.push("Please select a category");
  }

  if (!selectedType) {
    if (file) {
      const actualFileType = detectFileType(file);
      if (actualFileType === "video") {
        errors.push(
          "Please select a content type. Detected a video file; choose Videos or Sermon."
        );
      } else if (actualFileType === "audio") {
        errors.push(
          "Please select a content type. Detected an audio file; choose Music, Podcasts, or Sermon."
        );
      } else if (actualFileType === "ebook") {
        errors.push(
          "Please select a content type. Detected an ebook/PDF; choose Books or Ebook."
        );
      } else {
        errors.push("Please select a content type.");
      }
    } else {
      errors.push("Please select a content type.");
    }
  }

  // Validate file type - detect actual file type first, then check compatibility
  if (file) {
    const actualFileType = detectFileType(file);
    const fileExtension = file.name?.split(".").pop()?.toLowerCase() || "";
    const mimeType = file.mimeType || "";

    // Define valid formats for each content type
    const validAudioFormats = ["mp3", "wav", "aac", "m4a", "ogg", "flac"];
    const validAudioMimes = [
      "audio/mpeg",
      "audio/wav",
      "audio/aac",
      "audio/mp4",
      "audio/ogg",
      "audio/flac",
      "audio/x-m4a",
    ];

    const validVideoFormats = ["mp4"];
    const validVideoMimes = ["video/mp4"];

    const validBookFormats = ["pdf", "epub"];
    const validBookMimes = [
      "application/pdf",
      "application/epub+zip",
      "application/epub",
    ];

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
        (!validAudioFormats.includes(fileExtension) &&
          !validAudioMimes.some((mime) =>
            mimeType.toLowerCase().includes(mime.toLowerCase())
          ))
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
        (!validVideoFormats.includes(fileExtension) &&
          !validVideoMimes.some((mime) =>
            mimeType.toLowerCase().includes(mime.toLowerCase())
          ))
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
        (!validBookFormats.includes(fileExtension) &&
          !validBookMimes.some((mime) =>
            mimeType.toLowerCase().includes(mime.toLowerCase())
          ))
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
        // Validate video format
        if (
          !validVideoFormats.includes(fileExtension) &&
          !validVideoMimes.some((mime) =>
            mimeType.toLowerCase().includes(mime.toLowerCase())
          )
        ) {
          errors.push("Invalid video format. Supported: MP4");
        }
      } else if (actualFileType === "audio") {
        // Validate audio format
        if (
          !validAudioFormats.includes(fileExtension) &&
          !validAudioMimes.some((mime) =>
            mimeType.toLowerCase().includes(mime.toLowerCase())
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
  }

  // Validate file size based on actual file type and selected content type
  if (file && file.size) {
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    const maxAudioSize = 50 * 1024 * 1024; // 50MB
    const maxBookSize = 50 * 1024 * 1024; // 50MB

    const actualFileType = detectFileType(file);

    // For videos content type
    if (selectedType === "videos") {
      if (file.size > maxVideoSize) {
        errors.push("Video file size exceeds 100MB limit");
      }
    }
    // For music and podcasts content types (should be audio)
    else if (selectedType === "music" || selectedType === "podcasts") {
      if (actualFileType === "audio" && file.size > maxAudioSize) {
        errors.push("Audio file size exceeds 50MB limit");
      }
    }
    // For sermon content type (can be audio or video)
    else if (selectedType === "sermon") {
      if (actualFileType === "video" && file.size > maxVideoSize) {
        errors.push("Video file size exceeds 100MB limit");
      } else if (actualFileType === "audio" && file.size > maxAudioSize) {
        errors.push("Audio file size exceeds 50MB limit");
      }
    }
    // For books and ebook content types (should be ebooks)
    else if (selectedType === "books" || selectedType === "ebook") {
      if (file.size > maxBookSize) {
        errors.push("Book file size exceeds 50MB limit");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

