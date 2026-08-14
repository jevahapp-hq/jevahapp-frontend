import type { MediaItem } from "../types";
import { isPlaceholderName } from "./normalizeAuthor";
import { resolveAuthorName, seedAuthorsFromItem } from "./resolveAuthor";

function mediaKey(item: { _id?: string; id?: string } | null | undefined): string {
  return String(item?._id || item?.id || "").trim();
}

/**
 * Copy author fields from donor items onto targets with the same media id.
 * Used when For You / lite JSON omits authorInfo but chronological public has it.
 */
export function mergeAuthorFieldsByMediaId(
  donors: any[],
  targets: MediaItem[]
): MediaItem[] {
  if (!donors.length || !targets.length) return targets;

  const byId = new Map<string, any>();
  for (const donor of donors) {
    const id = mediaKey(donor);
    if (!id) continue;
    seedAuthorsFromItem(donor);
    byId.set(id, donor);
  }

  let changed = false;
  const next = targets.map((item) => {
    if (!isPlaceholderName(resolveAuthorName(item))) return item;
    const donor = byId.get(mediaKey(item));
    if (!donor) return item;

    changed = true;
    const authorInfo = donor.authorInfo || donor.author || (item as any).authorInfo;
    const uploadedBy =
      donor.uploadedBy !== undefined ? donor.uploadedBy : item.uploadedBy;
    const named = {
      ...item,
      uploadedBy,
      authorInfo,
      author: donor.author || (item as any).author,
      speakerAvatar:
        (item as any).speakerAvatar ||
        donor.speakerAvatar ||
        authorInfo?.avatar,
      userId: (item as any).userId || donor.userId,
    } as MediaItem;
    const name = resolveAuthorName(named, "");
    if (name) named.speaker = name;
    return named;
  });

  return changed ? next : targets;
}

const TTL_MS = 10 * 60 * 1000;
let donorCache: any[] = [];
let donorFetchedAt = 0;
let donorInflight: Promise<any[]> | null = null;

/** Public all-content (no lite projection) — known to include authorInfo. */
export async function loadPublicAuthorDonors(): Promise<any[]> {
  const { isLiteProfileActive } = await import("../lite/liteProfile");
  if (isLiteProfileActive()) return donorCache;
  if (donorCache.length && Date.now() - donorFetchedAt < TTL_MS) {
    return donorCache;
  }
  if (donorInflight) return donorInflight;

  donorInflight = (async () => {
    const { mediaApi } = await import("../../core/api/MediaApi");
    const res = await mediaApi.getAllContentPublic({ page: 1, limit: 50 });
    donorCache = res.success ? res.media || [] : [];
    donorFetchedAt = Date.now();
    return donorCache;
  })();

  try {
    return await donorInflight;
  } catch {
    return donorCache;
  } finally {
    donorInflight = null;
  }
}

export async function hydrateAuthorsFromPublicIndex(
  items: MediaItem[]
): Promise<MediaItem[]> {
  if (!items.length) return items;
  if (!items.some((item) => isPlaceholderName(resolveAuthorName(item)))) {
    return items;
  }
  const donors = await loadPublicAuthorDonors();
  return mergeAuthorFieldsByMediaId(donors, items);
}
