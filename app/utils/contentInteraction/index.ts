export type {
  BatchMetadataItem,
  CommentData,
  AddCommentOptions,
  EditCommentOptions,
  ContentInteraction,
  ContentStats,
} from "./types";

export { createClient, type ContentInteractionClient } from "./client";
export {
  RateLimitError,
  isRateLimitError,
  parseRetryAfterMs,
  CommentApiError,
  isCommentApiError,
  messageForCommentErrorCode,
} from "./errors";
export { createGestureIdempotencyKey } from "./idempotency";
export { flushLikeMutationQueue, onLikeQueueFlushed } from "./likeFlush";
export { applyLiveEngagementCounts } from "./socketCounts";
export type {
  ToggleLikeRequestOptions,
  ToggleLikeResponse,
} from "./likeTypes";
export { useLikeQueueBootstrap } from "./useLikeQueueBootstrap";
export { ContentInteractionService, contentInteractionAPI } from "./service";
export { contentInteractionAPI as default } from "./service";
export {
  peekCachedComments,
  putCachedComments,
  hydrateCommentsCacheFromDisk,
  peekDiskComments,
  writeDiskCommentsCache,
  invalidateDiskCommentsCache,
  diskCommentsCacheKey,
} from "./comments";
export {
  VIEW_QUALIFICATION,
  qualifiesPlaybackView,
  qualifiesEbookView,
  viewContentTypeForItem,
} from "./viewQualification";
