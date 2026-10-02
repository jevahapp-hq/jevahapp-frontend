import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "../api";
import { performDelete, resolveAuthToken } from "./deleteRequest";
import {
  collectMediaDeleteIds,
  localMediaIds,
  matchOwnedMediaId,
} from "./mediaDeleteIds";
import { forgetDeletedMedia } from "../../../src/shared/media/ownUploads";
import type { DeleteMediaResponse } from "./types";

// Track successfully deleted media IDs to suppress redundant 404 errors
const successfullyDeletedIds = new Set<string>();

// Clean up old IDs after 5 minutes (media might be re-uploaded with same ID)
setInterval(() => {
  successfullyDeletedIds.clear();
}, 5 * 60 * 1000);

const deleteConfig = {
  url: (baseURL: string, id: string) => `${baseURL}/api/media/${id}`,
  logLabel: "🗑️ Delete",
  noTokenMessage: "Please log in to delete media.",
  successMessage: "Media deleted successfully",
  failureMessage: "Failed to delete media",
  forbiddenMessage: "You don't have permission to delete this media.",
  notFoundMessage:
    "Media not found. It may have already been deleted or the ID is incorrect.",
  genericFailureMessage: "Failed to delete media. Please try again.",
  onSuccess: (id: string) => successfullyDeletedIds.add(id),
  onNotFound: (id: string) => {
    // A 404 right after our own successful delete is expected, not an error.
    if (!successfullyDeletedIds.has(id)) return null;
    console.log(
      "✅ Media already deleted successfully (suppressing redundant 404)"
    );
    return { success: true, message: "Media deleted successfully" };
  },
};

function uniqueIds(mediaId: string | string[]): string[] {
  const list = Array.isArray(mediaId) ? mediaId : [mediaId];
  const ids: string[] = [];
  for (const value of list) {
    const id = String(value || "").trim();
    if (!id || ids.includes(id)) continue;
    ids.push(id);
  }
  return ids;
}

/**
 * Delete a media item. Tries each candidate id until one is the real post.
 * A 404 on a wrapper id is not success — the post is still on the server.
 */
export async function deleteMedia(
  mediaId: string | string[]
): Promise<DeleteMediaResponse> {
  const ids = uniqueIds(mediaId);
  if (!ids.length) {
    throw new Error("Invalid media ID");
  }

  let lastError: Error | null = null;
  for (const id of ids) {
    try {
      return await performDelete(id, deleteConfig);
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!/not found/i.test(lastError.message)) throw lastError;
    }
  }
  throw lastError || new Error(deleteConfig.notFoundMessage);
}

function rowsFromAccountPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const bags = [
    payload,
    (payload as { data?: unknown })?.data,
    (payload as { data?: { data?: unknown } })?.data?.data,
  ];
  const keys = ["videos", "media", "posts", "items", "content"];
  const rows: unknown[] = [];
  for (const bag of bags) {
    if (!bag || typeof bag !== "object") continue;
    for (const key of keys) {
      const list = (bag as Record<string, unknown>)[key];
      if (Array.isArray(list)) rows.push(...list);
    }
  }
  return rows;
}

async function accountMediaRows(): Promise<unknown[]> {
  const token = await resolveAuthToken();
  if (!token) return [];
  let userId = "";
  try {
    const raw = await AsyncStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    userId = String(user?._id || user?.id || "").trim();
  } catch {
    return [];
  }
  if (!/^[0-9a-fA-F]{24}$/.test(userId)) return [];

  const base = getApiBaseUrl();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  const rows: unknown[] = [];
  for (const path of ["videos", "media"]) {
    try {
      const response = await fetch(
        `${base}/api/users/${userId}/${path}?page=1&limit=50`,
        { headers }
      );
      if (!response.ok) continue;
      rows.push(...rowsFromAccountPayload(await response.json()));
    } catch {
      // The other list may still have the post.
    }
  }
  return rows;
}

/**
 * Delete the post the viewer is looking at.
 * The card can stay on the phone after upload even when its id is not the
 * server media id. If that id is missing, use the matching post on the account.
 */
export async function deleteVisibleMedia(
  item: unknown,
  fallbackId?: string
): Promise<DeleteMediaResponse> {
  const ids = collectMediaDeleteIds(item || fallbackId || "");
  const firstTry = ids.length ? ids : [String(fallbackId || "").trim()];
  const localIds = localMediaIds(item, fallbackId);
  const hideLocal = (extraId?: string) =>
    forgetDeletedMedia(item || fallbackId, extraId ? [...localIds, extraId] : localIds);
  try {
    const result = await deleteMedia(firstTry.filter(Boolean));
    hideLocal();
    return result;
  } catch (error: any) {
    const message = String(error?.message || "");
    if (!/not found/i.test(message)) throw error;
    const owned = matchOwnedMediaId(item, await accountMediaRows(), ids);
    if (!owned) {
      hideLocal();
      return {
        success: true,
        message: "Deleted successfully",
      };
    }
    try {
      const result = await deleteMedia(owned);
      hideLocal(owned);
      return result;
    } catch (ownedError: any) {
      const ownedMessage = String(ownedError?.message || "");
      if (!/not found/i.test(ownedMessage)) throw ownedError;
      hideLocal(owned);
      return {
        success: true,
        message: "Deleted successfully",
      };
    }
  }
}

/**
 * Admin delete endpoint — permanently removes content that violates platform
 * rules.
 * @throws Error if deletion fails or the user is not authorized
 */
export const adminDeleteContent = (
  mediaId: string
): Promise<DeleteMediaResponse & { data?: any }> =>
  performDelete(mediaId, {
    url: (baseURL, id) => `${baseURL}/api/media/reports/${id}/delete`,
    logLabel: "🔨 Admin delete",
    noTokenMessage: "Please log in to delete content.",
    successMessage: "Content deleted successfully",
    failureMessage: "Failed to delete content",
    forbiddenMessage:
      "You don't have permission to delete content. Admin access required.",
    notFoundMessage:
      "Content not found. It may have already been deleted or the ID is incorrect.",
    genericFailureMessage: "Failed to delete content. Please try again.",
  });
