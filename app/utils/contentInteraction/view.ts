import { getDeviceId, getSessionId } from "../deviceIdentity";
import type { ContentInteractionClient } from "./client";
import { devWarn } from "./logging";

const RECORD_VIEW_MIN_INTERVAL_MS = 2500;
const recordViewThrottle: { lastTime?: number; backoffUntil?: number } = {};

export async function recordView(
  ctx: ContentInteractionClient,
  contentId: string,
  contentType: string,
  payload?: {
    durationMs?: number;
    progressPct?: number;
    isComplete?: boolean;
    source?: string;
  }
): Promise<{
  totalViews: number;
  hasViewed?: boolean;
  counted?: boolean;
}> {
  const now = Date.now();
  if (now - (recordViewThrottle.lastTime || 0) < RECORD_VIEW_MIN_INTERVAL_MS) {
    return { totalViews: 0, counted: false };
  }
  if (
    recordViewThrottle.backoffUntil &&
    now < recordViewThrottle.backoffUntil
  ) {
    return { totalViews: 0, counted: false };
  }
  recordViewThrottle.lastTime = now;

  try {
    const headers = await ctx.getAuthHeaders();
    const backendContentType = ctx.mapContentTypeToBackend(contentType);
    const [deviceId, sessionId] = await Promise.all([
      getDeviceId(),
      Promise.resolve(getSessionId()),
    ]);

    const response = await fetch(
      `${ctx.baseURL}/api/content/${backendContentType}/${contentId}/view`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...(payload || {}),
          source: payload?.source || "feed",
          deviceId,
          sessionId,
        }),
      }
    );

    if (!response.ok) {
      // Local/incomplete backends often lack /view — don't treat as app failure
      if (response.status === 404) {
        recordViewThrottle.backoffUntil = Date.now() + 60_000;
        if (__DEV__) {
          devWarn(
            "⚠️ View endpoint missing (404). Skipping view posts for 60s."
          );
        }
        return { totalViews: 0, counted: false };
      }
      if (response.status === 429) {
        recordViewThrottle.backoffUntil = Date.now() + 60_000;
        return { totalViews: 0, counted: false };
      }
      // Auth / Mongo-not-ready 401s — soft skip, don't spam ERROR stacks
      if (response.status === 401 || response.status === 402) {
        recordViewThrottle.backoffUntil = Date.now() + 15_000;
        if (__DEV__) {
          devWarn(
            "⚠️ View post skipped (401). Backing off 15s."
          );
        }
        return { totalViews: 0, counted: false };
      }
      // Server bugs (often under_review media) — soft skip; don't throw red ERROR
      if (response.status >= 500) {
        recordViewThrottle.backoffUntil = Date.now() + 15_000;
        if (__DEV__) {
          let body = "";
          try {
            body = (await response.text()).slice(0, 200);
          } catch {
            // ignore
          }
          devWarn(
            `⚠️ View post 500 for ${backendContentType}/${contentId}. Backing off 15s.`,
            body || undefined
          );
        }
        return { totalViews: 0, counted: false };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const viewCount = data?.data?.viewCount ?? data?.totalViews ?? 0;
    const hasViewed = data?.data?.hasViewed ?? undefined;
    const counted = data?.data?.counted === true;

    return {
      totalViews: Number(viewCount) || 0,
      hasViewed,
      counted,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const is429 = errorMessage.includes("429");
    if (is429) {
      recordViewThrottle.backoffUntil = Date.now() + 60000;
    }

    // Handle network errors gracefully - don't spam logs
    const isNetworkError =
      errorMessage.includes("Network request failed") ||
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("NetworkError");

    if (isNetworkError) {
      // Only log network errors in development, and throttle them
      if (__DEV__) {
        const errorKey = `network_error_view_${contentId}_${Date.now()}`;
        if (!(global as any).__loggedNetworkErrors) {
          (global as any).__loggedNetworkErrors = new Set();
        }
        if (!(global as any).__loggedNetworkErrors.has(errorKey)) {
          (global as any).__loggedNetworkErrors.add(errorKey);
          setTimeout(() => {
            (global as any).__loggedNetworkErrors?.delete(errorKey);
          }, 10000); // 10 second throttle
          devWarn(
            "⚠️ Network error recording view (offline or server unreachable)"
          );
        }
      }
    } else if (__DEV__ && !is429) {
      // Log non-network, non-429 errors in dev (429 is rate limit, expected when scrolling fast)
      console.error("Error recording view:", error);
    }

    // Return gracefully - view tracking failure shouldn't break the app
    return { totalViews: 0, counted: false };
  }
}
