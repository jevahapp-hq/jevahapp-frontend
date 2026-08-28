/**
 * Owner-only edit of a media item's description.
 *
 * Mirrors the delete pipeline (`mediaDelete/deleteRequest.ts`) for auth, id
 * validation, timeout and status-to-message mapping, so the two owner actions
 * behave identically. Tries the canonical route first and falls back to the
 * legacy one, matching how the comment endpoints handle route drift.
 */
import { Platform } from "react-native";
import { getApiBaseUrl } from "../api";
import { resolveAuthToken } from "../mediaDelete/deleteRequest";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
const REQUEST_TIMEOUT_MS = 20000;

/** Backend caps this; enforced client-side so we fail before the round trip. */
export const DESCRIPTION_MAX_LENGTH = 1500;

export interface UpdateDescriptionResult {
  success: boolean;
  description: string;
  /** Server's post-edit timestamp, used to order concurrent edits. */
  updatedAt?: string;
  message?: string;
}

/** A 404/405 means "wrong path", not "no such media" — worth another route. */
function isMissingRoute(status: number): boolean {
  return status === 404 || status === 405;
}

export async function updateMediaDescription(
  mediaId: string,
  description: string
): Promise<UpdateDescriptionResult> {
  const trimmedId = String(mediaId || "").trim();
  if (!OBJECT_ID_PATTERN.test(trimmedId)) {
    throw new Error("Invalid media ID format.");
  }

  const next = String(description ?? "").trim();
  if (next.length > DESCRIPTION_MAX_LENGTH) {
    throw new Error(
      `Description is too long (max ${DESCRIPTION_MAX_LENGTH} characters).`
    );
  }

  const token = await resolveAuthToken();
  if (!token) {
    throw new Error("You need to be signed in to edit this.");
  }

  const base = getApiBaseUrl();
  const urls = [
    `${base}/api/media/${trimmedId}`,
    `${base}/api/content/media/${trimmedId}`,
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let lastError = "Could not save your changes.";

    for (const url of urls) {
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        },
        body: JSON.stringify({ description: next }),
        signal: controller.signal,
      });

      let data: any = null;
      try {
        data = JSON.parse(await response.text());
      } catch {
        data = null;
      }

      if (response.ok && data?.success !== false) {
        const payload = data?.data || data || {};
        return {
          success: true,
          description:
            typeof payload.description === "string" ? payload.description : next,
          updatedAt: payload.updatedAt,
          message: data?.message,
        };
      }

      lastError = data?.message || data?.error || lastError;

      if (isMissingRoute(response.status)) continue;
      if (response.status === 401) {
        throw new Error("Your session has expired. Please log in again.");
      }
      if (response.status === 403) {
        throw new Error("You can only edit your own posts.");
      }
      throw new Error(lastError);
    }

    throw new Error(lastError);
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    if (error?.message === "Network request failed") {
      throw new Error("Network error. Check your connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
