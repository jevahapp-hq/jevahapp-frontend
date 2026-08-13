/**
 * Brand fallback avatar (anonymous / missing profile photo).
 * Cloudinary: jevah-hq logo.
 */
export const DEFAULT_USER_AVATAR_URL =
  "https://res.cloudinary.com/ddgzzjp4x/image/upload/v1758677253/jevah-hq_tcqmxl.jpg";

export const DEFAULT_USER_AVATAR_SOURCE = {
  uri: DEFAULT_USER_AVATAR_URL,
} as const;

/** Resolve a displayable avatar URI; empty/missing → brand default. */
export function resolveUserAvatarUrl(
  avatar?: string | null
): string {
  const trimmed = typeof avatar === "string" ? avatar.trim() : "";
  if (trimmed.length > 0) return trimmed;
  return DEFAULT_USER_AVATAR_URL;
}
