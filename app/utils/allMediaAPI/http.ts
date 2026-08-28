import { Platform } from "react-native";
import { getApiBaseUrl } from "../environmentManager";
import type { ApiResult } from "./types";

export const apiLog = (...a: any[]) => {
  if (__DEV__) console.log(...a);
};

export const apiWarn = (...a: any[]) => {
  if (__DEV__) console.warn(...a);
};

export function baseUrl(): string {
  return getApiBaseUrl();
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const TokenUtils = (await import("../tokenUtils")).default;
    const token = await TokenUtils.getAuthToken();

    if (token) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "expo-platform": Platform.OS,
      };
    }

    return {
      "Content-Type": "application/json",
      "expo-platform": Platform.OS,
    };
  } catch (error) {
    if (__DEV__) console.error("Error getting auth headers:", error);
    return {
      "Content-Type": "application/json",
      "expo-platform": Platform.OS,
    };
  }
}

export function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

/**
 * Authenticated request returning the `{ success, data?, error? }` envelope.
 * Every mutation endpoint shared this exact shape, so it lives here once.
 */
export async function authedRequest<T = any>(
  path: string,
  init: { method: "GET" | "POST" | "DELETE"; body?: unknown },
  context: string
): Promise<ApiResult<T>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl()}${path}`, {
      method: init.method,
      headers,
      ...(init.body === undefined
        ? {}
        : { body: JSON.stringify(init.body) }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`Error ${context}:`, error);
    return { success: false, error: errorMessageOf(error) };
  }
}
