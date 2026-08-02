import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import type { ContentType, MediaItem } from "../../../../shared/types";
import { UI_CONFIG } from "../../../../shared/constants";
import { getFeedContentKind } from "../utils/feedContentKind";
import type { FeedRow } from "../types";

export interface UseFeedListRowsParams {
  mostRecentItem: MediaItem | null | undefined;
  firstFour: MediaItem[];
  rest: MediaItem[];
  activeTab: ContentType | "ALL";
  filteredMediaListLength: number;
  getFeedPlaybackKey: (item: MediaItem) => string;
}

export interface UseFeedListRowsResult {
  listData: FeedRow[];
  mediaSeqByKeyRef: MutableRefObject<Record<string, number>>;
  mediaKeyBySeqRef: MutableRefObject<Record<number, string>>;
  mediaItemBySeqRef: MutableRefObject<Record<number, MediaItem>>;
  /** FlashList row key for the Most Recent media cell, if any. */
  heroRowKey: string | null;
}

/**
 * Builds FlashList rows + video-only seq maps (nearest-N videos, never
 * ebook/audio slots eating preload).
 */
export function useFeedListRows({
  mostRecentItem,
  firstFour,
  rest,
  activeTab,
  filteredMediaListLength,
  getFeedPlaybackKey,
}: UseFeedListRowsParams): UseFeedListRowsResult {
  const listData: FeedRow[] = useMemo(() => {
    const rows: FeedRow[] = [];
    let mediaSeq = 0;
    const usedKeys = new Set<string>();
    const uniqueKey = (base: string, fallback: string) => {
      let key = base || fallback;
      if (!key || usedKeys.has(key)) {
        key = `${fallback}-${mediaSeq}`;
      }
      usedKeys.add(key);
      return key;
    };

    if (mostRecentItem) {
      rows.push({
        rowType: "section-title",
        key: "title-most-recent",
        title: "Most Recent",
      });
      rows.push({
        rowType: "media",
        key: uniqueKey(getFeedPlaybackKey(mostRecentItem), "most-recent"),
        item: mostRecentItem,
        renderIndex: 0,
        mediaSeq: mediaSeq++,
        isHero: true,
      });
    }

    rows.push({
      rowType: "section-title",
      key: "title-all-content",
      title:
        activeTab === "ALL"
          ? `All Content (${filteredMediaListLength} items)`
          : `${activeTab} Content (${filteredMediaListLength} items)`,
    });

    firstFour.forEach((item, i) => {
      rows.push({
        rowType: "media",
        key: uniqueKey(getFeedPlaybackKey(item), `first-${i}`),
        item,
        renderIndex: i,
        mediaSeq: mediaSeq++,
      });
    });

    if (activeTab === "ALL" || activeTab === "live") {
      rows.push({ rowType: "coming-soon", key: "coming-soon" });
      rows.push({
        rowType: "spacer",
        key: "spacer-after-coming-soon",
        height: UI_CONFIG.SPACING.XL,
      });
    }

    rest.forEach((item, i) => {
      rows.push({
        rowType: "media",
        key: uniqueKey(getFeedPlaybackKey(item), `rest-${i}`),
        item,
        renderIndex: i + firstFour.length + 1,
        mediaSeq: mediaSeq++,
      });
    });

    rows.push({
      rowType: "spacer",
      key: "spacer-end",
      height: UI_CONFIG.SPACING.XXL,
    });

    return rows;
  }, [
    mostRecentItem,
    firstFour,
    rest,
    activeTab,
    filteredMediaListLength,
    getFeedPlaybackKey,
  ]);

  const heroRowKey = useMemo(() => {
    const hero = listData.find(
      (row) => row.rowType === "media" && row.isHero
    );
    return hero && hero.rowType === "media" ? hero.key : null;
  }, [listData]);

  const mediaSeqByKeyRef = useRef<Record<string, number>>({});
  const mediaKeyBySeqRef = useRef<Record<number, string>>({});
  const mediaItemBySeqRef = useRef<Record<number, MediaItem>>({});

  useEffect(() => {
    const byKey: Record<string, number> = {};
    const bySeq: Record<number, string> = {};
    const itemBySeq: Record<number, MediaItem> = {};
    let videoSeq = 0;
    for (const row of listData) {
      if (row.rowType !== "media") continue;
      if (getFeedContentKind(row.item) !== "video") continue;
      byKey[row.key] = videoSeq;
      bySeq[videoSeq] = row.key;
      itemBySeq[videoSeq] = row.item;
      videoSeq++;
    }
    mediaSeqByKeyRef.current = byKey;
    mediaKeyBySeqRef.current = bySeq;
    mediaItemBySeqRef.current = itemBySeq;
  }, [listData]);

  return {
    listData,
    mediaSeqByKeyRef,
    mediaKeyBySeqRef,
    mediaItemBySeqRef,
    heroRowKey,
  };
}
