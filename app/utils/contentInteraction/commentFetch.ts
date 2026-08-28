import type { ContentInteractionClient } from "./client";
import { peekCachedComments, putCachedComments } from "./commentCache";
import { buildHeaders, commentListUrls, isMissingRoute } from "./commentHttp";
import {
  commentPathType,
  extractCommentArray,
  extractTotal,
  transformComment,
} from "./commentTransform";
import type { CommentData } from "./types";

type CommentPage = {
  comments: CommentData[];
  totalComments: number;
  hasMore: boolean;
};

const EMPTY_PAGE: CommentPage = {
  comments: [],
  totalComments: 0,
  hasMore: false,
};

function parseMaybeJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : text;
  } catch {
    return text;
  }
}

export async function getComments(
  ctx: ContentInteractionClient,
  contentId: string,
  contentType: string = "media",
  page: number = 1,
  limit: number = 20,
  sortBy: "newest" | "oldest" | "top" = "newest"
): Promise<CommentPage> {
  try {
    if (!ctx.isValidObjectId(contentId)) return EMPTY_PAGE;

    const headers = await buildHeaders({ bypassHttpCache: true });
    const backendContentType = commentPathType(
      ctx.mapContentTypeToBackend(contentType)
    );
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
    }).toString();
    const urls = commentListUrls(
      ctx.baseURL,
      backendContentType,
      contentId,
      query
    );
    const shortPath = (url: string) => url.replace(ctx.baseURL, "");

    let lastStatus = 0;
    let raw: any = null;
    let usedUrl = urls[0];

    for (const url of urls) {
      usedUrl = url;
      // cache: 'no-store' — RN may ignore; headers above are the real fix for 304
      const response = await fetch(url, { headers, cache: "no-store" });
      lastStatus = response.status;

      // 304 = Not Modified. Fetch `ok` is false and body is empty on RN → treat
      // as a miss, retry the next path / fail clearly.
      if (response.status === 304) {
        if (__DEV__) {
          console.warn(
            `⚠️ Comments 304 (no body on device) — need fresh 200:`,
            shortPath(url)
          );
        }
        continue;
      }

      if (response.ok) {
        raw = await response.json();
        break;
      }

      // Only fall through on missing route / wrong mount
      if (!isMissingRoute(response.status)) {
        if (response.status === 401 || response.status === 402) {
          const errText = await response.text().catch(() => "");
          const { isTransientBackendAuthError, authFailureTextFromBody } =
            await import("../sessionExpired");
          const combined = authFailureTextFromBody(parseMaybeJson(errText));
          // Soft-fail: keep the sheet usable with cache / empty rather than
          // throwing red ERROR stacks at the user.
          if (__DEV__) {
            console.warn(
              `⚠️ GET comments failed (${response.status})`,
              shortPath(url),
              isTransientBackendAuthError(combined)
                ? "(backend not ready — soft fail)"
                : "(auth — soft fail)"
            );
          }
          const cached =
            page === 1 ? peekCachedComments(contentId, sortBy) : null;
          if (cached && cached.comments.length > 0) {
            return {
              comments: cached.comments,
              totalComments: cached.totalComments,
              hasMore: cached.hasMore,
            };
          }
          return EMPTY_PAGE;
        }
        if (__DEV__) {
          console.warn(
            `⚠️ GET comments failed (${response.status})`,
            shortPath(url)
          );
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (__DEV__) {
        console.warn(`⚠️ Comments 404, trying next path:`, shortPath(url));
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
        shortPath(usedUrl)
      );
      if (page === 1 && serverComments.length === 0 && total > 0) {
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
    // Fall back to memory cache so the sheet isn't blank after a network blip
    const cached = peekCachedComments(contentId, sortBy);
    if (cached?.comments?.length) return cached;
    throw error instanceof Error
      ? error
      : new Error("Failed to load comments");
  }
}
