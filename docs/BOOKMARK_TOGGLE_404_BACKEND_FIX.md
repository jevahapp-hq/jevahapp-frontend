# Bookmark Toggle 404 – Frontend + Backend

## Symptom

```
POST /api/bookmark/:id/toggle → 404 {"success":false,"message":"Media not found"}
```

Example from logs: contentId `694a46734f636937dbd71ce5` (`videos` / Christmas Celebration).

## Frontend behavior (this branch)

1. Retries bookmark toggle with contentType aliases: `media`, `videos`, `video`, raw type.
2. Falls back to `POST /api/media/interactions/:id/save` if bookmark still 404s.
3. **Does not** pretend the save succeeded (no ghost library items).
4. Parses `/api/bookmark/user` as `data.bookmarks` (was looking for `data.media`).

## Backend fix still required

Bookmark lookup must resolve the same Media document the feed returns. If the ID exists in the feed API but not in the collection used by `/api/bookmark/:id/toggle`, bookmark will keep 404’ing after all frontend retries.

Recommended: use the same `getContentModel(contentType)` path as likes:

```js
const contentType = req.body?.contentType || "media";
const ContentModel = getContentModel(contentType);
const content = await ContentModel.findById(contentId);
if (!content) {
  return res.status(404).json({ success: false, message: "Media not found" });
}
```
