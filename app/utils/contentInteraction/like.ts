import type { ContentInteractionClient } from "./client";
import { fallbackToggleLike } from "./fallbacks";
import { devLog, devWarn } from "./logging";

export async function toggleLike(
  ctx: ContentInteractionClient,
  contentId: string,
  contentType: string
): Promise<{ liked: boolean; totalLikes: number }> {
  // Map content types to backend expected types (move outside try block)
  const backendContentType = ctx.mapContentTypeToBackend(contentType);

  try {
    if (!ctx.isValidObjectId(contentId)) {
      return fallbackToggleLike(ctx, contentId);
    }
    const headers = await ctx.getAuthHeaders();

    const requestUrl = `${ctx.baseURL}/api/content/${backendContentType}/${contentId}/like`;
    devLog(
      "📡 TOGGLE LIKE: Making request",
      JSON.stringify(
        {
          url: requestUrl,
          method: "POST",
          hasAuth: Boolean((headers as any)?.Authorization),
          contentTypeHeader: (headers as any)?.["Content-Type"],
          contentType: backendContentType,
          contentId,
        },
        null,
        2
      )
    );

    // Use the correct endpoint from backend docs
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    });

    devLog(
      "📡 TOGGLE LIKE: Response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON, use text as message
      }

      // Handle specific error codes per guide
      if (response.status === 401) {
        // Token expired or invalid - should trigger token refresh
        throw new Error("Authentication required. Please log in again.");
      }

      if (response.status === 400) {
        // Invalid content type or content ID
        if (errorData.message?.includes("Invalid content type")) {
          console.error(
            `❌ TOGGLE LIKE: Backend rejected contentType "${backendContentType}" ` +
              `(original: "${contentType}").`
          );
        }
        throw new Error(errorData.message || `Invalid request: ${errorText}`);
      }

      if (response.status === 404) {
        // Content not found
        devWarn(
          `⚠️ TOGGLE LIKE: Content not found (404) for ${backendContentType}/${contentId}`
        );
        throw new Error("Content not found");
      }

      if (response.status === 429) {
        // Rate limited - don't rollback, user's action was valid
        throw new Error(
          "Too many requests. Please wait a moment before liking again."
        );
      }

      // Other errors
      console.error(
        "❌ TOGGLE LIKE: Request failed",
        response.status,
        errorText
      );
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    const result = await response.json();
    devLog(`✅ Like toggled successfully for ${contentId}:`, result);

    // FIXED: Parse response strictly per backend format
    // `data.liked` MUST be the post-toggle state for the authenticated user.
    const liked = result.data?.liked ?? false;
    const totalLikes = result.data?.likeCount ?? 0;

    if (
      result.success === true &&
      typeof result.data?.liked === "boolean" &&
      result.data.liked === false &&
      Number(result.data?.likeCount) > 0
    ) {
      devWarn(
        `⚠️ LIKE RESPONSE LOOKS INCONSISTENT for ${contentId}: liked=false but likeCount=${result.data.likeCount}. Frontend may keep optimistic liked.`
      );
    }

    // Track analytics for backend consolidation
    const analyticsData = {
      action: "like_toggle",
      contentId,
      contentType: backendContentType,
      liked,
      totalLikes,
      endpoint: `/api/content/${backendContentType}/${contentId}/like`,
      responseTime: Date.now(),
      success: true,
      rawResponse: result, // Include full response for debugging
    };
    devLog("📊 USER_INTERACTION:", JSON.stringify(analyticsData, null, 2));

    return {
      liked,
      totalLikes,
    };
  } catch (error) {
    console.error("Error toggling like:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // Track error analytics for backend consolidation
    const errorAnalyticsData = {
      action: "like_toggle_error",
      contentId,
      contentType: backendContentType,
      error: errorMessage || "Unknown error",
      endpoint: `/api/content/${backendContentType}/${contentId}/like`,
      responseTime: Date.now(),
      success: false,
    };
    devLog(
      "📊 USER_INTERACTION_ERROR:",
      JSON.stringify(errorAnalyticsData, null, 2)
    );

    // Fallback to local storage if API fails
    return fallbackToggleLike(ctx, contentId);
  }
}
