import type { ContentType, MediaItem } from "../../../shared/types";

export interface AllContentTikTokProps {
  contentType?: ContentType | "ALL";
  /** When true, fetches from authenticated endpoint so user's uploads appear in feed */
  useAuthFeed?: boolean;
  /**
   * When false (hidden category pane), don't autoplay / steal the global
   * player. Feed stays mounted so scroll + surfaces survive tab switches.
   */
  isFeedActive?: boolean;
  /**
   * Keep video surfaces mounted while this feed is hidden so returning
   * to the category isn't a white remount.
   */
  keepVideoDecoders?: boolean;
}

export type FeedRow =
  | { rowType: "section-title"; key: string; title: string }
  | { rowType: "media"; key: string; item: MediaItem; renderIndex: number; mediaSeq: number }
  | { rowType: "coming-soon"; key: string }
  | { rowType: "spacer"; key: string; height: number };
