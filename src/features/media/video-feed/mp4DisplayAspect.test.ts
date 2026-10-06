import assert from "node:assert/strict";
import test from "node:test";
import { displaySizeFromMp4, walkTopLevelBoxes } from "./mp4DisplayAspect.ts";

function tkhd(options: {
  version?: 0 | 1;
  width: number;
  height: number;
  turned?: boolean;
}): Uint8Array {
  const version = options.version ?? 0;
  const widthAt = version === 1 ? 96 : 84;
  const bytes = new Uint8Array(widthAt + 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, bytes.length);
  view.setUint32(4, 0x746b6864);
  view.setUint8(8, version);
  const matrixAt = widthAt - 36;
  const one = 65536;
  if (options.turned) {
    view.setInt32(matrixAt + 4, one);
    view.setInt32(matrixAt + 12, -one);
  } else {
    view.setInt32(matrixAt, one);
    view.setInt32(matrixAt + 16, one);
  }
  view.setUint32(matrixAt + 32, 0x40000000);
  view.setUint32(widthAt, Math.round(options.width * 65536));
  view.setUint32(widthAt + 4, Math.round(options.height * 65536));
  return bytes;
}

test("a sideways 9:16 phone video is read upright", () => {
  const bytes = tkhd({ width: 1920, height: 1080, turned: true });
  const size = displaySizeFromMp4(bytes);
  assert.deepEqual(size, { width: 1080, height: 1920 });
  assert.ok(Math.abs(size!.width / size!.height - 9 / 16) < 0.001);
});

test("a real landscape video stays landscape", () => {
  const size = displaySizeFromMp4(tkhd({ width: 1920, height: 1080 }));
  assert.deepEqual(size, { width: 1920, height: 1080 });
});

test("a portrait file that is already upright stays upright", () => {
  const prefix = new Uint8Array(12);
  const box = tkhd({ width: 1080, height: 1920, turned: true, version: 1 });
  const bytes = new Uint8Array(prefix.length + box.length);
  bytes.set(box, prefix.length);
  const size = displaySizeFromMp4(bytes);
  assert.deepEqual(size, { width: 1080, height: 1920 });
});

function box(type: string, payloadLength: number): Uint8Array {
  const bytes = new Uint8Array(8 + payloadLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, bytes.length);
  for (let i = 0; i < 4; i++) bytes[4 + i] = type.charCodeAt(i);
  return bytes;
}

test("a header after the media data points at the next box to read", () => {
  const ftyp = box("ftyp", 16);
  const mdatHeader = new Uint8Array(8);
  new DataView(mdatHeader.buffer).setUint32(0, 5_000_000);
  mdatHeader.set([0x6d, 0x64, 0x61, 0x74], 4);
  const slice = new Uint8Array(ftyp.length + mdatHeader.length + 64);
  slice.set(ftyp, 0);
  slice.set(mdatHeader, ftyp.length);
  const walk = walkTopLevelBoxes(slice, 0);
  assert.equal(walk.size, null);
  assert.equal(walk.nextOffset, ftyp.length + 5_000_000);
});

test("a header at the start of the slice is read in place", () => {
  const track = tkhd({ width: 1280, height: 720 });
  const moov = box("moov", track.length);
  moov.set(track, 8);
  const walk = walkTopLevelBoxes(moov, 52_000_000);
  assert.deepEqual(walk.size, { width: 1280, height: 720 });
});
