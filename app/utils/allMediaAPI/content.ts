import { checkServerHealth } from "./diagnostics";
import { apiLog, apiWarn, baseUrl, getAuthHeaders } from "./http";
import {
  extractMediaArray,
  mergeRecommendations,
  totalFrom,
} from "./normalizeFeed";
import type { ContentListResult } from "./types";

async function readContentList(
  url: string,
  headers: HeadersInit,
  label: string
): Promise<ContentListResult> {
  const response = await fetch(url, { method: "GET", headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  apiLog(`✅ ${label} response:`, data);

  const { media, pagination } = extractMediaArray(data);
  const merged = mergeRecommendations(media, data);

  return {
    success: true,
    media: merged,
    total: totalFrom(pagination, data, merged),
  };
}

/** Network failures get user-facing copy rather than a raw fetch message. */
function describePublicError(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown error";
  if (error.message.includes("Network request failed")) {
    return "Unable to connect to server. Please check your internet connection.";
  }
  if (error.message.includes("timeout")) {
    return "Request timed out. The server may be experiencing issues.";
  }
  if (error.message.includes("Failed to fetch")) {
    return "Server is unreachable. Please try again later.";
  }
  return error.message;
}

export async function getAllContentPublic(): Promise<ContentListResult> {
  try {
    apiLog("🌐 Fetching public all content...");

    const healthCheck = await checkServerHealth();
    if (!healthCheck.isHealthy) {
      apiWarn(
        "⚠️ Server health check failed, proceeding with request anyway..."
      );
    }

    return await readContentList(
      `${baseUrl()}/api/media/public/all-content`,
      { "Content-Type": "application/json", Accept: "application/json" },
      "Public all content"
    );
  } catch (error) {
    console.error("❌ Error fetching public all content:", error);
    return {
      success: false,
      error: describePublicError(error),
      media: [],
      total: 0,
    };
  }
}

export async function getAllContentWithAuth(): Promise<ContentListResult> {
  try {
    const headers = await getAuthHeaders();
    apiLog("🌐 Fetching authenticated all content...");

    return await readContentList(
      `${baseUrl()}/api/media/all-content`,
      headers,
      "Authenticated all content"
    );
  } catch (error) {
    console.error("❌ Error fetching authenticated all content:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      media: [],
      total: 0,
    };
  }
}
