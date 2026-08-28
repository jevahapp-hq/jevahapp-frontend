import type { ContentInteractionClient } from "./client";
import { peekCachedComments, putCachedComments } from "./commentCache";
import { isMissingRoute, multipartHeaders } from "./commentHttp";
import { commentPathType, transformComment } from "./commentTransform";
import type { AddCommentOptions, CommentData } from "./types";

const IMAGE_UNSUPPORTED_MESSAGE =
  "Photos need a server update. You can still send text comments.";

function imageUnsupportedError(status: number) {
  const err = new Error(IMAGE_UNSUPPORTED_MESSAGE) as Error & {
    code: string;
    status: number;
  };
  err.code = "COMMENT_IMAGE_UNSUPPORTED";
  err.status = status;
  return err;
}

function prependToCache(contentId: string, comment: CommentData): void {
  const prev = peekCachedComments(contentId, "newest");
  putCachedComments(contentId, "newest", {
    comments: [comment, ...(prev?.comments || [])],
    totalComments: (prev?.totalComments || 0) + 1,
    hasMore: prev?.hasMore ?? false,
  });
}

export async function addComment(
  ctx: ContentInteractionClient,
  contentId: string,
  comment: string,
  contentType: string = "media",
  parentCommentIdOrOptions?: string | AddCommentOptions
): Promise<CommentData> {
  try {
    if (!ctx.isValidObjectId(contentId)) {
      throw new Error("Invalid content ID");
    }

    const options: AddCommentOptions =
      typeof parentCommentIdOrOptions === "string" ||
      parentCommentIdOrOptions == null
        ? { parentCommentId: parentCommentIdOrOptions as string | undefined }
        : parentCommentIdOrOptions;

    const parentCommentId = options.parentCommentId;
    const mentions = (options.mentions || []).filter((m) =>
      m.displayName?.trim()
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
        if (localImage && isMissingRoute(response.status)) {
          error.code = "COMMENT_IMAGE_UNSUPPORTED";
          error.message = IMAGE_UNSUPPORTED_MESSAGE;
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
            data?.imageUrl || data?.image || data?.mediaUrl || remoteImageUrl,
          mentions: data?.mentions || mentions,
        },
        contentId
      );
    };

    const jsonCreate = (imageUrl?: string) =>
      fetch(createUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: comment,
          parentCommentId: parentCommentId || null,
          ...(mentions.length ? { mentions } : {}),
          ...(imageUrl ? { imageUrl } : {}),
        }),
      });

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
      const formHeaders = multipartHeaders(headers);

      let response = await fetch(createUrl, {
        method: "POST",
        headers: formHeaders,
        body: form,
      });

      if (isMissingRoute(response.status)) {
        // Fallback: dedicated upload endpoint then JSON create
        const uploadForm = new FormData();
        uploadForm.append("image", {
          uri: localImage.uri,
          type: localImage.type || "image/jpeg",
          name: localImage.name || "comment.jpg",
        } as any);
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: formHeaders,
          body: uploadForm,
        });

        if (isMissingRoute(uploadRes.status)) {
          throw imageUnsupportedError(uploadRes.status);
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
          if (!url) throw imageUnsupportedError(404);
          response = await jsonCreate(url);
        }
      }

      const transformed = await parseCreated(response);
      prependToCache(contentId, transformed);
      return transformed;
    }

    // --- Path B: JSON text (+ optional mentions / remote imageUrl) ---
    const transformed = await parseCreated(await jsonCreate(remoteImageUrl));
    prependToCache(contentId, transformed);
    return transformed;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
}
