import type { ContentInteractionClient } from "./client";
import {
  fallbackGetSaveState,
  fallbackToggleSave,
  syncWithLibraryStore,
} from "./fallbacks";
import { devLog } from "./logging";

export async function toggleSave(
  ctx: ContentInteractionClient,
  contentId: string,
  contentType: string
): Promise<{ saved: boolean; totalSaves: number }> {
  devLog("🔍 TOGGLE SAVE: Starting toggle save for:", {
    contentId,
    contentType,
  });

  try {
    if (!ctx.isValidObjectId(contentId)) {
      return fallbackToggleSave(ctx, contentId);
    }

    const headers = await ctx.getAuthHeaders();
    const backendContentType = ctx.mapContentTypeToBackend(contentType);
    // Backend Media docs often store plural "videos" — try several aliases on 404
    const typeCandidates = Array.from(
      new Set(
        [
          backendContentType,
          contentType,
          contentType === "videos" ? "media" : null,
          "videos",
          "video",
          "media",
        ].filter(Boolean) as string[]
      )
    );

    let lastErrorText = "";
    for (const typeAttempt of typeCandidates) {
      devLog(
        `🔄 Attempting bookmark toggle for ${contentId} (contentType: ${typeAttempt})`
      );

      const response = await fetch(
        `${ctx.baseURL}/api/bookmark/${contentId}/toggle`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contentType: typeAttempt }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        const isSaved =
          result.data?.bookmarked ?? result.data?.isBookmarked ?? false;
        const bookmarkCount =
          result.data?.bookmarkCount ?? result.data?.saves ?? 0;

        await syncWithLibraryStore(contentId, isSaved);
        return { saved: isSaved, totalSaves: bookmarkCount };
      }

      lastErrorText = await response.text();
      // Only retry on 404 media-not-found; other errors should fail fast
      if (response.status !== 404) {
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${lastErrorText}`
        );
      }
    }

    // Final fallback: media interactions save endpoint
    const fallback = await fetch(
      `${ctx.baseURL}/api/media/interactions/${contentId}/save`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentType: "media" }),
      }
    );
    if (fallback.ok) {
      const result = await fallback.json();
      const isSaved =
        result.data?.bookmarked ??
        result.data?.saved ??
        result.data?.isBookmarked ??
        false;
      const bookmarkCount =
        result.data?.bookmarkCount ?? result.data?.saves ?? 0;
      await syncWithLibraryStore(contentId, isSaved);
      return { saved: isSaved, totalSaves: bookmarkCount };
    }

    console.error(`❌ Bookmark toggle failed after retries:`, lastErrorText);
    throw new Error(
      `HTTP error! status: 404, body: ${lastErrorText || "Media not found"}`
    );
  } catch (error) {
    console.error("❌ TOGGLE SAVE: Error toggling save:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    const errorAnalyticsData = {
      action: "save_toggle_error",
      contentId,
      contentType,
      error: errorMessage || "Unknown error",
      endpoint: `/api/bookmark/${contentId}/toggle`,
      responseTime: Date.now(),
      success: false,
    };
    devLog(
      "📊 USER_INTERACTION_ERROR:",
      JSON.stringify(errorAnalyticsData, null, 2)
    );

    // Do not pretend save succeeded when the server rejected — avoids ghost library items
    throw error instanceof Error ? error : new Error(errorMessage);
  }
}

export async function getContentSaveState(
  ctx: ContentInteractionClient,
  contentId: string
): Promise<{ saved: boolean; totalSaves: number }> {
  try {
    const headers = await ctx.getAuthHeaders();

    // DEBUG: Log the request details
    devLog(
      `🔍 GET SAVE STATE: Making request to ${ctx.baseURL}/api/bookmark/${contentId}/status`
    );
    devLog(`🔍 GET SAVE STATE: Headers:`, headers);

    const response = await fetch(
      `${ctx.baseURL}/api/bookmark/${contentId}/status`,
      {
        headers,
      }
    );

    // DEBUG: Log response details
    devLog(`🔍 GET SAVE STATE: Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🔍 GET SAVE STATE: Error response body:`, errorText);

      // If it's a 500 error, use fallback
      if (response.status === 500) {
        return fallbackGetSaveState(ctx, contentId);
      }

      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      );
    }

    const data = await response.json();
    devLog(`🔍 GET SAVE STATE: Success response:`, data);
    // FIXED: Use correct response structure
    return {
      saved: data.data?.isBookmarked ?? false,
      totalSaves: data.data?.bookmarkCount ?? 0,
    };
  } catch (error) {
    console.error("Error getting save state:", error);
    return fallbackGetSaveState(ctx, contentId);
  }
}
