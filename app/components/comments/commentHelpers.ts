import { formatTimeAgo } from "../../../src/shared/utils";
import type { CommentReply, CommentThreadItem } from "./types";

export function countAllComments(
  list: Array<CommentThreadItem | CommentReply>
): number {
  return list.reduce(
    (sum, c) =>
      sum +
      1 +
      (Array.isArray((c as CommentThreadItem).replies)
        ? (c as CommentThreadItem).replies!.length
        : 0),
    0
  );
}

/** Compact relative time: 2h, 1d, now */
export function shortCommentTime(ts: string): string {
  const raw = formatTimeAgo(ts) || "";
  const m = raw.match(/^(\d+)\s*(second|minute|hour|day|week|month|year)/i);
  if (m) {
    const n = m[1];
    const unit = m[2].toLowerCase();
    const map: Record<string, string> = {
      second: "s",
      minute: "m",
      hour: "h",
      day: "d",
      week: "w",
      month: "mo",
      year: "y",
    };
    return `${n}${map[unit] || ""}`;
  }
  if (/just now/i.test(raw)) return "now";
  return raw.replace(/\s+ago$/i, "").trim() || raw;
}

export function mapCachedComment(c: any): CommentThreadItem {
  return {
    id: String(c?.id || c?._id || ""),
    userName: c?.username || c?.userName || "User",
    avatar: c?.userAvatar || c?.avatar || "",
    timestamp: c?.timestamp || c?.createdAt || new Date().toISOString(),
    comment: c?.comment || c?.content || c?.text || "",
    likes: Number(c?.likes || c?.likesCount || 0),
    isLiked: Boolean(c?.isLiked || false),
    imageUrl:
      c?.imageUrl || c?.image || c?.mediaUrl || c?.attachmentUrl || undefined,
    mentions: Array.isArray(c?.mentions) ? c.mentions : undefined,
    userId: c?.userId,
    isEdited: Boolean(c?.isEdited || c?.edited),
    editedAt: c?.editedAt ? String(c.editedAt) : undefined,
    replies: Array.isArray(c?.replies)
      ? c.replies.map((r: any) => mapCachedComment(r) as CommentReply)
      : [],
  };
}

export function mapCommentsDeep(
  list: CommentThreadItem[],
  commentId: string,
  updater: (c: CommentThreadItem) => CommentThreadItem | null
): CommentThreadItem[] {
  const out: CommentThreadItem[] = [];
  for (const c of list) {
    if (c.id === commentId) {
      const next = updater(c);
      if (next) out.push(next);
      continue;
    }
    const replies = Array.isArray(c.replies)
      ? (mapCommentsDeep(
          c.replies as unknown as CommentThreadItem[],
          commentId,
          updater
        ) as CommentReply[])
      : c.replies;
    out.push({
      ...c,
      replies,
    });
  }
  return out;
}

export function sortCommentThread(
  comments: CommentThreadItem[],
  mode: "top" | "newest" | "oldest"
): CommentThreadItem[] {
  const list = [...comments];
  if (mode === "oldest") return list.reverse();
  if (mode === "top") {
    return list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }
  return list;
}

export function toCachePayload(
  contentId: string,
  comments: CommentThreadItem[]
) {
  return comments.map((c) => ({
    id: c.id,
    contentId,
    userId: c.userId || "",
    username: c.userName,
    userAvatar: c.avatar,
    comment: c.comment,
    timestamp: c.timestamp,
    likes: c.likes,
    isLiked: c.isLiked,
    imageUrl: c.imageUrl,
    mentions: c.mentions,
    isEdited: c.isEdited,
    editedAt: c.editedAt,
    replies: c.replies as any,
  }));
}
