import type { ContentInteractionClient } from "./client";
import { isLikelyNetworkFailure, isNetworkOnline } from "./connectivity";
import {
  LikeServerError,
  RateLimitError,
  parseRetryAfterMs,
} from "./errors";
import { fallbackToggleLike } from "./fallbacks";
import { createGestureIdempotencyKey } from "./idempotency";
import { enqueueOrCancelLikeMutation } from "./likeQueue";
import type {
  ToggleLikeRequestOptions,
  ToggleLikeResponse,
} from "./likeTypes";
import { devLog, devWarn } from "./logging";
import { persistContentInteraction } from "../contentInteractionPersist";

async function queueOfflineLike(
  contentId: string,
  contentType: string,
  options: ToggleLikeRequestOptions,
  idempotencyKey: string
): Promise<ToggleLikeResponse> {
  const baselineLiked = Boolean(options.baselineLiked);
  const targetLiked =
    typeof options.expectedLiked === "boolean"
      ? options.expectedLiked
      : !baselineLiked;
  const targetTotalLikes = Math.max(0, options.expectedTotalLikes ?? 0);

  const { pending, cancelled } = await enqueueOrCancelLikeMutation({
    contentId,
    contentType,
    idempotencyKey,
    baselineLiked,
    targetLiked,
    targetTotalLikes,
  });

  void persistContentInteraction(contentId, {
    liked: targetLiked,
    likes: targetTotalLikes,
  });

  return {
    liked: targetLiked,
    totalLikes: targetTotalLikes,
    offlineQueued: pending,
    offlineCancelled: cancelled,
  };
}

export async function toggleLike(
  ctx: ContentInteractionClient,
  contentId: string,
  contentType: string,
  options: ToggleLikeRequestOptions = {}
): Promise<ToggleLikeResponse> {
  const backendContentType = ctx.mapContentTypeToBackend(contentType);
  const idempotencyKey =
    options.idempotencyKey || createGestureIdempotencyKey();

  try {
    // Local-only / invalid ids stay on the legacy local map — never hit the API.
    if (!ctx.isValidObjectId(contentId)) {
      return fallbackToggleLike(ctx, contentId);
    }

    const online = await isNetworkOnline();
    if (!online) {
      return queueOfflineLike(contentId, contentType, options, idempotencyKey);
    }

    const headers = await ctx.getAuthHeaders();
    const requestUrl = `${ctx.baseURL}/api/content/${backendContentType}/${contentId}/like`;

    const postLike = async (withIdempotencyKey: boolean) => {
      const reqHeaders: Record<string, string> = {
        ...headers,
        "Content-Type": "application/json",
      };
      if (withIdempotencyKey) {
        reqHeaders["Idempotency-Key"] = idempotencyKey;
      }

      devLog(
        "📡 TOGGLE LIKE: Making request",
        JSON.stringify(
          {
            url: requestUrl,
            method: "POST",
            hasAuth: Boolean((headers as any)?.Authorization),
            idempotencyKey: withIdempotencyKey ? idempotencyKey : null,
            contentType: backendContentType,
            contentId,
          },
          null,
          2
        )
      );

      return fetch(requestUrl, {
        method: "POST",
        headers: reqHeaders,
      });
    };

    let response = await postLike(true);

    // Local Redis/idempotency store down → backend asks to retry without the key.
    if (response.status === 503) {
      const peekText = await response.text();
      let peekData: any = {};
      try {
        peekData = JSON.parse(peekText);
      } catch {
        // Not JSON
      }
      const msg = String(peekData.message || peekText || "");
      if (/idempotency/i.test(msg) || /idempotency/i.test(peekData.code || "")) {
        devWarn(
          "⚠️ TOGGLE LIKE: Idempotency store unavailable (503) — retrying without Idempotency-Key"
        );
        response = await postLike(false);
      } else {
        throw new Error(
          peekData.message ||
            "Like temporarily unavailable. Please try again shortly."
        );
      }
    }

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
        // Not JSON
      }

      if (response.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }

      if (response.status === 400) {
        if (errorData.message?.includes("Invalid content type")) {
          console.error(
            `❌ TOGGLE LIKE: Backend rejected contentType "${backendContentType}" ` +
              `(original: "${contentType}").`
          );
        }
        if (
          /idempotency/i.test(errorData.code || "") ||
          /idempotency/i.test(errorData.message || "")
        ) {
          throw new Error(
            errorData.message || "Invalid idempotency key. Please try again."
          );
        }
        throw new Error(errorData.message || `Invalid request: ${errorText}`);
      }

      if (response.status === 404) {
        devWarn(
          `⚠️ TOGGLE LIKE: Content not found (404) for ${backendContentType}/${contentId}`
        );
        throw new Error("Content not found");
      }

      if (response.status === 409) {
        throw new Error(
          errorData.message ||
            "Like conflict. Please try again with a new gesture."
        );
      }

      if (response.status === 429) {
        throw new RateLimitError(
          errorData.message ||
            "Too many requests. Please wait a moment before liking again.",
          parseRetryAfterMs(response.headers.get("Retry-After"), 3000)
        );
      }

      if (response.status === 503) {
        throw new Error(
          errorData.message ||
            "Like temporarily unavailable. Please try again shortly."
        );
      }

      // 5xx / LIKE_OPERATION_FAILED — server bug or corrupt content row.
      // Do NOT offline-queue (retries will keep failing and fake a success).
      if (
        response.status >= 500 ||
        errorData.code === "LIKE_OPERATION_FAILED"
      ) {
        console.error(
          "❌ TOGGLE LIKE: Server failed",
          response.status,
          errorData.code || "",
          errorText
        );
        throw new LikeServerError(
          errorData.message || "Failed to toggle like",
          response.status,
          errorData.code
        );
      }

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

    const liked = result.data?.liked ?? false;
    const totalLikes = result.data?.likeCount ?? 0;

    if (
      result.success === true &&
      typeof result.data?.liked === "boolean" &&
      result.data.liked === false &&
      Number(result.data?.likeCount) > 0
    ) {
      // Valid IG semantics: I unliked / never liked, but others still have likes.
      devLog(
        `ℹ️ Like response for ${contentId}: liked=false, likeCount=${result.data.likeCount} (global count; not a contradiction)`
      );
    }

    void persistContentInteraction(contentId, {
      liked,
      likes: totalLikes,
    });

    return { liked, totalLikes };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    devLog(
      "📊 USER_INTERACTION_ERROR:",
      JSON.stringify(
        {
          action: "like_toggle_error",
          contentId,
          contentType: backendContentType,
          error: errorMessage || "Unknown error",
          success: false,
        },
        null,
        2
      )
    );

    // Server / auth / rate-limit / conflict — let store roll back optimistic UI.
    if (
      error instanceof LikeServerError ||
      error instanceof RateLimitError ||
      (error instanceof Error &&
        /authentication required|too many requests|idempotency|conflict|not found|unavailable|failed to toggle like/i.test(
          error.message
        ))
    ) {
      throw error;
    }

    // Transport / offline failures → durable queue (same Idempotency-Key).
    if (isLikelyNetworkFailure(error) || !(await isNetworkOnline(true))) {
      return queueOfflineLike(contentId, contentType, options, idempotencyKey);
    }

    console.error("Error toggling like:", error);
    throw error instanceof Error
      ? error
      : new Error(errorMessage || "Failed to toggle like");
  }
}
