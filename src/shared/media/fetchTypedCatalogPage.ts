import { UserProfileCache } from "../../../app/utils/cache/UserProfileCache";
import { mediaApi } from "../../core/api/MediaApi";
import {
  FEED_PAGE_SIZE,
} from "../config/feedCachePolicy";
import type { MediaItem } from "../types";
import { transformApiResponseToMediaItem } from "../utils";
import { paintAuthorsFromCache } from "../author";
import { syncMediaStatsToInteractionStore } from "./syncMediaStats";
import type { TypedCatalogKind } from "./typedCatalogKeys";

export type TypedCatalogPageResult = {
  media: MediaItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasMore: boolean;
};

async function fetchCatalogResponse(
  kind: TypedCatalogKind,
  page: number,
  limit: number
) {
  if (kind === "sermon") {
    return mediaApi.getSermons({ page, limit });
  }
  if (kind === "ebook") {
    return mediaApi.getEbooks({ page, limit });
  }
  return mediaApi.getMusicTracks({ page, limit });
}

function stampCatalogKind(
  item: MediaItem,
  kind: TypedCatalogKind
): MediaItem {
  const current = String(item.contentType || "").toLowerCase();
  const approved =
    item.moderationStatus ||
    ("approved" as MediaItem["moderationStatus"]);
  if (kind === "sermon") {
    if (
      current === "sermon" ||
      current === "teachings" ||
      current === "devotional"
    ) {
      return item.moderationStatus ? item : { ...item, moderationStatus: approved };
    }
    return { ...item, contentType: "sermon", moderationStatus: approved };
  }
  if (kind === "ebook") {
    if (
      current === "ebook" ||
      current === "e-books" ||
      current === "ebooks" ||
      current === "books"
    ) {
      return item.moderationStatus ? item : { ...item, moderationStatus: approved };
    }
    return { ...item, contentType: "ebook", moderationStatus: approved };
  }
  return item;
}

function toMediaItems(raw: any[], kind: TypedCatalogKind): MediaItem[] {
  if (!raw.length) return [];
  return paintAuthorsFromCache(
    UserProfileCache.enrichContentArray(raw)
      .map(transformApiResponseToMediaItem)
      .filter((item): item is MediaItem => item !== null)
      .map((item) => stampCatalogKind(item, kind))
  );
}

export async function fetchTypedCatalogPage(options: {
  kind: TypedCatalogKind;
  page?: number;
  limit?: number;
}): Promise<TypedCatalogPageResult> {
  const kind = options.kind;
  const page = options.page ?? 1;
  const limit = options.limit ?? FEED_PAGE_SIZE;

  const response = await fetchCatalogResponse(kind, page, limit);
  if (!response.success) {
    throw new Error(response.error || `Failed to fetch ${kind} catalog`);
  }

  const media = toMediaItems(response.media || [], kind);
  const total = response.total || response.pagination?.total || media.length;
  const pag = response.pagination as
    | { totalPages?: number; pages?: number }
    | undefined;
  const pages =
    pag?.totalPages ||
    pag?.pages ||
    Math.max(1, Math.ceil((total || 0) / (response.limit || limit)));

  syncMediaStatsToInteractionStore(media);

  return {
    media,
    total,
    page: response.page || page,
    limit: response.limit || limit,
    pages,
    hasMore:
      media.length >= limit &&
      (typeof total === "number" ? page * limit < total : media.length >= limit),
  };
}
