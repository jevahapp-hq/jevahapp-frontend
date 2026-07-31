/**
 * Creator studio upload pipeline: intent → R2 PUT → finalize.
 */
import { Platform } from "react-native";
import TokenUtils from "../../utils/tokenUtils";
import { creatorsApi } from "./CreatorsApi";
import {
  normalizeTrackCard,
  type TrackCard,
} from "../music-catalog/trackTypes";

export type UploadIntentRequest = {
  title: string;
  artistName?: string;
  genre?: string;
  category?: string;
  language?: string;
  contentType: string;
  fileName: string;
  fileSizeBytes: number;
  coverContentType?: string;
  coverFileName?: string;
  coverFileSizeBytes?: number;
};

export type UploadIntentResponse = {
  trackId: string;
  uploadUrl: string;
  uploadHeaders?: Record<string, string>;
  coverUploadUrl?: string;
  coverUploadHeaders?: Record<string, string>;
  expiresInSec?: number;
};

function unwrap(payload: any): any {
  return payload?.data?.data ?? payload?.data ?? payload;
}

export async function createUploadIntent(
  body: UploadIntentRequest
): Promise<UploadIntentResponse> {
  const res = await creatorsApi.createUploadIntent(body as any);
  if (!res.success) {
    throw new Error(res.error || "Failed to create upload intent");
  }
  const data = unwrap(res);
  const trackId = String(data.trackId || data.id || data._id || "");
  const uploadUrl = String(
    data.uploadUrl || data.audioUploadUrl || data.putUrl || ""
  );
  if (!trackId || !uploadUrl) {
    throw new Error("Upload intent missing trackId or uploadUrl");
  }
  return {
    trackId,
    uploadUrl,
    uploadHeaders: data.uploadHeaders || data.requiredHeaders || undefined,
    coverUploadUrl: data.coverUploadUrl || data.coverPutUrl,
    coverUploadHeaders: data.coverUploadHeaders,
    expiresInSec: data.expiresInSec || data.expiresIn,
  };
}

export async function putToPresignedUrl(params: {
  uploadUrl: string;
  fileUri: string;
  contentType: string;
  headers?: Record<string, string>;
}): Promise<void> {
  const fileRes = await fetch(params.fileUri);
  const blob = await fileRes.blob();
  const headers: Record<string, string> = {
    "Content-Type": params.contentType,
    ...(params.headers || {}),
  };
  delete headers.Authorization;

  const put = await fetch(params.uploadUrl, {
    method: "PUT",
    headers,
    body: blob,
  });
  if (!put.ok) {
    const text = await put.text().catch(() => "");
    throw new Error(
      `Upload PUT failed (${put.status})${text ? `: ${text.slice(0, 120)}` : ""}`
    );
  }
}

export async function finalizeTrack(
  trackId: string,
  opts?: { publish?: boolean }
): Promise<TrackCard | null> {
  const res = await creatorsApi.finalizeTrack(trackId, {
    publish: opts?.publish !== false,
  });
  if (!res.success) {
    throw new Error(res.error || "Failed to finalize track");
  }
  const data = unwrap(res);
  return normalizeTrackCard(data.track || data, "artist");
}

export async function patchCreatorTrack(
  trackId: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await creatorsApi.patchTrack(trackId, body);
  if (!res.success) throw new Error(res.error || "Failed to update track");
}

export async function deleteCreatorTrack(trackId: string): Promise<void> {
  const res = await creatorsApi.deleteTrack(trackId);
  if (!res.success) throw new Error(res.error || "Failed to delete track");
}

/** Replace cover on existing track: cover-intent → PUT → PATCH confirm. */
export async function replaceTrackCover(params: {
  trackId: string;
  cover: { uri: string; name: string; mimeType: string; size: number };
  onProgress?: (phase: string) => void;
}): Promise<void> {
  const { trackId, cover, onProgress } = params;
  if (cover.size > CREATOR_UPLOAD_LIMITS.coverMaxBytes) {
    throw new Error("Cover must be 5MB or smaller");
  }
  onProgress?.("Creating cover upload…");
  const res = await creatorsApi.createCoverUploadIntent(trackId, {
    contentType: cover.mimeType || "image/jpeg",
    fileName: cover.name || "cover.jpg",
    fileSizeBytes: cover.size || 1,
  });
  if (!res.success) {
    throw new Error(res.error || "Cover upload not available from backend yet");
  }
  const data = unwrap(res);
  const uploadUrl = String(
    data.coverUploadUrl || data.uploadUrl || data.putUrl || ""
  );
  if (!uploadUrl) {
    throw new Error("Cover intent missing coverUploadUrl");
  }
  onProgress?.("Uploading cover…");
  await putToPresignedUrl({
    uploadUrl,
    fileUri: cover.uri,
    contentType: cover.mimeType || "image/jpeg",
    headers: data.coverUploadHeaders || data.uploadHeaders,
  });
  onProgress?.("Saving cover…");
  await patchCreatorTrack(trackId, { coverUploaded: true });
}

/** Avatar intent → PUT → PATCH /me with avatar key if returned. */
export async function uploadCreatorAvatar(params: {
  file: { uri: string; name: string; mimeType: string; size: number };
  onProgress?: (phase: string) => void;
}): Promise<string | undefined> {
  const { file, onProgress } = params;
  if (file.size > CREATOR_UPLOAD_LIMITS.coverMaxBytes) {
    throw new Error("Avatar must be 5MB or smaller");
  }
  onProgress?.("Creating avatar upload…");
  const res = await creatorsApi.createAvatarUploadIntent({
    contentType: file.mimeType || "image/jpeg",
    fileName: file.name || "avatar.jpg",
    fileSizeBytes: file.size || 1,
  });
  if (!res.success) {
    throw new Error(res.error || "Avatar upload not available from backend yet");
  }
  const data = unwrap(res);
  const uploadUrl = String(
    data.uploadUrl || data.avatarUploadUrl || data.putUrl || ""
  );
  if (!uploadUrl) throw new Error("Avatar intent missing uploadUrl");
  onProgress?.("Uploading avatar…");
  await putToPresignedUrl({
    uploadUrl,
    fileUri: file.uri,
    contentType: file.mimeType || "image/jpeg",
    headers: data.uploadHeaders || data.avatarUploadHeaders,
  });
  return data.avatarUrl || data.publicUrl || data.key;
}

export async function uploadCreatorTrack(params: {
  title: string;
  artistName?: string;
  genre?: string;
  category?: string;
  audio: { uri: string; name: string; mimeType: string; size: number };
  cover?: { uri: string; name: string; mimeType: string; size: number } | null;
  publish?: boolean;
  onProgress?: (phase: string) => void;
}): Promise<TrackCard | null> {
  const { audio, cover, title, artistName, genre, category, publish, onProgress } =
    params;

  if (audio.size > 100 * 1024 * 1024) {
    throw new Error("Audio must be 100MB or smaller");
  }
  if (cover && cover.size > 5 * 1024 * 1024) {
    throw new Error("Cover must be 5MB or smaller");
  }

  onProgress?.("Creating upload…");
  const intent = await createUploadIntent({
    title,
    artistName,
    genre,
    category,
    language: "en",
    contentType: audio.mimeType || "audio/mpeg",
    fileName: audio.name || "track.mp3",
    fileSizeBytes: audio.size || 1,
    ...(cover
      ? {
          coverContentType: cover.mimeType || "image/jpeg",
          coverFileName: cover.name || "cover.jpg",
          coverFileSizeBytes: cover.size || 1,
        }
      : {}),
  });

  onProgress?.("Uploading audio…");
  await putToPresignedUrl({
    uploadUrl: intent.uploadUrl,
    fileUri: audio.uri,
    contentType: audio.mimeType || "audio/mpeg",
    headers: intent.uploadHeaders,
  });

  if (cover && intent.coverUploadUrl) {
    onProgress?.("Uploading cover…");
    await putToPresignedUrl({
      uploadUrl: intent.coverUploadUrl,
      fileUri: cover.uri,
      contentType: cover.mimeType || "image/jpeg",
      headers: intent.coverUploadHeaders,
    });
  }

  onProgress?.("Finalizing…");
  return finalizeTrack(intent.trackId, { publish: publish !== false });
}

export async function requireCreatorAuthToken(): Promise<string> {
  const token = await TokenUtils.getAuthToken();
  if (!token) throw new Error("Please sign in to upload");
  return token;
}

export const CREATOR_UPLOAD_LIMITS = {
  audioMaxBytes: 100 * 1024 * 1024,
  coverMaxBytes: 5 * 1024 * 1024,
  platform: Platform.OS,
} as const;
