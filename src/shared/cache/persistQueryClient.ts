/**
 * Persist allowlisted React Query keys to MMKV.
 * Feed (`all-content`) is hydrated separately via hydrateFeedQueryCache.
 * Notifications stay RAM-only (they go stale in minutes).
 */
import {
  dehydrate,
  hydrate,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";
import { AppState } from "react-native";
import { getFeedDiskMaxMs } from "../config/feedCachePolicy";
import { mmkvGetJson, mmkvRemove, mmkvSetJson } from "./mmkvStorage";
import { RQ_PERSIST_DISK_KEY } from "./persistKeys";
import { getSessionCacheUserId } from "./sessionCacheScope";

/** Public/shared feed only — never persist account or profile blobs. */
const PERSIST_ROOTS = new Set<string>(["default-content"]);

function persistDiskKey(): string {
  return `${RQ_PERSIST_DISK_KEY}:${getSessionCacheUserId()}`;
}

let registeredClient: QueryClient | null = null;

export function registerPersistedQueryClient(queryClient: QueryClient): void {
  registeredClient = queryClient;
}

export function clearPersistedQueryCache(): void {
  registeredClient?.removeQueries({ queryKey: ["user-profile"] });
  registeredClient?.removeQueries({ queryKey: ["account-posts"] });
  registeredClient?.removeQueries({ queryKey: ["account-media"] });
  registeredClient?.removeQueries({ queryKey: ["account-videos"] });
  registeredClient?.removeQueries({ queryKey: ["account-analytics"] });
  mmkvRemove(persistDiskKey());
  mmkvRemove(RQ_PERSIST_DISK_KEY);
}

const MAX_BYTES = 512 * 1024;
const MAX_QUERIES = 16;
const PERSIST_DEBOUNCE_MS = 400;

type PersistedBlob = {
  dehydratedAt: number;
  state: unknown;
};

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let subscribed = false;
let appStateSub: { remove: () => void } | null = null;

function rootKey(query: Query): string {
  return String(query.queryKey?.[0] ?? "");
}

function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== "success") return false;
  if (query.state.data == null) return false;
  return PERSIST_ROOTS.has(rootKey(query));
}

function trimInfinitePages(data: unknown): unknown {
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { pages?: unknown }).pages)
  ) {
    const pages = (data as { pages: unknown[]; pageParams?: unknown[] }).pages;
    const pageParams = (data as { pageParams?: unknown[] }).pageParams;
    return {
      ...(data as object),
      pages: pages.slice(0, 1),
      pageParams: Array.isArray(pageParams) ? pageParams.slice(0, 1) : pageParams,
    };
  }
  return data;
}

function persistNow(queryClient: QueryClient): void {
  try {
    const state = dehydrate(queryClient, {
      shouldDehydrateMutation: () => false,
      shouldDehydrateQuery: shouldPersistQuery,
      serializeData: trimInfinitePages,
    });
    const queries = Array.isArray(state.queries)
      ? state.queries.slice(0, MAX_QUERIES)
      : [];
    const slim = { mutations: [], queries };
    const raw = JSON.stringify(slim);
    if (raw.length > MAX_BYTES) {
      // Drop from the end until it fits; keep profile + default-content first.
      while (slim.queries.length > 1 && JSON.stringify(slim).length > MAX_BYTES) {
        slim.queries.pop();
      }
      if (JSON.stringify(slim).length > MAX_BYTES) return;
    }
    mmkvSetJson(persistDiskKey(), {
      dehydratedAt: Date.now(),
      state: slim,
    } satisfies PersistedBlob);
  } catch {
    // ignore quota / serialize errors
  }
}

function schedulePersist(queryClient: QueryClient): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistNow(queryClient);
  }, PERSIST_DEBOUNCE_MS);
}

export function hydratePersistedQueryCache(queryClient: QueryClient): void {
  const blob = mmkvGetJson<PersistedBlob>(persistDiskKey());
  mmkvRemove(RQ_PERSIST_DISK_KEY);
  if (!blob?.state || typeof blob.dehydratedAt !== "number") return;
  if (Date.now() - blob.dehydratedAt > getFeedDiskMaxMs()) return;
  try {
    hydrate(queryClient, blob.state);
  } catch {
    // ignore corrupt blob
  }
}

/** Background revalidate after disk paint. Feed is prefetched separately. */
export function swrPersistedQueryCache(
  queryClient: QueryClient,
  hasSession: boolean
): void {
  void queryClient
    .refetchQueries({ queryKey: ["default-content"] })
    .catch(() => {});
  if (!hasSession) return;
  void queryClient
    .refetchQueries({ queryKey: ["user-profile"] })
    .catch(() => {});
}

export function subscribePersistedQueryCache(queryClient: QueryClient): void {
  if (subscribed) return;
  subscribed = true;
  queryClient.getQueryCache().subscribe((event) => {
    if (
      event.type === "added" ||
      event.type === "removed" ||
      event.type === "updated"
    ) {
      schedulePersist(queryClient);
    }
  });
  appStateSub = AppState.addEventListener("change", (next) => {
    if (next === "background" || next === "inactive") {
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      persistNow(queryClient);
    }
  });
}

export function unsubscribePersistedQueryCache(): void {
  appStateSub?.remove();
  appStateSub = null;
  subscribed = false;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}
