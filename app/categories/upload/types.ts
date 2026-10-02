/**
 * Upload screen shared types
 */

export type MediaFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  /** Local probe / picker duration in seconds */
  durationSec?: number;
  /** Cover crop: 1:1, 9:16, or 16:9. */
  thumbnailAspect?: "1:1" | "9:16" | "16:9";
  width?: number;
  height?: number;
};

export type UploadState = {
  status: "idle" | "verifying" | "uploading" | "success" | "error";
  progress: number;
  message: string;
};

export type ModerationError = {
  message: string;
  reason?: string;
  flags?: string[];
  status?: string;
};

export type UploadResultKind =
  | "success"
  | "error"
  | "moderation"
  | "review";

export type UploadResultState = {
  kind: UploadResultKind;
  title: string;
  message: string;
  tip?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  moderation?: ModerationError;
};

export type EligibilityStatus = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

export type DetectedFileType = "video" | "audio" | "ebook" | "gif" | "unknown";

export type AuthStatus = {
  hasToken: boolean;
  token: string | null;
  tokenSource: string;
  hasUser: boolean;
  user: any;
  userRaw: string | null;
};
