# Comments Sheet — TikTok / IG Standard (Frontend Status + Backend Ask)

**Audience:** Backend + product  
**Date:** 2026-07-26  
**Frontend:** `jevahapp-frontend`  
**Related:**
- [`FRONTEND_COMMENTS_HOW_TO_PROCESS.md`](./FRONTEND_COMMENTS_HOW_TO_PROCESS.md) — **canonical FE processing guide** (badge vs list, parse, diagnose)
- [`BACKEND_COMMENTS_LIST_ROUTE_MOUNT.md`](./BACKEND_COMMENTS_LIST_ROUTE_MOUNT.md) — **P0 handoff:** what FE GETs + 404 mount / wrong-route reply template
- [`BACKEND_COMMENT_RICH_COMPOSER_HANDOFF.md`](./BACKEND_COMMENT_RICH_COMPOSER_HANDOFF.md) — images / @ mentions / emoji create+list contract
- [`BACKEND_COMMENTS_COUNT_LIST_CORROBORATION.md`](./BACKEND_COMMENTS_COUNT_LIST_CORROBORATION.md) — count ↔ list invariants for backend
- [`BACKEND_LOCAL_ENGAGEMENT_GAPS_FIX.md`](./BACKEND_LOCAL_ENGAGEMENT_GAPS_FIX.md)
- [`COMMENT_SYSTEM_BACKEND_IMPLEMENTATION_GUIDE.md`](./COMMENT_SYSTEM_BACKEND_IMPLEMENTATION_GUIDE.md)

---

## 0. Goal (product)

Opening the comment icon must feel like **TikTok / Instagram**:

1. Sheet appears **immediately** (~≤180ms) — no bounce, no long wait  
2. Cached comments paint **instantly** on reopen  
3. Fresh list loads in the background and merges in  
4. Badge count **matches** real comments (`commentCount` ↔ list `total`)  
5. Media behind the sheet **keeps playing** (peek + shift)  
6. Guest can **read**; login required only to **post / like / reply**

---

## 1. What frontend already does correctly

| TikTok / IG behavior | Frontend implementation |
|----------------------|-------------------------|
| Same-window sheet (not a full-screen route) | `CommentModalV2` overlay in root layout — not RN `Modal` |
| Media keeps playing under peek | `CommentMediaShift` + fixed peek height (`commentSheetLayout.ts`) |
| Instant open paint | `setIsVisible(true)` first; network after |
| Memory cache on reopen | `peekCachedComments()` + `lastSheetRef` — sync, no AsyncStorage on open |
| Optimistic post / reply / like | Heart + list update before API returns; rollback on failure |
| Public read | GET comments does not require auth (token optional for `isLiked`) |
| Pagination | First page ~12, then load-more |
| Sort modes | Newest / oldest / top (client + `sortBy` query) |
| Snappy motion | Timing ~180ms in / ~160ms out — **no spring bounce** |
| Error honesty | Empty + “Couldn't load / tap retry” when API fails (not fake empty) |
| Content-type mapping | `mapContentTypeForBackend` → `media` / `ebook` / `podcast` / … |
| Multi-shape parse | Accepts `comments`, `items`, `results`, `docs`, or bare `data: []` |
| Fallback list URLs on 404 | Tries, in order: `/api/content/:type/:id/comments` → `/api/media/:id/comments` → `/api/content/:id/comments` → `/api/interactions/:type/:id/comments` |

**Primary files**

- `app/components/CommentModalV2.tsx` — sheet UI / animation  
- `app/context/CommentModalContext.tsx` — open/close + load  
- `app/utils/contentInteraction/comments.ts` — GET/POST/like/edit/delete  
- `app/components/CommentMediaShift.tsx` — feed lift into peek  

---

## 2. Observed bug (why badge says 5 but sheet is empty)

| Surface | Source |
|---------|--------|
| Icon badge **“5”** | Feed / metadata `commentCount` on the media document |
| Sheet list | `GET …/comments` |

These are **different APIs**. If the list endpoint is missing, empty, auth-walled, or returns an unparseable body, the sheet is empty while the badge stays high.

**Frontend cannot invent the 5 comments.** It must receive them from the list endpoint (or a cache populated by a previous successful fetch).

---

## 3. What backend must do (correct contract)

### 3.1 List comments (P0)

```http
GET /api/content/:contentType/:contentId/comments?page=1&limit=20&sortBy=newest
```

**Auth:** Optional. Public read. With Bearer, set `isLiked` per comment.

**Success:**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "…",
        "content": "Amen 🙏",
        "createdAt": "2026-07-01T12:00:00.000Z",
        "likesCount": 2,
        "isLiked": false,
        "user": {
          "firstName": "Ada",
          "lastName": "O",
          "avatar": "https://…"
        },
        "replies": []
      }
    ],
    "total": 5,
    "hasMore": false
  }
}
```

**Rules**

1. `total` **must equal** the feed’s `commentCount` for that content id (same DB source of truth).  
2. Never return `404` for “no comments” — return `200` + `comments: []` + `total: 0`.  
3. `404` only if **content** itself does not exist.  
4. Do not require login to read.  
5. Register this route on **local** the same as production.

### 3.2 Create comment (P0)

```http
POST /api/content/:contentType/:contentId/comment
Authorization: Bearer <jwt>
Content-Type: application/json

{ "content": "…", "parentCommentId": null }
```

Response: created comment under `data`, and increment content `commentCount` atomically.

### 3.3 Edit / delete / reaction

| Action | Method | Path |
|--------|--------|------|
| Edit | `PATCH` | `/api/content/comments/:commentId` |
| Delete | `DELETE` | `/api/content/comments/:commentId` |
| Like toggle | `POST` | `/api/interactions/comments/:commentId/reaction` body `{ "reactionType": "like" }` |

### 3.4 Curl checklist (local)

```bash
BASE=http://127.0.0.1:4000
TOKEN=<local jwt>
TYPE=media
ID=<id that shows commentCount=5 on feed>

curl -i "$BASE/api/content/$TYPE/$ID/comments?page=1&limit=20&sortBy=newest"
# Expect 200 + 5 items (or total:5)

curl -i -X POST "$BASE/api/content/$TYPE/$ID/comment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"test from curl"}'
```

---

## 4. What next (ordered)

### Backend (blocks real list)

1. Mount `GET/POST …/comments` + `…/comment` on local  
2. Align `commentCount` with comment documents  
3. Public GET; optional auth for `isLiked`  
4. Confirm curl §3.4 green  

### Frontend (done / ongoing)

1. ✅ Snappy open/close (timing, no bounce)  
2. ✅ Memory cache + last-sheet reopen  
3. ✅ Multi-path fetch + richer response parse  
4. ✅ Retry UI when load fails  
5. Next (optional): prefetch first page when a card with `commentCount > 0` enters viewport  

### QA acceptance

- [ ] Tap comment icon → sheet visible in &lt;200ms  
- [ ] Close → reopen same item → comments visible immediately  
- [ ] Badge 5 → sheet shows 5 (or `total` matches after load)  
- [ ] Logged out → can read; post prompts login  
- [ ] Media continues playing under peek  

---

## 5. If sheet still empty after this frontend pass

Check Metro for:

```text
⚠️ Comments 404, trying next path: …
⚠️ All comment list paths failed …
📥 Comments OK (n/total) via …
Couldn't load comments
```

- **All paths 404** → backend route not mounted (handoff this doc).  
- **200 but 0 items while total&gt;0** → response shape / query filter bug on backend.  
- **200 with items** → frontend should render; if not, file a frontend bug with the JSON body.
