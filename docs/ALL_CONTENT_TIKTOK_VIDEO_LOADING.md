# AllContentTikTok: Why Only Thumbnails Load (No Video)

Sometimes the feed in **AllContentTikTok** shows only **thumbnails** and the actual **videos don’t load**. Below is how the UI decides what to show and what usually causes thumbnail-only behavior, plus how to fix it.

---

## How the feed decides what to show

In `VideoCard` the logic is:

- **Show video** when:  
  `!failedVideoLoad && videoUrl && !isAudioSermonValue && player`
- **Otherwise** it shows the **thumbnail** (or placeholder).

So if you only see thumbnails, at least one of these is true:

1. **`videoUrl` is null/empty** – no valid video URL for playback  
2. **`failedVideoLoad` is true** – the player tried to load the video and failed  
3. **`player` is missing** – edge case (e.g. expo-video not ready)  
4. **Item is an audio sermon** – then the card uses audio + thumbnail, not `VideoView`

---

## 1. No valid video URL (`videoUrl` is null)

The app gets the video URL like this:

- **Source:** `fileUrl` → `playbackUrl` → `hlsUrl` (see `getVideoUrlFromMedia` in `src/shared/utils/videoUrlManager.ts`).
- **Validation:** URL must be a non-empty string and start with `http://` or `https://` (`isValidUri` in `src/shared/utils/contentHelpers.ts`).
- **Transform:** `transformApiResponseToMediaItem` sets  
  `fileUrl = enrichedItem.fileUrl || enrichedItem.file || enrichedItem.url || ""`.

So thumbnail-only can happen when:

- **Backend doesn’t send a playable video URL**  
  - Item has `thumbnailUrl` / `imageUrl` (so thumbnail works) but no `fileUrl` / `file` / `url`, or they’re empty.  
  - **Fix:** Ensure every video item in the API response has a playable URL in one of: `fileUrl`, `file`, or `url` (prefer `fileUrl`). Same for any “get single media” or reels endpoint.

- **Backend sends a non-http(s) URL**  
  - e.g. relative path, `file://`, or a key-only value.  
  - **Fix:** Always return absolute `https://` (or `http://`) URLs for video playback.

- **Backend sends the thumbnail URL as the “video” URL**  
  - e.g. Cloudinary `so_1` image URL used as `fileUrl`.  
  - **Fix:** Keep `fileUrl` (and equivalents) for the **video** asset only; use `thumbnailUrl` / `imageUrl` only for the poster/thumbnail.

- **Different field names**  
  - If the API uses something like `videoUrl` or `mediaUrl` and the app doesn’t map it, `fileUrl` stays empty.  
  - **Fix:** Either have the backend expose `fileUrl` (or `file` / `url`) for the video, or extend `transformApiResponseToMediaItem` to map the backend’s field into `fileUrl`.

---

## 2. Video load failed (`failedVideoLoad` is true)

The card sets `failedVideoLoad` when:

- expo-video reports **`status.status === "error"`** (load/playback error), or  
- **`handleVideoError`** runs (e.g. after analyzing the URL).

Then the card falls back to the thumbnail. Common causes:

- **Expired or invalid signed URLs**  
  - If the backend uses signed URLs (e.g. S3, CloudFront) with short TTL, by the time the user scrolls to the item the URL may be expired.  
  - **Fix:** Prefer **public** video URLs, or use long-lived signed URLs / a CDN that doesn’t require short-lived signing. The app can strip some AWS params and retry once (see `videoUrlManager`), but the robust fix is backend providing stable URLs.

- **Network / CORS / 404**  
  - Request fails (timeout, 404, CORS, etc.).  
  - **Fix:** Ensure the video URL is reachable from the app (CORS if needed), and that the file exists (no 404).

- **Wrong URL type**  
  - e.g. URL points to an image or a page that redirects.  
  - **Fix:** Ensure `fileUrl` (and any alternate playback URL) points directly to a **video** resource (e.g. `.mp4`, or HLS manifest).

- **Very slow or flaky network**  
  - Load times out or fails intermittently.  
  - **Fix:** Optimize video delivery (CDN, smaller variants, or lower initial quality). Frontend can add retries; the card already has limited retry for “retryable” URL errors.

---

## 3. Quick checks in the app

- **Log what the card receives**  
  In `VideoCard`, temporarily log for each item:  
  `fileUrl`, `thumbnailUrl`, and whether `videoUrl` (after `getVideoUrlFromMedia` + `isValidUri`) is set. That shows if the problem is “no URL” vs “URL present but load fails”.

- **Log when only thumbnail is used**  
  When you render the thumbnail branch, log once per item (e.g. `failedVideoLoad`, `videoUrl`, `isAudioSermonValue`). That confirms which condition is failing.

- **Check backend response**  
  Inspect the JSON for the feed (e.g. `/api/...` used by `getAllContentPublic`). For items that only show thumbnail, confirm:  
  - Is there a `fileUrl` (or `file` / `url`)?  
  - Is it `https://` (or `http://`)?  
  - Does it point to a video file, not an image?

---

## 4. Summary

| Cause | What you see | Fix |
|--------|----------------|-----|
| No `fileUrl` / wrong field | Thumbnail only | API must return playable video URL in `fileUrl` (or map your field to it). |
| `fileUrl` not http(s) | Thumbnail only | Return absolute `https://` (or `http://`) URLs. |
| Thumbnail URL used as video URL | Thumbnail only (or load error) | Use separate fields: video URL for playback, thumbnail for poster. |
| Expired signed URL | Thumbnail after load error | Prefer public or long-lived URLs; avoid short-lived signed URLs. |
| 404 / network / CORS | Thumbnail after load error | Ensure URL is reachable and points to a video file. |

The feed is designed to **fall back to thumbnail whenever the video URL is missing or the player reports an error**, so fixing the URL source and stability (backend + optional retries) is what makes the actual videos load consistently.

---

## 5. Redis + video delivery (IG / TikTok style)

You’re using a **Redis backend** so the feed and metadata are cached and fast. That’s the right idea; the important part is how it fits with **video playback**.

### What Redis is good for (and what it isn’t)

- **Redis is great for:**
  - Caching the **API response** (feed list, metadata, thumbnails, video URLs).
  - Fast, consistent feed loading – similar to how IG/TikTok serve the feed list quickly from cached/served data.
- **Redis does *not* typically:**
  - Store or stream the actual **video bytes**. Video files are large; they live in object storage (e.g. S3) and are delivered via a **CDN** (e.g. CloudFront, Cloudflare, or your provider’s CDN).
  - “Keep videos available” by itself – **availability** depends on the **URL** you put in the cached response.

So: **Redis makes the feed (and the URLs inside it) fast and cached. The app then uses those URLs to load video from wherever they point** (usually a CDN). If those URLs are wrong or expired, you still get thumbnail-only or load errors even with Redis.

### How platforms like IG and TikTok do it

- **Feed API:** Cached and fast (your Redis-cached response is the same idea).
- **Video playback:** The URL in each feed item points to a **stable, CDN-backed video URL** (public or long-lived). The CDN caches the video file at the edge; the app just requests that URL and the video loads.

So the pattern is:

1. **Redis (or similar)** → cache the feed API response so the list and metadata (including `fileUrl`) are returned quickly.
2. **CDN + object storage** → store and serve the actual video file. The `fileUrl` in the response should be a **CDN URL** (or a long-lived public URL), not a short-lived signed URL that expires a few minutes later.

### What to do on your backend

- **Keep using Redis** for the feed/metadata response so the app gets a fast, cached list (IG/TikTok-style).
- **Ensure the `fileUrl` (and any playback URL) in that response is:**
  - A **stable** URL: either a **public CDN URL** (e.g. `https://cdn.yourdomain.com/videos/xyz.mp4`) or a **long-lived signed URL** (e.g. hours/days, not minutes).
  - Pointing at the **video** file (e.g. CDN serving the file from S3 or your storage), not at the thumbnail or an API route that redirects.
- **Avoid:** Putting a **short-lived signed URL** (e.g. 5–15 min TTL) into the Redis-cached response. The response may be cached for a while, but when the app uses the URL later (e.g. user scrolls to the item), the signature can already be expired, so the video fails to load and you see thumbnail-only.

If you do need signed URLs for security, either:

- Use **long-lived** signed URLs when writing the response that gets cached in Redis, or  
- Don’t cache the **URL** in Redis for long; instead cache only metadata (id, title, thumbnail) and have a separate, short-cache or uncached endpoint that returns a fresh signed URL when the user opens/plays that video.

**Summary:** Redis = fast, cached feed (like IG/TikTok). Videos stay available when the URLs inside that cached response point to **stable CDN (or long-lived) video URLs**. Combine Redis for the API with CDN for video delivery, and the feed will both load fast and play videos reliably.

### Frontend implementation (retry with fresh URL)

The app implements a **retry-with-fresh-URL** flow so that when a video fails to load (e.g. expired signed URL), it asks the backend for a new playback URL and retries once:

- **MediaApi:** `getMediaById(id)` – `GET /api/media/:id` – returns the media object (e.g. fresh `fileUrl` / `playbackUrl` / `hlsUrl`).
- **VideoCard:** On load error (`status === "error"` or `handleVideoError`), it calls `mediaApi.getMediaById(contentId)`, reads a valid playback URL from the response, and sets it as the new source (and clears the failed state). The player is keyed by URL so a new source is used. This runs at most **once per card** per mount.

So the backend can cache the feed in Redis with short-lived signed URLs if needed: when playback fails, the client requests that media by ID and the backend can return a **new** signed or CDN URL (from Redis or regenerated). No need to change the cached feed; the single-item endpoint can return a fresh URL.
