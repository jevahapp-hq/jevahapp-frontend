# Backend Handoff — Rich Comment Composer (Images, Mentions, Emoji)

**Audience:** Backend  
**Frontend:** `jevahapp-frontend`  
**Date:** 2026-07-26  
**Priority:** P1 — FE composer is live; image attach needs server support  
**P0 right now:** [`BACKEND_COMMENT_IMAGE_CDN_404_FIX.md`](./BACKEND_COMMENT_IMAGE_CDN_404_FIX.md) — list returns `imageUrl` but CDN **404** → sheet “Photo unavailable”  
**Related:** [`FRONTEND_COMMENTS_TIKTOK_STANDARD.md`](./FRONTEND_COMMENTS_TIKTOK_STANDARD.md) · [`FRONTEND_COMMENTS_HOW_TO_PROCESS.md`](./FRONTEND_COMMENTS_HOW_TO_PROCESS.md)

---

## What frontend already does

| Feature | FE behavior | Needs BE? |
|---------|-------------|-----------|
| Emoji | Unicode inserted into `content` | No — store/return as text |
| @ mentions v1 | Suggests **creator + thread authors**; inserts `@DisplayName`; sends `mentions[]` | Accept + persist `mentions`; notify mentioned users |
| @ directory (phase 2) | Will call search when available | `GET /api/users/search?q=` |
| Image comments | Pick → resize → multipart create (or upload then JSON) | **Mount upload/create with image** |
| Image missing | FE shows “Photos need a server update” on `404`/`405` — **never invents a URL** | Return real CDN/`imageUrl` |
| Image URL dead | FE shows “Photo unavailable” when `imageUrl` GETs **404** | Upload must land on a **public** object; curl the URL |

### Observed bug (2026-07-26) — URL saved, file missing

**Full fix brief (send this):** [`BACKEND_COMMENT_IMAGE_CDN_404_FIX.md`](./BACKEND_COMMENT_IMAGE_CDN_404_FIX.md)

List returns:

```text
imageUrl=https://pub-17c463321ed44e22ba0d23a3505140ac.r2.dev/comments/1785087100441-kj6t1z0.jpg
```

But:

```bash
curl -I "$imageUrl"   # → HTTP 404
```

Working assets on the same public host use the `jevah/…` prefix, e.g. avatars:

```text
https://pub-17c463….r2.dev/jevah/user-avatars/…
```

**Ask:** Persist `imageUrl` only after a successful public PutObject (prefer `jevah/comments/…`). FE cannot display a 404 CDN link.

**Acceptance:** `curl -I <imageUrl from list>` → **200** + `image/*`.

---

## 1. Create comment (extend existing)

```http
POST /api/content/{mappedType}/{contentId}/comment
Authorization: Bearer <required>
Content-Type: application/json
```

**JSON body (text / mentions / remote image):**

```json
{
  "content": "Amen @Ada 🙌",
  "parentCommentId": null,
  "mentions": [
    { "userId": "68b607db0e67a29dc6452526", "displayName": "Ada" }
  ],
  "imageUrl": "https://cdn.example/comments/abc.jpg"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `content` | Prefer non-empty; allow `""` if `image`/`imageUrl` present | Max ~500 chars (FE) |
| `parentCommentId` | No | Reply target |
| `mentions` | No | Ignore unknown users; still save text |
| `imageUrl` | No | After dedicated upload |

**Multipart (preferred for camera roll):**

```http
POST /api/content/{mappedType}/{contentId}/comment
Authorization: Bearer <required>
Content-Type: multipart/form-data
```

| Part | Type | Notes |
|------|------|--------|
| `content` | text | May be empty if image-only |
| `parentCommentId` | text | Optional |
| `mentions` | text JSON | Optional stringified array |
| `image` | file | JPEG/PNG/WebP, max **5MB**; FE sends JPEG ~1080px |

**Alternate upload then JSON:**

```http
POST /api/content/comments/upload-image
→ 200 { "success": true, "data": { "url": "https://..." } }

POST /api/content/{type}/{id}/comment
{ "content": "...", "imageUrl": "https://...", "mentions": [...] }
```

FE tries multipart create first; on `404`/`405` tries upload-image; if that also `404`/`405` → `COMMENT_IMAGE_UNSUPPORTED` (user sees server-update banner).

---

## 2. List comments (return rich fields)

```http
GET /api/content/{mappedType}/{contentId}/comments?page=1&limit=12&sortBy=newest
```

Each item should include (aliases accepted by FE):

```json
{
  "_id": "...",
  "content": "Amen @Ada 🙌",
  "imageUrl": "https://...",
  "mentions": [{ "userId": "...", "displayName": "Ada" }],
  "createdAt": "...",
  "likesCount": 0,
  "isLiked": false,
  "user": { "firstName": "Ada", "lastName": "O", "avatar": "" }
}
```

Aliases FE already parses for image: `imageUrl` | `image` | `mediaUrl` | `attachmentUrl`.

**Rules (unchanged):** empty thread = `200` + `total: 0`; never use `404` for “no comments.”

---

## 3. Mentions — business logic

1. Persist `mentions` on the comment document (or derive from text — prefer explicit array).
2. On create, for each `userId` that exists: emit notification type **`mention`** (FE already has this notification type).
3. Do not fail the whole create if one mentioned user is missing — drop that mention, keep comment.
4. Phase 2 directory search:

```http
GET /api/users/search?q=ada&limit=10
Authorization: Bearer <optional or required>
```

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "...",
        "firstName": "Ada",
        "lastName": "O",
        "avatar": "",
        "username": "ada"
      }
    ]
  }
}
```

Until this exists, FE only suggests creator + people already in the thread.

---

## 4. Emoji

No special endpoint. Store Unicode in `content` as-is (UTF-8). List must not strip emoji.

---

## 5. Curl acceptance

```bash
BASE=http://127.0.0.1:4000
TOKEN=...
ID=<mediaId>
TYPE=media

# Text + mention
curl -i -X POST "$BASE/api/content/$TYPE/$ID/comment" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"Hello @Ada 🙏","mentions":[{"userId":"...","displayName":"Ada"}]}'

# Multipart image
curl -i -X POST "$BASE/api/content/$TYPE/$ID/comment" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'content=Look' -F 'image=@./photo.jpg;type=image/jpeg'
```

| Result | FE |
|--------|-----|
| `200` + comment with `imageUrl` | Renders image in sheet |
| `404`/`405` on image paths | Banner: photos need server update; text still works |
| `200` text-only | Unchanged happy path |

---

## 6. Reply template

```text
Multipart create mounted?     yes / no
Upload-image mounted?         yes / no
imageUrl on list items?       yes / no
mentions persisted + notify?  yes / no
GET /api/users/search live?   yes / no (phase 2)
Sample imageUrl domain:       ________________
```

---

## FE code map

| Area | Path |
|------|------|
| Composer UI | `app/components/comments/*` |
| Create client | `app/utils/contentInteraction/comments.ts` → `addComment` |
| Context | `app/context/CommentModalContext.tsx` |
| Sheet | `app/components/CommentModalV2.tsx` |
