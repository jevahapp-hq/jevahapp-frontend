import type { AuthorId, AuthorProfile } from "./types";
import { fetchAuthorProfile } from "./authorProfileApi";
import { hasUsableAuthorName, normalizeAuthorProfile } from "./normalizeAuthor";

/**
 * In-memory author profile store (single responsibility).
 * Never treats a nameless entry as a successful cache hit for name resolution.
 */
const profiles = new Map<AuthorId, AuthorProfile>();
const inFlight = new Map<AuthorId, Promise<AuthorProfile | null>>();
const failedIds = new Set<AuthorId>();

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
    failedIds.delete(userId);
  }
  return profile;
}

export function markAuthorFetchFailed(userId: AuthorId): void {
  if (userId) failedIds.add(userId);
}

export function wasAuthorFetchFailed(userId: AuthorId): boolean {
  return failedIds.has(userId);
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
  if (failedIds.has(userId)) return cached || null;

  const pending = inFlight.get(userId);
  if (pending) return pending;

  const job = (async () => {
    try {
      const fetched = await fetchAuthorProfile(userId);
      if (fetched && hasUsableAuthorName(fetched)) {
        profiles.set(userId, fetched);
        failedIds.delete(userId);
        return fetched;
      }
      if (fetched) {
        // Keep avatar-only if we had nothing, but allow retry later for names
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
      // Soft-fail: don't permanently block if response had no name (backend lag)
      if (!fetched) {
        failedIds.add(userId);
      }
      return profiles.get(userId) || null;
    } catch {
      failedIds.add(userId);
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

/** Bridge: seed from legacy UserProfileCache / login session. */
export function seedAuthorFromSession(user: Record<string, any> | null | undefined): void {
  if (!user) return;
  const id = String(user._id || user.id || "").trim();
  if (!id) return;
  putAuthorProfile(id, user);
}
