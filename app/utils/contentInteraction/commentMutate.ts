import type { ContentInteractionClient } from "./client";
import {
  isMissingRoute,
  multipartHeaders,
  readCommentError,
} from "./commentHttp";
import { transformComment } from "./commentTransform";
import { CommentApiError } from "./errors";
import type { CommentData, EditCommentOptions } from "./types";

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
    if (options.content != null) form.append("content", options.content);
    if (options.clearImage) form.append("clearImage", "true");
    if (options.imageUrl) form.append("imageUrl", options.imageUrl);
    form.append("image", {
      uri: options.localImage.uri,
      type: options.localImage.type || "image/jpeg",
      name: options.localImage.name || "comment.jpg",
    } as any);

    response = await fetch(url, {
      method: "PATCH",
      headers: multipartHeaders(headers),
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
    if (!isMissingRoute(response.status)) {
      await readCommentError(response);
    }
  }

  if (lastResponse) {
    await readCommentError(lastResponse);
  }
  throw new CommentApiError("Failed to delete comment", 500);
}
