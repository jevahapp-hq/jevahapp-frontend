/**
 * Layout for the owner-only “under review” banner on feed cards.
 *
 * FlashList pins each video row to `getFeedVideoRowSize()`. If that extra
 * height is smaller than the wrapped copy, the message is clipped. Metrics
 * here are the single source for font, padding, line-height, wrap width, and
 * the extra row space reserved on each breakpoint.
 */

export const UNDER_REVIEW_MESSAGE =
  "This content is currently under review and is only visible to you. It will be made public once approved.";

/** Overlay / in-banner chip copy — must wrap, not clip, on narrow cards. */
export const UNDER_REVIEW_BADGE_LABEL =
  "Under review · only you can see this";

/** Matches `useResponsiveOptimized`: small < 375, tablet ≥ 768, desktop ≥ 1024. */
export const UNDER_REVIEW_BREAKPOINTS = {
  smallMobile: 375,
  tablet: 768,
  desktop: 1024,
} as const;

/** Matches `UnderReviewBanner` `maxFontSizeMultiplier`. */
export const UNDER_REVIEW_MAX_FONT_MULTIPLIER = 1.2;

export type UnderReviewBreakpoint = "small" | "largeMobile" | "tablet" | "desktop";

type BannerPreset = {
  fontSize: number;
  lineHeight: number;
  padding: number;
  marginTop: number;
  marginBottom: number;
};

const PRESETS: Record<UnderReviewBreakpoint, BannerPreset> = {
  /** iPhone SE 1 / small Android — 4 wrapped lines at 12/18. */
  small: {
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  /** Common phones (375–767). */
  largeMobile: {
    fontSize: 13,
    lineHeight: 20,
    padding: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  tablet: {
    fontSize: 14,
    lineHeight: 22,
    padding: 14,
    marginTop: 8,
    marginBottom: 10,
  },
  desktop: {
    fontSize: 15,
    lineHeight: 24,
    padding: 16,
    marginTop: 8,
    marginBottom: 10,
  },
};

/** Horizontal chrome: card pad + avatar + gaps + ⋮ slot. */
const FOOTER_CHROME_X = 136;
const BORDER_WIDTH = 1;
const BADGE_FONT_SIZE = 11;
const BADGE_LINE_HEIGHT = 16;
const BADGE_PAD_Y = 4;
const BADGE_GAP = 6;
/** Font-padding / wrapping / name-row wrap slack. */
const HEIGHT_BUFFER = 20;
const MIN_TEXT_WIDTH = 148;
/** Wide glyphs (Plus Jakarta) so we over-count lines rather than clip. */
const GLYPH_WIDTH_RATIO = 0.58;

export type UnderReviewBannerMetrics = BannerPreset & {
  breakpoint: UnderReviewBreakpoint;
  textWidth: number;
  lines: number;
  boxHeight: number;
  extraRowSize: number;
  withBadge: boolean;
};

export function getUnderReviewBreakpoint(width: number): UnderReviewBreakpoint {
  if (!(width > 0) || width < UNDER_REVIEW_BREAKPOINTS.smallMobile) {
    return "small";
  }
  if (width < UNDER_REVIEW_BREAKPOINTS.tablet) return "largeMobile";
  if (width < UNDER_REVIEW_BREAKPOINTS.desktop) return "tablet";
  return "desktop";
}

/**
 * Word-aware wrap so a long last word cannot be treated as fitting on the
 * previous line (character-count math under-counts and clips the copy).
 */
export function countWrappedLines(text: string, maxCharsPerLine: number): number {
  const limit = Math.max(8, Math.floor(maxCharsPerLine));
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 1;

  let lines = 1;
  let used = 0;
  for (const word of words) {
    const wordLen = Math.max(1, word.length);
    if (used === 0) {
      used = wordLen;
    } else if (used + 1 + wordLen <= limit) {
      used += 1 + wordLen;
      continue;
    } else {
      lines += 1;
      used = wordLen;
    }
    while (used > limit) {
      lines += 1;
      used -= limit;
    }
  }
  return Math.max(1, lines);
}

function charsPerLineFor(textWidth: number, fontSize: number): number {
  const avgGlyph = Math.max(1, fontSize * GLYPH_WIDTH_RATIO);
  return Math.max(8, Math.floor(textWidth / avgGlyph));
}

function badgeBlockHeight(textWidth: number): number {
  const lines = countWrappedLines(
    UNDER_REVIEW_BADGE_LABEL,
    charsPerLineFor(textWidth, BADGE_FONT_SIZE)
  );
  return BADGE_PAD_Y * 2 + lines * BADGE_LINE_HEIGHT + BADGE_GAP;
}

export function getUnderReviewBannerMetrics(
  viewportWidth: number,
  options?: { withBadge?: boolean }
): UnderReviewBannerMetrics {
  const width = viewportWidth > 0 ? viewportWidth : 390;
  const breakpoint = getUnderReviewBreakpoint(width);
  const preset = PRESETS[breakpoint];
  const textWidth = Math.max(MIN_TEXT_WIDTH, width - FOOTER_CHROME_X);
  const lines = Math.max(
    2,
    countWrappedLines(
      UNDER_REVIEW_MESSAGE,
      charsPerLineFor(textWidth, preset.fontSize)
    )
  );
  const scaledLineHeight = Math.ceil(
    preset.lineHeight * UNDER_REVIEW_MAX_FONT_MULTIPLIER
  );
  const textHeight = lines * scaledLineHeight;
  const badgeHeight = options?.withBadge ? badgeBlockHeight(textWidth) : 0;
  const boxHeight =
    preset.padding * 2 + BORDER_WIDTH * 2 + textHeight + badgeHeight;
  const extraRowSize =
    boxHeight + preset.marginTop + preset.marginBottom + HEIGHT_BUFFER;

  return {
    breakpoint,
    ...preset,
    textWidth,
    lines,
    boxHeight,
    extraRowSize,
    withBadge: !!options?.withBadge,
  };
}

export function getUnderReviewExtraRowSize(
  viewportWidth: number,
  options?: { withBadge?: boolean }
): number {
  return getUnderReviewBannerMetrics(viewportWidth, options).extraRowSize;
}

export function getUnderReviewBannerStyles(metrics: UnderReviewBannerMetrics) {
  return {
    box: {
      width: "100%" as const,
      alignSelf: "stretch" as const,
      alignItems: "stretch" as const,
      minWidth: 0,
      flexGrow: 0,
      flexShrink: 0,
      marginTop: metrics.marginTop,
      marginBottom: metrics.marginBottom,
      backgroundColor: "#FFF7ED",
      borderColor: "#FFEDD5",
      borderWidth: BORDER_WIDTH,
      borderRadius: 8,
      paddingHorizontal: metrics.padding,
      paddingVertical: metrics.padding,
      overflow: "visible" as const,
      minHeight: metrics.boxHeight,
    },
    badge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      flexWrap: "wrap" as const,
      marginBottom: BADGE_GAP,
      maxWidth: "100%" as const,
      overflow: "visible" as const,
    },
    text: {
      width: "100%" as const,
      minWidth: 0,
      fontSize: metrics.fontSize,
      lineHeight: metrics.lineHeight,
      color: "#C2410C",
      flexGrow: 0,
      flexShrink: 1,
      overflow: "visible" as const,
      textAlign: "left" as const,
    },
  };
}

export function needsUnderReviewRowSpace(
  moderationStatus?: string | null
): boolean {
  const status = String(moderationStatus || "").trim().toLowerCase();
  return (
    status === "under_review" ||
    status === "pending" ||
    status === "in_review"
  );
}
