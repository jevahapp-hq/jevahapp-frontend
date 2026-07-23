import { createClient, type ContentInteractionClient } from "./client";
import * as likes from "./like";
import * as saves from "./save";
import * as metadata from "./metadata";
import * as share from "./share";
import * as view from "./view";
import * as comments from "./comments";
import * as stats from "./stats";
import * as savedContent from "./savedContent";
import * as analytics from "./analytics";
import type { BatchMetadataItem } from "./types";
import type { CommentData, ContentInteraction, ContentStats } from "./types";

/**
 * Public API surface matching the original ContentInteractionService.
 * Domain modules are functional; this thin class binds methods to a shared client.
 */
export class ContentInteractionService {
  private readonly ctx: ContentInteractionClient;

  constructor(ctx: ContentInteractionClient = createClient()) {
    this.ctx = ctx;
  }

  // ============= LIKE INTERACTIONS =============
  toggleLike(
    contentId: string,
    contentType: string,
    options?: import("./likeTypes").ToggleLikeRequestOptions
  ): Promise<import("./likeTypes").ToggleLikeResponse> {
    return likes.toggleLike(this.ctx, contentId, contentType, options);
  }

  // ============= SAVE INTERACTIONS =============
  toggleSave(
    contentId: string,
    contentType: string
  ): Promise<{ saved: boolean; totalSaves: number }> {
    return saves.toggleSave(this.ctx, contentId, contentType);
  }

  getContentSaveState(
    contentId: string
  ): Promise<{ saved: boolean; totalSaves: number }> {
    return saves.getContentSaveState(this.ctx, contentId);
  }

  // ============= CONTENT METADATA =============
  getBatchMetadata(
    items: BatchMetadataItem[]
  ): Promise<Record<string, ContentStats>> {
    return metadata.getBatchMetadata(this.ctx, items);
  }

  getContentMetadata(
    contentId: string,
    contentType: string
  ): Promise<ContentStats> {
    return metadata.getContentMetadata(this.ctx, contentId, contentType);
  }

  // ============= SHARE INTERACTIONS =============
  recordShare(
    contentId: string,
    contentType: string,
    shareMethod: string = "generic",
    message?: string
  ): Promise<{ totalShares: number; shared?: boolean }> {
    return share.recordShare(
      this.ctx,
      contentId,
      contentType,
      shareMethod,
      message
    );
  }

  // ============= VIEW INTERACTIONS =============
  recordView(
    contentId: string,
    contentType: string,
    payload?: {
      durationMs?: number;
      progressPct?: number;
      isComplete?: boolean;
      source?: string;
    }
  ): Promise<{
    totalViews: number;
    hasViewed?: boolean;
    counted?: boolean;
  }> {
    return view.recordView(this.ctx, contentId, contentType, payload);
  }

  // ============= COMMENT INTERACTIONS =============
  addComment(
    contentId: string,
    comment: string,
    contentType: string = "media",
    parentCommentId?: string
  ): Promise<CommentData> {
    return comments.addComment(
      this.ctx,
      contentId,
      comment,
      contentType,
      parentCommentId
    );
  }

  getComments(
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
    return comments.getComments(
      this.ctx,
      contentId,
      contentType,
      page,
      limit,
      sortBy
    );
  }

  toggleCommentLike(
    commentId: string
  ): Promise<{ liked: boolean; totalLikes: number }> {
    return comments.toggleCommentLike(this.ctx, commentId);
  }

  editComment(commentId: string, content: string): Promise<CommentData> {
    return comments.editComment(this.ctx, commentId, content);
  }

  deleteComment(commentId: string): Promise<void> {
    return comments.deleteComment(this.ctx, commentId);
  }

  // ============= GET CONTENT STATS =============
  getContentStats(contentId: string): Promise<ContentStats> {
    return stats.getContentStats(this.ctx, contentId);
  }

  // ============= BATCH OPERATIONS =============
  getBatchContentStats(
    contentIds: string[]
  ): Promise<Record<string, ContentStats>> {
    return stats.getBatchContentStats(this.ctx, contentIds);
  }

  // ============= USER'S SAVED CONTENT =============
  getUserSavedContent(
    contentType?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    content: any[];
    totalCount: number;
    hasMore: boolean;
  }> {
    return savedContent.getUserSavedContent(
      this.ctx,
      contentType,
      page,
      limit
    );
  }

  // ============= ANALYTICS =============
  getUserInteractionHistory(
    page: number = 1,
    limit: number = 50,
    interactionType?: string
  ): Promise<{
    interactions: ContentInteraction[];
    totalCount: number;
    hasMore: boolean;
  }> {
    return analytics.getUserInteractionHistory(
      this.ctx,
      page,
      limit,
      interactionType
    );
  }
}

export const contentInteractionAPI = new ContentInteractionService();
export default contentInteractionAPI;
