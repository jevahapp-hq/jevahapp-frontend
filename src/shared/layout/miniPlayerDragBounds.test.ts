import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampMiniPlayerTranslation,
  getMiniPlayerTranslationBounds,
} from "./miniPlayerDragBounds";

const phone = {
  screenWidth: 390,
  screenHeight: 844,
  barWidth: 366,
  barHeight: 86,
  defaultLeft: 12,
  defaultBottom: 160,
  minBottom: 120,
  topInset: 47,
  sideMargin: 12,
};

test("full-width bar cannot move horizontally", () => {
  const bounds = getMiniPlayerTranslationBounds(phone);
  assert.equal(bounds.minX, 0);
  assert.equal(bounds.maxX, 0);
});

test("cannot drag below the nav/FAB floor", () => {
  const bounds = getMiniPlayerTranslationBounds(phone);
  const down = clampMiniPlayerTranslation(0, 400, bounds);
  assert.equal(down.y, bounds.maxY);
  assert.equal(down.y, 40);
});

test("cannot drag above the top inset", () => {
  const bounds = getMiniPlayerTranslationBounds(phone);
  const up = clampMiniPlayerTranslation(0, -800, bounds);
  assert.equal(up.y, bounds.minY);
  assert.ok(up.y < 0);
});

test("rest position is inside the allowed range", () => {
  const bounds = getMiniPlayerTranslationBounds(phone);
  const rest = clampMiniPlayerTranslation(0, 0, bounds);
  assert.equal(rest.x, 0);
  assert.equal(rest.y, 0);
});

test("narrower bar can slide sideways but stays on screen", () => {
  const bounds = getMiniPlayerTranslationBounds({
    ...phone,
    barWidth: 200,
  });
  assert.ok(bounds.maxX > 0);
  const left = clampMiniPlayerTranslation(-500, 0, bounds);
  const right = clampMiniPlayerTranslation(500, 0, bounds);
  assert.equal(left.x, bounds.minX);
  assert.equal(right.x, bounds.maxX);
});
