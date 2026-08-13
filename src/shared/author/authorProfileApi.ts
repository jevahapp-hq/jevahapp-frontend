import { getApiBaseUrl } from "../../../app/utils/environmentManager";
import { authUtils } from "../../../app/utils/authUtils";
import type { AuthorId, AuthorProfile } from "./types";
import { normalizeAuthorProfile } from "./normalizeAuthor";

/**
 * GET {origin}/api/users/:id
 * NOTE: getApiBaseUrl() is origin only — do NOT prepend API_BASE_URL which already has /api.
 */
export async function fetchAuthorProfile(
  userId: AuthorId
): Promise<AuthorProfile | null> {
  if (!userId) return null;

  const token = await authUtils.getStoredToken();
  if (!token) return null;

  const url = `${getApiBaseUrl()}/api/users/${userId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (__DEV__) {
      console.warn(
        `[author] GET /api/users/${userId} → ${response.status}`
      );
    }
    return null;
  }

  const data = await response.json();
  // Tolerate: { user }, { success, user }, { data: user }, { data: { user } }, bare user
  const rawUser =
    data?.user ??
    data?.data?.user ??
    (data?.data &&
    typeof data.data === "object" &&
    !Array.isArray(data.data) &&
    (data.data.firstName ||
      data.data.first_name ||
      data.data.name ||
      data.data._id ||
      data.data.id)
      ? data.data
      : null) ??
    (data?._id || data?.id || data?.firstName || data?.name ? data : null);

  return normalizeAuthorProfile(rawUser, userId);
}
