import assert from "node:assert/strict";
import { test } from "node:test";
import {
  UNDER_REVIEW_MAX_FONT_MULTIPLIER,
  UNDER_REVIEW_MESSAGE,
  countWrappedLines,
  getUnderReviewBannerMetrics,
  getUnderReviewBannerStyles,
  getUnderReviewBreakpoint,
  getUnderReviewExtraRowSize,
  needsUnderReviewRowSpace,
} from "./underReviewBannerLayout";

/** Supported surfaces from the ticket: small/large phone, tablet, desktop. */
const VIEWPORTS = {
  se1: 320,
  androidSmall: 360,
  se2: 375,
  iphone14: 390,
  largePhone: 430,
  tablet: 768,
  tabletLandscape: 1024,
  desktop: 1280,
  wideDesktop: 1440,
} as const;

test("keeps the full review-status message (not a truncated sentence)", () => {
  assert.match(UNDER_REVIEW_MESSAGE, /currently under review/i);
  assert.match(UNDER_REVIEW_MESSAGE, /only visible to you/i);
  assert.match(UNDER_REVIEW_MESSAGE, /made public once approved/i);
  assert.equal(UNDER_REVIEW_MESSAGE.includes("…"), false);
  assert.equal(UNDER_REVIEW_MESSAGE.includes("..."), false);
  assert.equal(
    UNDER_REVIEW_MESSAGE.endsWith("only visible to you."),
    false,
    "details-modal used to drop the 'made public' sentence"
  );
});

test("maps small/large mobile, tablet, and desktop breakpoints", () => {
  assert.equal(getUnderReviewBreakpoint(320), "small");
  assert.equal(getUnderReviewBreakpoint(360), "small");
  assert.equal(getUnderReviewBreakpoint(374), "small");
  assert.equal(getUnderReviewBreakpoint(375), "largeMobile");
  assert.equal(getUnderReviewBreakpoint(430), "largeMobile");
  assert.equal(getUnderReviewBreakpoint(767), "largeMobile");
  assert.equal(getUnderReviewBreakpoint(768), "tablet");
  assert.equal(getUnderReviewBreakpoint(1023), "tablet");
  assert.equal(getUnderReviewBreakpoint(1024), "desktop");
  assert.equal(getUnderReviewBreakpoint(1280), "desktop");
  assert.equal(getUnderReviewBreakpoint(1440), "desktop");
});

test("treats missing/zero/invalid width as small-phone wrapping, not a crash", () => {
  assert.equal(getUnderReviewBreakpoint(0), "small");
  assert.equal(getUnderReviewBreakpoint(-1), "small");
  assert.equal(getUnderReviewBreakpoint(Number.NaN), "small");
  const metrics = getUnderReviewBannerMetrics(0);
  assert.ok(metrics.extraRowSize > 0);
  assert.ok(metrics.lines >= 2);
  assert.ok(getUnderReviewBannerMetrics(-40).extraRowSize > 0);
});

test("word wrap counts extra lines when the last word will not fit", () => {
  assert.equal(countWrappedLines("one two three", 8), 2);
  assert.equal(countWrappedLines("approved.", 8), 2);
  assert.ok(countWrappedLines(UNDER_REVIEW_MESSAGE, 20) >= 5);
  assert.ok(
    countWrappedLines(UNDER_REVIEW_MESSAGE, 20) >=
      Math.ceil(UNDER_REVIEW_MESSAGE.length / 20)
  );
});

test("extra row height covers wrapped, font-scaled lines on every viewport", () => {
  for (const [name, width] of Object.entries(VIEWPORTS)) {
    const metrics = getUnderReviewBannerMetrics(width);
    const scaledLine = Math.ceil(
      metrics.lineHeight * UNDER_REVIEW_MAX_FONT_MULTIPLIER
    );
    const textBlock = metrics.lines * scaledLine;
    const chrome =
      metrics.padding * 2 +
      2 +
      metrics.marginTop +
      metrics.marginBottom;
    assert.ok(
      metrics.extraRowSize >= textBlock + chrome,
      `${name} (${width}): extra ${metrics.extraRowSize} < text+chrome ${textBlock + chrome}`
    );
    assert.ok(
      metrics.lineHeight >= Math.ceil(metrics.fontSize * 1.4),
      `${name}: line-height ${metrics.lineHeight} too tight for ${metrics.fontSize}px`
    );
    assert.ok(metrics.fontSize >= 12);
    assert.ok(metrics.padding >= 10);
    assert.ok(metrics.lines >= 2);
    assert.ok(metrics.boxHeight >= textBlock);
  }
});

test("small phones reserve more than the old 72px extra that clipped the copy", () => {
  for (const width of [VIEWPORTS.se1, VIEWPORTS.androidSmall]) {
    const extra = getUnderReviewExtraRowSize(width);
    assert.ok(extra > 72, `width ${width} extra was ${extra}`);
    const metrics = getUnderReviewBannerMetrics(width);
    assert.ok(metrics.lines >= 3, `width ${width} only wrapped to ${metrics.lines}`);
  }
});

test("narrower viewports never reserve less extra than a comfortable 2-line floor", () => {
  const extras = Object.values(VIEWPORTS).map((width) =>
    getUnderReviewExtraRowSize(width)
  );
  for (const extra of extras) {
    assert.ok(extra >= 96, `extra ${extra} fell below the 96px floor`);
  }
  assert.ok(
    getUnderReviewExtraRowSize(VIEWPORTS.se1) >=
      getUnderReviewExtraRowSize(VIEWPORTS.desktop)
  );
});

test("badge variant adds space; banner statuses match extra-row reservation", () => {
  const plain = getUnderReviewExtraRowSize(390);
  const withBadge = getUnderReviewExtraRowSize(390, { withBadge: true });
  assert.ok(withBadge > plain);
  assert.equal(needsUnderReviewRowSpace("approved"), false);
  assert.equal(needsUnderReviewRowSpace(""), false);
  assert.equal(needsUnderReviewRowSpace(null), false);
  assert.equal(needsUnderReviewRowSpace(undefined), false);
  assert.equal(needsUnderReviewRowSpace("under_review"), true);
  assert.equal(needsUnderReviewRowSpace("pending"), true);
  assert.equal(needsUnderReviewRowSpace("in_review"), true);
  assert.equal(
    needsUnderReviewRowSpace("rejected"),
    false,
    "rejected uses the overlay chip, not the footer banner"
  );
});

test("banner styles wrap instead of shrinking or clipping", () => {
  for (const width of Object.values(VIEWPORTS)) {
    const styles = getUnderReviewBannerStyles(getUnderReviewBannerMetrics(width));
    assert.equal(styles.box.overflow, "visible");
    assert.equal(styles.box.width, "100%");
    assert.equal(styles.box.minWidth, 0);
    assert.equal(styles.box.flexShrink, 0);
    assert.equal(styles.text.overflow, "visible");
    assert.equal(styles.text.flexShrink, 1);
    assert.equal(styles.text.width, "100%");
    assert.equal(styles.text.minWidth, 0);
    assert.ok(!("maxHeight" in styles.box));
    assert.ok(!("height" in styles.box));
    assert.ok(styles.box.minHeight >= styles.text.lineHeight * 2);
    assert.ok(styles.box.paddingVertical >= 10);
    assert.ok(styles.box.paddingHorizontal >= 10);
  }
});
