import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContentOpenGraphHtml,
  buildContentShare,
  contentPublicUrl,
  contentRouteFromUrl,
} from "./contentShare.ts";

test("share message includes the title, description, and public link", () => {
  const share = buildContentShare({
    id: "abc123",
    title: "Sunday message",
    description: "A word for the week.",
  });
  assert.equal(share.title, "Sunday message");
  assert.equal(share.url, "https://jevahapp.com/content/abc123");
  assert.match(share.message, /^Sunday message/);
  assert.match(share.message, /A word for the week\./);
  assert.match(share.message, /https:\/\/jevahapp.com\/content\/abc123/);
  assert.doesNotMatch(share.message, /\.mp4|fileUrl/i);
});

test("share message omits a blank description and still includes the link", () => {
  const share = buildContentShare({ id: "abc123", title: "Sunday message" });
  assert.equal(
    share.message,
    "Sunday message\n\nhttps://jevahapp.com/content/abc123"
  );
  assert.equal(contentPublicUrl("abc123"), share.url);
});

test("open graph html carries the title, description, link, and image", () => {
  const html = buildContentOpenGraphHtml({
    id: "abc123",
    title: "Sunday message",
    description: "A word for the week.",
    imageUrl: "https://cdn.jevahapp.com/cover.jpg",
  });
  assert.match(html, /property="og:title" content="Sunday message"/);
  assert.match(html, /property="og:description" content="A word for the week\."/);
  assert.match(html, /property="og:url" content="https:\/\/jevahapp.com\/content\/abc123"/);
  assert.match(html, /property="og:image" content="https:\/\/cdn\.jevahapp\.com\/cover\.jpg"/);
  assert.match(html, /property="og:site_name" content="Jevah"/);
});

test("content links open the matching post", () => {
  assert.equal(
    contentRouteFromUrl("https://jevahapp.com/content/abc123"),
    "/content/abc123"
  );
  assert.equal(
    contentRouteFromUrl("https://www.jevahapp.com/content/abc123"),
    "/content/abc123"
  );
  assert.equal(contentRouteFromUrl("jevah://content/abc123"), "/content/abc123");
  assert.equal(
    contentRouteFromUrl("jevahapp://content/abc123"),
    "/content/abc123"
  );
  assert.equal(contentRouteFromUrl("https://example.com/content/abc123"), null);
});
