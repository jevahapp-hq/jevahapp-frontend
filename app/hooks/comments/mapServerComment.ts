import {
  mapCachedComment,
  type CommentThreadItem,
} from "../../components/comments";
import { transformComment } from "../../utils/contentInteraction/commentTransform";

/**
 * Single mapping path: API row → CommentData (transformComment) → sheet row.
 * Replaces the duplicate inline mapComment in CommentModalContext.
 */
export function mapServerCommentToSheet(
  raw: any,
  contentId: string
): CommentThreadItem {
  const data = transformComment(raw, contentId);
  return mapCachedComment(data);
}

export function mapServerCommentsToSheet(
  list: any[] | undefined,
  contentId: string
): CommentThreadItem[] {
  return (list || [])
    .map((c) => mapServerCommentToSheet(c, contentId))
    .filter((c) => c.id && String(c.id) !== "undefined");
}
