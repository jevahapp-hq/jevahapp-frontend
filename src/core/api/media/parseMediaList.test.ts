import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMediaListPayload } from "./parseMediaList";

test("parses typed catalog data.items (sermons / ebooks)", () => {
  const parsed = parseMediaListPayload({
    success: true,
    data: {
      success: true,
      data: {
        items: [{ id: "s1", contentType: "sermon" }],
        total: 1,
        pagination: { page: 1, limit: 12, total: 1, pages: 1 },
      },
    },
  });
  assert.equal(parsed.media.length, 1);
  assert.equal(parsed.media[0].id, "s1");
  assert.equal(parsed.total, 1);
  assert.equal(parsed.page, 1);
  assert.equal(parsed.limit, 12);
});

test("parses legacy default-content data.content", () => {
  const parsed = parseMediaListPayload({
    success: true,
    data: {
      success: true,
      data: {
        content: [{ id: "c1", contentType: "video" }],
        pagination: { page: 1, limit: 12, total: 1, pages: 1 },
      },
    },
  });
  assert.equal(parsed.media.length, 1);
  assert.equal(parsed.media[0].id, "c1");
});

test("parses sermons and ebooks arrays", () => {
  const sermons = parseMediaListPayload({
    success: true,
    data: { sermons: [{ id: "s1", contentType: "sermon" }], total: 1 },
  });
  assert.equal(sermons.media.length, 1);
  assert.equal(sermons.media[0].id, "s1");

  const ebooks = parseMediaListPayload({
    success: true,
    data: { ebooks: [{ id: "e1", contentType: "ebook" }], total: 1 },
  });
  assert.equal(ebooks.media.length, 1);
  assert.equal(ebooks.media[0].id, "e1");
});

test("parses music tracks array at data.tracks", () => {
  const parsed = parseMediaListPayload({
    success: true,
    data: {
      tracks: [{ id: "t1" }],
      total: 1,
    },
  });
  assert.equal(parsed.media.length, 1);
  assert.equal(parsed.media[0].id, "t1");
});
