# Backend Handoff — Comment List Route Mount (404)

**Audience:** Backend  
**Priority:** P0 — comment sheet cannot render without a successful list GET  
**Frontend:** `jevahapp-frontend`  
**Date:** 2026-07-26  
**Related:** [`BACKEND_COMMENTS_COUNT_LIST_CORROBORATION.md`](./BACKEND_COMMENTS_COUNT_LIST_CORROBORATION.md) · [`BACKEND_LOCAL_ENGAGEMENT_GAPS_FIX.md`](./BACKEND_LOCAL_ENGAGEMENT_GAPS_FIX.md) · [`FRONTEND_COMMENTS_HOW_TO_PROCESS.md`](./FRONTEND_COMMENTS_HOW_TO_PROCESS.md)

---

## Ask (one decision)

Please confirm **one** of:

1. **Mount / register** the primary list route below on **local** (same as prod), **or**
2. Tell frontend the **canonical path** you actually serve so we stop calling a dead URL.

Do **not** treat this as an empty-thread case. Empty must be `200` + `total: 0`. We are getting **`404`**.

---

## What frontend consumes (source of truth for FE)

**Code:** `app/utils/contentInteraction/comments.ts` → `getComments()` / `commentListUrls()`.

### Primary (preferred)

```http
GET /api/content/{mappedType}/{contentId}/comments?page=1&limit=12&sortBy=newest
```

| Field | Value |
|-------|--------|
| Host | Same as feed / likes / sockets (`EXPO_PUBLIC_API_URL_LOCAL` when `API_ENV=local`) |
| `mappedType` | Almost always `media` for All-tab video/audio/sermon (via `mapContentTypeForBackend`) |
| `contentId` | Same Mongo `_id` as feed card / like / socket room `media:{id}` |
| Auth | **Optional** — omit Bearer when logged out; send Bearer when logged in (for `isLiked`) |
| Query | `page`, `limit`, `sortBy=newest\|oldest\|top` |

**Expected 200 body:**

```json
{
  "success": true,
  "data": {
    "comments": [ /* … */ ],
    "total": 5,
    "totalComments": 5,
    "hasMore": false,
    "page": 1,
    "limit": 12
  }
}
```

FE also accepts `items` / `results` / `docs` / bare array under `data`. Prefer `data.comments` + `data.total`.

### Fallbacks FE already tries on 404 / 405 (first 200 wins)

1. `/api/content/{mappedType}/{contentId}/comments` ← **primary**
2. `/api/media/{contentId}/comments`
3. `/api/content/{contentId}/comments`
4. `/api/interactions/{mappedType}/{contentId}/comments`

If **all four** return 404 → FE shows “Couldn't load / tap to retry”. It does **not** invent rows from `commentCount`.

### Related write paths FE also uses (same host)

| Action | Method + path |
|--------|----------------|
| Create / reply | `POST /api/content/{mappedType}/{contentId}/comment` body `{ "content", "parentCommentId"? }` + Bearer |
| Edit | `PATCH /api/content/comments/{commentId}` |
| Delete | `DELETE /api/content/comments/{commentId}` |
| Heart | `POST /api/content/comments/{commentId}/reaction` then legacy `POST /api/interactions/comments/{commentId}/reaction` |

---

## Observed on local (repro) — updated 2026-07-26 17:40

**Env:** App → LAN `:4000`; curl → `http://127.0.0.1:4000`  
**Feed id:** `69abf4886aef561f683a1a32`

### Route is mounted (backend logs)

Phone hit primary path; backend logged **`304`** (Not Modified), not missing route:

```text
GET /api/content/media/69abf4886aef561f683a1a32/comments?page=1&limit=12&sortBy=newest → 304
```

Deprecated fallbacks also **304**. Metadata/view on same server → **200**.

### Why FE still showed “404”

React Native / OkHttp often has **no cached body** for a bare 304 → empty response / failed parse → FE fallback chain / hard failure (Metro may label it 404).

**Curl with cache bypass returns 200 + comments:**

```bash
curl -i -H "Cache-Control: no-cache" \
  "$BASE/api/content/media/$ID/comments?page=1&limit=12&sortBy=newest"
# → 200 + data.comments[]
```

**FE fix:** list GET sends `Cache-Control: no-cache` / `Pragma: no-cache` and `cache: 'no-store'` (`comments.ts`).

### Separate auth noise (not the list mount)

Local Mongo has no user for the phone’s stored JWT → `User not found` / `Invalid refresh token`. List is public (guest OK). Re-login against **local** for likes/post/notifications.

---

## How to distinguish mount vs wrong id

```bash
BASE=http://127.0.0.1:4000   # must match app
ID=69abf4886aef561f683a1a32  # or any All-tab _id
TYPE=media

curl -i "$BASE/api/content/$TYPE/$ID/comments?page=1&limit=20&sortBy=newest"
```

| Curl | Meaning | Backend action |
|------|---------|----------------|
| Connection refused | API down / wrong host | Start local API; align FE `BASE` |
| **404** on primary + all FE fallbacks | Route not mounted **or** path differs from contract | Mount primary **or** reply with canonical path |
| **404** + body `CONTENT_NOT_FOUND` | Route exists; id missing in **this** DB | Same Mongo as feed; seed or fix id |
| **200** + `total: 0` + `[]` | Route OK; empty thread | Heal `commentCount` if badge ≠ 0 |
| **200** + items + `total: N` | Contract green | FE should render; if not, FE bug |

**Rule:** Missing comments ≠ 404. Missing comments = **200** + empty list.

---

## Reply template (please fill)

```text
Canonical list path: ________________________________
Mounted on local?     yes / no
Mounted on prod?      yes / no
Empty thread status:  200 + []  (required)
CONTENT_NOT_FOUND:    only when media id truly missing
If FE path wrong, use: ______________________________
Sample curl that returns 200 on local:
  curl -i "…"
```

After you confirm the path, FE will point primary at that URL (and drop dead fallbacks if you say so).

---

## Acceptance

- [ ] Local: primary `GET /api/content/media/:id/comments` returns **200** for a feed id (empty or with rows)
- [ ] Prod: same path
- [ ] FE Metro shows `📥 Comments OK (n/total) via …` instead of all-paths-failed
- [ ] Badge updates from `data.total` after successful list
- [ ] Or: backend documents a different canonical path and FE is updated in one PR

---

## Not a frontend invent-rows bug

Badge `commentCount` is a **hint** from feed/metadata. Sheet rows come **only** from list GET (or memory cache of a prior **200**). Until the list route returns 200 on the same host as the feed, the sheet will correctly show load failure — not fake empty from the badge.
