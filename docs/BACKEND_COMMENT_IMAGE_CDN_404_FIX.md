# Backend Handoff — Comment Image CDN 404 (P0)

**Audience:** Backend  
**Priority:** **P0** — FE sheet shows **“Photo unavailable”**; text works, photo does not  
**Frontend:** `jevahapp-frontend`  
**Date:** 2026-07-26  
**Related:** [`BACKEND_COMMENT_RICH_COMPOSER_HANDOFF.md`](./BACKEND_COMMENT_RICH_COMPOSER_HANDOFF.md)

---

## One-sentence ask

**Stop returning `imageUrl` values that 404.** After upload, the public CDN URL in the comment document must `GET`/`HEAD` with **200** and `Content-Type: image/*`.

Frontend already renders `imageUrl` from list/create. It cannot invent bytes for a dead link.

---

## Repro (local, confirmed)

**Media id:** `694a46734f636937dbd71ce5`  
**Comment id:** `6a66447d7fc93df3cc662cfb`

```bash
BASE=http://127.0.0.1:4000
ID=694a46734f636937dbd71ce5

# 1) List — FE gets imageUrl
curl -s "$BASE/api/content/media/$ID/comments?page=1&limit=12&sortBy=newest" | jq '.data.comments[0] | {id, content, imageUrl}'
```

**Observed list fields (working):**

```json
{
  "id": "6a66447d7fc93df3cc662cfb",
  "content": "This works?",
  "imageUrl": "https://pub-17c463321ed44e22ba0d23a3505140ac.r2.dev/comments/1785087100441-kj6t1z0.jpg"
}
```

(`image` / `mediaUrl` / `attachmentUrl` aliases also present — same URL.)

```bash
# 2) CDN — file missing
curl -I "https://pub-17c463321ed44e22ba0d23a3505140ac.r2.dev/comments/1785087100441-kj6t1z0.jpg"
# → HTTP/1.1 404 Not Found

curl -I "https://pub-17c463321ed44e22ba0d23a3505140ac.r2.dev/jevah/user-avatars/1759422356963-v1a7ttsxi.jpg"
# → HTTP/1.1 200 OK   (same public host, different key prefix)
```

**App symptom:** Comment sheet text visible; image tile **“Photo unavailable”** (FE `Image` `onError` after CDN 404).

---

## Likely root causes (check in order)

1. **Wrong R2 object key** — uploaded under `comments/…` but public/custom domain expects `jevah/comments/…` (avatars use `jevah/user-avatars/…`).
2. **URL built before/without successful `PutObject`** — Mongo gets a guessed URL; upload failed or wrote elsewhere.
3. **Private object / wrong bucket** — key exists in private bucket; public `*.r2.dev` host can’t see it.
4. **Path mismatch** — `imageUrl` path ≠ actual key (typo, missing folder, wrong filename).

---

## What to implement

### A. Upload path (create with image)

On `POST /api/content/:type/:id/comment` **multipart** (`image` file field):

1. Read file buffer from multipart.
2. Upload to the **same public R2 (or CDN) pipeline used for avatars/media**.
3. Prefer key pattern aligned with working assets, e.g.:

```text
jevah/comments/{timestamp}-{random}.jpg
```

4. Build `imageUrl` as:

```text
{PUBLIC_R2_BASE}/{exactKey}
```

Example shape that matches working avatars:

```text
https://pub-17c463321ed44e22ba0d23a3505140ac.r2.dev/jevah/comments/{…}.jpg
```

5. **Only then** persist comment with that `imageUrl`.
6. Optional but strong: after upload, `HEAD`/`GET` the public URL (or S3 `HeadObject`) before saving; if not found, fail create with `500` / `UPLOAD_FAILED` — do **not** save a dead URL.

### B. List / create response

Keep returning:

```json
"imageUrl": "https://…/jevah/comments/….jpg"
```

Aliases FE already reads: `image`, `mediaUrl`, `attachmentUrl` (same URL is fine).

### C. Heal existing bad rows (recommended)

For comments whose `imageUrl` 404s:

- Re-upload from backup if you still have the object under another key, **or**
- Clear `imageUrl` / mark attachment missing so FE doesn’t show a broken tile forever.

At minimum: **new** uploads must be curl-green.

---

## FE contract (already live — do not change)

| Step | FE |
|------|-----|
| Send | Multipart `POST …/comment` with `content` + `image` (JPEG ~1080px) |
| Fallback | `POST /api/content/comments/upload-image` then JSON `{ imageUrl }` |
| List | Reads `imageUrl` \| `image` \| `mediaUrl` \| `attachmentUrl` |
| Render | `<Image source={{ uri: imageUrl }} />` |
| CDN 404 | Shows **“Photo unavailable”** (not a blank text-only bug) |

Frontend **will not** proxy or re-host the file.

---

## Acceptance checklist

- [ ] Fresh multipart comment create returns `200` + `imageUrl`
- [ ] `curl -I "$imageUrl"` → **200** + `Content-Type: image/jpeg` (or png/webp)
- [ ] `GET /api/content/media/:id/comments` returns that same URL
- [ ] Phone: reopen sheet → photo visible (not “Photo unavailable”)
- [ ] Text-only comments still work without `imageUrl`

### Verify script

```bash
BASE=http://127.0.0.1:4000
TOKEN="<local JWT>"
ID=694a46734f636937dbd71ce5

# create
RESP=$(curl -s -X POST "$BASE/api/content/media/$ID/comment" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'content=CDN check' \
  -F 'image=@./test.jpg;type=image/jpeg')

echo "$RESP" | jq '.data.imageUrl // .data.image'
URL=$(echo "$RESP" | jq -r '.data.imageUrl // .data.image // empty')

# must be 200
curl -sI "$URL" | head -n 5
```

---

## Reply template

```text
Root cause:     wrong key / private object / URL before PutObject / other: ___
New key prefix: jevah/comments/ … (or: ________________)
curl -I imageUrl: 200 / still 404
Healed old rows: yes / no
Sample good URL: ________________________________
```

---

## Out of scope for this ticket

- @ user search directory  
- Emoji API (Unicode in `content` is enough)  
- FE changes (renderer already correct once CDN is 200)
