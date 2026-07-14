import { mapContentTypeForBackend, type BatchMetadataItem } from "../engagementHelpers";
import type { ContentInteractionClient } from "./client";
import { fallbackGetStats } from "./fallbacks";
import { devLog, devWarn } from "./logging";
import type { ContentStats } from "./types";

export async function getBatchMetadata(
  ctx: ContentInteractionClient,
  items: BatchMetadataItem[]
): Promise<Record<string, ContentStats>> {
  try {
    const normalized = (items || [])
      .filter((item) => ctx.isValidObjectId(item?.contentId))
      .map((item) => ({
        contentId: item.contentId,
        contentType: mapContentTypeForBackend(item.contentType || "media"),
      }));

    if (normalized.length === 0) return {};

    const headers = await ctx.getAuthHeaders();

    const response = await fetch(
      `${ctx.baseURL}/api/content/batch-metadata`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ items: normalized }),
      }
    );

    if (!response.ok) {
      devWarn(
        `⚠️ batch-metadata failed (${response.status}), falling back to per-item`
      );
      return {};
    }

    const payload = await response.json();
    const data = payload?.data;
    if (!payload?.success || !data) return {};

    // Backend contract: object keyed by contentId { "id1": {...}, "id2": {...} }
    // Fallback: array format from older/alternate backends
    const entries = Array.isArray(data)
      ? data
          .map((i: any) => [i.contentId || i.id, i] as const)
          .filter(([id]) => id)
      : Object.entries(data);

    const result: Record<string, ContentStats> = {};
    for (const [id, item] of entries) {
      const contentId = String(id);
      if (!contentId || contentId === "undefined") continue;
      const stat = item as any;
      const userInteraction =
        stat?.userInteractions || stat?.userInteraction || {};
      result[contentId] = {
        contentId,
        likes: Number(stat?.likes ?? stat?.likeCount ?? 0),
        saves: Number(stat?.saves ?? stat?.bookmarkCount ?? 0),
        shares: Number(stat?.shares ?? stat?.shareCount ?? 0),
        views: Number(stat?.views ?? stat?.viewCount ?? 0),
        comments: Number(stat?.comments ?? stat?.commentCount ?? 0),
        userInteractions: {
          liked: Boolean(userInteraction.liked ?? stat?.hasLiked ?? false),
          saved: Boolean(
            userInteraction.saved ?? stat?.hasBookmarked ?? false
          ),
          shared: Boolean(userInteraction.shared ?? stat?.hasShared ?? false),
          viewed: Boolean(userInteraction.viewed ?? stat?.hasViewed ?? false),
        },
      };
    }
    return result;
  } catch (error) {
    devWarn("⚠️ Error in getBatchMetadata, falling back:", error);
    return {};
  }
}

export async function getContentMetadata(
  ctx: ContentInteractionClient,
  contentId: string,
  contentType: string
): Promise<ContentStats> {
  try {
    const headers = await ctx.getAuthHeaders();
    const backendContentType = ctx.mapContentTypeToBackend(contentType);

    devLog(`🔍 Getting metadata for ${contentId} (${backendContentType})`);

    const response = await fetch(
      `${ctx.baseURL}/api/content/${backendContentType}/${contentId}/metadata`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      devWarn(
        `⚠️ Metadata endpoint failed (${response.status}), using fallback`
      );
      return fallbackGetStats(ctx, contentId);
    }

    const result = await response.json();

    // Backend contract: { data: { likes, saves, userInteractions: { liked, saved, ... } } }
    // Fallback: legacy formats (userInteraction.hasLiked, stats.likes, etc.)
    const data = result.data || {};
    const ui = data.userInteractions || {};
    const userInteraction = data.userInteraction || {};
    const stats = data.stats || {};

    return {
      contentId,
      likes: data.likes ?? stats.likes ?? data.likeCount ?? 0,
      saves: data.saves ?? stats.saves ?? data.bookmarkCount ?? 0,
      shares: data.shares ?? stats.shares ?? data.shareCount ?? 0,
      views: data.views ?? stats.views ?? data.viewCount ?? 0,
      comments: data.comments ?? stats.comments ?? data.commentCount ?? 0,
      userInteractions: {
        liked: Boolean(
          ui.liked ?? userInteraction.hasLiked ?? data.hasLiked ?? false
        ),
        saved: Boolean(
          ui.saved ??
            userInteraction.hasBookmarked ??
            data.hasBookmarked ??
            false
        ),
        shared: Boolean(
          ui.shared ?? userInteraction.hasShared ?? data.hasShared ?? false
        ),
        viewed: Boolean(
          ui.viewed ?? userInteraction.hasViewed ?? data.hasViewed ?? false
        ),
      },
    };
  } catch (error) {
    devWarn("⚠️ Error getting content metadata, using fallback:", error);
    return fallbackGetStats(ctx, contentId);
  }
}
