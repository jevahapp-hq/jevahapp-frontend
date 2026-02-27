# How to Fix Copyright-Free Music Backend

**For:** Backend developers  
**Companion to:** [COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md](./COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md) (API contract and field shapes)  
**Goal:** Step-by-step fixes so views, likes, and responses align with the frontend and the **viewCount ≥ likeCount** invariant holds.

---

## 1. Fix the views vs likes invariant (critical)

**Problem:** Some songs have `likeCount` > `viewCount` (e.g. 68 likes, 3 views). The frontend expects **views ≥ likes** for every song.

### 1.1 One-time data migration

Run once on your songs collection (adjust to your DB and schema):

```js
// Pseudocode (MongoDB-style)
db.songs.find({}).forEach(function (doc) {
  const viewCount = doc.viewCount ?? doc.views ?? 0;
  const likeCount = doc.likeCount ?? doc.likes ?? 0;
  if (likeCount > viewCount) {
    db.songs.updateOne(
      { _id: doc._id },
      { $set: { viewCount: likeCount, views: likeCount } }
    );
  }
});
```

- Use your actual field names (`viewCount`/`views`, `likeCount`/`likes`).
- If you store view events in a separate collection, optionally backfill one “implicit” view per user who liked (so analytics stay consistent).

### 1.2 Enforce in write paths

**When user likes a song** (`POST /api/audio/copyright-free/:songId/like`):

After toggling the like and recomputing `likeCount` for the song:

```text
if (newLikeCount > currentViewCount) {
  set song.viewCount = newLikeCount   // (and song.views if you use both)
  persist song
}
```

Return in response: `viewCount: Math.max(song.viewCount, song.likeCount)` so the client always gets a consistent value.

**When returning any song object** (list, single, search, view response, like response):

Before sending the response, normalize so the client never sees views < likes:

```text
viewCount = Math.max(song.viewCount ?? 0, song.likeCount ?? 0)
views     = viewCount   // if you expose both
```

Then return `viewCount` and `views` (and `likeCount` / `likes`) in the payload.

---

## 2. Ensure list and single song include real stats

**Problem:** List or single-song responses may omit or zero out `viewCount` / `likeCount`, so the app shows 0 or stale numbers.

**Fix:**

- For **GET /api/audio/copyright-free** (list) and **GET /api/audio/copyright-free/:songId** (single), ensure every song object includes:
  - `viewCount` and `views` (same value, or omit one and frontend will use the other)
  - `likeCount` and `likes` (same value)
  - `isLiked` (boolean for current user when auth is present)
- Compute these from the **same** source of truth you use for the view and like endpoints (no separate “stats” service that returns different numbers).
- After reading from DB, apply the invariant (see §1.2):  
  `viewCount = Math.max(song.viewCount, song.likeCount)` before returning.

---

## 3. Implement or fix POST view (record view)

**Problem:** Frontend calls `POST /api/audio/copyright-free/:songId/view` with `durationMs`, `progressPct`, `isComplete`. Backend may not be counting views or may not return the new count.

**Fix:**

1. **Accept body:** `{ durationMs?, progressPct?, isComplete? }` (all optional).
2. **When to count a view:** Only if the play is “qualified”, e.g.  
   `(durationMs >= 3000) OR (progressPct >= 25) OR (isComplete === true)`.
3. **Dedupe:** At most one view per user per song per day (or per session). If this user already has a view for this song today, do **not** increment again; still return the current `viewCount`.
4. **Update song:** Increment `song.viewCount` (and `song.views` if stored) only when you count a new view.
5. **Enforce invariant:** After any change, set  
   `song.viewCount = Math.max(song.viewCount, song.likeCount)`.
6. **Response:** Always return:
   - `viewCount`: current total view count for the song (after step 5)
   - `hasViewed`: `true` if this request caused a new view to be counted, else `false`

Example response shape:

```json
{
  "success": true,
  "data": {
    "viewCount": 1251,
    "hasViewed": true
  }
}
```

---

## 4. Implement or fix POST like (toggle like)

**Problem:** Like endpoint may not return updated counts or may leave `viewCount` below `likeCount`.

**Fix:**

1. **Auth:** Require a valid user (e.g. JWT). Return 401 if not authenticated.
2. **Toggle:** Update the user’s like state for this song and recompute the song’s total `likeCount`.
3. **Enforce invariant:** If `likeCount > viewCount`, set  
   `song.viewCount = song.likeCount` (and persist). Optionally record an “implicit” view for the user so analytics are consistent.
4. **Response:** Return at least:
   - `liked`: boolean (new state for current user)
   - `likeCount`: number (new total for song)
   - `viewCount`: number (current view count after step 3), so the frontend doesn’t show stale views

Example response shape:

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 90,
    "viewCount": 90
  }
}
```

---

## 5. Unified search results (copyright-free)

**Problem:** Search endpoint (e.g. `GET /api/search?contentType=copyright-free&...`) returns song items that lack or mis-report `viewCount` / `likeCount`.

**Fix:**

- For every result that is a copyright-free song, include the same interaction fields as in list/single:
  - `viewCount`, `views` (same value)
  - `likeCount`, `likes` (same value)
  - `isLiked` when user is authenticated
- Apply the same invariant before returning:  
  `viewCount = Math.max(song.viewCount, song.likeCount)`.

---

## 6. Real-time updates (optional but recommended)

**Problem:** After a view or like, the modal and lists don’t update until refresh.

**Fix:**

- After updating a song’s `viewCount` or `likeCount` (in POST view or POST like), emit a WebSocket event:
  - **Event name:** `copyright-free-song-interaction-updated`
  - **Payload:** `{ songId, viewCount, likeCount, liked }`  
    (use the same values you would return in the HTTP response, after applying the invariant).
- Clients subscribed to that song (e.g. by `songId` + type “audio”) can update their UI immediately.

---

## 7. Checklist (implementation order)

| # | Task | Notes |
|---|------|--------|
| 1 | Run one-time migration: set `viewCount = likeCount` where `likeCount > viewCount` | §1.1 |
| 2 | In like handler: when liking, set `viewCount = max(viewCount, likeCount)` and persist | §1.2 |
| 3 | In all “return song” paths: normalize `viewCount = max(viewCount, likeCount)` before sending | §1.2, §2 |
| 4 | Ensure list + single GET return `viewCount`, `views`, `likeCount`, `likes`, `isLiked` | §2 |
| 5 | Implement/fix POST view: qualify by threshold, dedupe, return `viewCount` + `hasViewed` | §3 |
| 6 | Implement/fix POST like: return `liked`, `likeCount`, `viewCount`; enforce invariant | §4 |
| 7 | Include same stats in search results for copyright-free songs | §5 |
| 8 | (Optional) Emit `copyright-free-song-interaction-updated` after view/like | §6 |

Once these are done, the frontend will show consistent, real figures and the “likes > views” issue will be resolved. For full request/response shapes and field names, use [COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md](./COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md).
