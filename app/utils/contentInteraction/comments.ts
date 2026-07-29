import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { ContentInteractionClient } from "./client";
import {
  CommentApiError,
  messageForCommentErrorCode,
} from "./errors";
import type { CommentData, EditCommentOptions } from "./types";

/** In-memory comments cache — sync read on sheet open (IG/TikTok snappy reopen). */
const commentsMemoryCache = new Map<
  string,
  { comments: CommentData[]; totalComments: number; hasMore: boolean; at: number }
>();
/** Keep threads hot for long scrolling sessions */
const MEMORY_TTL_MS = 45 * 60 * 1000;
/** Disk survives process death / app restart */
const DISK_TTL_MS = 24 * 60 * 60 * 1000;

function memoryKey(contentId: string, sortBy: string) {
  return `${contentId}:${sortBy}`;
}

export function diskCommentsCacheKey(contentId: string, sortBy: string) {
  return `comments-cache-${contentId}-${sortBy}`;
}

/** Path segment for comment routes — prefer `media` for feed types. */
function commentPathType(backendContentType: string): string {
  if (backendContentType === "ebook" || backendContentType === "podcast") {
    return "media";
  }
  return backendContentType || "media";
}

export function peekCachedComments(
  contentId: string,
  sortBy: string = "newest"
): { comments: CommentData[]; totalComments: number; hasMore: boolean } | null {
  const hit = commentsMemoryCache.get(memoryKey(contentId, sortBy));
  if (!hit) return null;
  if (Date.now() - hit.at > MEMORY_TTL_MS) {
    commentsMemoryCache.delete(memoryKey(contentId, sortBy));
    return null;
  }
  return {
    comments: hit.comments,
    totalComments: hit.totalComments,
    hasMore: hit.hasMore,
  };
}

export function putCachedComments(
  contentId: string,
  sortBy: string,
  data: { comments: CommentData[]; totalComments: number; hasMore: boolean }
) {
  commentsMemoryCache.set(memoryKey(contentId, sortBy), {
    ...data,
    at: Date.now(),
  });
}

export async function writeDiskCommentsCache(
  contentId: string,
  sortBy: string,
  data: {
    comments: unknown[];
    totalComments?: number;
    hasMore: boolean;
    page?: number;
  }
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      diskCommentsCacheKey(contentId, sortBy),
      JSON.stringify({
        comments: data.comments,
        totalComments: data.totalComments ?? data.comments.length,
        hasMore: data.hasMore,
        page: data.page ?? 1,
        timestamp: Date.now(),
      })
    );
  } catch {
    // no-op
  }
}

/**
 * Read disk cache and hydrate memory. Returns mapped payload or null.
 * Call off the critical path / fire-and-forget on open.
 */
export async function hydrateCommentsCacheFromDisk(
  contentId: string,
  sortBy: string = "newest"
): Promise<{
  comments: CommentData[];
  totalComments: number;
  hasMore: boolean;
} | null> {
  try {
    const raw = await AsyncStorage.getItem(
      diskCommentsCacheKey(contentId, sortBy)
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.timestamp || 0);
    if (!ts || Date.now() - ts > DISK_TTL_MS) {
      void AsyncStorage.removeItem(diskCommentsCacheKey(contentId, sortBy));
      return null;
    }
    const list = Array.isArray(parsed?.comments) ? parsed.comments : [];
    if (!list.length) return null;

    // Disk may hold either API rows or already-normalized sheet rows
    const comments: CommentData[] = list.map((c: any) => {
      if (c?.userName || (c?.username && (c?.comment != null || c?.content != null))) {
        return {
          id: String(c?.id || c?._id || ""),
          contentId,
          userId: String(c?.userId || ""),
          username: String(c?.username || c?.userName || "User"),
          userAvatar: c?.userAvatar || c?.avatar || "",
          comment: String(c?.comment || c?.content || c?.text || ""),
          timestamp: String(
            c?.timestamp || c?.createdAt || new Date().toISOString()
          ),
          likes: Number(c?.likes || c?.likesCount || 0),
          isLiked: Boolean(c?.isLiked),
          imageUrl: c?.imageUrl || c?.image || undefined,
          mentions: Array.isArray(c?.mentions) ? c.mentions : undefined,
          isEdited: Boolean(c?.isEdited || c?.edited),
          editedAt: c?.editedAt ? String(c.editedAt) : undefined,
          replies: Array.isArray(c?.replies) ? c.replies : undefined,
        } as CommentData;
      }
      return transformComment(c, contentId);
    });

    const payload = {
      comments,
      totalComments: Number(parsed?.totalComments ?? comments.length),
      hasMore: Boolean(parsed?.hasMore),
    };
    putCachedComments(contentId, sortBy, payload);
    return payload;
  } catch {
    return null;
  }
}

export async function invalidateDiskCommentsCache(
  contentId: string,
  sortBy: string
): Promise<void> {
  try {
    await AsyncStorage.removeItem(diskCommentsCacheKey(contentId, sortBy));
  } catch {
    // no-op
  }
}

function extractCommentArray(raw: any): any[] {
  const payload = raw && raw.data !== undefined ? raw.data : raw;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.comments)) return payload.comments;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.docs)) return payload.docs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(raw?.comments)) return raw.comments;
  if (Array.isArray(raw?.items)) return raw.items;
  // Nested: data.comments inside another wrapper
  if (payload?.data && Array.isArray(payload.data.comments)) {
    return payload.data.comments;
  }
  return [];
}

function extractTotal(raw: any, listLength: number): number {
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

function transformComment(c: any, contentId: string): CommentData {
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

async function buildHeaders(opts?: { bypassHttpCache?: boolean }): Promise<HeadersInit> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "expo-platform": Platform.OS,
  };
  // OkHttp/RN: server 304 with no local cache → empty body / bogus failure.
  // Force a fresh 200 body for list reads (curl with no-cache returns comments).
  if (opts?.bypassHttpCache) {
    headers["Cache-Control"] = "no-cache";
    headers["Pragma"] = "no-cache";
  }
  try {
    const token =
      (await AsyncStorage.getItem("userToken")) ||
      (await AsyncStorage.getItem("token"));
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch {
    // public GET — fine without token
  }
  return headers;
}

/**
 * Candidate URLs — primary contract first, then legacy/local variants.
 * First 200 wins.
 */
function commentListUrls(
  baseURL: string,
  backendContentType: string,
  contentId: string,
  query: string
): string[] {
  return [
    `${baseURL}/api/content/${backendContentType}/${contentId}/comments?${query}`,
    `${baseURL}/api/media/${contentId}/comments?${query}`,
    `${baseURL}/api/content/${contentId}/comments?${query}`,
    `${baseURL}/api/interactions/${backendContentType}/${contentId}/comments?${query}`,
  ];
}

export async function addComment(
  ctx: ContentInteractionClient,
  contentId: string,
  comment: string,
  contentType: string = "media",
  parentCommentIdOrOptions?: string | import("./types").AddCommentOptions
): Promise<CommentData> {
  try {
    if (!ctx.isValidObjectId(contentId)) {
      throw new Error("Invalid content ID");
    }

    const options: import("./types").AddCommentOptions =
      typeof parentCommentIdOrOptions === "string" ||
      parentCommentIdOrOptions == null
        ? { parentCommentId: parentCommentIdOrOptions as string | undefined }
        : parentCommentIdOrOptions;

    const parentCommentId = options.parentCommentId;
    const mentions = (options.mentions || []).filter(
      (m) => m.displayName?.trim()
    );
    const localImage = options.localImage;
    const remoteImageUrl = options.imageUrl;

    const headers = await ctx.getAuthHeaders();
    const backendContentType = commentPathType(
      ctx.mapContentTypeToBackend(contentType)
    );
    const createUrl = `${ctx.baseURL}/api/content/${backendContentType}/${contentId}/comment`;
    const uploadUrl = `${ctx.baseURL}/api/content/comments/upload-image`;

    const parseCreated = async (response: Response): Promise<CommentData> => {
      if (!response.ok) {
        let errorMessage = "Failed to create comment";
        let errorBody: any = {};
        try {
          const errorText = await response.text();
          try {
            errorBody = JSON.parse(errorText);
            errorMessage =
              errorBody?.message || errorBody?.error || errorMessage;
          } catch {
            if (errorText) errorMessage = errorText.slice(0, 180);
          }
        } catch {
          // ignore
        }

        const error = new Error(errorMessage) as Error & {
          status: number;
          statusText: string;
          body?: any;
          code?: string;
        };
        error.status = response.status;
        error.statusText = response.statusText;
        error.body = errorBody;
        if (
          localImage &&
          (response.status === 404 || response.status === 405)
        ) {
          error.code = "COMMENT_IMAGE_UNSUPPORTED";
          error.message =
            "Photos need a server update. You can still send text comments.";
        }
        throw error;
      }

      const raw = await response.json();
      const data = raw?.data || raw;
      return transformComment(
        {
          ...data,
          content: data?.content || data?.comment || comment,
          imageUrl:
            data?.imageUrl ||
            data?.image ||
            data?.mediaUrl ||
            remoteImageUrl,
          mentions: data?.mentions || mentions,
        },
        contentId
      );
    };

    // --- Path A: local image → try multipart create, then upload+JSON ---
    if (localImage?.uri) {
      const { buildCommentImageFormData } = await import(
        "../../components/comments/commentImage"
      );
      const form = buildCommentImageFormData({
        content: comment,
        parentCommentId,
        mentions,
        image: localImage,
      });

      // Strip Content-Type so boundary is set automatically
      const multipartHeaders: Record<string, string> = {
        ...(headers as Record<string, string>),
      };
      delete multipartHeaders["Content-Type"];
      delete multipartHeaders["content-type"];

      let response = await fetch(createUrl, {
        method: "POST",
        headers: multipartHeaders,
        body: form,
      });

      if (response.status === 404 || response.status === 405) {
        // Fallback: dedicated upload endpoint then JSON create
        const uploadForm = new FormData();
        uploadForm.append("image", {
          uri: localImage.uri,
          type: localImage.type || "image/jpeg",
          name: localImage.name || "comment.jpg",
        } as any);
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: multipartHeaders,
          body: uploadForm,
        });
        if (uploadRes.status === 404 || uploadRes.status === 405) {
          const err = new Error(
            "Photos need a server update. You can still send text comments."
          ) as Error & { code: string; status: number };
          err.code = "COMMENT_IMAGE_UNSUPPORTED";
          err.status = uploadRes.status;
          throw err;
        }
        if (!uploadRes.ok) {
          response = uploadRes;
        } else {
          const uploadJson = await uploadRes.json().catch(() => ({}));
          const url =
            uploadJson?.data?.url ||
            uploadJson?.data?.imageUrl ||
            uploadJson?.url ||
            uploadJson?.imageUrl;
          if (!url) {
            const err = new Error(
              "Photos need a server update. You can still send text comments."
            ) as Error & { code: string; status: number };
            err.code = "COMMENT_IMAGE_UNSUPPORTED";
            err.status = 404;
            throw err;
          }
          response = await fetch(createUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              content: comment,
              parentCommentId: parentCommentId || null,
              mentions: mentions.length ? mentions : undefined,
              imageUrl: url,
            }),
          });
        }
      }

      const transformed = await parseCreated(response);
      const prev = peekCachedComments(contentId, "newest");
      putCachedComments(contentId, "newest", {
        comments: [transformed, ...(prev?.comments || [])],
        totalComments: (prev?.totalComments || 0) + 1,
        hasMore: prev?.hasMore ?? false,
      });
      return transformed;
    }

    // --- Path B: JSON text (+ optional mentions / remote imageUrl) ---
    const response = await fetch(createUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: comment,
        parentCommentId: parentCommentId || null,
        ...(mentions.length ? { mentions } : {}),
        ...(remoteImageUrl ? { imageUrl: remoteImageUrl } : {}),
      }),
    });

    const transformed = await parseCreated(response);

    const prev = peekCachedComments(contentId, "newest");
    putCachedComments(contentId, "newest", {
      comments: [transformed, ...(prev?.comments || [])],
      totalComments: (prev?.totalComments || 0) + 1,
      hasMore: prev?.hasMore ?? false,
    });

    return transformed;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
}

export async function getComments(
  ctx: ContentInteractionClient,
  contentId: string,
  contentType: string = "media",
  page: number = 1,
  limit: number = 20,
  sortBy: "newest" | "oldest" | "top" = "newest"
): Promise<{
  comments: CommentData[];
  totalComments: number;
  hasMore: boolean;
}> {
  try {
    if (!ctx.isValidObjectId(contentId)) {
      return { comments: [], totalComments: 0, hasMore: false };
    }

    // Instant path for reopen
    if (page === 1) {
      const cached = peekCachedComments(contentId, sortBy);
      if (cached && cached.comments.length > 0) {
        // Still refresh in background below — caller can use peek for UI first
      }
    }

    const headers = await buildHeaders({ bypassHttpCache: true });
    const backendContentType = commentPathType(
      ctx.mapContentTypeToBackend(contentType)
    );
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
    });
    const query = params.toString();
    const urls = commentListUrls(
      ctx.baseURL,
      backendContentType,
      contentId,
      query
    );

    let lastStatus = 0;
    let raw: any = null;
    let usedUrl = urls[0];

    for (const url of urls) {
      usedUrl = url;
      // cache: 'no-store' — RN may ignore; headers above are the real fix for 304
      const response = await fetch(url, { headers, cache: "no-store" });
      lastStatus = response.status;

      // 304 = Not Modified. Fetch `ok` is false and body is empty on RN → treat as miss, retry next / fail clear.
      if (response.status === 304) {
        if (__DEV__) {
          console.warn(
            `⚠️ Comments 304 (no body on device) — need fresh 200:`,
            url.replace(ctx.baseURL, "")
          );
        }
        continue;
      }

      if (response.ok) {
        raw = await response.json();
        break;
      }
      // Only fall through on missing route / wrong mount
      if (response.status !== 404 && response.status !== 405) {
        if (__DEV__) {
          console.warn(
            `⚠️ GET comments failed (${response.status})`,
            url.replace(ctx.baseURL, "")
          );
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      if (__DEV__) {
        console.warn(
          `⚠️ Comments 404, trying next path:`,
          url.replace(ctx.baseURL, "")
        );
      }
    }

    if (!raw) {
      if (__DEV__) {
        console.warn(
          `⚠️ All comment list paths failed (last ${lastStatus}) for ${contentId}`
        );
      }
      throw new Error(`HTTP error! status: ${lastStatus || 404}`);
    }

    const serverComments = extractCommentArray(raw);
    const total = extractTotal(raw, serverComments.length);
    // Prefer length vs limit — backends sometimes send hasMore:true with a short last page
    const hasMore =
      serverComments.length >= limit && page * limit < Math.max(total, 1);

    if (__DEV__) {
      console.log(
        `📥 Comments OK (${serverComments.length}/${total}) via`,
        usedUrl.replace(ctx.baseURL, "")
      );
    }

    if (
      __DEV__ &&
      page === 1 &&
      serverComments.length === 0 &&
      total > 0
    ) {
      console.warn(
        `⚠️ Comments API returned total=${total} but 0 items — check response shape`,
        {
          contentId,
          keys:
            raw?.data && typeof raw.data === "object"
              ? Object.keys(raw.data)
              : typeof raw,
        }
      );
    }

    const comments: CommentData[] = serverComments
      .map((c) => transformComment(c, contentId))
      .filter((c) => c.id && c.id !== "undefined");

    const result = { comments, totalComments: total, hasMore };
    if (page === 1) {
      putCachedComments(contentId, sortBy, result);
    }
    return result;
  } catch (error) {
    console.error("Error getting comments:", error);
    // Fall back to memory cache so sheet isn't blank after a flaky network blip
    const cached = peekCachedComments(contentId, sortBy);
    if (cached?.comments?.length) {
      return cached;
    }
    throw error instanceof Error
      ? error
      : new Error("Failed to load comments");
  }
}

export async function toggleCommentLike(
  ctx: ContentInteractionClient,
  commentId: string
): Promise<{ liked: boolean; totalLikes: number }> {
  try {
    if (!ctx.isValidObjectId(commentId)) {
      return { liked: false, totalLikes: 0 };
    }
    const headers = await ctx.getAuthHeaders();
    // Prefer current contract; fall back to legacy interactions path
    const urls = [
      `${ctx.baseURL}/api/content/comments/${commentId}/reaction`,
      `${ctx.baseURL}/api/interactions/comments/${commentId}/reaction`,
    ];

    let raw: any = null;
    let lastStatus = 0;
    for (const url of urls) {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ reactionType: "like" }),
      });
      lastStatus = response.status;
      if (response.ok) {
        raw = await response.json();
        break;
      }
      if (response.status !== 404 && response.status !== 405) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    if (!raw) {
      throw new Error(`HTTP error! status: ${lastStatus || 404}`);
    }

    const data = raw && raw.data ? raw.data : raw;
    return {
      liked: Boolean(data?.liked ?? false),
      totalLikes: Number(
        data?.likesCount ?? data?.totalLikes ?? data?.reactionsCount ?? 0
      ),
    };
  } catch (error) {
    console.error("Error toggling comment like:", error);
    return { liked: false, totalLikes: 0 };
  }
}

async function readCommentError(response: Response): Promise<never> {
  let body: any = {};
  try {
    body = await response.json();
  } catch {
    // ignore
  }
  const codeRaw = body?.code ?? body?.error?.code ?? body?.error;
  const code = typeof codeRaw === "string" ? codeRaw : undefined;
  const serverMsg =
    typeof body?.message === "string"
      ? body.message
      : typeof body?.error === "string"
        ? body.error
        : undefined;
  throw new CommentApiError(
    messageForCommentErrorCode(code, response.status, serverMsg),
    response.status,
    code
  );
}

export async function editComment(
  ctx: ContentInteractionClient,
  commentId: string,
  contentOrOptions: string | EditCommentOptions
): Promise<CommentData> {
  if (!ctx.isValidObjectId(commentId)) {
    throw new Error("Invalid comment ID");
  }

  const options: EditCommentOptions =
    typeof contentOrOptions === "string"
      ? { content: contentOrOptions }
      : contentOrOptions || {};

  const headers = await ctx.getAuthHeaders();
  const url = `${ctx.baseURL}/api/content/comments/${commentId}`;
  let response: Response;

  if (options.localImage?.uri) {
    const form = new FormData();
    if (options.content != null) {
      form.append("content", options.content);
    }
    if (options.clearImage) {
      form.append("clearImage", "true");
    }
    if (options.imageUrl) {
      form.append("imageUrl", options.imageUrl);
    }
    form.append("image", {
      uri: options.localImage.uri,
      type: options.localImage.type || "image/jpeg",
      name: options.localImage.name || "comment.jpg",
    } as any);

    const multipartHeaders: Record<string, string> = {
      ...(headers as Record<string, string>),
    };
    delete multipartHeaders["Content-Type"];
    delete multipartHeaders["content-type"];

    response = await fetch(url, {
      method: "PATCH",
      headers: multipartHeaders,
      body: form,
    });
  } else {
    const body: Record<string, unknown> = {};
    if (options.content != null) body.content = options.content;
    if (options.imageUrl) body.imageUrl = options.imageUrl;
    if (options.clearImage) body.clearImage = true;

    response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
  }

  if (!response.ok) {
    await readCommentError(response);
  }

  const raw = await response.json();
  const data = raw?.data || raw;
  return transformComment(data, String(data?.contentId || ""));
}

export async function deleteComment(
  ctx: ContentInteractionClient,
  commentId: string
): Promise<void> {
  if (!ctx.isValidObjectId(commentId)) {
    throw new Error("Invalid comment ID");
  }
  const headers = await ctx.getAuthHeaders();
  const urls = [
    `${ctx.baseURL}/api/content/comments/${commentId}`,
    `${ctx.baseURL}/api/interactions/comments/${commentId}`,
  ];

  let lastResponse: Response | null = null;
  for (const url of urls) {
    const response = await fetch(url, { method: "DELETE", headers });
    lastResponse = response;
    if (response.ok) return;
    if (response.status !== 404 && response.status !== 405) {
      await readCommentError(response);
    }
  }

  if (lastResponse) {
    await readCommentError(lastResponse);
  }
  throw new CommentApiError("Failed to delete comment", 500);
}

/** GET /api/users/search?q=&limit= — mention directory (optional enrichment). */
export async function searchUsersForMentions(
  ctx: ContentInteractionClient,
  q: string,
  limit: number = 10
): Promise<{ userId: string; displayName: string; avatar?: string }[]> {
  const query = String(q || "").trim();
  if (query.length < 2) return [];

  try {
    const headers = await ctx.getAuthHeaders();
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(20, Math.max(1, limit))),
    });
    const response = await fetch(
      `${ctx.baseURL}/api/users/search?${params.toString()}`,
      { headers }
    );
    if (!response.ok) return [];

    const raw = await response.json();
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.users)
          ? raw.users
          : Array.isArray(raw?.results)
            ? raw.results
            : [];

    return list
      .map((u: any) => {
        const first = u?.firstName || "";
        const last = u?.lastName || "";
        const full = `${String(first).trim()} ${String(last).trim()}`.trim();
        return {
          userId: String(u?._id || u?.id || u?.userId || ""),
          displayName: full || u?.username || u?.displayName || u?.name || "",
          avatar: u?.avatar || u?.avatarUrl || undefined,
        };
      })
      .filter(
        (u: { userId: string; displayName: string }) =>
          !!u.userId && !!u.displayName
      );
  } catch {
    return [];
  }
}
