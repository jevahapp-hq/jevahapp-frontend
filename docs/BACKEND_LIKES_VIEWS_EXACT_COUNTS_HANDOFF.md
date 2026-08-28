# Backend Handoff — Exact like & view counts (corroborate the endpoints)

**Audience:** Backend / engagement  
**Date:** 2026-08-16  
**Frontend:** `jevahapp-frontend`  
**Priority:** P1 — icons must show the **same integer** the API stores, not a guess.

Related (do not contradict):
- [`BACKEND_MEDIA_VIEWS_HANDOFF.md`](./BACKEND_MEDIA_VIEWS_HANDOFF.md)
- [`BACKEND_LIKE_UNLIKE_CORROBORATION.md`](./BACKEND_LIKE_UNLIKE_CORROBORATION.md)
- [`BACKEND_FEED_AUDIO_SEEK_AND_VIEWS_HANDOFF.md`](./BACKEND_FEED_AUDIO_SEEK_AND_VIEWS_HANDOFF.md)
- [`COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md`](./COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md)

---

## 0. What the user sees

Feed cards and the music player show a **view (eye)** count and a **like (heart)** count.

Today those numbers often disagree with Mongo because:

1. List JSON, `POST /like`, `POST /view`, and `GET/batch stats` return **different fields / different totals**.
2. Views and likes were being mixed on the client (`viewCount = max(views, likes)`). **FE no longer does that.** Each icon now prints its own integer (exact under 1,000; compact `1.2K` / `1.2M` after that — display only, storage stays exact).
3. A view that was not counted (`counted: false`) must not bump the UI. FE already respects that.

**We need BE to corroborate one source of truth per metric.**

---

## 1. Business logic (Instagram / TikTok style)

### 1.1 Likes

| Rule | Spec |
|---|---|
| Identity | One like per `(userId, contentId)`. Anonymous cannot like. |
| Write | **Toggle.** Same `POST` likes if absent, unlikes if present. No `DELETE /unlike`. |
| Count | Exact `likeCount` = number of like rows. Never estimate. Never copy `viewCount`. |
| Idempotency | Honor `Idempotency-Key`. Same key + same user → same `{ liked, likeCount }`. |
| Auth | `401` if missing/expired JWT. Do not 500. |
| Latency | p95 write **< 300ms**. |

**Return on every like write:**

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 42
  }
}
```

`liked` is **this user’s** state after the toggle. `likeCount` is the **global exact total**.

### 1.2 Views

| Rule | Spec |
|---|---|
| What a view is | A **qualified** playback: user actually watched/listened, not a list impression. |
| Threshold (media / video) | Count when `progressPct >= 3` **or** `durationMs >= 3000` (FE sends both). |
| Threshold (copyright-free / audio) | Same family as `qualifiesPlaybackView` — short clips can count at ~1s if `isComplete`. |
| Dedupe | One counted view per `(userId OR deviceId, contentId)` per **24h** window. Repeat plays in that window return `counted: false` and the **same** `viewCount`. |
| Do not count | Scrub-only seeks, 0s loads, 404 audio, paused-at-0. |
| Count | Exact `viewCount` = counted rows. **Never** `max(views, likes)`. **Never** alias `playCount`. |

`playCount` (artist catalog) = how many times play **started**. That can be higher than `viewCount`. Keep them separate.

**Return on every view write:**

```json
{
  "success": true,
  "data": {
    "viewCount": 1284,
    "counted": true
  }
}
```

If this request was a duplicate / too short: `"counted": false` and `viewCount` still the exact stored total.

---

## 2. Endpoints to corroborate (same integers everywhere)

### 2.1 Feed / uploaded media

| Action | Endpoint | Must return |
|---|---|---|
| List | `GET /api/media/all-content` (and public twin) | `likeCount`, `viewCount`, `hasLiked` on **each item** |
| Like toggle | `POST /api/content/media/:id/like` | `data.liked`, `data.likeCount` |
| Record view | `POST /api/content/media/:id/view` | `data.viewCount`, `data.counted` |
| Batch read | `POST /api/content/batch-metadata` | per id: `likes`, `views`, `userInteractions.liked` |
| Single read | `GET /api/content/:id/stats` | same shape as batch item |

`likes` in stats **===** `likeCount` on the list card **===** `data.likeCount` after toggle.  
`views` in stats **===** `viewCount` on the list card **===** `data.viewCount` after a counted view.

### 2.2 Copyright-free / catalog audio

| Action | Endpoint | Must return |
|---|---|---|
| List / detail | CF list + `GET` by id | `likeCount`, `viewCount`, `isLiked` — **not** stuffed into each other |
| Like | CF `POST .../like` | `liked`, `likeCount` |
| View | CF `POST .../view` | `viewCount`, `counted` |

If CF still only stores `playCount`, add a real `viewCount`. Do not tell FE to display plays as views.

### 2.3 Artist tracks (`/artists/:slug`)

List items should include `thumbnailUrl` **or** `release.coverUrl` (album art). Missing cover is a FE logo fallback, not a BE blocker — but covers should be generated at upload (first frame / attached image).

Playback URL must 200 with `Accept-Ranges`. A CDN **404** is what produced `Error loading audio track: Response code: 404`. Prefer mark `processingStatus` / omit from playable lists over handing a dead URL.

---

## 3. Field names (canonical)

Use these keys. Aliases are ok **in addition**, not instead.

| Metric | Canonical | Allowed aliases (same integer) |
|---|---|---|
| Likes total | `likeCount` | `likes` |
| This user liked | `hasLiked` / `isLiked` / `userInteractions.liked` | — |
| Views total | `viewCount` | `views` |
| This request counted | `counted` | — |
| Play starts | `playCount` | `plays` — **not** a view |

Do **not** return `viewCount` as a copy of `likeCount` when views are 0. Zero is a valid exact figure. FE now shows `0`.

---

## 4. Acceptance checks

1. Like a video: heart fills, count +1. Unlike: count −1. Reload: same numbers as `batch-metadata`.
2. Watch past the view threshold once: eye +1, `counted: true`. Watch again in 24h: `counted: false`, eye **unchanged**.
3. A post with 12 likes and 3 views shows **12** on the heart and **3** on the eye — never 12 on both.
4. CF song detail `GET` matches the numbers on the player.
5. Dead audio URL: list `processingStatus` is not `ready`, or URL 200s. No 404 from `expo-av`.

Until 1–4 match in production, the icons cannot be trusted as exact.
