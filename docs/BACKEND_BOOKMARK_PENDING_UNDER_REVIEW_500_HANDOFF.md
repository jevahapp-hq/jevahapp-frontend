# Backend Handoff — Bookmark/save 500 on pending / under-review media

**Date:** 2026-08-03  
**Audience:** Backend / engagement  
**Frontend:** `jevahapp-frontend`  
**Related:** [`BOOKMARK_TOGGLE_404_BACKEND_FIX.md`](./BOOKMARK_TOGGLE_404_BACKEND_FIX.md) · [`FEED_AND_BOOKMARK_BACKEND_SPEC.md`](./FEED_AND_BOOKMARK_BACKEND_SPEC.md) · [`BACKEND_VIEW_UNDER_REVIEW_500_HANDOFF.md`](./BACKEND_VIEW_UNDER_REVIEW_500_HANDOFF.md)

---

## 0. Symptom (device / Metro)

```
[feed-card] {
  "id": "6a6f702744f8f938d715d416",
  "processingStatus": "pending",
  "duration": 36.15,
  "fileUrl": "https://…r2.dev/…"
}

POST /api/bookmark/6a6f702744f8f938d715d416/toggle
→ 500 {"success":false,"message":"An unexpected error occurred while processing your request"}

ERROR  ❌ TOGGLE SAVE: Error toggling save: [Error: HTTP error! status: 500, …]
endpoint: "/api/bookmark/6a6f702744f8f938d715d416/toggle"
contentType tried: media (FE also logs videos in analytics)
```

Same pattern as view 500 on under-review: media is playable in the app, engagement mutation crashes.

`ENOENT InternalBytecode.js` is Metro symbolication noise after FE throws — ignore for BE.

---

## 1. Corroborate with FE

| | FE |
|--|-----|
| Method / path | `POST /api/bookmark/:contentId/toggle` |
| Auth | **Required** Bearer JWT |
| Body | `{ "contentType": "media" }` (retries `videos` / `video` only on **404**) |
| Source | `app/utils/contentInteraction/save.ts` → `toggleSave()` |
| Expect | `200` + `data.bookmarked` / `isBookmarked` + `bookmarkCount` / `saves` |

On **non-404** errors FE fails fast (does not retry aliases). A **500** never reaches the `/api/media/interactions/:id/save` fallback.

---

## 2. Product rule (align with views)

If the client can already play the media (owner / review surface / feed card present):

| `processingStatus` | `moderationStatus` | Allow bookmark? |
|--------------------|--------------------|-----------------|
| `ready` / `pending` / `processing` | `approved` | **Yes** |
| any playable | `under_review` / `pending` | **Yes** |
| — | `rejected` | Prefer `200` + no-op or `400` with clear message — **not 500** |
| deleted | — | `404` or `200` counted:false-style — **not 500** |

Bookmark is “save for later,” not a public ranking unlock. Do **not** require `processingStatus === "ready"` or `moderationStatus === "approved"` before toggle.

---

## 3. Likely BE causes

1. Lookup uses **approved-only** / **ready-only** filter → then null deref → generic 500 handler.  
2. Side effect assumes HLS / CDN fields exist (still `pending`) → throw.  
3. Bookmark model / unique index conflict uncaught.  
4. Same broken resolver as historical **404 Media not found** (wrong collection) — now throwing instead of returning 404.

**Fix sketch:**

```ts
const contentType = req.body?.contentType || "media";
const ContentModel = getContentModel(contentType); // same as likes
const media = await ContentModel.findById(contentId);
if (!media || media.deletedAt) {
  return res.status(404).json({ success: false, message: "Media not found" });
}
if (media.moderationStatus === "rejected") {
  return res.status(400).json({
    success: false,
    message: "This content can’t be saved",
  });
}
// pending / processing / under_review / approved → toggle bookmark for req.user
```

Wrap mutations in try/catch; never leak uncaught exceptions as opaque 500 without logging the real stack.

---

## 4. Curl repro

```bash
BASE=http://127.0.0.1:4000
TOKEN="<jwt>"
ID=6a6f702744f8f938d715d416   # pending / under_review id from feed

curl -i -X POST "$BASE/api/bookmark/$ID/toggle" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"contentType":"media"}'
```

**Expect:**

```json
{
  "success": true,
  "data": {
    "bookmarked": true,
    "isBookmarked": true,
    "bookmarkCount": 1,
    "saves": 1
  }
}
```

**Today:** `500` + generic message.

Also confirm:

```bash
db.media.findOne(
  { _id: ObjectId("6a6f702744f8f938d715d416") },
  { title: 1, processingStatus: 1, moderationStatus: 1, deletedAt: 1 }
)
```

---

## 5. Response contract (unchanged)

Aliases FE already accepts:

- `bookmarked` **or** `isBookmarked`
- `bookmarkCount` **or** `saves`

Library list still: `GET /api/bookmark/user` → `data.bookmarks`.

---

## 6. BE checklist

- [ ] Toggle returns **200** for `processingStatus: pending|processing` when media exists  
- [ ] Toggle returns **200** for `moderationStatus: under_review|pending`  
- [ ] Rejected → **400** (or soft 200) — never uncaught **500**  
- [ ] Same `getContentModel` path as likes/feed  
- [ ] Log real exception before generic error middleware  
- [ ] Optional: same fix for `POST /api/media/interactions/:id/save` if used as fallback  

---

## 7. FE note

FE will soft-warn on bookmark **5xx** (no ghost save). Counts/library still require BE to return **200**.
