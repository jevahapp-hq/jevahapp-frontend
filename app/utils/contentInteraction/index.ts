export type {
  BatchMetadataItem,
  CommentData,
  ContentInteraction,
  ContentStats,
} from "./types";

export { createClient, type ContentInteractionClient } from "./client";
export {
  RateLimitError,
  isRateLimitError,
  parseRetryAfterMs,
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
