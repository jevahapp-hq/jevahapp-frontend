import type { MediaItem } from "../../../shared/types";

/**
 * A single row in the unified feed list. Most Recent, All Content, the
 * Live-Streaming promo card, and every media item live in ONE FlashList
 * `data` array so viewability tracking covers every video.
 */
export type FeedRow =
  | { rowType: "section-title"; key: string; title: string }
  | {
      rowType: "media";
      key: string;
      item: MediaItem;
      renderIndex: number;
      mediaSeq: number;
      /** True for the Most Recent hero row (fast-path mount/play). */
      isHero?: boolean;
    }
  | { rowType: "coming-soon"; key: string }
  | { rowType: "spacer"; key: string; height: number };
