import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFeedRows } from "./buildFeedRows";
import { estimateFeedOffset } from "./scrollFeedToResume";
import type { MediaItem } from "../../../../shared/types";

function item(id: string): MediaItem {
  return { _id: id, id, title: id } as MediaItem;
}

test("full All feed: most recent, first four, coming soon, then rest", () => {
  const rows = buildFeedRows({
    mostRecentItem: item("r"),
    firstFour: [item("1"), item("2"), item("3"), item("4")],
    rest: [item("5"), item("6")],
    activeTab: "ALL",
    filteredCount: 7,
    getFeedPlaybackKey: (m) => `ALL::${m._id}`,
    liteActive: false,
  });
  const types = rows.map((row) => row.rowType);
  assert.equal(types.includes("coming-soon"), true);
  assert.equal(rows.filter((row) => row.rowType === "media").length, 7);
});

test("Lite All feed never inserts Coming Soon — list stays one backbone", () => {
  const rows = buildFeedRows({
    mostRecentItem: item("r"),
    firstFour: [item("1"), item("2")],
    rest: [item("3")],
    activeTab: "ALL",
    filteredCount: 3,
    getFeedPlaybackKey: (m) => `ALL::${m._id}`,
    liteActive: true,
  });
  assert.equal(
    rows.some((row) => row.rowType === "coming-soon"),
    false
  );
});

test("estimateFeedOffset grows with section titles and media rows", () => {
  const rows = buildFeedRows({
    mostRecentItem: item("r"),
    firstFour: [item("1")],
    rest: [],
    activeTab: "ALL",
    filteredCount: 2,
    getFeedPlaybackKey: (m) => `ALL::${m._id}`,
    liteActive: true,
  });
  const mediaIndex = rows.findIndex(
    (row) => row.rowType === "media" && row.key === "ALL::1"
  );
  assert.ok(mediaIndex > 0);
  const offset = estimateFeedOffset(rows, mediaIndex);
  assert.ok(offset > 0);
  assert.equal(estimateFeedOffset(rows, 0), 0);
});

test("under-review media rows add scroll offset so the banner is not clipped", () => {
  const approved = item("a");
  const review = { ...item("u"), moderationStatus: "under_review" } as MediaItem;
  const approvedRows = buildFeedRows({
    mostRecentItem: approved,
    firstFour: [],
    rest: [],
    activeTab: "ALL",
    filteredCount: 1,
    getFeedPlaybackKey: (m) => String(m._id),
    liteActive: true,
  });
  const reviewRows = buildFeedRows({
    mostRecentItem: review,
    firstFour: [],
    rest: [],
    activeTab: "ALL",
    filteredCount: 1,
    getFeedPlaybackKey: (m) => String(m._id),
    liteActive: true,
  });
  const approvedEnd = estimateFeedOffset(approvedRows, approvedRows.length, 320);
  const reviewEnd = estimateFeedOffset(reviewRows, reviewRows.length, 320);
  assert.ok(reviewEnd > approvedEnd);
});
