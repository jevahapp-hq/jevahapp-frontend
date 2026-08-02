import type { CommentData } from "./types";

/** Path segment for comment routes — prefer `media` for feed types. */
export function commentPathType(backendContentType: string): string {
  if (backendContentType === "ebook" || backendContentType === "podcast") {
    return "media";
  }
  return backendContentType || "media";
}

export function extractCommentArray(raw: any): any[] {
  const payload = raw && raw.data !== undefined ? raw.data : raw;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.comments)) return payload.comments;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.docs)) return payload.docs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(raw?.comments)) return raw.comments;
  if (Array.isArray(raw?.items)) return raw.items;
  if (payload?.data && Array.isArray(payload.data.comments)) {
    return payload.data.comments;
  }
  return [];
}

export function extractTotal(raw: any, listLength: number): number {
  const payload = raw && raw.data !== undefined ? raw.data : raw;
  const candidates = [
    !Array.isArray(payload) ? payload?.total : undefined,
    !Array.isArray(payload) ? payload?.totalCount : undefined,
    !Array.isArray(payload) ? payload?.totalComments : undefined,
    !Array.isArray(payload) ? payload?.count : undefined,
    raw?.total,
    raw?.totalCount,
    raw?.totalComments,
    listLength,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return listLength;
}

export function transformComment(c: any, contentId: string): CommentData {
  const firstName =
    c?.user?.firstName || c?.author?.firstName || c?.userFirstName || "";
  const lastName =
    c?.user?.lastName || c?.author?.lastName || c?.userLastName || "";
  const fullName =
    `${String(firstName).trim()} ${String(lastName).trim()}`.trim();
  const username = fullName || c?.username || c?.user?.username || "User";

  return {
    id: String(c?._id || c?.id),
    contentId: String(contentId),
    userId: String(
      c?.userId || c?.user?._id || c?.author?._id || c?.authorId || ""
    ),
    username,
    userAvatar:
      c?.userAvatar ||
      c?.user?.avatar ||
      c?.user?.avatarUrl ||
      c?.author?.avatar ||
      "",
    comment: String(c?.content || c?.comment || c?.text || ""),
    timestamp: String(
      c?.createdAt || c?.timestamp || new Date().toISOString()
    ),
    likes: Number(c?.likesCount || c?.likes || c?.reactionsCount || 0),
    isLiked: Boolean(c?.isLiked || false),
    imageUrl: String(
      c?.imageUrl || c?.image || c?.mediaUrl || c?.attachmentUrl || ""
    ) || undefined,
    mentions: Array.isArray(c?.mentions)
      ? c.mentions
          .map((m: any) => ({
            userId: String(m?.userId || m?.id || ""),
            displayName: String(
              m?.displayName || m?.username || m?.name || ""
            ),
          }))
          .filter((m: { displayName: string }) => !!m.displayName)
      : undefined,
    isEdited: Boolean(c?.isEdited || c?.edited),
    editedAt: c?.editedAt ? String(c.editedAt) : undefined,
    replies: Array.isArray(c?.replies)
      ? c.replies.map((r: any) => transformComment(r, contentId))
      : undefined,
  };
}
