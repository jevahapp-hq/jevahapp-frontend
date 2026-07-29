# Backend Handoff: Comment Count ↔ Comment List Corroboration

**Audience:** Backend engineers  
**Date:** 2026-07-26  
**Priority:** P0 — badge shows N comments; opening the sheet gets `404` / empty  
**Frontend:** `jevahapp-frontend`  
**Observed:** `Failed loading comments: HTTP error! status: 404` while UI badge / media doc claims e.g. **5** comments  

**Companion docs:**
- [`BACKEND_COMMENTS_LIST_ROUTE_MOUNT.md`](./BACKEND_COMMENTS_LIST_ROUTE_MOUNT.md) — **send first on 404:** exact paths FE calls + mount vs wrong-route reply template
- [`FRONTEND_COMMENTS_TIKTOK_STANDARD.md`](./FRONTEND_COMMENTS_TIKTOK_STANDARD.md) — TikTok/IG UX + full API shapes  
- [`BACKEND_LOCAL_ENGAGEMENT_GAPS_FIX.md`](./BACKEND_LOCAL_ENGAGEMENT_GAPS_FIX.md) — views / metadata / like  

---

## 0. One-sentence ask

**Treat comment *count* and comment *list* as one system.**  
If feed/metadata says `commentCount: 5`, then:

```http
GET /api/content/:contentType/:contentId/comments
```

must return **HTTP 200** with those **5** documents (or `total: 5` + paginated items) — never a silent 404 while the count field stays high.

Frontend is already wired for TikTok/IG open/cache/optimistic UX. It **cannot** render comments the list endpoint does not return.

---

## 1. What frontend is doing correctly

| Concern | Frontend behavior | Why it matters for you |
|--------|-------------------|-------------------------|
| Badge | Reads `commentCount` / `comments` / store stats from **feed or metadata** | That number is only a hint until list confirms it |
| Sheet open | Opens immediately; then calls **list** API | Empty sheet + badge 5 = list API failed or empty |
| List request | `GET /api/content/{mappedType}/{contentId}/comments?page=&limit=&sortBy=` | Primary contract path |
| Type mapping | UI `video` / `sermon` / `audio` / … → path segment **`media`** (ebook/podcast/artist/merch stay distinct) | Your `:contentType` must accept `media` for feed videos |
| Fallbacks on 404 | Also tries `/api/media/:id/comments`, `/api/content/:id/comments`, `/api/interactions/:type/:id/comments` | If **all** 404, route is missing or id wrong |
| Parse | Accepts `data.comments`, `data.items`, `data.results`, `data.docs`, or `data` as array | Prefer canonical `data.comments` + `data.total` |
| Auth | GET is public; Bearer optional (for `isLiked`) | Do **not** 401 anonymous readers |
| Post | `POST /api/content/:type/:id/comment` with `{ content, parentCommentId? }` | Must persist **and** bump the same counter the feed reads |
| After load | Updates local badge from list `totalComments` when present | List is treated as source of truth when it succeeds |
| Errors | Shows “Couldn't load / tap retry” on 404 — does not invent rows | Matches observed Metro: `HTTP error! status: 404` |

**Code:** `app/utils/contentInteraction/comments.ts`, `app/context/CommentModalContext.tsx`, `app/components/CommentModalV2.tsx`.

---

## 2. Required backend structure (corroboration model)

### 2.1 Single source of truth

```text
┌─────────────────────┐     write      ┌──────────────────┐
│  Comment collection │◄──────────────│  POST …/comment  │
│  (one doc per row)  │                └──────────────────┘
└─────────┬───────────┘
          │ count(*) / $inc on write
          ▼
┌─────────────────────┐     read       ┌──────────────────┐
│ Content.commentCount│───────────────►│ Feed / metadata  │  → badge
└─────────────────────┘                └──────────────────┘
          │
          │ same contentId + contentType
          ▼
┌─────────────────────┐     read       ┌──────────────────┐
│ GET …/comments      │───────────────►│ Comment sheet    │  → list
└─────────────────────┘                └──────────────────┘
```

**Invariant (must always hold):**

```text
Content.commentCount
  === count(Comment docs where contentId + contentType match and not deleted)
  === GET …/comments → data.total   (for page 1 with no filters beyond sort)
```

If feed says 5 and GET returns 404 or `total: 0` with no rows → **broken corroboration**.

### 2.2 Suggested schema (logical)

**Comment**

| Field | Notes |
|-------|--------|
| `_id` | ObjectId |
| `contentId` | Same id as feed item `_id` |
| `contentType` | Same as path segment: `media`, `ebook`, `podcast`, … |
| `userId` | Author |
| `content` | Body text |
| `parentCommentId` | `null` top-level; set for replies |
| `likesCount` | Denormalized |
| `createdAt` / `updatedAt` | ISO |
| `deletedAt` | Soft delete — excluded from count + list |

**Content (media / etc.)**

| Field | Notes |
|-------|--------|
| `_id` | Same id clients use in like/view/comment URLs |
| `commentCount` | Maintained on create/delete of top-level comments (define whether replies increment; if yes, document it and keep list `total` consistent) |

### 2.3 Routes that must exist together

| Role | Method | Path |
|------|--------|------|
| List (public) | `GET` | `/api/content/:contentType/:contentId/comments` |
| Create (auth) | `POST` | `/api/content/:contentType/:contentId/comment` |
| Edit (owner) | `PATCH` | `/api/content/comments/:commentId` |
| Delete (owner) | `DELETE` | `/api/content/comments/:commentId` |
| Reaction (auth) | `POST` | `/api/interactions/comments/:commentId/reaction` |

Optional aliases are fine **in addition**, but the **primary** path above must work on local and production.

### 2.4 List response (canonical)

```http
GET /api/content/media/694a46734f636937dbd71ce5/comments?page=1&limit=20&sortBy=newest
```

**200 — has comments**

```json
{
  "success": true,
  "data": {
    "comments": [ /* length ≤ limit */ ],
    "total": 5,
    "hasMore": false
  }
}
```

**200 — truly none**

```json
{
  "success": true,
  "data": {
    "comments": [],
    "total": 0,
    "hasMore": false
  }
}
```

**404** — only if **content** does not exist (same rule as like).  
**Not** “zero comments” and **not** “route forgotten on local.”

Each comment item should include at least: `_id` (or `id`), `content`, `createdAt`, `likesCount`, `user` / author fields, optional `replies`, optional `isLiked` when Bearer present.

### 2.5 Write path must update count

On successful `POST …/comment` (top-level):

1. Insert Comment doc with that `contentId` + `contentType`  
2. `$inc` `commentCount` on the **same** Content document the feed reads  
3. Return the created comment under `data`  

On delete (soft or hard): decrement with floor 0; list must stop returning that row.

---

## 3. Why you see “backend has 5” but app gets 404

Typical local causes:

1. **`commentCount` denormalized on Media**, but **comments router not registered** in local server entry → GET 404, badge still 5  
2. **Comments in DB under a different `contentType`** than path `media`  
3. **Comments keyed by a different id** than feed `_id`  
4. **List lives only under a legacy path** frontend already tries as fallback — if those also 404, nothing is mounted  
5. **Production has the route; local does not** — frontend is pointed at local  

Reproduce (same id as the card):

```bash
BASE=http://127.0.0.1:4000
ID=<contentId from feed>
TYPE=media

# A) What the badge is based on (feed / single media)
curl -s "$BASE/api/media/all-content?page=1&limit=12" | head

# B) What the sheet needs — THIS must be 200 + total matching badge
curl -i "$BASE/api/content/$TYPE/$ID/comments?page=1&limit=20&sortBy=newest"
```

| A says | B returns | Diagnosis |
|--------|-----------|-----------|
| `commentCount: 5` | `404` | Route missing or wrong mount — **fix routing** |
| `commentCount: 5` | `200` + `total: 0` / `[]` | Count out of sync or query filter wrong — **fix corroboration** |
| `commentCount: 5` | `200` + 5 items | Frontend should render; share JSON if not |
| Content missing | `404` on both | Bad/stale feed id |

---

## 4. Acceptance checklist (backend)

- [ ] Local and prod both serve `GET /api/content/:contentType/:contentId/comments`  
- [ ] `curl` in §3 returns **200** for an id that shows a non-zero badge  
- [ ] `data.total ===` feed `commentCount` for that id  
- [ ] Empty state is **200 + total: 0**, not 404  
- [ ] POST comment increments the same `commentCount` the next feed/metadata read returns  
- [ ] Anonymous GET works without Authorization  
- [ ] Soft-deleted comments excluded from list **and** count  

---

## 5. What frontend will do once B is green

- Paint list from `data.comments`  
- Sync badge to `data.total`  
- Cache in memory for snappy reopen  
- Keep TikTok-style sheet (media peek, optimistic post)  

No further frontend inventing of rows — **corroboration is entirely on the API + DB invariants above.**

---

## 6. Contact surfaces

| Side | Location |
|------|----------|
| List / create client | `app/utils/contentInteraction/comments.ts` |
| Sheet orchestration | `app/context/CommentModalContext.tsx` |
| UX | `app/components/CommentModalV2.tsx` |
| Type mapping | `app/utils/engagementHelpers.ts` → `mapContentTypeForBackend` |
