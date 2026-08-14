/**
 * Cross-session author identity cache (TikTok/IG pattern).
 * Names are tiny JSON — persist them, never re-fetch to paint a card.
 */
import { mmkvGetJson, mmkvSetJson } from "../cache/mmkvStorage";
import { isLiteProfileActive } from "../lite/liteProfile";
import { hasUsableAuthorName } from "./normalizeAuthor";
import type { AuthorProfile } from "./types";

export const AUTHOR_DISK_KEY = "author-profiles-v1";

const MAX_FULL = 64;
const MAX_LITE = 32;

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function readAuthorProfilesFromDisk(): AuthorProfile[] {
  const raw = mmkvGetJson<AuthorProfile[]>(AUTHOR_DISK_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter((row) => row?.id && hasUsableAuthorName(row));
}

export function schedulePersistAuthorProfiles(
  profiles: Map<string, AuthorProfile>
): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const max = isLiteProfileActive() ? MAX_LITE : MAX_FULL;
    const named = Array.from(profiles.values()).filter(hasUsableAuthorName);
    const slice = named.slice(-max);
    mmkvSetJson(
      AUTHOR_DISK_KEY,
      slice.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: p.fullName,
        avatar: p.avatar,
      }))
    );
  }, 250);
}
