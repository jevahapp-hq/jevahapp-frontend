import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { TokenManager } from "../TokenManager";
import { API_BASE_URL } from "../types";

type UploadResponse = {
  status: number;
  body: string;
};

async function toJpegFileUri(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

async function postMultipart(
  url: string,
  fileUri: string,
  token: string
): Promise<UploadResponse> {
  if (Platform.OS === "web") {
    const blobRes = await fetch(fileUri);
    const blob = await blobRes.blob();
    const formData = new FormData();
    formData.append("avatar", blob, "avatar.jpg");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "expo-platform": Platform.OS,
      },
      body: formData,
    });
    return { status: response.status, body: await response.text() };
  }

  // Expo fetch throws "Unsupported FormDataPart implementation" for RN
  // `{ uri, name, type }` parts. Native multipart upload avoids that.
  const result = await FileSystem.uploadAsync(url, fileUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "avatar",
    mimeType: "image/jpeg",
    headers: {
      Authorization: `Bearer ${token}`,
      "expo-platform": Platform.OS,
    },
  });
  return { status: result.status, body: result.body };
}

function parseJson(body: string): any {
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function parseAvatarResponse(json: any): {
  success: boolean;
  data: {
    avatar: string;
    avatarUpload: string;
    previewUrl?: string;
    message: string;
  };
} {
  const avatarUrl =
    json?.data?.avatarUrl ||
    json?.data?.avatar ||
    json?.data?.avatarUpload ||
    json?.avatarUrl ||
    json?.avatar ||
    json?.avatarUpload;
  return {
    success: json?.success !== false && !!avatarUrl,
    data: {
      avatar: avatarUrl,
      avatarUpload: json?.data?.avatarUpload || avatarUrl,
      previewUrl: json?.data?.previewUrl,
      message: json?.message || json?.data?.message || "Avatar updated",
    },
  };
}

async function uploadToPaths(fileUri: string, paths: string[]) {
  const token = await TokenManager.getToken();
  if (!token) throw new Error("No authentication token");

  const jpegUri = await toJpegFileUri(fileUri);
  let lastBody = "";
  let lastStatus = 0;

  for (const path of paths) {
    const result = await postMultipart(`${API_BASE_URL}${path}`, jpegUri, token);
    lastStatus = result.status;
    lastBody = result.body;
    if (result.status === 404 || result.status === 405) continue;

    const json = parseJson(result.body);
    if (result.status >= 400) {
      throw new Error(
        json.error || json.message || `Failed to upload avatar (${result.status})`
      );
    }
    const parsed = parseAvatarResponse(json);
    if (!parsed.success) {
      throw new Error(json?.message || "Failed to upload avatar");
    }
    return parsed;
  }

  const json = parseJson(lastBody);
  throw new Error(
    json.error || json.message || `Failed to upload avatar (${lastStatus})`
  );
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
  return uploadToPaths(fileUri, [
    "/user/profile/upload-avatar",
    "/auth/avatar",
  ]);
}

export async function uploadAvatar(
  fileUri: string
): Promise<{ avatarUrl: string }> {
  const parsed = await uploadToPaths(fileUri, ["/auth/avatar"]);
  return { avatarUrl: parsed.data.avatar };
}
