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
import {
  useContentCount,
  useContentStats,
  useInteractionStore,
  useUserInteraction,
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

  const initialSaved = Boolean(
    resolveSavedFlag(
      contentId,
      typeof stats?.userInteractions?.saved === "boolean"
        ? stats.userInteractions.saved
        : savedFromMetadata(item)
    )
  );

  const initialSaves = Number(
    stats?.saves ??
      (cacheIsFresh ? cached?.saves : undefined) ??
      saveCountFromMetadata(item)
  );

  return {
    initialSaved,
    initialSaves: Number.isFinite(initialSaves)
      ? Math.max(0, initialSaves)
      : 0,
  };
}

export function useContentSaveState(
  contentId: string,
  item?: SaveMetadataSource
): ContentSaveState {
  const liveStats = useContentStats(contentId);
  const storeSaved = useUserInteraction(contentId, "saved");
  const storeSaves = useContentCount(contentId, "saves");

  const liveSaved = liveStats?.userInteractions?.saved;
  const saved = Boolean(
    resolveSavedFlag(
      contentId,
      typeof liveSaved === "boolean"
        ? liveSaved
        : storeSaved || savedFromMetadata(item)
    )
  );

  const cached = getCachedContentInteraction(contentId);
  const cacheIsFresh = isContentInteractionFresh(contentId);
  const metadataCount = saveCountFromMetadata(item);

  let saveCount =
    cacheIsFresh && cached?.saves !== undefined
      ? Math.max(0, cached.saves)
      : Math.max(Number(storeSaves) || 0, metadataCount);

  if (saved && saveCount < 1) saveCount = 1;

  return {
    saved,
    saveCount,
    toggleSeed: { initialSaved: saved, initialSaves: saveCount },
  };
}
