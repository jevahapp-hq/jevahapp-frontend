import { getApiBaseUrl } from "../../../app/utils/environmentManager";
import { authUtils } from "../../../app/utils/authUtils";
import { isLiteProfileActive } from "../lite/liteProfile";
import type { AuthorId, AuthorProfile } from "./types";
import { hasUsableAuthorName, normalizeAuthorProfile } from "./normalizeAuthor";

function origin(): string {
  return getApiBaseUrl().replace(/\/+$/, "");
}

function userFromPayload(data: any, userId: string): Record<string, any> | null {
  if (!data || typeof data !== "object") return null;

  const candidates = [
    data.user,
    data.data?.user,
    data.profile,
    data.data?.profile,
    Array.isArray(data.users) ? data.users[0] : null,
    Array.isArray(data.data?.users) ? data.data.users[0] : null,
    data.data &&
    typeof data.data === "object" &&
    !Array.isArray(data.data) &&
    (data.data.firstName ||
      data.data.first_name ||
      data.data.displayName ||
      data.data.name ||
      data.data._id ||
      data.data.id)
      ? data.data
      : null,
    data._id || data.id || data.firstName || data.displayName || data.name
      ? data
      : null,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== "object") continue;
    const id = String(raw._id || raw.id || userId || "").trim();
    if (id && id !== userId && raw._id && raw.id && String(raw._id) !== userId && String(raw.id) !== userId) {
      continue;
    }
    return raw;
  }
  return null;
}

async function getJson(
  url: string,
  headers: Record<string, string>
): Promise<{ status: number; data: any }> {
  const response = await fetch(url, { headers });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

/**
 * Resolve a public-ish author profile.
 * Primary: GET {origin}/api/users/:id (auth). Fallbacks if that 404s / is nameless.
 */
export async function fetchAuthorProfile(
  userId: AuthorId
): Promise<AuthorProfile | null> {
  if (!userId) return null;

  const token = await authUtils.getStoredToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const tryParse = (data: any): AuthorProfile | null => {
    const raw = userFromPayload(data, userId);
    return normalizeAuthorProfile(raw, userId);
  };

  const primary = await getJson(`${origin()}/api/users/${userId}`, headers);
  if (primary.status === 401 || primary.status === 402) {
    throw new Error(token ? "AUTHOR_PROFILE_RETRY" : "AUTHOR_PROFILE_NO_TOKEN");
  }
  let profile = tryParse(primary.data);
  if (hasUsableAuthorName(profile)) return profile;

  const tabs = await getJson(
    `${origin()}/api/user/tabs?userId=${encodeURIComponent(userId)}`,
    headers
  );
  if (tabs.status === 401 || tabs.status === 402) {
    throw new Error(token ? "AUTHOR_PROFILE_RETRY" : "AUTHOR_PROFILE_NO_TOKEN");
  }
  const tabsUser = tabs.data?.user || tabs.data?.data?.user;
  if (tabsUser && typeof tabsUser === "object") {
    profile = normalizeAuthorProfile(
      {
        _id: tabsUser.id || tabsUser._id || userId,
        id: tabsUser.id || tabsUser._id || userId,
        firstName: tabsUser.firstName,
        lastName: tabsUser.lastName,
        fullName: tabsUser.displayName || tabsUser.fullName || tabsUser.name,
        avatar: tabsUser.avatarUrl || tabsUser.avatar,
      },
      userId
    );
    if (hasUsableAuthorName(profile)) return profile;
  }

  if (isLiteProfileActive()) {
    return hasUsableAuthorName(profile) ? profile : null;
  }

  const media = await getJson(
    `${origin()}/api/users/${userId}/media?page=1&limit=1`,
    headers
  );
  const mediaRoot = media.data?.data ?? media.data;
  const items =
    (Array.isArray(mediaRoot?.media) && mediaRoot.media) ||
    (Array.isArray(mediaRoot?.items) && mediaRoot.items) ||
    (Array.isArray(mediaRoot) && mediaRoot) ||
    [];
  const first = items[0];
  if (first) {
    profile =
      normalizeAuthorProfile(first.authorInfo, userId) ||
      normalizeAuthorProfile(
        typeof first.uploadedBy === "object" ? first.uploadedBy : null,
        userId
      ) ||
      normalizeAuthorProfile(first.author, userId);
    if (hasUsableAuthorName(profile)) return profile;
  }

  if (__DEV__ && primary.status !== 200) {
    console.warn(`[author] GET /api/users/${userId} → ${primary.status}`);
  }

  return hasUsableAuthorName(profile) ? profile : null;
}
