/**
 * Enrich sparse bookmark payloads with media already loaded in the ALL feed
 * (content cache + media store + local library saves). Same videos, same URLs.
 */
import { useContentCacheStore } from "../../../../store/useContentCacheStore";
import { useLibraryStore } from "../../../../store/useLibraryStore";
import { useMediaStore } from "../../../../store/useUploadStore";

const pickString = (...candidates: any[]): string | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (
      candidate &&
      typeof candidate === "object" &&
      typeof candidate.uri === "string" &&
      candidate.uri.trim()
    ) {
      return candidate.uri.trim();
    }
  }
  return undefined;
};

const itemId = (item: any): string | null => {
  const id = item?._id || item?.id;
  return id != null ? String(id) : null;
};

/** Index every media object already sitting in memory from ALL / category feeds. */
export const buildKnownMediaIndex = (): Map<string, any> => {
  const map = new Map<string, any>();

  const remember = (item: any) => {
    const id = itemId(item);
    if (!id) return;
    const prev = map.get(id);
    // Prefer the richer record (feed items usually have fileUrl + thumbs).
    if (!prev) {
      map.set(id, item);
      return;
    }
    const prevScore =
      Number(!!prev.fileUrl) +
      Number(!!prev.playbackUrl) +
      Number(!!prev.thumbnailUrl) +
      Number(!!prev.imageUrl);
    const nextScore =
      Number(!!item.fileUrl) +
      Number(!!item.playbackUrl) +
      Number(!!item.thumbnailUrl) +
      Number(!!item.imageUrl);
    if (nextScore >= prevScore) map.set(id, { ...prev, ...item });
  };

  try {
    const cache = useContentCacheStore.getState().cache || {};
    Object.values(cache).forEach((page: any) => {
      const items = page?.items;
      if (!Array.isArray(items)) return;
      items.forEach(remember);
    });
  } catch {
    /* ignore */
  }

  try {
    const mediaList = useMediaStore.getState().mediaList || [];
    mediaList.forEach(remember);
  } catch {
    /* ignore */
  }

  try {
    useLibraryStore
      .getState()
      .getAllSavedItems()
      .forEach((saved: any) => {
        remember({
          ...saved,
          _id: saved._id || saved.id,
        });
      });
  } catch {
    /* ignore */
  }

  return map;
};

/**
 * Fill missing file/playback/thumbnail fields on a bookmark from the same
 * media object already shown in the ALL category.
 */
export const enrichLibraryItemFromKnownMedia = (
  item: any,
  index?: Map<string, any>
): any => {
  if (!item || typeof item !== "object") return item;

  const known = (index ?? buildKnownMediaIndex()).get(itemId(item) || "") || null;
  if (!known) {
    // Still normalize imageUrl objects → string for thumb helpers.
    const imageUrl = pickString(item.imageUrl, item.thumbnailUrl);
    const thumbnailUrl = pickString(item.thumbnailUrl, item.imageUrl);
    if (imageUrl === item.imageUrl && thumbnailUrl === item.thumbnailUrl) {
      return item;
    }
    return { ...item, imageUrl, thumbnailUrl };
  }

  const fileUrl = pickString(
    item.fileUrl,
    known.fileUrl,
    item.mediaUrl,
    known.mediaUrl
  );
  const mediaUrl = pickString(
    item.mediaUrl,
    known.mediaUrl,
    known.fileUrl,
    item.fileUrl
  );
  const playbackUrl = pickString(item.playbackUrl, known.playbackUrl);
  const hlsUrl = pickString(item.hlsUrl, known.hlsUrl);
  const thumbnailUrl = pickString(
    item.thumbnailUrl,
    known.thumbnailUrl,
    known.imageUrl,
    item.imageUrl
  );
  const imageUrl = pickString(
    item.imageUrl,
    known.imageUrl,
    known.thumbnailUrl,
    item.thumbnailUrl
  );

  return {
    ...item,
    fileUrl: fileUrl || item.fileUrl,
    mediaUrl: mediaUrl || item.mediaUrl,
    playbackUrl: playbackUrl || item.playbackUrl,
    hlsUrl: hlsUrl || item.hlsUrl,
    thumbnailUrl: thumbnailUrl || item.thumbnailUrl,
    imageUrl: imageUrl || item.imageUrl,
    mimeType: item.mimeType || known.mimeType,
    contentType: item.contentType || known.contentType,
  };
};

export const enrichLibraryItemsFromKnownMedia = (items: any[]): any[] => {
  if (!Array.isArray(items) || items.length === 0) return items;
  const index = buildKnownMediaIndex();
  return items.map((item) => enrichLibraryItemFromKnownMedia(item, index));
};
