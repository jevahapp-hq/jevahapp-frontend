## Copyright‑Free Music – Views + Likes + Playback Modes (Repeat/Shuffle) Backend Spec

### 1) Purpose

This document defines the **exact backend contract** the Jevah frontend expects for copyright‑free music:
- **Likes** (toggle like/unlike)
- **Views** (unique view tracking)
- Optional: **Listens/Plays** (non‑unique play counter)
- Optional: **Playback preferences** (repeat/shuffle) if you want them to persist across devices

Frontend implementation already calls:
- `POST /api/audio/copyright-free/{songId}/like`
- `POST /api/audio/copyright-free/{songId}/view`

Backend must return consistent response shapes so UI counts and the red heart state never flicker.

---

### 2) Current frontend expectations (source of truth)

#### 2.1 Base URL

Frontend uses:

```text
{API_BASE_URL}/api/audio/copyright-free
```

#### 2.2 Like toggle response shape (REQUIRED)

Frontend expects `toggleLike(songId)` to return:

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 125,
    "viewCount": 1250,
    "listenCount": 890
  }
}
```

**Rules**
- `data.liked`: boolean final state **after** the toggle for the authenticated user
- `data.likeCount`: total likes **after** the toggle
- `data.viewCount`: current view count (for convenience/UI consistency)
- `data.listenCount`: optional, but the frontend client already types it; return `0` if not implemented

#### 2.3 View recording response shape (REQUIRED)

Frontend expects `recordView(songId, payload)` to return:

```json
{
  "success": true,
  "data": {
    "viewCount": 1251,
    "hasViewed": true
  }
}
```

**Rules**
- `data.viewCount`: total view count after processing this call
- `data.hasViewed`: must be `true` on success (a successful call implies the user is marked as viewed)

#### 2.4 View request payload (frontend sends; backend must accept)

```json
{
  "durationMs": 47160,
  "progressPct": 27,
  "isComplete": false
}
```

All fields are optional. Frontend may send `{}`.

---

### 3) Likes: required backend behavior

#### 3.1 Endpoint

```http
POST /api/audio/copyright-free/{songId}/like
Authorization: Bearer <JWT>
Content-Type: application/json
```

#### 3.2 Required logic (toggle)

- If user has not liked: create like record, increment `likeCount`
- If user has liked: remove like record, decrement `likeCount` (clamp at 0)

**Must be race-safe**
- Use atomic update (`$inc`) or transaction
- Enforce uniqueness at DB layer

#### 3.3 Recommended schema

**copyrightFreeSong**
- `_id`
- `likeCount: number` default 0
- `viewCount: number` default 0
- `listenCount: number` default 0 (optional)

**copyrightFreeSongLikes**
- `userId`
- `songId`
- `createdAt`

Unique index:
- `(userId, songId)` unique

---

### 4) Views: required backend behavior (unique views)

#### 4.1 Endpoint

```http
POST /api/audio/copyright-free/{songId}/view
Authorization: Bearer <JWT>
Content-Type: application/json
```

#### 4.2 Required logic (YouTube‑style unique view)

Backend must guarantee:
- **One view per user per song** (unique)
- Multiple calls from the same user for the same song must be **idempotent**
- Always return the current `viewCount`

Suggested model:

**copyrightFreeSongViews**
- `userId`
- `songId`
- `durationMs` (optional)
- `progressPct` (optional)
- `isComplete` (optional)
- `viewedAt` (first time)
- `lastViewedAt` (update for analytics)

Unique index:
- `(userId, songId)` unique

#### 4.3 Engagement thresholds (IMPORTANT)

The frontend decides when to call `/view` based on playback engagement. Backend should:
- Accept and store the payload
- NOT require all fields
- NOT crash on missing payload

If you add backend-side validation, keep it permissive (do not reject legitimate calls).

---

### 5) Listens/Plays (optional, but recommended)

The like response includes `listenCount`, which is a useful metric distinct from unique views:
- **viewCount**: unique users who meaningfully listened (deduped)
- **listenCount**: total number of plays (can include repeats)

#### 5.1 If backend does NOT implement listens

Return:
- `listenCount: 0` in the like response

#### 5.2 If backend DOES implement listens

Add one of these approaches:

**Option A (recommended): dedicated “listen” endpoint**

```http
POST /api/audio/copyright-free/{songId}/listen
Authorization: Bearer <JWT>   // optional, but recommended
Content-Type: application/json
```

Body (optional):

```json
{ "startedAt": "ISO-8601", "source": "player" }
```

Response:

```json
{
  "success": true,
  "data": { "listenCount": 891 }
}
```

Rules:
- Count a listen when playback starts (or after 1–2 seconds to prevent accidental taps)
- Dedupe rapid restarts (e.g., don’t count again if restarted within 10s)

**Option B: reuse `/view` and also increment `listenCount`**
- Not recommended, because it mixes unique views with non‑unique plays.

---

### 6) Real-time updates (optional but supported by frontend)

Frontend listens for:
- Event name: `"copyright-free-song-interaction-updated"`
- Room: `content:audio:{songId}`

Payload should include counts:

```json
{
  "songId": "string",
  "likeCount": 126,
  "viewCount": 1251,
  "liked": true,
  "listenCount": 891
}
```

Rules:
- `liked` is per-user; only include if the socket is authenticated and you can compute it safely.
- Always include `likeCount` and `viewCount` if you emit the event.

---

### 7) Repeat/Shuffle: what it is and what backend must do

Repeat and shuffle are **player behaviors**:
- They should work fully offline
- They should not require backend to function

However, backend must **not break counts** when users repeat/shuffle.

#### 7.1 Playback modes (frontend behavior)

Define:
- `repeatMode`: `"off" | "one" | "all"`
- `shuffle`: `boolean`

Rules:
- **repeat=one**: when a song ends, restart the same track
- **repeat=all**: when the queue ends, loop back to the first song
- **shuffle=true**: play next track from a shuffled order (keep order stable during a session)

#### 7.2 How repeat/shuffle affects backend counts

With **unique views** (one per user per song):
- repeating/shuffling the same song does **not** increment `viewCount` again → correct and standard

With **listenCount** (plays):
- repeating a song *can* increment listenCount (depending on your business choice)
- but you must dedupe accidental rapid restarts to prevent inflated listens

---

### 8) Optional backend feature: persist playback preferences across devices

If you want “repeat/shuffle” to follow the user across devices, add:

#### 8.1 Endpoints

```http
GET  /api/user/playback-preferences
PUT  /api/user/playback-preferences
Authorization: Bearer <JWT>
```

Response / request body:

```json
{
  "repeatMode": "off",
  "shuffle": false
}
```

Rules:
- Don’t block playback if this endpoint fails (frontend should default locally)
- This is purely a UX preference store; not required for counting

---

### 9) Backend checklist (must pass)

- [ ] `POST /like` toggles and returns `{ liked, likeCount, viewCount, listenCount }`
- [ ] `POST /view` is idempotent per `(userId, songId)` and returns `{ viewCount, hasViewed:true }`
- [ ] DB uniqueness indexes exist for likes and views
- [ ] Counts are updated atomically
- [ ] 500 errors include actionable logging (avoid generic “Failed to record view” without details)
- [ ] Repeat/shuffle does not inflate unique views



