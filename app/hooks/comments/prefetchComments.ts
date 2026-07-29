/**
 * Warm comments cache for feed items before the user opens the sheet.
 * Call from adjacent-prefetch / focused item effects.
 */
import contentInteractionAPI, {
  peekCachedComments,
  putCachedComments,
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
      putCachedComments(contentId, sortBy, {
        comments: res.comments,
        totalComments: res.totalComments || res.comments.length,
        hasMore: Boolean(res.hasMore),
      });
    }
  } catch {
    // non-blocking warm
  } finally {
    inflight.delete(key);
  }
}
