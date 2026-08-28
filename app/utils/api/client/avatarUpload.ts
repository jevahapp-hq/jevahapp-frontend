import { Platform } from "react-native";
import { enhancedFetch } from "../fetchUtils";
import { TokenManager } from "../TokenManager";
import { API_BASE_URL } from "../types";

/**
 * Avatar uploads bypass `request` because FormData must not be JSON-encoded.
 */
async function postAvatar(
  path: string,
  fileUri: string,
  send: typeof fetch = enhancedFetch as unknown as typeof fetch
): Promise<Response> {
  const token = await TokenManager.getToken();
  if (!token) throw new Error("No authentication token");

  const formData = new FormData();
  formData.append("avatar", {
    uri: fileUri,
    type: "image/jpeg",
    name: "avatar.jpg",
  } as any);

  return send(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
      "expo-platform": Platform.OS,
    },
    body: formData,
  });
}

export async function uploadProfileAvatar(fileUri: string): Promise<{
  success: boolean;
  data: {
    avatar: string;
    avatarUpload: string;
    previewUrl?: string;
    message: string;
  };
}> {
  const response = await postAvatar("/user/profile/upload-avatar", fileUri);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}) as any);
    throw new Error(error.error || error.message || "Failed to upload avatar");
  }

  return response.json();
}

export async function uploadAvatar(
  fileUri: string
): Promise<{ avatarUrl: string }> {
  // Legacy endpoint: plain fetch, no retry/timeout wrapper.
  const response = await postAvatar("/auth/upload-avatar", fileUri, fetch);

  if (!response.ok) {
    throw new Error(`Avatar upload failed: ${response.status}`);
  }

  return response.json();
}
