import type { ContentInteractionClient } from "./client";
import { fallbackGetStats } from "./fallbacks";
import { devWarn } from "./logging";
import type { ContentStats } from "./types";

export async function getContentStats(
  ctx: ContentInteractionClient,
  contentId: string
): Promise<ContentStats> {
  try {
    // If ID is not a valid ObjectId, skip server call and use fallback
    if (!ctx.isValidObjectId(contentId)) {
      return fallbackGetStats(ctx, contentId);
    }

    const headers = await ctx.getAuthHeaders();
    const response = await fetch(
      `${ctx.baseURL}/api/content/${contentId}/stats`,
      {
        headers,
      }
    );

    if (response.ok) {
      return await response.json();
    }

    // Gracefully fallback on 404 or any non-OK
    if (response.status === 404) {
      devWarn(
        `⚠️ content stats 404 for ${contentId}. Falling back to local stats.`
      );
    }
    return fallbackGetStats(ctx, contentId);
  } catch (error) {
    console.error("Error getting content stats:", error);
    return fallbackGetStats(ctx, contentId);
  }
}

export async function getBatchContentStats(
  ctx: ContentInteractionClient,
  contentIds: string[]
): Promise<Record<string, ContentStats>> {
  try {
    // Filter to valid IDs only; if none, return empty to avoid server errors
    const validIds = (contentIds || []).filter((id) =>
      ctx.isValidObjectId(id)
    );
    if (validIds.length === 0) {
      return {};
    }

    const headers = await ctx.getAuthHeaders();
    const response = await fetch(`${ctx.baseURL}/api/content/batch-stats`, {
      method: "POST",
      headers,
      body: JSON.stringify({ contentIds: validIds }),
    });

    if (response.ok) {
      return await response.json();
    }

    // If endpoint not found or other non-OK, gracefully fall back to per-id fetches
    if (response.status === 404) {
      devWarn(
        "⚠️ batch-stats endpoint not found (404). Falling back to individual stats requests."
      );
    } else {
      devWarn(
        `⚠️ batch-stats request failed with status ${response.status}. Falling back.`
      );
    }

    const entries = await Promise.all(
      validIds.map(async (id) => {
        try {
          const stats = await getContentStats(ctx, id);
          return [id, stats] as [string, ContentStats];
        } catch {
          return [id, undefined] as unknown as [string, ContentStats];
        }
      })
    );

    return entries.reduce((acc, [id, stats]) => {
      if (stats) acc[id] = stats;
      return acc;
    }, {} as Record<string, ContentStats>);
  } catch (error) {
    console.error("Error getting batch content stats:", error);
    return {};
  }
}
