import { putAuthorProfile } from "./authorProfileStore";
import {
  avatarFromUserLike,
  hasUsableAuthorName,
  isPlaceholderName,
  nameFromUserLike,
  normalizeAuthorProfile,
} from "./normalizeAuthor";
import { getAuthorProfile } from "./authorProfileStore";
import {
  ANONYMOUS_AUTHOR_LABEL,
  type AuthorCarrier,
} from "./types";
import { extractAuthorId } from "./extractAuthorId";
import { DEFAULT_USER_AVATAR_SOURCE } from "../../../app/utils/defaultUserAvatar";

/**
 * Pure name resolver — payload fields first, then profile store by id.
 * No network. Call ensureFeedAuthors() to populate the store asynchronously.
 */
export function resolveAuthorName(
  item: AuthorCarrier | null | undefined,
  fallback: string = ANONYMOUS_AUTHOR_LABEL
): string {
  if (!item) return fallback;

  for (const key of [
    "uploadedByName",
    "authorName",
    "displayName",
    "creatorName",
  ] as const) {
    const v = item[key];
    if (typeof v === "string" && !isPlaceholderName(v)) return v.trim();
  }

  const fromObjects =
    nameFromUserLike(item.authorInfo) ||
    nameFromUserLike(item.uploadedBy) ||
    nameFromUserLike(item.author) ||
    nameFromUserLike(item.user) ||
    nameFromUserLike(item.createdBy);
  if (fromObjects) return fromObjects;

  if (typeof item.artistName === "string" && !isPlaceholderName(item.artistName)) {
    const artist = item.artistName.trim();
    if (!/^[0-9a-fA-F]{24}$/.test(artist)) return artist;
  }

  if (typeof item.speaker === "string" && !isPlaceholderName(item.speaker)) {
    const speaker = item.speaker.trim();
    if (!/^[0-9a-fA-F]{24}$/.test(speaker)) return speaker;
  }

  if (
    typeof item.uploadedBy === "string" &&
    !/^[0-9a-fA-F]{24}$/.test(item.uploadedBy.trim())
  ) {
    if (!isPlaceholderName(item.uploadedBy)) return item.uploadedBy.trim();
  }

  const id = extractAuthorId(item);
  if (id) {
    const cached = getAuthorProfile(id);
    if (hasUsableAuthorName(cached)) return cached!.fullName;
  }

  return fallback;
}

/** Pure avatar resolver — payload first, then profile store. */
export function resolveAuthorAvatar(
  item: AuthorCarrier | null | undefined,
  fallback: any = DEFAULT_USER_AVATAR_SOURCE
): any {
  if (!item) return fallback;

  const url =
    avatarFromUserLike(item.uploadedBy) ||
    avatarFromUserLike(item.author) ||
    avatarFromUserLike(item.authorInfo) ||
    (typeof item.speakerAvatar === "string" ? item.speakerAvatar.trim() : null) ||
    (typeof item.userAvatar === "string" ? item.userAvatar.trim() : null);

  if (url) {
    return { uri: url };
  }

  const id = extractAuthorId(item);
  if (id) {
    const cached = getAuthorProfile(id);
    if (cached?.avatar) return { uri: cached.avatar };
  }

  return fallback;
}

/** Seed store from any already-populated author fields on a media item. */
export function seedAuthorsFromItem(item: AuthorCarrier): void {
  for (const candidate of [
    item.authorInfo,
    item.author,
    item.uploadedBy,
    item.user,
    item.createdBy,
  ]) {
    if (!candidate || typeof candidate !== "object") continue;
    const profile = normalizeAuthorProfile(candidate as any);
    if (!profile) continue;
    putAuthorProfile(profile.id, profile);
  }
}
