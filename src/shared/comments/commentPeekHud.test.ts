import assert from "node:assert/strict";
import { test } from "node:test";
import { isCommentPeekHudVisible } from "./commentPeekHud";

test("peek HUD is on only while the sheet is open and not dismissing", () => {
  assert.equal(isCommentPeekHudVisible(true, false), true);
});

test("HUD is gone the moment dismiss starts — even if isVisible is still true", () => {
  assert.equal(isCommentPeekHudVisible(true, true), false);
});

test("HUD stays off when the sheet is closed", () => {
  assert.equal(isCommentPeekHudVisible(false, false), false);
  assert.equal(isCommentPeekHudVisible(false, true), false);
});
