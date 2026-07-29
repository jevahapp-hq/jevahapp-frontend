# Backend Fix Brief: Local Engagement Gaps (Views, Metadata, Like Idempotency)

**Audience:** Jevah backend engineers  
**Date:** 2026-07-26  
**Priority:** P0 for local/dev parity with production engagement  
**Frontend:** `jevahapp-frontend` (Expo / React Native)  
**Observed against:** `http://<LAN-IP>:4000` (local API)

**Related docs:**
- [`BACKEND_LIKE_500_FIX_AND_IG_TIKTOK_BUSINESS_LOGIC.md`](./BACKEND_LIKE_500_FIX_AND_IG_TIKTOK_BUSINESS_LOGIC.md)
- [`BACKEND_ENGAGEMENT_TIKTOK_IG_ALIGNMENT.md`](./BACKEND_ENGAGEMENT_TIKTOK_IG_ALIGNMENT.md)
- [`LIKE_SYSTEM_BACKEND_BUSINESS_LOGIC_SPEC.md`](./LIKE_SYSTEM_BACKEND_BUSINESS_LOGIC_SPEC.md)

---

## 0. Executive summary

While pointing the app at **local** (`EXPO_PUBLIC_API_ENV=local`), feed + sockets work, but engagement is incomplete or broken:

| # | Symptom (frontend log) | Status | Endpoint |
|---|------------------------|--------|----------|
| 1 | `View endpoint missing (404)` | **Missing route / not mounted** | `POST /api/content/:contentType/:contentId/view` |
| 2 | `Metadata endpoint failed (404)` | **Missing route / not mounted** | `GET /api/content/:contentType/:contentId/metadata` |
| 3 | Likely same gap | **Missing or wrong contract** | `POST /api/content/batch-metadata` |
| 4 | Like `503` — *Idempotency store unavailable* | **Redis / idempotency middleware failing closed** | `POST /api/content/:contentType/:contentId/like` |

Frontend already soft-fails (views skip for 60s; metadata falls back; like retries once **without** `Idempotency-Key` on that 503). That is a **dev workaround**, not a product solution.

**Ask:** Make local (and production) implement the contracts below so likes/views/hydration behave like Instagram / TikTok.

---

## 1. Reproduce (local)

```bash
BASE=http://127.0.0.1:4000   # or LAN IP the phone uses
TOKEN="<valid JWT issued by THIS local API — not production>"
CONTENT_ID="<valid media ObjectId from /api/media/all-content>"
TYPE=media
```

### 1.1 View — currently 404

```bash
curl -i -X POST "$BASE/api/content/$TYPE/$CONTENT_ID/view" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "durationMs": 5000,
    "progressPct": 30,
    "isComplete": false,
    "source": "feed",
    "deviceId": "device_dev_test",
    "sessionId": "session_dev_test"
  }'
```

**Expected:** `200`  
**Actual (local):** `404`

### 1.2 Metadata — currently 404

```bash
curl -i -X GET "$BASE/api/content/$TYPE/$CONTENT_ID/metadata" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** `200` with likes/saves/views/comments + `userInteractions`  
**Actual (local):** `404`

### 1.3 Batch metadata

```bash
curl -i -X POST "$BASE/api/content/batch-metadata" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      { \"contentType\": \"$TYPE\", \"contentId\": \"$CONTENT_ID\" }
    ]
  }"
```

**Expected:** `200` object keyed by `contentId`  
**Actual (local):** often missing / 404 → frontend falls back to per-item metadata (also 404)

### 1.4 Like — 503 when Redis/idempotency store is down

```bash
KEY="$(uuidgen)"

curl -i -X POST "$BASE/api/content/$TYPE/$CONTENT_ID/like" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{}'
```

**Observed (local):**

```http
HTTP/1.1 503
{
  "message": "Idempotency store unavailable. Retry without Idempotency-Key or try again shortly."
}
```

Frontend then retries **once without** `Idempotency-Key`. That unblocks UX but loses duplicate-tap protection.

---

## 2. Required contracts

### 2.1 View — `POST /api/content/:contentType/:contentId/view`

**Auth:** Optional Bearer (anonymous views via `deviceId` / `sessionId`).

**Body (frontend sends):**

| Field | Type | Notes |
|-------|------|--------|
| `durationMs` | number | Watch time so far |
| `progressPct` | number | `0–100` or `0–1` (accept both) |
| `isComplete` | boolean | Finished |
| `source` | string | `feed` \| `reels` \| `detail` |
| `deviceId` | string | Stable per install |
| `sessionId` | string | Per app session |

**Success response:**

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

| Rule | Detail |
|------|--------|
| Qualification | Video/reels: ≥3s **or** ≥25% **or** complete. Audio: ≥10s **or** ≥20% **or** complete. Ebook: ≥10s **or** ≥10% **or** complete |
| Dedupe | 1 counted view / user-or-device / content / **hour** |
| Below threshold / deduped | Still `200`, with `"counted": false` — do **not** 404/400 |
| Counter | Never decrement; UI only bumps when `counted: true` |

**Frontend caller:** `app/utils/contentInteraction/view.ts`

---

### 2.2 Single metadata — `GET /api/content/:contentType/:contentId/metadata`

**Auth:** Optional Bearer. When present, include **this user’s** interaction flags.

**Success response:**

```json
{
  "success": true,
  "data": {
    "likes": 11,
    "saves": 2,
    "shares": 1,
    "views": 43,
    "comments": 4,
    "userInteractions": {
      "liked": true,
      "saved": false,
      "shared": false,
      "viewed": true
    }
  }
}
```

Aliases accepted by frontend (prefer the shape above): `likeCount`, `viewCount`, `hasLiked`, `userInteraction`, etc.

**Frontend caller:** `app/utils/contentInteraction/metadata.ts`

---

### 2.3 Batch metadata — `POST /api/content/batch-metadata`

**Auth:** Optional Bearer (same identity rules as like write path).

**Request:**

```json
{
  "items": [
    { "contentType": "media", "contentId": "694a46734f636937dbd71ce5" }
  ]
}
```

Also accept legacy `{ "contentIds": ["..."] }` during deprecation if needed; prefer `items[]`.

**Success response** (object keyed by id):

```json
{
  "success": true,
  "data": {
    "694a46734f636937dbd71ce5": {
      "likes": 11,
      "saves": 2,
      "shares": 1,
      "views": 43,
      "comments": 4,
      "userInteractions": {
        "liked": true,
        "saved": false,
        "shared": false,
        "viewed": true
      }
    }
  }
}
```

**Critical:** `userInteractions.liked` after login must match what `POST .../like` persisted for the **same user id**.

---

### 2.5 Comments list — `GET /api/content/:contentType/:contentId/comments`

**Symptom:** Card badge shows e.g. **5** comments, but opening the sheet loads **0**.

**Why:** Badge uses feed/metadata `commentCount`. The sheet loads:

```http
GET /api/content/:contentType/:contentId/comments?page=1&limit=8&sortBy=newest
```

If this route is missing (404), empty, or returns a shape the client can’t parse, the modal looks empty while the count stays high.

**Expected success:**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "...",
        "content": "Amen",
        "createdAt": "2026-07-01T12:00:00.000Z",
        "likesCount": 0,
        "isLiked": false,
        "user": { "firstName": "Ada", "lastName": "O", "avatar": "" }
      }
    ],
    "total": 5,
    "hasMore": false
  }
}
```

Also accepted: `data` as a bare array of comments, or `items` instead of `comments`.

**Curl:**

```bash
curl -i "$BASE/api/content/$TYPE/$CONTENT_ID/comments?page=1&limit=20&sortBy=newest" \
  -H "Authorization: Bearer $TOKEN"
```

**Rule:** `total` / feed `commentCount` must match real comment documents for that content id.

---


**Auth:** Required Bearer.

**Headers:**

```http
Authorization: Bearer <jwt>
Content-Type: application/json
Idempotency-Key: <uuid-v4>   # sent per gesture by current app
```

**Body:** empty `{}` or omitted — toggle semantics (like ↔ unlike).

**Success:**

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 11
  }
}
```

`liked` = state **after** this request. `likeCount` = global count.

#### Idempotency rules (must match production intent)

| Case | Behavior |
|------|----------|
| Same `Idempotency-Key` replayed | Return **identical** previous `200` body; **do not toggle again** |
| New key while already liked | Toggle to unlike |
| New key while not liked | Toggle to like |
| Redis / idempotency store **down** | Prefer **fail open**: process like **without** idempotency (log warning). Prefer **not** hard `503` that blocks all likes |
| If you must return 503 | Keep the current message so clients can retry without the key (frontend already does this once) |

**Local Redis (Upstash / docker):** if Redis is noisy or unreachable, likes should still succeed. Fail-closed 503 is why like→unlike felt slow / flaky on local.

---

## 3. Content type mapping

Frontend maps UI types → backend path segment via `mapContentTypeToBackend`:

| UI / feed | Path `:contentType` |
|-----------|---------------------|
| video, videos, sermon, media | `media` |
| music, audio | `audio` (or as already agreed in engagement doc) |
| ebook, book | `ebook` |

Confirm local routers mount:

```text
/api/content/:contentType/:contentId/like
/api/content/:contentType/:contentId/view
/api/content/:contentType/:contentId/metadata
/api/content/batch-metadata
```

A common local bug: media CRUD exists under `/api/media/*` but **engagement router** for `/api/content/*` is not registered in the local server entry.

---

## 4. Feed list shape (related — All tab empty flashes)

`GET /api/media/all-content?page=1&limit=12` (auth and public variants) should return a stable list.

Preferred:

```json
{
  "success": true,
  "data": {
    "media": [ /* items */ ],
    "pagination": { "page": 1, "limit": 12, "total": 120 }
  }
}
```

Also accepted: `data` as array, or `data.media`, or recommendations sections merged by frontend. **Avoid** intermittent empty `media: []` when content exists (causes All tab “No content available yet”).

---

## 5. Checklist for backend

- [ ] `GET .../comments` returns the same count as feed `commentCount` / metadata
- [ ] Register engagement routes on **local** the same as production
- [ ] `POST .../view` → 200 + `viewCount` / `hasViewed` / `counted`
- [ ] `GET .../metadata` → 200 + counts + `userInteractions`
- [ ] `POST /api/content/batch-metadata` accepts `items[]`, returns map by id
- [ ] `POST .../like` works with valid local JWT
- [ ] Idempotency: Redis up → honor key; Redis down → fail **open** (still toggle) or document 503 + allow keyless retry
- [ ] Same `userId` for like write and metadata read
- [ ] Curl suite in §1 all green on local before claiming parity

---

## 6. Acceptance tests (QA)

1. Open All tab on device against local → feed loads; no sustained view/metadata 404 spam after routes exist  
2. Watch a video ≥3s → `POST .../view` returns `counted: true` once; second watch within hour → `counted: false`  
3. Like → heart stays; `GET .../metadata` or batch-metadata shows `liked: true`, `likes` incremented  
4. Unlike immediately after like → smooth; final state `liked: false`  
5. Replay same `Idempotency-Key` → identical body, count unchanged  
6. Stop Redis briefly → like still succeeds (fail-open) **or** keyless retry succeeds without rolling the heart back for long  
7. Logout → login → batch-metadata restores liked state  

---

## 7. What frontend already does (do not “fix” these away)

| Behavior | File |
|----------|------|
| Soft-skip views for 60s on 404 | `app/utils/contentInteraction/view.ts` |
| Metadata 404 → fallback zeros / feed counts | `app/utils/contentInteraction/metadata.ts` |
| Like 503 idempotency → **one** retry without `Idempotency-Key` | `app/utils/contentInteraction/like.ts` |
| Optimistic heart + latest-wins (rapid taps) | `app/store/useInteractionStore/actions/likeActions.ts` |

Once backend routes exist and Redis fail-open is fixed, those workarounds become quiet no-ops and UX matches IG/TikTok.

---

## 8. Contact surfaces

- Views: `app/utils/contentInteraction/view.ts`  
- Metadata: `app/utils/contentInteraction/metadata.ts`  
- Like: `app/utils/contentInteraction/like.ts`, `app/store/useInteractionStore/actions/likeActions.ts`  
- Feed: `src/core/api/MediaApi.ts`, `src/shared/hooks/useMedia.ts`
