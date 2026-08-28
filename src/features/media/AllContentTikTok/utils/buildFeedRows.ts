import type { ContentType, MediaItem } from "../../../../shared/types";
import type { FeedRow } from "../types";

/** UI_CONFIG.SPACING.XL / XXL — inlined so this module stays RN-free for tests. */
const SPACER_AFTER_COMING_SOON = 32;
const SPACER_END = 48;

export function buildFeedRows(params: {
  mostRecentItem: MediaItem | null;
  firstFour: MediaItem[];
  rest: MediaItem[];
  activeTab: ContentType | "ALL";
  filteredCount: number;
  getFeedPlaybackKey: (item: MediaItem) => string;
  liteActive: boolean;
}): FeedRow[] {
  const {
    mostRecentItem,
    firstFour,
    rest,
    activeTab,
    filteredCount,
    getFeedPlaybackKey,
    liteActive,
  } = params;

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
    });
  }

  rows.push({
    rowType: "section-title",
    key: "title-all-content",
    title:
      activeTab === "ALL"
        ? `All Content (${filteredCount} items)`
        : `${activeTab} Content (${filteredCount} items)`,
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

  if (!liteActive && (activeTab === "ALL" || activeTab === "live")) {
    rows.push({ rowType: "coming-soon", key: "coming-soon" });
    rows.push({
      rowType: "spacer",
      key: "spacer-after-coming-soon",
      height: SPACER_AFTER_COMING_SOON,
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
    height: SPACER_END,
  });

  return rows;
}

export function indexMediaRows(listData: FeedRow[]) {
  const byKey: Record<string, number> = {};
  const bySeq: Record<number, string> = {};
  const itemBySeq: Record<number, MediaItem> = {};
  for (const row of listData) {
    if (row.rowType === "media") {
      byKey[row.key] = row.mediaSeq;
      bySeq[row.mediaSeq] = row.key;
      itemBySeq[row.mediaSeq] = row.item;
    }
  }
  return { byKey, bySeq, itemBySeq };
}
