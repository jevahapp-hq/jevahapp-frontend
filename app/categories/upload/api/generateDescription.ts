/**
 * AI description generation API call
 */

import { getApiBaseUrl } from "../../../utils/api";
import TokenUtils from "../../../utils/tokenUtils";
import type { MediaFile } from "../types";

export type GenerateDescriptionParams = {
  title: string;
  selectedType: string;
  selectedCategory: string;
  file: MediaFile;
  thumbnail: MediaFile;
};

export type GenerateDescriptionResult = {
  success: boolean;
  description?: string;
  bibleVerses?: string[];
  warning?: boolean;
  message?: string;
};

export async function generateDescription(
  params: GenerateDescriptionParams
): Promise<GenerateDescriptionResult> {
  const { title, selectedType, selectedCategory, file, thumbnail } = params;

  const token = await TokenUtils.getAuthToken();
  const formData = new FormData();

  formData.append("title", title);
  formData.append("contentType", selectedType || "videos");

  if (selectedCategory) {
    formData.append("category", selectedCategory);
  }

  const fileSizeMB = file.size ? file.size / (1024 * 1024) : 0;
  if (fileSizeMB > 50) {
    console.warn(
      `File too large (${fileSizeMB.toFixed(1)}MB) for AI analysis. Backend will handle it.`
    );
  }
  formData.append("file", {
    uri: file.uri,
    type: file.mimeType,
    name: file.name,
    size: file.size,
  } as any);

  formData.append("thumbnail", {
    uri: thumbnail.uri,
    type: thumbnail.mimeType || "image/jpeg",
    name: thumbnail.name || `thumbnail_${Date.now()}.jpg`,
  } as any);

  console.log("📤 Sending AI description request with:", {
    title,
    contentType: selectedType || "videos",
    hasFile: !!file,
    fileSizeMB: fileSizeMB > 0 ? fileSizeMB.toFixed(2) : "unknown",
    hasThumbnail: !!thumbnail,
    fileUri: file.uri?.substring(0, 50) + "...",
    thumbnailUri: thumbnail.uri?.substring(0, 50) + "...",
  });

  const headers: HeadersInit = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const apiUrl = `${getApiBaseUrl()}/api/media/generate-description`;
  console.log("🌐 API URL:", apiUrl);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: formData,
  });

  console.log("📥 Response status:", response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error("❌ API Error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    const err: any = new Error(`API error: ${response.status} - ${errorText}`);
    err.response = { status: response.status, data: { message: errorText } };
    throw err;
  }

  const contentType = response.headers.get("content-type") || "";
  let data: any;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    console.warn("⚠️ Non-JSON response:", text);
    throw new Error("Server returned non-JSON response");
  }

  return data as GenerateDescriptionResult;
}
