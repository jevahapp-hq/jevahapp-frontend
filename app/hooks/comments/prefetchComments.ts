/**
 * Warm comments cache for feed items before the user opens the sheet.
 * Call from adjacent-prefetch / focused item effects.
 */
import contentInteractionAPI, {
  peekCachedComments,
  putCachedComments,
  writeDiskCommentsCache,
} from "../../utils/contentInteractionAPI";

const inflight = new Set<string>();

export async function prefetchComments(
  contentId: string,
  contentType: "media" | "devotional" = "media",
  sortBy: "newest" | "oldest" | "top" = "newest"
): Promise<void> {
  if (!contentId) return;
  const key = `${contentId}:${sortBy}`;
  if (inflight.has(key)) return;
  if (peekCachedComments(contentId, sortBy)?.comments?.length) return;

  inflight.add(key);
  try {
    const res = await contentInteractionAPI.getComments(
      contentId,
      contentType,
      1,
      12,
      sortBy
    );
    if (res?.comments?.length) {
      const payload = {
        comments: res.comments,
        totalComments: res.totalComments || res.comments.length,
        hasMore: Boolean(res.hasMore),
      };
      putCachedComments(contentId, sortBy, payload);
      void writeDiskCommentsCache(contentId, sortBy, payload);
    }
  } catch {
    // non-blocking warm
  } finally {
    inflight.delete(key);
  }
}
