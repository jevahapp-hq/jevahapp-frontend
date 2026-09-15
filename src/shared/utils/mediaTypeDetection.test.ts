import assert from "node:assert/strict";
import { test } from "node:test";
import {
  belongsInVideoCategory,
  detectMediaType,
  isAudioSermon,
  isEbook,
  isVideoSermon,
} from "./mediaTypeDetection";

test("sermon mediaType audio is not treated as video", () => {
  const item = {
    contentType: "sermon",
    mediaType: "audio",
    playbackUrl: "https://cdn.example/sermon.mp3",
    fileUrl: "https://cdn.example/sermon.mp3",
    title: "Control Your Thoughts",
    createdAt: new Date().toISOString(),
  } as any;
  assert.equal(detectMediaType(item), "audio");
  assert.equal(isAudioSermon(item), true);
  assert.equal(isVideoSermon(item), false);
});

test("sermon mediaType video stays video", () => {
  const item = {
    contentType: "sermon",
    mediaType: "video",
    playbackUrl: "https://cdn.example/sermon.mp4",
    fileUrl: "https://cdn.example/sermon.mp4",
    title: "Sunday Service",
    createdAt: new Date().toISOString(),
  } as any;
  assert.equal(detectMediaType(item), "video");
  assert.equal(isAudioSermon(item), false);
  assert.equal(isVideoSermon(item), true);
});

test("ebook pdfUrl is not classified as video", () => {
  const item = {
    contentType: "ebook",
    fileUrl: "https://cdn.example/fasting.pdf",
    pdfUrl: "https://cdn.example/fasting.pdf",
    title: "Fasting",
    createdAt: new Date().toISOString(),
  } as any;
  assert.equal(detectMediaType(item), "ebook");
  assert.equal(isEbook(item), true);
  assert.equal(isAudioSermon(item), false);
});

test("VIDEO category excludes audio sermons and keeps video sermons", () => {
  const audioSermon = {
    contentType: "sermon",
    mediaType: "audio",
    fileUrl: "https://cdn.example/sermon.mp3",
    title: "Audio sermon",
    createdAt: new Date().toISOString(),
  } as any;
  const videoSermon = {
    contentType: "sermon",
    mediaType: "video",
    fileUrl: "https://cdn.example/sermon.mp4",
    title: "Video sermon",
    createdAt: new Date().toISOString(),
  } as any;
  const clip = {
    contentType: "videos",
    fileUrl: "https://cdn.example/clip.mp4",
    title: "Clip",
    createdAt: new Date().toISOString(),
  } as any;
  assert.equal(belongsInVideoCategory(audioSermon), false);
  assert.equal(belongsInVideoCategory(videoSermon), true);
  assert.equal(belongsInVideoCategory(clip), true);
});
