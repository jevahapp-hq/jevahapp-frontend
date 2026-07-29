/**
 * Media upload FormData builder + fetch helper
 */

import { Platform } from "react-native";
import { API_BASE_URL } from "../constants";
import type { MediaFile } from "../types";
import { resolveUploadContentType } from "../utils/resolveUploadContentType";

export type BuildUploadFormDataParams = {
  file: MediaFile;
  thumbnail: MediaFile | null;
  title: string;
  description: string;
  selectedType: string;
  selectedCategory: string;
};

export function buildUploadFormData({
  file,
  thumbnail,
  title,
  description,
  selectedType,
  selectedCategory,
}: BuildUploadFormDataParams): FormData {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    type: file.mimeType,
    name: file.name,
    size: file.size,
  } as any);

  if (thumbnail) {
    formData.append("thumbnail", {
      uri: thumbnail.uri,
      type: thumbnail.mimeType,
      name: thumbnail.name,
    } as any);
  }

  formData.append("title", title);
  formData.append("description", description);

  if (file.size) {
    formData.append("fileSize", file.size.toString());
    console.log("📊 File size added to FormData:", file.size, "bytes");
  } else {
    console.warn(
      "⚠️ No file size available - this might cause upload issues"
    );
  }

  // File MIME/extension + selected type — never title ("Book of Enoch" ≠ ebook)
  const resolved = resolveUploadContentType({
    selectedType,
    file,
    isSermonContent: selectedType === "sermon",
  });
  formData.append("contentType", resolved.contentType);
  formData.append(
    "genre",
    JSON.stringify([selectedCategory.toLowerCase(), "All"])
  );
  formData.append("topics", JSON.stringify([]));

  return formData;
}

export type UploadMediaParams = {
  formData: FormData;
  token: string;
  uploadId: string;
  signal: AbortSignal;
};

export async function uploadMedia({
  formData,
  token,
  uploadId,
  signal,
}: UploadMediaParams): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "expo-platform": Platform.OS,
      "X-Upload-ID": uploadId,
    },
    body: formData,
    signal,
  });
}

export function getUploadTimeoutMs(mimeType?: string): number {
  // Much longer timeouts for Render free tier (cold start can take 30+ seconds)
  return mimeType?.startsWith("video/")
    ? 600000 // 10 minutes for videos
    : 300000; // 5 minutes for other files
}
