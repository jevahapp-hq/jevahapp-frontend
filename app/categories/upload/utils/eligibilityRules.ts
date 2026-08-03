import { FileInfo, detectFileType } from "./fileTypeDetection";
import { validateMimeCompatibility } from "./mimeCompatibility";
import { validateFileSizeLimits } from "./sizeLimits";

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

  const title = isReview ? "Under review" : "Needs a small tweak";

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
    errors.push(...validateMimeCompatibility(file, selectedType));
  }

  // Validate file size based on actual file type and selected content type
  if (file && file.size) {
    errors.push(...validateFileSizeLimits(file, selectedType));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};
