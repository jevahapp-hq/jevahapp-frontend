/**
 * Upload Validation Utilities — barrel keeping caller-facing exports stable
 */

export type { ValidationResult, UploadFormData } from "./eligibilityRules";
export {
  formatFriendlyRejectionMessage,
  validateMediaEligibility,
} from "./eligibilityRules";

export {
  MAX_AUDIO_SIZE,
  MAX_BOOK_SIZE,
  MAX_VIDEO_SIZE,
  validateFileSizeLimits,
} from "./sizeLimits";

export {
  VALID_AUDIO_FORMATS,
  VALID_AUDIO_MIMES,
  VALID_BOOK_FORMATS,
  VALID_BOOK_MIMES,
  VALID_VIDEO_FORMATS,
  VALID_VIDEO_MIMES,
  validateMimeCompatibility,
} from "./mimeCompatibility";
