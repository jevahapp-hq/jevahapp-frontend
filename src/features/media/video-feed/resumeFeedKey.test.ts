import assert from "node:assert/strict";
import { test } from "node:test";
import type { FeedRow } from "../AllContentTikTok/types";
import type { MediaItem } from "../../../shared/types";
import {
  ensureTabPrefixedFeedKey,
  findMediaRowIndex,
  playbackKeyToContentKey,
  feedTabFromResumeKey,
  isHomeOriginReelsSource,
  remapResumeFeedKey,
  resolveFeedResumeKey,
  resolveReturnHomeCategory,
} from "./resumeFeedKey";

function media(id: string, key = `ALL::${id}`): FeedRow {
  return {
    rowType: "media",
    key,
    item: { _id: id, id, title: id } as MediaItem,
    renderIndex: 0,
    mediaSeq: 0,
  };
}

test("playbackKeyToContentKey strips the tab prefix", () => {
  assert.equal(playbackKeyToContentKey("ALL::abc"), "abc");
  assert.equal(playbackKeyToContentKey("videos::file::path"), "file::path");
  assert.equal(playbackKeyToContentKey("abc"), "abc");
});

test("remapResumeFeedKey keeps the tab and retargets the exit video", () => {
  assert.equal(remapResumeFeedKey("ALL::first", "second"), "ALL::second");
  assert.equal(remapResumeFeedKey("videos::first", "second"), "videos::second");
  assert.equal(remapResumeFeedKey("first", "second"), "second");
  assert.equal(remapResumeFeedKey(undefined, "second"), undefined);
});

test("feedTabFromResumeKey reads the category prefix", () => {
  assert.equal(feedTabFromResumeKey("ALL::abc"), "ALL");
  assert.equal(feedTabFromResumeKey("videos::abc"), "videos");
  assert.equal(feedTabFromResumeKey("abc"), null);
  assert.equal(feedTabFromResumeKey(undefined), null);
});

test("ensureTabPrefixedFeedKey keeps or adds the category prefix", () => {
  assert.equal(
    ensureTabPrefixedFeedKey("sermon::first", "second", "ALL"),
    "sermon::second"
  );
  assert.equal(
    ensureTabPrefixedFeedKey("bare-id", "next", "videos"),
    "videos::next"
  );
  assert.equal(
    ensureTabPrefixedFeedKey(undefined, "abc", "e-books"),
    "e-books::abc"
  );
  assert.equal(ensureTabPrefixedFeedKey(undefined, "abc"), "abc");
});

test("resolveReturnHomeCategory prefers feed tab, then category, then stored", () => {
  assert.equal(
    resolveReturnHomeCategory("sermon::abc", "videos", "ALL"),
    "sermon"
  );
  assert.equal(resolveReturnHomeCategory("abc", "LIVE", "ALL"), "LIVE");
  assert.equal(resolveReturnHomeCategory(undefined, "", "e-books"), "e-books");
  assert.equal(resolveReturnHomeCategory(undefined, null, null), "ALL");
});

test("isHomeOriginReelsSource is true for Home category sources only", () => {
  assert.equal(isHomeOriginReelsSource("AllContentTikTok"), true);
  assert.equal(isHomeOriginReelsSource("SermonComponent"), true);
  assert.equal(isHomeOriginReelsSource(undefined), true);
  assert.equal(isHomeOriginReelsSource("AllLibrary"), false);
  assert.equal(isHomeOriginReelsSource("Downloads"), false);
  assert.equal(isHomeOriginReelsSource("ExploreSearch"), false);
});

test("findMediaRowIndex matches prefixed keys and raw ids", () => {
  const rows: FeedRow[] = [
    { rowType: "section-title", key: "title", title: "Most Recent" },
    media("aaa"),
    media("bbb"),
  ];
  assert.equal(findMediaRowIndex(rows, "ALL::bbb"), 2);
  assert.equal(findMediaRowIndex(rows, "bbb", "bbb"), 2);
  assert.equal(findMediaRowIndex(rows, null, "aaa"), 1);
  assert.equal(findMediaRowIndex(rows, "missing"), -1);
});

test("resolveFeedResumeKey prefers a key that exists in the list", () => {
  const listData: FeedRow[] = [
    { rowType: "section-title", key: "title", title: "All" },
    media("aaa"),
    media("bbb"),
  ];
  assert.equal(
    resolveFeedResumeKey({
      storeFeedKey: "bbb",
      blurFeedKey: "ALL::aaa",
      contentId: "bbb",
      listData,
    }),
    "ALL::bbb"
  );
  assert.equal(
    resolveFeedResumeKey({
      storeFeedKey: "ALL::bbb",
      blurFeedKey: "ALL::aaa",
      listData,
    }),
    "ALL::bbb"
  );
});

test("resolveFeedResumeKey does not return a key missing from the list", () => {
  const listData: FeedRow[] = [
    { rowType: "section-title", key: "title", title: "All" },
    media("aaa"),
    media("bbb"),
  ];
  assert.equal(
    resolveFeedResumeKey({
      storeFeedKey: "ALL::zzz",
      blurFeedKey: "ALL::missing",
      contentId: "zzz",
      listData,
    }),
    null
  );
});
