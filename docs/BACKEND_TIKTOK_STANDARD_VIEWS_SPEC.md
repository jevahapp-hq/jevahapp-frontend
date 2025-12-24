## TikTok/YouTube-Style Views – Backend Contract + Counting Rules (Video/Audio/Ebook)

### 1) Why this doc exists (avoid broken UI + wrong counts)

Cards in the feed/reels need a **stable `viewCount`** that increases in a standard, non-abusive way.
If backend view logic double-counts on scroll, counts jump too fast (or stay at 0), which breaks trust and UI expectations.

**Goal**: define a professional view-counting system similar to TikTok/YouTube:
- counts are **deduped**
- counts are **threshold-based** (not every impression)
- backend returns **consistent response shapes** so the UI can update immediately and safely

---

### 2) Frontend expectations (what the UI needs)

For every item in feeds/reels/details, frontend expects:
- `viewCount` (number)
- optionally `hasViewed` (boolean, user-specific; mostly used for analytics/UX, not required for UI display)

Views are recorded via a dedicated endpoint, and counts are fetched via metadata/batch-metadata.

---

### 3) What counts as a “view” (standard rules)

#### 3.1 Video view (TikTok-style)

Count a view when **any** of the following is true:
- **time threshold**: user watched at least **3 seconds**
- **progress threshold**: user reached at least **25%**
- **completion**: video finished

Recommended thresholds:
- `MIN_VIDEO_VIEW_MS = 3000`
- `MIN_VIDEO_VIEW_PCT = 0.25`

#### 3.2 Audio view (play view)

Audio is different: users often listen in background, and progress updates are frequent.

Count a view when:
- user listened at least **10 seconds**, OR
- user reached at least **20%**, OR
- audio finished

Recommended:
- `MIN_AUDIO_VIEW_MS = 10000`
- `MIN_AUDIO_VIEW_PCT = 0.20`

#### 3.3 Ebook view (open/read view)

Ebooks/PDFs are not “played”; do NOT count view just by showing a thumbnail.

Count a view when:
- the user opened the ebook reader AND stayed at least **10 seconds**, OR
- user reached at least **N pages** or **X% progress** (if you track reading progress)

Recommended:
- `MIN_EBOOK_VIEW_MS = 10000`
- OR `MIN_EBOOK_PROGRESS_PCT = 0.10`

---

### 4) Dedupe rules (YouTube-style anti-inflation)

Without dedupe, scrolling up/down re-triggers view posts and inflates counts.

#### 4.1 Dedupe scope (recommended)

Count at most **1 view per user per content per window**:
- **Authenticated**: per `(userId, contentId, contentType)` within a window
- **Anonymous**: per `(deviceId|sessionId, contentId, contentType)` within a window

Recommended window:
- `VIEW_DEDUPE_WINDOW_MS = 60 * 60 * 1000` (1 hour)  
  (or 24 hours if you want stricter “unique daily views”)

#### 4.2 What NOT to do

- Do not increment viewCount on every “play” event
- Do not count each resume, replay loop, or scroll re-entry as a new view
- Do not store gigantic arrays of viewer IDs on the content document

---

### 5) Data model (professional, scalable)

#### 5.1 `views` collection/table (source of truth for dedupe)

Store view events (or dedupe keys) separately:

**ViewEvent**
- `_id`
- `contentId`
- `contentType`
- `userId` (nullable)
- `deviceId` or `sessionId` (nullable)
- `viewedAt`
- `durationMs` (optional)
- `progressPct` (optional)
- `isComplete` (optional)
- `source` (feed|reels|details)

Indexes:
- `(contentType, contentId, viewedAt)`
- for dedupe: either
  - unique `(userId, contentType, contentId, windowKey)` for authed, OR
  - unique `(deviceId, contentType, contentId, windowKey)` for anon

Where `windowKey = floor(viewedAt / VIEW_DEDUPE_WINDOW_MS)`.

#### 5.2 Cached counter on content (fast reads)

On the content document:
- `viewCount: number` default 0

Increment with atomic `$inc`.

---

### 6) Required endpoints + expected responses

#### 6.1 Record a view

**Endpoint**

```http
POST /api/content/{contentType}/{contentId}/view
Authorization: Bearer <JWT>    // optional
Content-Type: application/json
```

**Request body (recommended)**

```json
{
  "durationMs": 4200,
  "progressPct": 0.31,
  "isComplete": false,
  "source": "feed",
  "sessionId": "string",
  "deviceId": "string",
  "startedAt": "ISO-8601"
}
```

Notes:
- Backend should accept missing fields (don’t crash).
- `sessionId/deviceId` are important for anonymous dedupe.

**Behavior**
- Validate content exists; if not, return 404.
- Determine whether thresholds are met for the given contentType.
- Apply dedupe (window-based).
- If accepted as a new view: create ViewEvent + `$inc viewCount: 1`.
- If deduped: do not increment, but return the current viewCount.

**Response (must be safe + stable)**

```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "viewCount": 1234,
    "hasViewed": true,
    "counted": true
  }
}
```

Where:
- `counted=true` means this request incremented viewCount
- `counted=false` means it was deduped / below-threshold

#### 6.2 Single item metadata

**Endpoint**

```http
GET /api/content/{contentType}/{contentId}/metadata
```

**Response fields required for views**

```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "viewCount": 1234,
    "hasViewed": true
  }
}
```

#### 6.3 Batch metadata (feeds)

**Endpoint**

```http
POST /api/content/batch-metadata
```

**Response fields required for views**

```json
{
  "success": true,
  "data": [
    { "id": "id1", "viewCount": 1234, "hasViewed": true },
    { "id": "id2", "viewCount": 22,   "hasViewed": false }
  ]
}
```

---

### 7) Backend implementation outline (pseudocode)

```ts
// POST /api/content/:type/:id/view
// 1) resolve userId (optional)
// 2) derive dedupeKey = (userId OR deviceId/sessionId) + contentId + contentType + windowKey
// 3) check thresholds (duration/progress/complete) based on contentType
// 4) if below threshold -> return current viewCount, counted=false
// 5) if dedupeKey exists -> return current viewCount, counted=false
// 6) else: insert view event + increment content.viewCount atomically
// 7) return updated viewCount, counted=true
```

Important:
- Do **not** require all fields; treat missing duration/progress gracefully.
- Use `$inc` and avoid read-modify-write races.

---

### 8) Avoid these common mistakes

- **Counting impressions** as views (thumbnail render != view)
- **Counting every status update** (especially for audio) → huge inflation
- **Counting loops** (video repeats) as new views within short window
- **Storing huge arrays** of viewers inside the content doc
- **Hot-document contention**: if viewCount is extremely high traffic, consider sharded counters (advanced)

---

### 9) Quick test scenarios (must pass)

1) **Below threshold**
- Watch 1s → POST /view returns `counted=false`, viewCount unchanged

2) **Valid view**
- Watch 3s → POST /view returns `counted=true`, viewCount increments by 1

3) **Scroll replay within window**
- Watch, scroll away, come back within 1 hour → `counted=false`

4) **Cross-device**
- Same user watches on device A then B (authed) within window → count only once

5) **Anonymous**
- No auth, but same deviceId/sessionId within window → count only once


