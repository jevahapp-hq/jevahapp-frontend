# Copyright-Free Music: Interactions Backend Specification

**Audience:** Backend team  
**Purpose:** Align backend APIs and logic with frontend design so **views**, **likes**, and **“people seen”** (unique viewers) display real figures and stay in sync end-to-end.  
**Status:** Authoritative contract for front–back integration.

---

## 1. Overview

The app shows **copyright-free music** in dedicated screens (Music tab, CopyrightFreeSongs, modal). Each song displays:

| Metric | UI label / usage | Source |
|--------|------------------|--------|
| **Views** | “Views” count, sort by popularity | Backend: total view events (or unique views — see §3) |
| **Likes** | Heart icon + count | Backend: like count + current user’s `isLiked` |
| **People seen** (optional) | “Seen by N people” / unique viewers | Backend: unique viewers count (see §3) |

To avoid **front–back discrepancy**, the backend must:

1. Expose **consistent field names** in list, single-song, view, and like responses.
2. Implement **view recording** with clear rules (when to count, dedupe).
3. Optionally support **unique viewers** (“people seen”) and expose it in the same responses.
4. Emit **real-time events** so the modal and lists update without refresh.

This document defines the **API contract** and **recommended backend logic** so implementation is seamless from front to back.

---

## 2. Base URL and auth

- **Base URL:** `{API_BASE_URL}/api/audio/copyright-free`
- **Auth:** All mutation endpoints (view, like, save) require `Authorization: Bearer <token>`. List/single GET may be public or optionally require auth to return `isLiked` / `isInLibrary`.
- **IDs:** Song identifiers are MongoDB-style `_id` (24-char hex). Frontend sends `songId` as string; backend may receive as `_id` or `id`.

---

## 3. Metrics: definitions and backend logic

### 3.1 Views (`viewCount` / `views`)

- **Meaning:** Total number of “qualified” plays (see below). Frontend displays this as the main “views” number.
- **Backend logic (recommended):**
  - **When to count a view:** On `POST /:songId/view` when the request meets an engagement threshold. Frontend sends:
    - `durationMs`: time listened (ms)
    - `progressPct`: 0–100
    - `isComplete`: boolean
  - **Suggested rule:** Count at most **one view per user per song per day** (or per session), and only when e.g. `durationMs >= 3000` OR `progressPct >= 25` OR `isComplete === true`. This avoids inflating from quick skips.
  - **Storage:** e.g. a `views` or `viewCount` field on the song document (incremented when a new qualified view is recorded), plus an aggregate table or cache for “unique viewers” if you support that (see §3.3).

### 3.2 Likes (`likeCount` / `likes`, `isLiked`)

- **Meaning:** Total number of likes; `isLiked` is whether the current user has liked the song.
- **Backend logic:** Standard toggle:
  - Store per-user like state (e.g. `UserSongLike` or embedded in user document).
  - On `POST /:songId/like`: toggle current user’s like; recompute `likeCount` for the song; return new `liked` and `likeCount` (and optionally `viewCount` for UI sync).
- **Invariant — likes must not exceed views:** A like implies the user has engaged with the song, so **`likeCount` must never exceed `viewCount`** for any song. Enforce this in write paths:
  - When toggling a like **on**: if after incrementing, `likeCount > viewCount`, set `viewCount = likeCount` (or record an implicit view so the invariant holds).
  - When returning list/single/view/like responses: never return `viewCount < likeCount`; if data is inconsistent, return `viewCount = Math.max(viewCount, likeCount)` until a migration fixes the source.
- **Data cleanup (one-time):** Run a migration over the songs collection: for each song where `likeCount > viewCount`, set `viewCount = likeCount` (and optionally backfill one view per liker in your view-events store). After that, all responses will satisfy the invariant.

### 3.3 Unique viewers / “People seen” (optional)

- **Meaning:** Number of **distinct users** who have had at least one qualified view for this song.
- **Backend logic:** When recording a view (see §3.1), if you count a new view for user U and song S, ensure U is in the **unique viewers** set for S (e.g. distinct user IDs in view events, or a dedicated `uniqueViewerIds` / count). Expose as `uniqueViewerCount` (or `peopleSeen`) in list/single and in real-time payloads so the frontend can show “Seen by N people” if desired.
- **Frontend:** Currently the UI shows **view count** prominently; “people seen” can be added later using this field once the backend exposes it.

---

## 4. API contract

### 4.1 List songs

**GET** ` /api/audio/copyright-free`

**Query (recommended):** `page`, `limit`, `category`, `search`, `sortBy` (e.g. `popular`, `newest`, `oldest`, `title`).

**Response shape (success):**

```json
{
  "success": true,
  "data": {
    "songs": [
      {
        "_id": "<songId>",
        "id": "<songId>",
        "title": "Song title",
        "artist": "Artist name",
        "singer": "Artist name",
        "thumbnailUrl": "https://...",
        "audioUrl": "https://...",
        "fileUrl": "https://...",
        "category": "Gospel",
        "duration": 180,
        "contentType": "copyright-free-music",
        "description": "...",
        "year": 2024,
        "createdAt": "...",
        "views": 1250,
        "viewCount": 1250,
        "likes": 89,
        "likeCount": 89,
        "isLiked": false,
        "isInLibrary": false,
        "uniqueViewerCount": 420
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

**Field alignment:** Frontend accepts **either** `views` or `viewCount` and **either** `likes` or `likeCount`. Prefer returning **both** for compatibility (`views` + `viewCount`, `likes` + `likeCount`). Optional: `uniqueViewerCount` for “people seen”.

---

### 4.2 Single song

**GET** ` /api/audio/copyright-free/:songId`

**Response shape (success):**

```json
{
  "success": true,
  "data": {
    "_id": "<songId>",
    "id": "<songId>",
    "title": "Song title",
    "artist": "Artist name",
    "thumbnailUrl": "https://...",
    "audioUrl": "https://...",
    "category": "Gospel",
    "duration": 180,
    "contentType": "copyright-free-music",
    "views": 1250,
    "viewCount": 1250,
    "likes": 89,
    "likeCount": 89,
    "isLiked": false,
    "isInLibrary": false,
    "uniqueViewerCount": 420
  }
}
```

Same field rules as list: provide both `views`/`viewCount` and `likes`/`likeCount`; optional `uniqueViewerCount`.

---

### 4.3 Record view

**POST** ` /api/audio/copyright-free/:songId/view`

**Auth:** Required.

**Body:**

```json
{
  "durationMs": 45000,
  "progressPct": 75,
  "isComplete": false
}
```

All fields optional. Frontend sends these when a user has listened ≥3s, or ≥25% progress, or completed the song.

**Response shape (success):**

```json
{
  "success": true,
  "data": {
    "viewCount": 1251,
    "hasViewed": true
  }
}
```

- **viewCount:** Updated total view count for this song (after applying your dedupe/qualification rules).
- **hasViewed:** Whether this request resulted in a new view being counted for the current user (e.g. `true` first time today, `false` if already counted).

**Backend logic:**

1. Resolve user from token; validate `songId`.
2. Determine if this play is “qualified” (e.g. `durationMs >= 3000` or `progressPct >= 25` or `isComplete === true`).
3. Dedupe: e.g. “at most one view per user per song per calendar day”. If already counted for this user today, return current `viewCount` and `hasViewed: false`.
4. If new qualified view: increment song’s `viewCount`/`views`, update unique-viewer set if used, persist.
5. Optionally emit real-time event (see §6) with new `viewCount`.
6. Return `{ viewCount, hasViewed }`.

---

### 4.4 Toggle like

**POST** ` /api/audio/copyright-free/:songId/like`

**Auth:** Required.

**Body:** Empty or `{}`.

**Response shape (success):**

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 90,
    "viewCount": 1251,
    "listenCount": 1251
  }
}
```

- **liked:** New state for current user (true = liked).
- **likeCount:** New total like count for the song.
- **viewCount** (optional but recommended): Current view count so the frontend can keep modal state in sync without an extra GET.
- **listenCount** (optional): If your backend uses “listen” terminology, same as view count; frontend can use either.

**Backend logic:**

1. Resolve user from token; validate `songId`.
2. Toggle user’s like for this song; recompute song’s total `likeCount`.
3. Optionally emit real-time event (see §6).
4. Return `{ liked, likeCount, viewCount? }`.

---

### 4.5 Toggle save (library)

**POST** ` /api/audio/copyright-free/:songId/save`

**Auth:** Required.

**Response shape (success):**

```json
{
  "success": true,
  "data": {
    "bookmarked": true,
    "bookmarkCount": 42
  }
}
```

Frontend uses this for “Add to library” / save. Same pattern: toggle, return new state and count.

---

## 5. Search (unified search)

The frontend also uses **unified search** with a filter for copyright-free:

**GET** `{API_BASE_URL}/api/search?q=...&contentType=copyright-free&page=...&limit=...&sort=...`

**Response:** Unified search format. Each result that is a copyright-free song should include the same interaction fields as in §4.1 so list UIs show real figures:

- `viewCount` or `views`
- `likeCount` or `likes`
- `isLiked`
- Optionally `uniqueViewerCount`

Frontend maps these into the same shape as list/single song (see `copyrightFreeMusicAPI` search transformation).

---

## 6. Real-time updates (WebSocket)

To keep modal and list UIs in sync without polling, backend should emit:

**Event name:** `copyright-free-song-interaction-updated`

**Payload (minimal):**

```json
{
  "songId": "<songId>",
  "likeCount": 90,
  "viewCount": 1251,
  "liked": true
}
```

- **songId:** So clients can apply updates only to the correct song.
- **likeCount / viewCount:** New totals.
- **liked:** Current user’s like state (if room is per-user; otherwise frontend may rely on like response).

**When to emit:** After updating a song’s like or view count (e.g. after `POST .../view` or `POST .../like`). Clients in the same “content room” (e.g. `songId` + type `audio`) can subscribe so only relevant listeners get the event.

Frontend subscribes to this event in `CopyrightFreeSongModal` and updates local state (`setLikeCount`, `setViewCount`, `setIsLiked`) so icons and numbers stay real-time.

---

## 7. Frontend expectations summary

| Action | Frontend call | Expectation |
|--------|----------------|-------------|
| Load list | GET `/api/audio/copyright-free` or search | Each song has `views`/`viewCount`, `likes`/`likeCount`, `isLiked` (and optional `uniqueViewerCount`) |
| Load single | GET `/api/audio/copyright-free/:id` | Same fields so modal shows correct counts on open |
| Play / engage | POST `/:id/view` with `durationMs` / `progressPct` / `isComplete` | Response `viewCount` and `hasViewed`; frontend sets view count from response |
| Like | POST `/:id/like` | Response `liked`, `likeCount`, and optionally `viewCount`; frontend updates heart and counts |
| Real-time | Socket `copyright-free-song-interaction-updated` | Payload includes `songId`, `likeCount`, `viewCount`, `liked` so UI stays in sync |

---

## 8. Resolving current discrepancy

If the front currently shows **stale or zero** views/likes for copyright-free music, check:

1. **List/single responses** — Ensure every song object includes `viewCount` (or `views`) and `likeCount` (or `likes`) computed from the same store you use for view/like endpoints. No separate “stats” service with different semantics.
2. **View recording** — Ensure `POST /:songId/view` is called by the frontend when thresholds are met (it is), and that the backend actually increments and returns the new `viewCount`. Frontend uses the response to update the modal; list will update on next fetch or via real-time.
3. **Like response** — Ensure like endpoint returns `likeCount` and preferably `viewCount` so the modal doesn’t show stale view count after a like.
4. **Naming** — Prefer returning both `viewCount` and `views` (same value), and both `likeCount` and `likes`, so frontend’s dual field handling always has a value.
5. **Real-time** — If implemented, use the exact event name and payload above so the frontend’s socket handler can update counts without refresh.

---

## 9. Checklist for backend

- [ ] List and single song responses include `viewCount`/`views` and `likeCount`/`likes` (and optional `uniqueViewerCount`).
- [ ] **Invariant:** `viewCount >= likeCount` for every song; enforce in like/view handlers and run one-time migration if needed (see §3.2).
- [ ] `POST /:songId/view` accepts `durationMs`, `progressPct`, `isComplete`; applies qualification and dedupe; returns `viewCount` and `hasViewed`.
- [ ] `POST /:songId/like` returns `liked`, `likeCount`, and optionally `viewCount`; when liking, ensure `viewCount` is never less than `likeCount`.
- [ ] Unified search results for `contentType=copyright-free` include the same interaction fields.
- [ ] Optional: Emit `copyright-free-song-interaction-updated` with `songId`, `likeCount`, `viewCount`, `liked` after view or like updates.
- [ ] Optional: Implement and expose `uniqueViewerCount` for “people seen” when needed.

This document is the single source of truth for front–back alignment on copyright-free music interactions. Any backend change to field names or semantics should be reflected here and in the frontend types in `copyrightFreeMusicAPI.ts` and `CopyrightFreeSongModal.tsx`.
