/**
 * Media upload FormData builder + fetch helper
 */

import { Platform } from "react-native";
import { API_BASE_URL } from "../constants";
import type { MediaFile } from "../types";
import { resolveUploadContentType } from "../utils/resolveUploadContentType";
import { appendLocalFile, postMultipartForm } from "./appendLocalFile";

export type BuildUploadFormDataParams = {
  file: MediaFile;
  thumbnail: MediaFile | null;
  title: string;
  description: string;
  selectedType: string;
  selectedCategory: string;
};

export async function buildUploadFormData({
  file,
  thumbnail,
  title,
  description,
  selectedType,
  selectedCategory,
}: BuildUploadFormDataParams): Promise<FormData> {
  const formData = new FormData();
  await appendLocalFile(formData, "file", {
    uri: file.uri,
    name: file.name,
    mimeType: file.mimeType,
  });

  if (thumbnail) {
    await appendLocalFile(formData, "thumbnail", {
      uri: thumbnail.uri,
      name: thumbnail.name,
      mimeType: thumbnail.mimeType,
    });
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

  if (file.mimeType) {
    formData.append("mimeType", file.mimeType);
  }

  // File MIME/extension + selected type — never title ("Book of Enoch" ≠ ebook)
  const resolved = resolveUploadContentType({
    selectedType,
    file,
    isSermonContent: selectedType === "sermon",
  });
  formData.append("contentType", resolved.contentType === "gif" ? "videos" : resolved.contentType);
  if (resolved.contentType === "gif" || selectedType === "gif") {
    formData.append("isGif", "true");
  }
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
  return postMultipartForm(
    `${API_BASE_URL}/api/media/upload`,
    formData,
    {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "expo-platform": Platform.OS,
      "X-Upload-ID": uploadId,
    },
    signal
  );
}

export function getUploadTimeoutMs(mimeType?: string): number {
  // Long timeouts: large media over mobile networks to a single-region VPS
  return mimeType?.startsWith("video/")
    ? 600000 // 10 minutes for videos
    : 300000; // 5 minutes for other files
}
