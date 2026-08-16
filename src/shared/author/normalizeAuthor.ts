import type { AuthorProfile } from "./types";

const PLACEHOLDER_RE =
  /^(anonymous(\s+user)?|unknown|no speaker|user)$/i;

export function isPlaceholderName(name?: string | null): boolean {
  const t = String(name || "").trim();
  if (!t) return true;
  return PLACEHOLDER_RE.test(t);
}

/** Normalize any API / media user object into a consistent AuthorProfile. */
export function normalizeAuthorProfile(
  raw: Record<string, any> | null | undefined,
  fallbackId?: string
): AuthorProfile | null {
  if (!raw || typeof raw !== "object") return null;

  const id = String(raw._id || raw.id || fallbackId || "").trim();
  if (!id) return null;

  const fullCandidate =
    raw.fullName ||
    raw.displayName ||
    raw.name ||
    raw.username ||
    raw.userName ||
    raw.authorName ||
    "";
  const parts = String(fullCandidate)
    .split(/\s+/)
    .filter(Boolean);

  const firstName = String(
    raw.firstName || raw.first_name || parts[0] || ""
  ).trim();
  const lastName = String(
    raw.lastName ||
      raw.last_name ||
      (parts.length > 1 ? parts.slice(1).join(" ") : "") ||
      ""
  ).trim();

  let fullName = `${firstName} ${lastName}`.trim();
  if (isPlaceholderName(fullName) && typeof fullCandidate === "string") {
    fullName = String(fullCandidate).trim();
  }
  if (isPlaceholderName(fullName) && raw.email) {
    const prefix = String(raw.email).split("@")[0];
    if (!isPlaceholderName(prefix)) fullName = prefix;
  }

  const avatar = String(
    raw.avatar ||
      raw.avatarUpload ||
      raw.avatarUrl ||
      raw.profileImage ||
      raw.profilePicture ||
      raw.imageUrl ||
      ""
  ).trim();

  return {
    id,
    firstName: isPlaceholderName(firstName) ? "" : firstName,
    lastName: isPlaceholderName(lastName) ? "" : lastName,
    fullName: isPlaceholderName(fullName) ? "" : fullName,
    avatar,
    email: raw.email ? String(raw.email) : undefined,
  };
}

export function hasUsableAuthorName(
  profile: AuthorProfile | null | undefined
): boolean {
  return Boolean(profile && !isPlaceholderName(profile.fullName));
}

/** Pull a displayable name from a nested user-like object (no network). */
export function nameFromUserLike(user: unknown): string | null {
  if (typeof user === "string") {
    const t = user.trim();
    if (!t || isPlaceholderName(t) || /^[0-9a-fA-F]{24}$/.test(t)) return null;
    return t;
  }
  // "_" lets populated { firstName, name } objects resolve even without _id.
  const profile = normalizeAuthorProfile(user as any, "_");
  if (!profile) return null;
  return hasUsableAuthorName(profile) ? profile.fullName : null;
}

export function avatarFromUserLike(user: unknown): string | null {
  const profile = normalizeAuthorProfile(user as any);
  const avatar = profile?.avatar?.trim();
  return avatar || null;
}
