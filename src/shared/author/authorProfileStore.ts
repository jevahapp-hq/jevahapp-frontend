import type { AuthorId, AuthorProfile } from "./types";
import { fetchAuthorProfile } from "./authorProfileApi";
import { hasUsableAuthorName, normalizeAuthorProfile } from "./normalizeAuthor";

/**
 * In-memory author profile store (single responsibility).
 * Never treats a nameless entry as a successful cache hit for name resolution.
 */
const profiles = new Map<AuthorId, AuthorProfile>();
const inFlight = new Map<AuthorId, Promise<AuthorProfile | null>>();
/** Cooldown — never a permanent blacklist (token/404 can recover). */
const failedUntil = new Map<AuthorId, number>();
const FAIL_COOLDOWN_MS = 12_000;

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
  profiles.set(userId, profile);
  if (hasUsableAuthorName(profile)) {
    failedUntil.delete(userId);
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
        profiles.set(userId, fetched);
        failedUntil.delete(userId);
        return fetched;
      }
      if (fetched) {
        const existing = profiles.get(userId);
        profiles.set(userId, {
          ...(existing || {
            id: userId,
            firstName: "",
            lastName: "",
            fullName: "",
            avatar: "",
          }),
          ...fetched,
          fullName: fetched.fullName || existing?.fullName || "",
        });
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
  await Promise.all(unique.map((id) => ensureAuthorProfile(id)));
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
