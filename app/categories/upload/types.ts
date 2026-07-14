/**
 * Upload screen shared types
 */

export type MediaFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
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

export type EligibilityStatus = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

export type DetectedFileType = "video" | "audio" | "ebook" | "unknown";

export type AuthStatus = {
  hasToken: boolean;
  token: string | null;
  tokenSource: string;
  hasUser: boolean;
  user: any;
  userRaw: string | null;
};
