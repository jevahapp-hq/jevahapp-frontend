# Feed + Bookmark Backend Spec (paste to backend team)

**Priority:** High — bookmark/save is broken in production for feed media IDs.  
**Frontend branch:** `feature/feed-playback-engagement`  
**Related:** `docs/LIKE_TOGGLE_INCONSISTENT_RESPONSE.md`, `docs/BACKEND_ENGAGEMENT_TIKTOK_IG_ALIGNMENT.md`

---

## 1. What the user sees (UI contract)

### Feed (`AllContentTikTok` + Reels)

| UI element | Behavior |
|------------|----------|
| Vertical feed | TikTok/IG-style cards; first visible item auto-plays |
| Heart (like) | Optimistic toggle; red stays if server disagrees (known like bug) |
| Bookmark (save) | Optimistic toggle; item should appear in **Library** when saved |
| Share | Native share sheet; analytics only if user actually shares |
| Comments | Bottom sheet modal; `POST` comment, nested replies when API supports |
| Progress bar | Seek/scrub on video |

### Bookmark button states

| State | Icon | On tap |
|-------|------|--------|
| Not saved | Outline bookmark | `POST` toggle → saved |
| Saved | Filled bookmark | `POST` toggle → unsaved |
| Error | Revert optimistic state | Show error (no ghost library item) |

**Important:** Frontend does **not** pretend save succeeded on 404. User sees errors in Metro and bookmark reverts.

---

## 2. Bug: Bookmark toggle returns 404 “Media not found”

### Symptom (from production logs)

```
POST /api/bookmark/69abf4886aef561f683a1a32/toggle
Body: { "contentType": "videos" }  // also retried: video, media
→ 404 { "success": false, "message": "Media not found" }
```

Same `contentId` is returned by the **feed/media list** and is likeable via:

```
POST /api/content/media/69abf4886aef561f683a1a32/like
```

So bookmark lookup is using a **different collection or resolver** than likes/feed.

### Frontend retry sequence (already implemented)

For `contentId` + `contentType` from the card:

1. `POST /api/bookmark/:id/toggle` with mapped type (`media` for videos/sermons/audio)
2. Retry aliases: `videos`, `video`, `media`, raw type
3. Fallback: `POST /api/media/interactions/:id/save` with `{ contentType: "media" }`
4. If all fail → throw; optimistic save **reverted**

### Root cause (backend)

Bookmark route likely does one of:

- `BookmarkModel.findById(contentId)` instead of resolving **Media** by `_id`
- Wrong `contentType` → wrong Mongoose model (e.g. only checks `Video` collection, feed uses `Media`)
- ID exists in feed cache/CDN but not in DB collection bookmark queries

### Required fix

Use the **same content resolver as likes**:

```js
// Pseudocode — mirror POST /api/content/:contentType/:contentId/like
const contentType = mapContentType(req.body?.contentType || "media");
const ContentModel = getContentModel(contentType); // media | ebook | podcast | ...
const content = await ContentModel.findById(contentId);

if (!content) {
  return res.status(404).json({ success: false, message: "Media not found" });
}

// Toggle bookmark for req.user._id
```

### Content type mapping (must match frontend)

| Feed `contentType` (examples) | Backend path segment | Collection |
|------------------------------|----------------------|------------|
| `video`, `videos`, `live`, `sermon`, `sermons`, `devotional`, `audio`, `music` | `media` | Media |
| `ebook`, `e-books`, `books` | `ebook` | Ebook |
| `podcast`, `podcasts` | `podcast` | Podcast |
| `artist` | `artist` | Artist |
| `merch` | `merch` | Merch |

Frontend mapper: `app/utils/engagementHelpers.ts` → `mapContentTypeForBackend()`.

---

## 3. Bookmark API contract (canonical)

### Toggle save / bookmark

```http
POST /api/bookmark/:contentId/toggle
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "contentType": "media"
}
```

**Success (save):**

```json
{
  "success": true,
  "data": {
    "contentId": "69abf4886aef561f683a1a32",
    "bookmarked": true,
    "isBookmarked": true,
    "bookmarkCount": 4,
    "saves": 4
  }
}
```

**Success (unsave):**

```json
{
  "success": true,
  "data": {
    "contentId": "69abf4886aef561f683a1a32",
    "bookmarked": false,
    "isBookmarked": false,
    "bookmarkCount": 3,
    "saves": 3
  }
}
```

**Rules (same as likes):**

1. `bookmarked` / `isBookmarked` = **post-toggle** state for JWT user
2. `bookmarkCount` / `saves` = count **after** this mutation
3. Feed must return matching `hasBookmarked` / `userInteractions.saved` for that user

### Get bookmark status

```http
GET /api/bookmark/:contentId/status
Authorization: Bearer <JWT>
```

```json
{
  "success": true,
  "data": {
    "isBookmarked": true,
    "bookmarkCount": 4
  }
}
```

### List user bookmarks (Library tab)

```http
GET /api/bookmark/user?page=1&limit=50
Authorization: Bearer <JWT>
```

```json
{
  "success": true,
  "data": {
    "bookmarks": [
      {
        "_id": "69abf4886aef561f683a1a32",
        "title": "...",
        "contentType": "videos",
        "fileUrl": "...",
        "thumbnailUrl": "...",
        "bookmarkedAt": "2026-03-10T12:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 50, "total": 12 }
  }
}
```

Frontend reads: `data.bookmarks` (not `data.media`).

### Deprecated / alternate (optional)

If you keep legacy route, it must behave identically:

```http
POST /api/media/interactions/:contentId/save
Body: { "contentType": "media" }
```

---

## 4. Feed list must include user interaction flags

Every media card in feed/list responses should include **per-user** flags when JWT present:

```json
{
  "_id": "69abf4886aef561f683a1a32",
  "title": "...",
  "contentType": "videos",
  "likeCount": 3,
  "hasLiked": true,
  "bookmarkCount": 1,
  "hasBookmarked": false,
  "userInteractions": {
    "liked": true,
    "saved": false
  }
}
```

If `hasBookmarked` is always `false` after a successful toggle, Library and feed will disagree (same class of bug as likes).

---

## 5. For You feed (server-side — recommended next)

Client already ranks locally (`rankFeedForYou`, impressions, affinity). For TikTok/IG quality at scale, add:

```http
GET /api/feed/for-you?cursor=&limit=20
Authorization: Bearer <JWT>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [ /* full media cards, same shape as feed */ ],
    "cursor": "opaque_cursor",
    "hasMore": true
  }
}
```

### Ranking signals to ingest

| Event | When frontend sends | Use |
|-------|---------------------|-----|
| `impression` | Card ≥50% visible ≥1s | Dedup / fatigue |
| `view` | Playback start | Engagement |
| `watch_time` | Every 5s or on pause | Primary rank signal |
| `like` | Heart tap | Affinity |
| `save` | Bookmark tap | Strong affinity |
| `skip` | <3s watch + scroll away | Negative signal |
| `share` | Share completed | Boost |

### Server ranking pipeline (Python or Node)

1. Filter: exclude IDs impressed in last 6–24h (per user)
2. Score: `0.4 * watch_affinity + 0.25 * engagement + 0.2 * recency + 0.15 * exploration`
3. Explore: ε-greedy (10–15% slots to new/niche content)
4. Diversify: no more than 2 same `contentType` in a row

Until this ships, frontend client ranker remains source of truth for order.

---

## 6. Client-side rotation (already shipped — for context)

Backend should align with these behaviors:

| Mechanism | Purpose |
|-----------|---------|
| `feed_impressions_v1` | IDs seen in last 14d |
| `feed_last_session_tops_v1` | Demote previous session’s top 3–5 cards |
| Session seed | Shuffle among top candidates each cold start |
| `feed_affinity_v1` | Boost families/tags/speakers from likes |
| Seen-today bucket | Hard demote before fresh bucket |

**Product rule:** User should not land on the same first video every login if they have other unwatched content.

---

## 7. Repro checklist for backend QA

1. Pick any ID from `GET /api/media` (or feed) — e.g. `69abf4886aef561f683a1a32`
2. `POST /api/bookmark/:id/toggle` with JWT + `{ "contentType": "media" }`
3. Expect `200` + `bookmarked: true`
4. `GET /api/bookmark/:id/status` → `isBookmarked: true`
5. `GET /api/bookmark/user` → ID appears in `bookmarks`
6. Toggle again → `bookmarked: false`, removed from library list
7. Feed item for same ID shows `hasBookmarked` matching step 3/6

**Fail if:** step 2 returns 404 while step 1 returns the document.

---

## 8. Suggested implementation order

1. **Fix bookmark resolver** — same `getContentModel()` as likes (unblocks Library)
2. **Fix `hasBookmarked` on feed** — batch user flags with list endpoint
3. **Align toggle response** — post-toggle boolean + count (mirror like contract)
4. **Ingest watch_time events** — foundation for real For You
5. **Ship `GET /api/feed/for-you`** — replace client-only ranking

---

## 9. Frontend files (for backend dev reference)

| Area | Path |
|------|------|
| Bookmark toggle | `app/utils/contentInteraction/save.ts` |
| Like toggle | `app/utils/contentInteraction/like.ts` |
| Content type map | `app/utils/engagementHelpers.ts` |
| Feed ranking | `src/features/media/AllContentTikTok/utils/rankFeedForYou.ts` |
| Impressions | `src/features/media/AllContentTikTok/utils/feedImpressionStore.ts` |
| Affinity | `src/features/media/AllContentTikTok/utils/feedAffinityStore.ts` |
| Feed hook | `src/features/media/AllContentTikTok/hooks/useAllContentTikTokFeedData.ts` |

---

*Generated for backend handoff — bookmark 404 + For You feed alignment.*
