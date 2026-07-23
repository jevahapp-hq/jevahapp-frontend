/**
 * Durable offline like queue.
 *
 * Toggle APIs can only flip once per request, so we keep at most one
 * pending gesture per contentId and cancel pairs (like→unlike while offline).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type QueuedLikeMutation = {
  contentId: string;
  contentType: string;
  /** Idempotency-Key — reused on every flush attempt for this gesture */
  idempotencyKey: string;
  /** Server-known liked before this pending toggle */
  baselineLiked: boolean;
  /** UI target after optimistic update */
  targetLiked: boolean;
  targetTotalLikes: number;
  enqueuedAt: number;
  attempts: number;
};

const QUEUE_KEY = "jevah_like_mutation_queue_v1";
const MAX_QUEUE = 120;

let memoryQueue: QueuedLikeMutation[] | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function readQueue(): Promise<QueuedLikeMutation[]> {
  if (memoryQueue) return memoryQueue;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    memoryQueue = Array.isArray(parsed) ? parsed : [];
  } catch {
    memoryQueue = [];
  }
  return memoryQueue;
}

function persist(queue: QueuedLikeMutation[]): void {
  memoryQueue = queue.slice(-MAX_QUEUE);
  writeChain = writeChain.then(async () => {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(memoryQueue));
    } catch {
      // Disk full / private mode — RAM queue still works this session.
    }
  });
}

export async function getQueuedLikeMutations(): Promise<QueuedLikeMutation[]> {
  return [...(await readQueue())];
}

export async function peekQueuedLike(
  contentId: string
): Promise<QueuedLikeMutation | undefined> {
  const queue = await readQueue();
  return queue.find((item) => item.contentId === contentId);
}

/**
 * Enqueue or cancel a like gesture while offline.
 * Returns whether a durable POST is still pending.
 */
export async function enqueueOrCancelLikeMutation(input: {
  contentId: string;
  contentType: string;
  idempotencyKey: string;
  baselineLiked: boolean;
  targetLiked: boolean;
  targetTotalLikes: number;
}): Promise<{ pending: boolean; cancelled: boolean }> {
  const queue = [...(await readQueue())];
  const index = queue.findIndex((item) => item.contentId === input.contentId);

  if (index >= 0) {
    const existing = queue[index];
    // Second offline tap returns to baseline → drop the pending toggle.
    if (input.targetLiked === existing.baselineLiked) {
      queue.splice(index, 1);
      persist(queue);
      return { pending: false, cancelled: true };
    }

    // Replace with latest target; new key because the desired outcome changed.
    queue[index] = {
      ...existing,
      contentType: input.contentType,
      idempotencyKey: input.idempotencyKey,
      targetLiked: input.targetLiked,
      targetTotalLikes: input.targetTotalLikes,
      enqueuedAt: Date.now(),
      attempts: 0,
    };
    persist(queue);
    return { pending: true, cancelled: false };
  }

  if (input.targetLiked === input.baselineLiked) {
    return { pending: false, cancelled: true };
  }

  queue.push({
    contentId: input.contentId,
    contentType: input.contentType,
    idempotencyKey: input.idempotencyKey,
    baselineLiked: input.baselineLiked,
    targetLiked: input.targetLiked,
    targetTotalLikes: input.targetTotalLikes,
    enqueuedAt: Date.now(),
    attempts: 0,
  });
  persist(queue);
  return { pending: true, cancelled: false };
}

export async function removeQueuedLike(contentId: string): Promise<void> {
  const queue = await readQueue();
  const next = queue.filter((item) => item.contentId !== contentId);
  if (next.length !== queue.length) persist(next);
}

export async function bumpQueuedLikeAttempt(
  contentId: string
): Promise<QueuedLikeMutation | undefined> {
  const queue = [...(await readQueue())];
  const index = queue.findIndex((item) => item.contentId === contentId);
  if (index < 0) return undefined;
  queue[index] = {
    ...queue[index],
    attempts: (queue[index].attempts || 0) + 1,
  };
  persist(queue);
  return queue[index];
}

export async function clearLikeQueue(): Promise<void> {
  persist([]);
  await writeChain;
}
