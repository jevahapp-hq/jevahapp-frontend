# Backend Engagement Alignment — TikTok / Instagram Parity

**Audience:** Backend team  
**Purpose:** Single source of truth for what the Jevah **mobile frontend now calls** and what the backend must implement, fix, or deprecate for feed + copyright-free engagement — and what is still missing for TikTok/IG-style product behavior.  
**Status:** Authoritative as of frontend engagement integration (March 2026)  
**Related frontend docs:** `ENGAGEMENT.md`, `WEBSOCKETS.md`, `COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md`, `COMMENT_SYSTEM_BACKEND_IMPLEMENTATION_GUIDE.md`

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Two engagement stacks (do not mix)](#2-two-engagement-stacks-do-not-mix)
3. [What the frontend now sends (March 2026)](#3-what-the-frontend-now-sends-march-2026)
4. [Feed content — required endpoints](#4-feed-content--required-endpoints)
5. [Copyright-free music — required endpoints](#5-copyright-free-music--required-endpoints)
6. [Comments — required endpoints](#6-comments--required-endpoints)
7. [WebSockets — required events](#7-websockets--required-events)
8. [Legacy endpoints to deprecate or remove](#8-legacy-endpoints-to-deprecate-or-remove)
9. [Breaking / contract fixes backend must ship](#9-breaking--contract-fixes-backend-must-ship)
10. [TikTok / IG features still missing on backend](#10-tiktok--ig-features-still-missing-on-backend)
11. [Rate limits & error codes](#11-rate-limits--error-codes)
12. [SDK (`packages/jevah-js-sdk`) gaps](#12-sdk-packagesjevah-js-sdk-gaps)
13. [Migration checklist](#13-migration-checklist)
14. [QA test plan (backend + frontend)](#14-qa-test-plan-backend--frontend)

---

## 1. Executive summary

The frontend has been aligned to the **canonical engagement guide** (feed `/api/content/*` vs copyright-free `/api/audio/copyright-free/*`). Backend must:

| Priority | Action |
|----------|--------|
| **P0** | Accept `POST /api/content/batch-metadata` body `{ items: [{ contentType, contentId }] }` |
| **P0** | Serve `POST /api/content/:type/:id/share` (not `/api/interactions/share`) |
| **P0** | Return `{ counted: boolean }` on view endpoints; honor dedupe without inflating UI |
| **P0** | Accept `deviceId` + `sessionId` on anonymous feed views |
| **P1** | Unify comment write path on `/api/content/:type/:id/comment` |
| **P1** | Implement `PATCH` / `DELETE` on `/api/content/comments/:commentId` |
| **P1** | Copyright-free `POST …/:songId/share` |
| **P2** | Deprecate legacy `/api/media/interactions/*`, `/api/comments`, `/api/interactions/share` |
| **P2** | Algorithmic feed, impressions, follow graph (TikTok/IG parity) |

---

## 2. Two engagement stacks (do not mix)

| | Feed content | Copyright-free music |
|---|---|---|
| **Content** | User uploads: video, audio, ebook, podcast, merch, devotional | Curated royalty-free library |
| **Collections** | `Media`, `Devotional`, etc. | `CopyrightFreeSong` |
| **Base path** | `/api/content/*` | `/api/audio/copyright-free/*` |
| **Comments** | Yes | **No** |
| **Batch metadata** | `POST /api/content/batch-metadata` | Per-song `GET …/:songId` only |
| **View auth** | Optional (`deviceId` / `sessionId`) | **Required** |
| **Like storage** | `Like` + Redis fast path | `CopyrightFreeSongInteraction.hasLiked` |

**Rule:** Never resolve copyright-free song engagement through `Media` or `/api/content/media/:id/*`.

---

## 3. What the frontend now sends (March 2026)

### 3.1 Batch metadata (feed list hydration)

```http
POST /api/content/batch-metadata
Authorization: Bearer <token>   # optional but recommended for userInteraction
Content-Type: application/json

{
  "items": [
    { "contentType": "media", "contentId": "507f1f77bcf86cd799439011" },
    { "contentType": "ebook", "contentId": "507f1f77bcf86cd799439012" },
    { "contentType": "podcast", "contentId": "507f1f77bcf86cd799439013" },
    { "contentType": "media", "contentId": "507f1f77bcf86cd799439014" }
  ]
}
```

**Frontend mapping** (`contentType` in URL path segment):

| Feed tag | Sent as `contentType` |
|----------|------------------------|
| video, audio, music, live | `media` |
| ebook, books | `ebook` |
| podcast | `podcast` |
| sermon, sermon, teachings | `media` (devotional path rejected by live API) |
| merch | `merch` |

**Do not accept** the old shape `{ contentIds: string[], contentType: "media" }` as the only format — mixed-type feeds require `items[]`.

**Expected response** (per item, keyed by id or array):

```json
{
  "success": true,
  "data": {
    "507f1f77bcf86cd799439011": {
      "id": "507f1f77bcf86cd799439011",
      "likes": 10,
      "saves": 2,
      "shares": 1,
      "views": 42,
      "comments": 5,
      "userInteraction": {
        "liked": true,
        "saved": false,
        "shared": false,
        "viewed": true
      }
    }
  }
}
```

Also accept `userInteractions` (plural) — frontend normalizes both.

---

### 3.2 Feed share

```http
POST /api/content/:contentType/:contentId/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "platform": "whatsapp"
}
```

`platform` examples: `whatsapp`, `internal`, `copy`, activity type from OS share sheet.

**Frontend only calls this after** the user completes native share (`Share.sharedAction`).

**Expected response:**

```json
{
  "success": true,
  "data": {
    "shared": true,
    "shareCount": 5,
    "platform": "whatsapp"
  }
}
```

---

### 3.3 Feed view

```http
POST /api/content/:contentType/:contentId/view
Content-Type: application/json

{
  "durationMs": 5000,
  "progressPct": 30,
  "isComplete": false,
  "source": "feed",
  "deviceId": "device_1740000000_abc123",
  "sessionId": "session_1740000000_xyz789"
}
```

| Field | Notes |
|-------|--------|
| `source` | `feed`, `reels`, `detail` — frontend sets per screen |
| `deviceId` | Stable per install (AsyncStorage) |
| `sessionId` | Per app session |
| `progressPct` | `0–100` or `0–1` |

**Expected response:**

```json
{
  "success": true,
  "data": {
    "viewCount": 43,
    "hasViewed": true,
    "counted": true
  }
}
```

**Critical:** When deduped or below threshold, return `"counted": false`. Frontend **will not** bump the UI counter when `counted` is false.

**Qualification thresholds:**

| Kind | Counts when |
|------|-------------|
| Video / reels | ≥ 3 s **or** ≥ 25% progress **or** complete |
| Audio / podcast | ≥ 10 s **or** ≥ 20% progress **or** complete |
| Ebook / devotional | ≥ 10 s **or** ≥ 10% progress **or** complete |

**Dedupe:** 1 counted view per user/device/session per content per **hour** (anonymous uses `deviceId` / `sessionId`).

---

### 3.4 Feed like (unchanged but confirm)

```http
POST /api/content/:contentType/:contentId/like
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "data": { "liked": true, "likeCount": 11 }
}
```

Toggle — same endpoint for like and unlike. `liked` is state **after** toggle.

---

### 3.5 Comments

**List:**

```http
GET /api/content/:contentType/:contentId/comments?page=1&limit=20&sortBy=newest
```

**Add (frontend now uses this, not `POST /api/comments`):**

```http
POST /api/content/:contentType/:contentId/comment
Authorization: Bearer <token>

{
  "content": "Great message!",
  "parentCommentId": "optional-for-replies"
}
```

**Edit:**

```http
PATCH /api/content/comments/:commentId
{ "content": "Updated text" }
```

**Delete:**

```http
DELETE /api/content/comments/:commentId
```

**Comment like:**

```http
POST /api/interactions/comments/:commentId/reaction
{ "reactionType": "like" }
```

---

### 3.6 Copyright-free

| Action | Method | Path |
|--------|--------|------|
| Hydrate | GET | `/api/audio/copyright-free/:songId` |
| Like | POST | `/api/audio/copyright-free/:songId/like` |
| Share | POST | `/api/audio/copyright-free/:songId/share` |
| View | POST | `/api/audio/copyright-free/:songId/view` |

Share body: `{ "platform": "internal" }`  
View body: `{ "durationMs", "progressPct", "isComplete" }` — auth required  
View threshold: ≥ 3 s or ≥ 25% or complete; **lifetime** dedupe per user per song

Share response should include:

```json
{
  "success": true,
  "data": {
    "shareCount": 3,
    "likeCount": 10,
    "viewCount": 42
  }
}
```

Enforce `viewCount >= likeCount` on all copyright-free responses.

---

## 4. Feed content — required endpoints

| Action | Method | Path | Auth |
|--------|--------|------|------|
| Like / unlike | POST | `/api/content/:contentType/:contentId/like` | Required |
| Share | POST | `/api/content/:contentType/:contentId/share` | Required |
| View | POST | `/api/content/:contentType/:contentId/view` | Optional* |
| Metadata | GET | `/api/content/:contentType/:contentId/metadata` | Optional |
| Batch metadata | POST | `/api/content/batch-metadata` | Optional |
| Add comment | POST | `/api/content/:contentType/:contentId/comment` | Required |
| List comments | GET | `/api/content/:contentType/:contentId/comments` | Public |
| Edit comment | PATCH | `/api/content/comments/:commentId` | Owner |
| Delete comment | DELETE | `/api/content/comments/:commentId` | Owner |
| Report comment | POST | `/api/content/comments/:commentId/report` | Required |
| Comment reaction | POST | `/api/interactions/comments/:commentId/reaction` | Required |
| Share URLs (optional) | GET | `/api/interactions/media/:mediaId/share-urls` | Optional |

\*Anonymous views require `deviceId` or `sessionId` in body.

### Devotional likes — confirm canonical path

Frontend maps sermons / devotionals → `contentType: "media"` because live API returns `400 Invalid content type: devotional`.

If backend later adds `POST /api/content/devotional/:id/like` or `POST /api/devotionals/:id/like`, update `mapContentTypeForBackend` accordingly. Until then, all sermon likes go through:

```
POST /api/content/media/:id/like
```
---

## 5. Copyright-free music — required endpoints

See also: `docs/COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md`

| Action | Method | Path |
|--------|--------|------|
| List | GET | `/api/audio/copyright-free` |
| Single song | GET | `/api/audio/copyright-free/:songId` |
| Like | POST | `/api/audio/copyright-free/:songId/like` |
| Share | POST | `/api/audio/copyright-free/:songId/share` |
| View | POST | `/api/audio/copyright-free/:songId/view` |
| Save (optional) | POST | `/api/audio/copyright-free/:songId/save` |

**Remove / block:**

- `POST /api/audio/copyright-free/:songId/playback/track` (deprecated — use `/view`)

**Do not add:**

- Comments on copyright-free songs
- `/api/content/batch-metadata` for copyright-free IDs

---

## 6. Comments — required endpoints

### Response shape (list + create)

```json
{
  "id": "...",
  "content": "Great message!",
  "comment": "Great message!",
  "authorId": "...",
  "user": {
    "id": "...",
    "firstName": "Jane",
    "lastName": "Doe",
    "avatar": "https://..."
  },
  "createdAt": "2026-07-13T12:00:00.000Z",
  "likesCount": 2,
  "replyCount": 1,
  "parentCommentId": null,
  "replies": [],
  "isLiked": false
}
```

Support `ETag` / `304` on list for bandwidth savings.

### Report reasons

`inappropriate_content`, `non_gospel_content`, `explicit_language`, `violence`, `sexual_content`, `blasphemy`, `spam`, `copyright`, `other`

Return `400` with clear message if already reported.

---

## 7. WebSockets — required events

### Client emits

```json
{ "event": "join-content", "data": { "contentId": "<id>", "contentType": "media" } }
{ "event": "leave-content", "data": { "contentId": "<id>", "contentType": "media" } }
```

Copyright-free room: `contentType: "audio"`.

### Server emits — feed

| Event | Payload highlights |
|-------|-------------------|
| `like-updated` | `contentId`, `likeCount`, `userLiked` |
| `content-like-update` | same (alias OK) |
| `content-comment` | new comment payload |
| `count-update` | `likeCount`, `viewCount`, `commentCount`, … |
| `view-updated` | `contentId`, `viewCount` |
| `content:viewCountUpdated` | global broadcast variant |

### Server emits — copyright-free

| Event | Payload |
|-------|---------|
| `copyright-free-song-interaction-updated` | `songId`, `liked`, `likeCount`, `viewCount` |

**Rule:** HTTP is always the write path for the acting user. Sockets update **other** clients only. Engagement writes must succeed even if socket emit fails.

---

## 8. Legacy endpoints to deprecate or remove

| Legacy path | Replacement | Risk if kept |
|-------------|-------------|--------------|
| `POST /api/interactions/share` | `/api/content/:type/:id/share` | Share counts never increment in app |
| `POST /api/comments` (unified body) | `/api/content/:type/:id/comment` | Split comment stacks |
| `POST /api/comments/:id/like` | `/api/interactions/comments/:id/reaction` | Wrong counts / 404 |
| `POST /api/content/batch-stats` + `{ contentIds }` | `batch-metadata` + `items[]` | Wrong types in mixed feeds |
| `POST /api/media/interactions/:id/like` | `/api/content/media/:id/like` | Duplicate like logic |
| `POST /api/media/interactions/:id/share` | content share endpoint | Orphan shares |
| `GET /api/content/:contentId/stats` (no type) | `/api/content/:type/:id/metadata` | Ambiguous routing |
| `POST …/playback/track` (copyright-free) | `…/view` | Double counting |

**Recommendation:** Return `410 Gone` or `301` with message for deprecated routes after 30-day sunset; log callers.

---

## 9. Breaking / contract fixes backend must ship

### 9.1 `batch-metadata` body

```diff
- { "contentIds": ["id1", "id2"], "contentType": "media" }
+ { "items": [
+   { "contentType": "media", "contentId": "id1" },
+   { "contentType": "ebook", "contentId": "id2" }
+ ]}
```

Support old format temporarily with deprecation warning header: `Deprecation: true`.

### 9.2 View `counted` field

Every view response **must** include `counted`. Defaulting to `true` when omitted breaks dedupe UX.

### 9.3 Anonymous identity

When `Authorization` is missing, dedupe using:

1. `userId` if token present  
2. Else `deviceId`  
3. Else `sessionId`  

Reject or ignore views with no identity only if you explicitly disallow anonymous — otherwise frontend always sends device + session.

### 9.4 Share platform enum

Accept string `platform` from clients. Map unknown values to `other` — do not 400.

### 9.5 `userInteraction` vs `userInteractions`

Return either; frontend accepts both. Prefer `userInteraction` in new code to match engagement guide.

### 9.6 Copyright-free invariant

```
viewCount >= likeCount  (always, on every response)
```

Run one-time migration for existing bad rows.

---

## 10. TikTok / IG features still missing on backend

These are **product-level** gaps — engagement endpoints alone do not make a TikTok/IG experience.

### 10.1 Algorithmic For You feed

**Need:**

```
GET /api/feed/for-you?cursor=&limit=20
```

- Ranked by engagement velocity, recency, follow graph, user interests  
- Embed `userInteraction` + counts in each item (avoid N+1 batch-metadata)  
- Cursor-based pagination  

**Current gap:** Frontend loads chronological `allContent` then batch-hydrates stats — works but not TikTok-scale.

### 10.2 Impressions vs qualified views

| Metric | When | Endpoint |
|--------|------|----------|
| **Impression** | Card ≥50% visible in feed for ≥500ms | `POST /api/content/:type/:id/impression` |
| **View** | Watch threshold met | existing `/view` |

TikTok optimizes recommendations on impressions + watch time, not views alone.

### 10.3 Follow graph

```
POST   /api/users/:id/follow
DELETE /api/users/:id/follow
GET    /api/feed/following?cursor=
```

Feed items should include `author.isFollowing` and prioritize followed creators.

### 10.4 Reels-dedicated feed

```
GET /api/feed/reels?cursor=
```

- Vertical video only  
- Pre-signed / CDN URLs  
- Inline engagement metadata  

Frontend reels currently reuse passed video arrays from home feed.

### 10.5 Share deep links & OG

```
GET /api/content/:type/:id/share-urls
→ { webUrl, deepLink, ogTitle, ogImage, ogDescription }
```

Required for rich previews in WhatsApp, iMessage, Instagram stories.

### 10.6 Realtime at feed scale

Options:

- Room per visible content ID (current, expensive at scale)  
- Batch rooms per feed session  
- Fanout on `count-update` with contentId filter  

Minimum: emit `like-updated` and `count-update` when counts change.

### 10.7 Double-tap / quick like

No new endpoint — ensure like toggle is idempotent and fast (`<100ms` p95 with Redis path).

### 10.8 Save / bookmark unification

Frontend uses `POST /api/bookmark/:id/toggle` with `{ contentType }` in body. Confirm backend resolves sermon/devotional/ebook correctly.

### 10.9 Copyright-free batch hydration

For music library with 50+ songs:

```
POST /api/audio/copyright-free/batch
{ "songIds": ["...", "..."] }
→ { [songId]: { likeCount, viewCount, isLiked, ... } }
```

Optional but recommended for performance.

### 10.10 Moderation & safety (IG parity)

- Report content (not just comments)  
- Shadow-limit distribution  
- Age-gate explicit content  

---

## 11. Rate limits & error codes

| Endpoint | Suggested limit | Frontend behavior |
|----------|-----------------|-------------------|
| Like | 10/min/user | Toast, revert optimistic |
| Comment | 5/min/user | Toast, keep input |
| View | 60/min/device | Throttle client-side 2.5s |
| Share | 20/min/user | Silent fail OK |

| Status | Meaning | Frontend action |
|--------|---------|-----------------|
| `401` | Not logged in | Login prompt, revert optimistic |
| `400` | Validation | Toast, revert |
| `404` | Deleted | Remove card |
| `429` | Rate limited | Toast, cooldown |
| `500` | Server error | Revert optimistic |

---

## 12. SDK (`packages/jevah-js-sdk`) gaps

Frontend uses `contentInteractionAPI` directly for most calls. SDK should expose:

| Method | Status |
|--------|--------|
| `toggleContentLike` | Exists |
| `recordContentView` | Exists — add `deviceId`/`sessionId`/`source` params |
| `shareContent` | Update to `/api/content/:type/:id/share` |
| `getBatchContentMetadata` | Update to `items[]` shape |
| `addComment` / `getComments` / `editComment` / `deleteComment` | Partial — align paths |
| `toggleCopyrightFreeLike` | **Missing** |
| `recordCopyrightFreeView` | **Missing** |
| `shareCopyrightFreeSong` | **Missing** |

---

## 13. Migration checklist

### Phase 1 — Contract alignment (1–2 days)

- [ ] `batch-metadata` accepts `items[]`
- [ ] Share route on `/api/content/:type/:id/share`
- [ ] View responses include `counted`
- [ ] Anonymous views accept `deviceId` + `sessionId`
- [ ] Comment POST on `/api/content/:type/:id/comment`
- [ ] Copyright-free share endpoint live

### Phase 2 — Deprecation (1 week)

- [ ] Log usage of legacy routes
- [ ] Return deprecation headers
- [ ] Remove `/api/interactions/share` after zero traffic

### Phase 3 — TikTok/IG product (2–4 weeks)

- [ ] For You feed endpoint
- [ ] Impression tracking
- [ ] Follow graph + following feed
- [ ] Reels feed endpoint
- [ ] Share URL / OG metadata
- [ ] Copyright-free batch metadata

### Data migrations

- [ ] Copyright-free: `viewCount = max(viewCount, likeCount)` where violated
- [ ] Normalize `contentType` aliases (ebook/podcast → media internal OK, but return consistent external type)

---

## 14. QA test plan (backend + frontend)

### Feed

1. Open home feed logged out → batch-metadata returns counts (no userInteraction)
2. Log in → batch-metadata returns `userInteraction.liked` etc.
3. Like video → count increments, persists after refresh
4. Share video → complete OS share → `shareCount` increments
5. Watch 3s → `viewCount` increments once; scrub replay within hour → `counted: false`, UI unchanged
6. Post comment → appears in list; `commentCount` increments
7. Open second device → socket updates like/comment counts

### Reels

1. Open reel → watch 3s → view recorded with `source: "reels"`
2. Share from reels menu → share count increments

### Copyright-free

1. Open player → `GET /:songId` hydrates counts
2. Like → `likeCount` + `viewCount` coherent
3. Share → `shareCount` increments
4. Listen 3s → one lifetime view per user

### Regression

1. Liking copyright-free via `/api/content/media/:id/like` → must **not** work
2. `batch-metadata` with old `contentIds` only → should still work during deprecation window
3. Rate limit like at 11/min → `429`

---

## Appendix A — Frontend file map (for backend debugging)

| Concern | Frontend file |
|---------|---------------|
| API client | `app/utils/contentInteractionAPI.ts` |
| Type mapping | `app/utils/engagementHelpers.ts` |
| Device/session IDs | `app/utils/deviceIdentity.ts` |
| Interaction store | `app/store/useInteractionStore/` |
| Feed handlers | `src/features/media/AllContentTikTok/hooks/useAllContentTikTokHandlers.ts` |
| Feed batch load | `src/features/media/AllContentTikTok/hooks/useAllContentTikTokFeedData.ts` |
| Video view tracking | `src/features/media/components/VideoCard/hooks/useVideoCardPlayback.ts` |
| Reels views | `app/reels/components/ReelsVideoPlayer.tsx` |
| Copyright-free API | `app/services/copyright-free/CopyrightFreeMusicService.ts` |
| Sockets | `app/services/SocketManager.ts` |

---

## Appendix B — Repo sync note (March 2026)

Frontend `main` was fast-forwarded with branch `content-optimization` (FlashList, expo-video player, feed perf). Engagement changes were merged on top. Backend contracts in this doc reflect the **post-merge** frontend behavior.

---

**Questions?** Tag frontend + backend leads. For copyright-free specifics, see `COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md`. For comment moderation, see `COMMENT_SYSTEM_BACKEND_IMPLEMENTATION_GUIDE.md`.
