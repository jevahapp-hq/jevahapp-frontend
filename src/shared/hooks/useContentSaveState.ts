/**
 * Single read path for "is this saved, and by how many".
 *
 * Feed VideoCards used to read save from memoized parent props, so the
 * bookmark never turned orange after a tap. Reels used the local library
 * store keyed by `reel-…`, which did not match the mongo id `toggleSave`
 * writes. Both surfaces now call this.
 */
import {
  getCachedContentInteraction,
  isContentInteractionFresh,
  resolveSavedFlag,
} from "../../../app/utils/contentInteractionPersist";
import { pickLocalFirstCount } from "../media/engagementToggle";
import {
  useContentStats,
  useInteractionStore,
} from "@/store/useInteractionStore";

export type SaveMetadataSource = {
  hasBookmarked?: boolean | null;
  isBookmarked?: boolean | null;
  bookmarkCount?: number | null;
  saveCount?: number | null;
  saves?: number | null;
  saved?: number | null;
} | null | undefined;

export type ContentSaveState = {
  saved: boolean;
  saveCount: number;
  toggleSeed: { initialSaved: boolean; initialSaves: number };
};

export function saveCountFromMetadata(item: SaveMetadataSource): number {
  const raw =
    item?.saveCount ??
    item?.saves ??
    item?.saved ??
    item?.bookmarkCount ??
    0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function savedFromMetadata(
  item: SaveMetadataSource
): boolean | undefined {
  if (typeof item?.hasBookmarked === "boolean") return item.hasBookmarked;
  if (typeof item?.isBookmarked === "boolean") return item.isBookmarked;
  return undefined;
}

export function resolveSaveSeed(
  contentId: string,
  item?: SaveMetadataSource
): { initialSaved: boolean; initialSaves: number } {
  const stats = useInteractionStore.getState().contentStats[contentId];
  const cached = getCachedContentInteraction(contentId);
  const cacheIsFresh = isContentInteractionFresh(contentId);
  const storeSaved = stats?.userInteractions?.saved;

  const initialSaved = Boolean(
    resolveSavedFlag(
      contentId,
      typeof storeSaved === "boolean" ? storeSaved : savedFromMetadata(item)
    )
  );

  const initialSaves = pickLocalFirstCount({
    cachedCount: cached?.saves,
    cacheIsFresh,
    storeCount: stats?.saves,
    fallbacks: [saveCountFromMetadata(item)],
  });

  return {
    initialSaved,
    initialSaves,
  };
}

export function useContentSaveState(
  contentId: string,
  item?: SaveMetadataSource
): ContentSaveState {
  const liveStats = useContentStats(contentId);
  const liveSaved = liveStats?.userInteractions?.saved;
  const saved = Boolean(
    resolveSavedFlag(
      contentId,
      typeof liveSaved === "boolean"
        ? liveSaved
        : savedFromMetadata(item)
    )
  );

  const cached = getCachedContentInteraction(contentId);
  const cacheIsFresh = isContentInteractionFresh(contentId);
  const metadataCount = saveCountFromMetadata(item);

  let saveCount = pickLocalFirstCount({
    cachedCount: cached?.saves,
    cacheIsFresh,
    storeCount: liveStats?.saves,
    fallbacks: [metadataCount],
  });

  if (saved && saveCount < 1) saveCount = 1;

  return {
    saved,
    saveCount,
    toggleSeed: { initialSaved: saved, initialSaves: saveCount },
  };
}
