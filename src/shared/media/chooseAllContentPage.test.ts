import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseAllContentPage, hasForYouItems } from "./chooseAllContentPage";

test("hasForYouItems is true when media or items exist", () => {
  assert.equal(hasForYouItems({ media: [{ id: "1" }] }), true);
  assert.equal(hasForYouItems({ items: [{ id: "1" }] }), true);
  assert.equal(hasForYouItems({ media: [] }), false);
  assert.equal(hasForYouItems(null), false);
});

test("For You is preferred when it has items even if chronological exists", () => {
  const forYou = { media: [{ id: "fy" }], source: "for_you" };
  const chrono = { media: [{ id: "ch" }], source: "all_content" };
  assert.equal(chooseAllContentPage(true, forYou, chrono), forYou);
});

test("chronological is used when For You is empty", () => {
  const forYou = { media: [], items: [] };
  const chrono = { media: [{ id: "ch" }] };
  assert.equal(chooseAllContentPage(true, forYou, chrono), chrono);
});

test("chronological is used when For You is disabled", () => {
  const forYou = { media: [{ id: "fy" }] };
  const chrono = { media: [{ id: "ch" }] };
  assert.equal(chooseAllContentPage(false, forYou, chrono), chrono);
});
