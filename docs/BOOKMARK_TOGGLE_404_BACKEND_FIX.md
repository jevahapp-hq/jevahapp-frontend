# Bookmark Toggle 404 for Sermons – Backend Fix

**Problem:** `POST /api/bookmark/:contentId/toggle` returns 404 "Media not found" when saving sermons (and potentially other content types like audio, devotional).

**Root cause:** The bookmark endpoint likely looks up content by ID in a single collection (e.g. Media). Sermons may be stored in a different collection or require `contentType` to resolve correctly.

**Frontend change (done):** The app now sends `contentType` in the request body:

```json
POST /api/bookmark/:contentId/toggle
Content-Type: application/json

{ "contentType": "media" }
```

- **Valid `contentType` values** (same as like endpoint): `media`, `devotional`, `ebook`, `podcast`, `merch`, `artist`
- Sermons, videos, audio, live → frontend sends `"media"`
- Ebooks → `"ebook"`
- Podcasts → `"podcast"`
- etc.

**Backend fix required:** Parse `contentType` from the request body and use it to resolve the content model (e.g. `getContentModel(contentType)` as in the like endpoint). If no body is sent, fallback to `"media"` for backward compatibility.

```javascript
// Example backend logic
const contentType = req.body?.contentType || "media";
const ContentModel = getContentModel(contentType); // Same helper as like endpoint
const content = await ContentModel.findById(contentId);
if (!content) {
  return res.status(404).json({ success: false, message: "Media not found" });
}
// ... toggle bookmark logic
```

This aligns bookmark behavior with the like endpoint (`POST /api/content/:contentType/:id/like`), which already uses contentType to resolve content and works for sermons.
