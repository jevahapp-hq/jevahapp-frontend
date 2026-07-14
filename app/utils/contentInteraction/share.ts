import type { ContentInteractionClient } from "./client";
import { devLog, devWarn } from "./logging";

/**
 * Record a share with the backend.
 * Soft-fails on 404 / network — closing the native share sheet (esp. Android)
 * must never surface a red error to the user.
 */
export async function recordShare(
  ctx: ContentInteractionClient,
  contentId: string,
  contentType: string,
  shareMethod: string = "generic",
  message?: string
): Promise<{ totalShares: number; shared?: boolean; ok?: boolean }> {
  try {
    if (!ctx.isValidObjectId(contentId)) {
      return { totalShares: 0, ok: false };
    }
    const headers = await ctx.getAuthHeaders();
    const backendContentType = ctx.mapContentTypeToBackend(contentType);
    const platform =
      shareMethod === "generic" || shareMethod === "internal"
        ? "internal"
        : shareMethod;

    const response = await fetch(
      `${ctx.baseURL}/api/content/${backendContentType}/${contentId}/share`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          platform,
          ...(message ? { message } : {}),
        }),
      }
    );

    // Endpoint missing / not deployed yet — quiet no-op
    if (response.status === 404 || response.status === 405) {
      if (__DEV__) {
        devWarn(
          `Share endpoint unavailable (${response.status}) for ${backendContentType}/${contentId} — skipping analytics`
        );
      }
      return { totalShares: 0, shared: false, ok: false };
    }

    if (!response.ok) {
      if (__DEV__) {
        devWarn(`Share record failed: HTTP ${response.status}`);
      }
      return { totalShares: 0, shared: false, ok: false };
    }

    const result = await response.json();
    devLog(`✅ Share recorded successfully for ${contentId}:`, result);

    return {
      totalShares: result.data?.shareCount ?? result.data?.totalShares ?? 0,
      shared: result.data?.shared ?? true,
      ok: true,
    };
  } catch (error) {
    // Never throw — share UX must stay quiet if analytics fail
    if (__DEV__) {
      devWarn(
        "Share record soft-failed:",
        error instanceof Error ? error.message : String(error)
      );
    }
    return { totalShares: 0, shared: false, ok: false };
  }
}
