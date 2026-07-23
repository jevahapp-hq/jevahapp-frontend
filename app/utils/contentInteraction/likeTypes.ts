export type ToggleLikeRequestOptions = {
  /** UUID for this gesture — required for durable / offline-safe writes */
  idempotencyKey?: string;
  /** Liked state after optimistic UI (used for offline queue + local-only ids) */
  expectedLiked?: boolean;
  /** Count after optimistic UI */
  expectedTotalLikes?: number;
  /** Liked state before this gesture (server-known / last synced) */
  baselineLiked?: boolean;
};

export type ToggleLikeResponse = {
  liked: boolean;
  totalLikes: number;
  /** True when the durable POST is waiting for connectivity */
  offlineQueued?: boolean;
  /** True when a pending offline toggle was cancelled (net-zero taps) */
  offlineCancelled?: boolean;
};
