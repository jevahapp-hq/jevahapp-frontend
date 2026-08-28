import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiBaseUrl } from "../api";
import type { DeleteMediaResponse } from "./types";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
const REQUEST_TIMEOUT_MS = 30000;

/** Same lookup order as upload: userToken → token → SecureStore jwt. */
export async function resolveAuthToken(): Promise<string | null> {
  let token = await AsyncStorage.getItem("userToken");
  if (!token) token = await AsyncStorage.getItem("token");
  if (!token) {
    try {
      const { default: SecureStore } = await import("expo-secure-store");
      token = await SecureStore.getItemAsync("jwt");
    } catch {
      // Silent fallback
    }
  }
  return token;
}

function assertObjectId(mediaId: string): string {
  if (!mediaId || typeof mediaId !== "string") {
    throw new Error("Invalid media ID");
  }
  const trimmed = mediaId.trim();
  if (!OBJECT_ID_PATTERN.test(trimmed)) {
    console.error("❌ Invalid media ID format:", {
      mediaId,
      length: mediaId.length,
    });
    throw new Error("Invalid media ID format. Please try again.");
  }
  return trimmed;
}

export interface DeleteConfig {
  /** Build the DELETE URL from the origin and validated id. */
  url: (baseURL: string, mediaId: string) => string;
  /** Prefix for the debug logs, e.g. "🗑️ Delete" / "🔨 Admin delete". */
  logLabel: string;
  noTokenMessage: string;
  successMessage: string;
  failureMessage: string;
  forbiddenMessage: string;
  notFoundMessage: string;
  genericFailureMessage: string;
  /**
   * Chance to short-circuit a non-OK response, e.g. treating a 404 as success
   * when we know we already deleted the item.
   */
  onNotFound?: (mediaId: string) => DeleteMediaResponse | null;
  onSuccess?: (mediaId: string) => void;
}

/**
 * Shared DELETE pipeline: auth, id validation, timeout, response parsing and
 * status-to-message mapping. `deleteMedia` and `adminDeleteContent` differ only
 * in their endpoint and copy.
 */
export async function performDelete(
  mediaId: string,
  config: DeleteConfig
): Promise<DeleteMediaResponse & { data?: any }> {
  const token = await resolveAuthToken();
  if (!token) throw new Error(config.noTokenMessage);

  const trimmedMediaId = assertObjectId(mediaId);
  const fullURL = config.url(getApiBaseUrl(), trimmedMediaId);

  console.log(`${config.logLabel} request:`, {
    hasToken: true,
    tokenLength: token.length,
    mediaId: trimmedMediaId,
    fullURL,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(fullURL, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`📥 ${config.logLabel} response:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    let data: any;
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch (parseError) {
      console.error(
        `❌ Failed to parse ${config.logLabel} response:`,
        parseError
      );
      throw new Error("Invalid response from server");
    }

    if (response.ok && data.success) {
      config.onSuccess?.(trimmedMediaId);
      console.log(`✅ ${config.logLabel} successful:`, data);
      return {
        success: true,
        message: data.message || config.successMessage,
        data: data.data,
      };
    }

    const errorMessage =
      data.message || data.error || config.failureMessage;
    console.error(`❌ ${config.logLabel} failed:`, {
      status: response.status,
      statusText: response.statusText,
      errorMessage,
      fullResponse: data,
    });

    if (response.status === 401) {
      throw new Error(
        errorMessage || "Your session has expired. Please log in again."
      );
    }
    if (response.status === 403) {
      throw new Error(errorMessage || config.forbiddenMessage);
    }
    if (response.status === 404) {
      const shortCircuit = config.onNotFound?.(trimmedMediaId);
      if (shortCircuit) return shortCircuit;
      throw new Error(errorMessage || config.notFoundMessage);
    }

    throw new Error(errorMessage);
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    if (
      error.message?.includes("Network") ||
      error.message === "Network request failed"
    ) {
      throw new Error(
        "Network error. Please check your connection and try again."
      );
    }
    if (error.message) throw error;

    throw new Error(config.genericFailureMessage);
  }
}
