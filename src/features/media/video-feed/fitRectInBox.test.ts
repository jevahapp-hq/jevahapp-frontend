import assert from "node:assert/strict";
import { test } from "node:test";
import { fitRectInBox } from "./fitRectInBox";

test("portrait 9:16 fits a landscape box without overflow", () => {
  const fitted = fitRectInBox(9 / 16, 1920, 1080);
  assert.equal(fitted.height, 1080);
  assert.ok(fitted.width < 1920);
  assert.ok(Math.abs(fitted.width / fitted.height - 9 / 16) < 0.001);
});

test("landscape 16:9 fits a portrait fullscreen box without overflow", () => {
  const fitted = fitRectInBox(16 / 9, 390, 844);
  assert.equal(fitted.width, 390);
  assert.ok(fitted.height < 844);
  assert.ok(Math.abs(fitted.width / fitted.height - 16 / 9) < 0.001);
});

test("square images sit inside the box on both axes", () => {
  const fitted = fitRectInBox(1, 400, 400);
  assert.deepEqual(fitted, { width: 400, height: 400 });
  const tablet = fitRectInBox(1, 768, 1024);
  assert.equal(tablet.width, 768);
  assert.equal(tablet.height, 768);
});

test("very large source dimensions still fit the viewport", () => {
  const fitted = fitRectInBox(8000 / 2000, 390, 844);
  assert.ok(fitted.width <= 390);
  assert.ok(fitted.height <= 844);
  assert.equal(fitted.width, 390);
});

test("invalid sizes fall back to the box", () => {
  assert.deepEqual(fitRectInBox(0, 400, 400), { width: 400, height: 400 });
  assert.deepEqual(fitRectInBox(1.5, 0, 400), { width: 0, height: 400 });
});
