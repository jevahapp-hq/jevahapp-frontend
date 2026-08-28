/**
 * Store-safe public API. Do not re-export socketCounts or useLikeQueueBootstrap
 * from this file — those import the interaction store and would cycle:
 * store → API → store.
 */
export type {
  AddCommentOptions,
  BatchMetadataItem,
  CommentData,
  ContentInteraction,
  ContentStats,
  EditCommentOptions,
} from "./contentInteraction/types";
export {
  createClient,
  type ContentInteractionClient,
} from "./contentInteraction/client";
export {
  CommentApiError,
  RateLimitError,
  isCommentApiError,
  isRateLimitError,
  messageForCommentErrorCode,
  parseRetryAfterMs,
} from "./contentInteraction/errors";
export { createGestureIdempotencyKey } from "./contentInteraction/idempotency";
export {
  flushLikeMutationQueue,
  onLikeQueueFlushed,
} from "./contentInteraction/likeFlush";
export type {
  ToggleLikeRequestOptions,
  ToggleLikeResponse,
} from "./contentInteraction/likeTypes";
export {
  ContentInteractionService,
  contentInteractionAPI,
} from "./contentInteraction/service";
export { contentInteractionAPI as default } from "./contentInteraction/service";
export {
  diskCommentsCacheKey,
  hydrateCommentsCacheFromDisk,
  invalidateDiskCommentsCache,
  peekCachedComments,
  peekDiskComments,
  putCachedComments,
  writeDiskCommentsCache,
} from "./contentInteraction/comments";
export {
  VIEW_QUALIFICATION,
  qualifiesEbookView,
  qualifiesPlaybackView,
  viewContentTypeForItem,
} from "./contentInteraction/viewQualification";
