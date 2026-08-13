import type { MediaItem } from "../types";
import { extractAuthorId } from "./extractAuthorId";
import {
  ensureAuthorProfiles,
  getAuthorProfile,
} from "./authorProfileStore";
import {
  hasUsableAuthorName,
  isPlaceholderName,
} from "./normalizeAuthor";
import { resolveAuthorName, seedAuthorsFromItem } from "./resolveAuthor";
import { hydrateAuthorsFromPublicIndex } from "./publicAuthorIndex";
import type { AuthorCarrier } from "./types";

function collectAuthorIds(items: AuthorCarrier[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    seedAuthorsFromItem(item);
    const id = extractAuthorId(item);
    if (!id) continue;
    const cached = getAuthorProfile(id);
    if (!hasUsableAuthorName(cached)) ids.push(id);
  }
  return ids;
}

/** Immutable patch: merge profile store names/avatars onto media items. */
export function applyAuthorsToMedia(items: MediaItem[]): MediaItem[] {
  if (!items.length) return items;
  let changed = false;

  const next = items.map((item) => {
    const currentName = resolveAuthorName(item);
    const id = extractAuthorId(item);
    const profile = id ? getAuthorProfile(id) : null;

    const speakerIsId =
      typeof item.speaker === "string" &&
      /^[0-9a-fA-F]{24}$/.test(item.speaker.trim());

    if (!profile || !hasUsableAuthorName(profile)) {
      return item;
    }

    if (
      !isPlaceholderName(currentName) &&
      currentName === profile.fullName &&
      !isPlaceholderName(item.speaker as any) &&
      !speakerIsId
    ) {
      return item;
    }

    changed = true;
    const uploadedBy =
      typeof item.uploadedBy === "object" && item.uploadedBy
        ? {
            ...(item.uploadedBy as any),
            _id: id,
            id,
            firstName: (item.uploadedBy as any).firstName || profile.firstName,
            lastName: (item.uploadedBy as any).lastName || profile.lastName,
            avatar:
              (item.uploadedBy as any).avatar ||
              profile.avatar ||
              "",
          }
        : id
          ? {
              _id: id,
              id,
              firstName: profile.firstName,
              lastName: profile.lastName,
              avatar: profile.avatar,
            }
          : item.uploadedBy;

    const authorInfo = {
      ...((item as any).authorInfo || {}),
      _id: id || (item as any).authorInfo?._id,
      id: id || (item as any).authorInfo?.id,
      firstName: (item as any).authorInfo?.firstName || profile.firstName,
      lastName: (item as any).authorInfo?.lastName || profile.lastName,
      fullName: (item as any).authorInfo?.fullName || profile.fullName,
      avatar: (item as any).authorInfo?.avatar || profile.avatar,
    };

    return {
      ...item,
      uploadedBy,
      authorInfo,
      speaker:
        isPlaceholderName(item.speaker as any) || speakerIsId
          ? profile.fullName
          : item.speaker,
      speakerAvatar: (item as any).speakerAvatar || profile.avatar,
    } as MediaItem;
  });

  return changed ? next : items;
}

export function feedNeedsAuthorEnrichment(items: MediaItem[]): boolean {
  return items.some((item) => {
    if (!isPlaceholderName(resolveAuthorName(item))) return false;
    return Boolean(extractAuthorId(item));
  });
}

/**
 * Lite list JSON omits author ids entirely. Profile fetches cannot help —
 * the feed page must be refetched without the lite projection.
 */
export function feedItemsNeedFullAuthorRefetch(items: MediaItem[]): boolean {
  if (!items.length) return false;
  let stripped = 0;
  for (const item of items) {
    if (!isPlaceholderName(resolveAuthorName(item)) || extractAuthorId(item)) {
      continue;
    }
    stripped += 1;
  }
  return stripped >= Math.max(1, Math.ceil(items.length / 2));
}

/**
 * Fetch missing profiles then return patched media list.
 * Safe to call repeatedly — skips ids that already have usable names.
 */
export async function ensureFeedAuthors(
  items: MediaItem[]
): Promise<MediaItem[]> {
  if (!items.length) return items;
  items.forEach((item) => seedAuthorsFromItem(item));
  const missing = collectAuthorIds(items);
  if (missing.length) {
    await ensureAuthorProfiles(missing);
  }
  let next = applyAuthorsToMedia(items);
  if (next.some((item) => isPlaceholderName(resolveAuthorName(item)))) {
    next = await hydrateAuthorsFromPublicIndex(next);
    next = applyAuthorsToMedia(next);
  }
  return next;
}

/** Sync enrich for transform pipelines (uses store only, no network). */
export function enrichContentWithAuthor(content: any): any {
  if (!content) return content;
  seedAuthorsFromItem(content);
  const id = extractAuthorId(content);
  const profile = id ? getAuthorProfile(id) : null;
  if (!profile) return content;

  const next = { ...content };
  if (typeof next.uploadedBy === "object" && next.uploadedBy) {
    next.uploadedBy = {
      ...next.uploadedBy,
      firstName: next.uploadedBy.firstName || profile.firstName,
      lastName: next.uploadedBy.lastName || profile.lastName,
      avatar: next.uploadedBy.avatar || profile.avatar,
    };
  } else if (typeof next.uploadedBy === "string" && hasUsableAuthorName(profile)) {
    next.uploadedBy = {
      _id: id,
      id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: profile.avatar,
    };
  }

  if (next.authorInfo && typeof next.authorInfo === "object") {
    next.authorInfo = {
      ...next.authorInfo,
      firstName: next.authorInfo.firstName || profile.firstName,
      lastName: next.authorInfo.lastName || profile.lastName,
      fullName: next.authorInfo.fullName || profile.fullName,
      avatar: next.authorInfo.avatar || profile.avatar,
    };
  } else if (hasUsableAuthorName(profile)) {
    next.authorInfo = {
      _id: id,
      id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      fullName: profile.fullName,
      avatar: profile.avatar,
    };
  }

  if (isPlaceholderName(next.speaker) && hasUsableAuthorName(profile)) {
    next.speaker = profile.fullName;
  }

  return next;
}
