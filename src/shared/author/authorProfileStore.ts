import { useSyncExternalStore } from "react";
import { isLiteProfileActive } from "../lite/liteProfile";
import type { AuthorId, AuthorProfile } from "./types";
import { fetchAuthorProfile } from "./authorProfileApi";
import {
  readAuthorProfilesFromDisk,
  schedulePersistAuthorProfiles,
} from "./authorDiskCache";
import { hasUsableAuthorName, normalizeAuthorProfile } from "./normalizeAuthor";

/**
 * In-memory author profile store (single responsibility).
 * Disk-backed so cold start paints real names (TikTok/IG identity cache).
 * Never treats a nameless entry as a successful cache hit for name resolution.
 */
const profiles = new Map<AuthorId, AuthorProfile>();
const inFlight = new Map<AuthorId, Promise<AuthorProfile | null>>();
/** Cooldown — never a permanent blacklist (token/404 can recover). */
const failedUntil = new Map<AuthorId, number>();
const FAIL_COOLDOWN_MS = 12_000;
const MAX_IN_MEMORY = 80;

let storeVersion = 0;
const storeListeners = new Set<() => void>();
let bumpTimer: ReturnType<typeof setTimeout> | null = null;

function bumpStore(): void {
  if (bumpTimer) return;
  bumpTimer = setTimeout(() => {
    bumpTimer = null;
    storeVersion += 1;
    storeListeners.forEach((fn) => {
      try {
        fn();
      } catch {
        // no-op
      }
    });
  }, 16);
}

function trimProfiles(): void {
  while (profiles.size > MAX_IN_MEMORY) {
    const oldest = profiles.keys().next().value;
    if (!oldest) break;
    profiles.delete(oldest);
  }
}

export function getAuthorStoreVersion(): number {
  return storeVersion;
}

export function subscribeAuthorStore(onStoreChange: () => void): () => void {
  storeListeners.add(onStoreChange);
  return () => {
    storeListeners.delete(onStoreChange);
  };
}

/** Re-render feed chrome when a cached name lands (no React Query patch needed). */
export function useAuthorStoreVersion(): number {
  return useSyncExternalStore(
    subscribeAuthorStore,
    getAuthorStoreVersion,
    getAuthorStoreVersion
  );
}

/** Sync disk → RAM. Call before first feed paint. */
export function hydrateAuthorProfilesSync(): void {
  const rows = readAuthorProfilesFromDisk();
  if (!rows.length) return;
  for (const row of rows) {
    profiles.set(row.id, row);
  }
  bumpStore();
}

export function getAuthorProfile(userId: AuthorId): AuthorProfile | null {
  if (!userId) return null;
  return profiles.get(userId) || null;
}

export function putAuthorProfile(
  userId: AuthorId,
  raw: Record<string, any> | AuthorProfile
): AuthorProfile | null {
  const profile = normalizeAuthorProfile(raw as any, userId);
  if (!profile) return null;
  const prev = profiles.get(userId);

  // Never replace a usable list-payload name with a nameless /users/:id result.
  if (!hasUsableAuthorName(profile)) {
    if (prev && hasUsableAuthorName(prev)) {
      if (profile.avatar && profile.avatar !== prev.avatar) {
        const merged = { ...prev, avatar: profile.avatar };
        profiles.set(userId, merged);
        schedulePersistAuthorProfiles(profiles);
        bumpStore();
        return merged;
      }
      return prev;
    }
    return prev || null;
  }

  profiles.delete(userId);
  profiles.set(userId, profile);
  trimProfiles();
  failedUntil.delete(userId);
  const nameChanged = prev?.fullName !== profile.fullName;
  const avatarChanged = prev?.avatar !== profile.avatar;
  if (nameChanged || avatarChanged || !prev) {
    schedulePersistAuthorProfiles(profiles);
    bumpStore();
  }
  return profile;
}

export function markAuthorFetchFailed(userId: AuthorId): void {
  if (userId) failedUntil.set(userId, Date.now() + FAIL_COOLDOWN_MS);
}

export function wasAuthorFetchFailed(userId: AuthorId): boolean {
  const until = failedUntil.get(userId);
  if (until == null) return false;
  if (Date.now() >= until) {
    failedUntil.delete(userId);
    return false;
  }
  return true;
}

/**
 * Fetch if missing usable name. Does NOT early-return nameless cache entries.
 */
export async function ensureAuthorProfile(
  userId: AuthorId
): Promise<AuthorProfile | null> {
  if (!userId) return null;

  const cached = profiles.get(userId);
  if (cached && hasUsableAuthorName(cached)) return cached;
  if (wasAuthorFetchFailed(userId)) return cached || null;

  const pending = inFlight.get(userId);
  if (pending) return pending;

  const job = (async () => {
    try {
      const fetched = await fetchAuthorProfile(userId);
      if (fetched && hasUsableAuthorName(fetched)) {
        putAuthorProfile(userId, fetched);
        return fetched;
      }
      if (!hasUsableAuthorName(profiles.get(userId))) {
        markAuthorFetchFailed(userId);
      }
      return profiles.get(userId) || null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "");
      // Token not ready / 401 mid-refresh — do NOT cooldown; enrichment retries.
      if (msg !== "AUTHOR_PROFILE_NO_TOKEN" && msg !== "AUTHOR_PROFILE_RETRY") {
        markAuthorFetchFailed(userId);
      }
      return profiles.get(userId) || null;
    } finally {
      inFlight.delete(userId);
    }
  })();

  inFlight.set(userId, job);
  return job;
}

export async function ensureAuthorProfiles(
  userIds: AuthorId[]
): Promise<void> {
  const unique = Array.from(
    new Set(userIds.map((id) => String(id || "").trim()).filter(Boolean))
  );
  const lite = isLiteProfileActive();
  const capped = lite ? unique.slice(0, 8) : unique;
  const concurrency = lite ? 2 : 3;
  let cursor = 0;
  const worker = async () => {
    while (cursor < capped.length) {
      const id = capped[cursor];
      cursor += 1;
      await ensureAuthorProfile(id);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, capped.length) }, () => worker())
  );
}

/** Clear hard-fail marks so enrichment can retry (e.g. after login). */
export function clearAuthorFetchFailures(userIds?: AuthorId[]): void {
  if (!userIds?.length) {
    failedUntil.clear();
    return;
  }
  for (const id of userIds) {
    if (id) failedUntil.delete(id);
  }
}

/** Bridge: seed from legacy UserProfileCache / login session. */
export function seedAuthorFromSession(user: Record<string, any> | null | undefined): void {
  if (!user) return;
  const id = String(user._id || user.id || "").trim();
  if (!id) return;
  putAuthorProfile(id, user);
}
