import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fixOverEncodedMediaUrl,
  getBestVideoUrl,
  getVideoUrlFromMedia,
  isRetryableVideoSourceError,
  isVideoCacheUnsupportedError,
  toExpoVideoSource,
} from "./videoUrlManager";

const DOUBLE_ENCODED =
  "https://pub-17c463321ed44e22ba0d23a3505140ac.r2.dev/jevah/media-videos/YOU%2520WILL%2520TAKE%2520FASTING%2520%2526%2520PRAYER%2520SERIOUSLY%2520AFTER%2520HEARING%2520THIS%2520-%2520POWER%2520OF%2520FASTING%2520-%2520APOSTLE%2520AROME%2520OSAYI.mp4";
const SINGLE_ENCODED =
  "https://pub-17c463321ed44e22ba0d23a3505140ac.r2.dev/jevah/media-videos/YOU%20WILL%20TAKE%20FASTING%20%26%20PRAYER%20SERIOUSLY%20AFTER%20HEARING%20THIS%20-%20POWER%20OF%20FASTING%20-%20APOSTLE%20AROME%20OSAYI.mp4";

test("does not cache HLS sources (iOS VideoCacheUnsupported)", () => {
  const source = toExpoVideoSource(
    "https://cdn.example.com/v/clip.m3u8?token=1"
  );
  assert.deepEqual(source, {
    uri: "https://cdn.example.com/v/clip.m3u8?token=1",
    useCaching: false,
    contentType: "hls",
  });
});

test("caches progressive mp4 by default", () => {
  const source = toExpoVideoSource("https://cdn.example.com/v/clip.mp4");
  assert.deepEqual(source, {
    uri: "https://cdn.example.com/v/clip.mp4",
    useCaching: true,
    contentType: "progressive",
  });
});

test("can force-disable cache on progressive sources for retry", () => {
  const source = toExpoVideoSource("https://cdn.example.com/v/clip.mp4", {
    useCaching: false,
  });
  assert.equal(source?.useCaching, false);
  assert.equal(source?.contentType, "progressive");
});

test("detects nested VideoCacheUnsupported player errors", () => {
  assert.equal(
    isVideoCacheUnsupportedError({
      error: {
        message:
          "Failed to load the player item: The operation couldn’t be completed. (ExpoVideo.VideoCacheUnsupported error 0.)",
      },
    }),
    true
  );
  assert.equal(isVideoCacheUnsupportedError(new Error("network")), false);
});

test("undoubles R2 paths so spaces and ampersands resolve", () => {
  assert.equal(fixOverEncodedMediaUrl(DOUBLE_ENCODED), SINGLE_ENCODED);
  assert.equal(fixOverEncodedMediaUrl(SINGLE_ENCODED), SINGLE_ENCODED);
});

test("leaves query strings intact while undoubling the path", () => {
  const signed =
    "https://cdn.example.com/v/The%2520Power%2520of%2520Faith.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&x-id=GetObject";
  assert.equal(
    fixOverEncodedMediaUrl(signed),
    "https://cdn.example.com/v/The%20Power%20of%20Faith.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&x-id=GetObject"
  );
});

test("getBestVideoUrl and getVideoUrlFromMedia feed the player the single-encoded path", () => {
  assert.equal(getBestVideoUrl(DOUBLE_ENCODED), SINGLE_ENCODED);
  assert.equal(
    getVideoUrlFromMedia({
      fileUrl: DOUBLE_ENCODED,
      fileMimeType: "video/mp4",
      mediaType: "video",
      contentType: "videos",
    }),
    SINGLE_ENCODED
  );
});

test("toExpoVideoSource undoubles before caching a progressive file", () => {
  const source = toExpoVideoSource(DOUBLE_ENCODED);
  assert.equal(source?.uri, SINGLE_ENCODED);
  assert.equal(source?.useCaching, true);
  assert.equal(source?.contentType, "progressive");
});

test("retries 404 and damaged cache instead of tearing down the player", () => {
  assert.equal(
    isRetryableVideoSourceError({
      message: "Failed to load the player item: The requested URL was not found on this server.",
    }),
    true
  );
  assert.equal(
    isRetryableVideoSourceError({
      error: {
        localizedDescription: "This media may be damaged.",
        message: "expo-video-cache://cdn.example.com/clip.mp4",
      },
    }),
    true
  );
  assert.equal(isRetryableVideoSourceError(new Error("network")), false);
});
