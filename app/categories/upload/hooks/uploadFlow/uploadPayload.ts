import { Alert } from "react-native";
import { getMaxFileSizeBytes } from "../../constants";
import type { MediaFile } from "../../types";
import { buildUploadFormData } from "../../api/uploadMedia";

export function validateUploadFileSize(
  file: MediaFile,
  selectedType: string
): { ok: true } | { ok: false } {
  const maxBytes = getMaxFileSizeBytes(selectedType || "videos");
  const fileSize = file.size ?? 0;
  if (fileSize <= maxBytes) return { ok: true };

  const maxMB = Math.round(maxBytes / (1024 * 1024));
  const fileMB = (fileSize / (1024 * 1024)).toFixed(1);
  Alert.alert(
    "File too large",
    `This file is ${fileMB} MB. Maximum allowed is ${maxMB} MB for ${selectedType || "this type"}. Please choose a smaller file or compress it.`
  );
  return { ok: false };
}

export function buildUploadPayload(params: {
  file: MediaFile;
  thumbnail: MediaFile | null;
  title: string;
  description: string;
  selectedType: string;
  selectedCategory: string;
}) {
  return buildUploadFormData(params);
}

export function createUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
