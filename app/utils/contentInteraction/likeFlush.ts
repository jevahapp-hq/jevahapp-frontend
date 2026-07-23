/**
 * Flush durable offline like mutations when connectivity returns.
 * Reuses each gesture's Idempotency-Key so retries never double-unlike.
 */
import type { ContentInteractionClient } from "./client";
import { isNetworkOnline } from "./connectivity";
import { createClient } from "./client";
import {
  bumpQueuedLikeAttempt,
  getQueuedLikeMutations,
  removeQueuedLike,
  type QueuedLikeMutation,
} from "./likeQueue";
import { persistContentInteraction } from "../contentInteractionPersist";
import { devLog, devWarn } from "./logging";
import { isRateLimitError } from "./errors";

type FlushResult = {
  flushed: number;
  failed: number;
  remaining: number;
};

let flushing = false;
let flushListeners = new Set<(result: FlushResult) => void>();

export function onLikeQueueFlushed(listener: (result: FlushResult) => void) {
  flushListeners.add(listener);
  return () => {
    flushListeners.delete(listener);
  };
}

async function postLikeOnce(
  ctx: ContentInteractionClient,
  item: QueuedLikeMutation
): Promise<{ liked: boolean; totalLikes: number }> {
  const backendContentType = ctx.mapContentTypeToBackend(item.contentType);
  const headers = await ctx.getAuthHeaders();
  const response = await fetch(
    `${ctx.baseURL}/api/content/${backendContentType}/${item.contentId}/like`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Idempotency-Key": item.idempotencyKey,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(text || `HTTP ${response.status}`) as Error & {
      status?: number;
    };
    err.status = response.status;
    throw err;
  }

  const result = await response.json();
  return {
    liked: Boolean(result.data?.liked),
    totalLikes: Number(result.data?.likeCount) || 0,
  };
}

/**
 * Attempt to flush the entire queue. Safe to call often — mutexed.
 */
export async function flushLikeMutationQueue(
  ctx: ContentInteractionClient = createClient()
): Promise<FlushResult> {
  if (flushing) {
    const remaining = (await getQueuedLikeMutations()).length;
    return { flushed: 0, failed: 0, remaining };
  }

  const online = await isNetworkOnline(true);
  if (!online) {
    const remaining = (await getQueuedLikeMutations()).length;
    return { flushed: 0, failed: 0, remaining };
  }

  flushing = true;
  let flushed = 0;
  let failed = 0;

  try {
    const queue = await getQueuedLikeMutations();
    for (const item of queue) {
      try {
        await bumpQueuedLikeAttempt(item.contentId);
        const result = await postLikeOnce(ctx, item);
        await removeQueuedLike(item.contentId);
        void persistContentInteraction(item.contentId, {
          liked: result.liked,
          likes: result.totalLikes,
        });
        flushed += 1;
        devLog(
          `✅ Flushed offline like ${item.contentId} → liked=${result.liked}`
        );
      } catch (error) {
        failed += 1;
        const status = (error as any)?.status;
        if (status === 401) {
          // Don't burn the queue while logged out — stop flush.
          devWarn("Offline like flush stopped: auth required");
          break;
        }
        if (status === 404 || status === 400) {
          await removeQueuedLike(item.contentId);
          continue;
        }
        if (isRateLimitError(error) || status === 429) {
          // Back off; leave item for later.
          break;
        }
        // Network blip — stop and retry later with same keys.
        break;
      }
    }
  } finally {
    flushing = false;
  }

  const remaining = (await getQueuedLikeMutations()).length;
  const result = { flushed, failed, remaining };
  flushListeners.forEach((listener) => {
    try {
      listener(result);
    } catch {
      // ignore listener errors
    }
  });
  return result;
}
