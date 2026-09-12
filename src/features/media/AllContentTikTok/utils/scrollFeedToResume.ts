import { getFeedVideoRowSize } from "../../video-feed/feedVideoConfig";
import type { FeedRow } from "../types";

export function estimateFeedOffset(
  listData: FeedRow[],
  index: number,
  viewportWidth = 390
): number {
  let offset = 0;
  const end = Math.max(0, Math.min(index, listData.length));
  for (let i = 0; i < end; i++) {
    const row = listData[i];
    if (!row) break;
    switch (row.rowType) {
      case "spacer":
        offset += row.height;
        break;
      case "section-title":
        offset += 48;
        break;
      case "coming-soon":
        offset += 320;
        break;
      case "media":
        offset += getFeedVideoRowSize({
          moderationStatus: row.item?.moderationStatus,
          viewportWidth,
        });
        break;
      default:
        break;
    }
  }
  return offset;
}

export function scrollFeedToResume(
  listRef: { current?: { scrollToOffset?: Function; scrollToIndex?: Function } } | undefined,
  listData: FeedRow[] | undefined,
  index: number
): void {
  if (!listRef?.current || !listData || index < 0) return;
  const offset = estimateFeedOffset(listData, index);
  try {
    if (typeof listRef.current.scrollToOffset === "function") {
      listRef.current.scrollToOffset({ offset, animated: false });
      return;
    }
    listRef.current.scrollToIndex?.({
      index,
      animated: false,
      viewPosition: 0,
    });
  } catch {
    /* FlashList may not have measured yet. */
  }
}
