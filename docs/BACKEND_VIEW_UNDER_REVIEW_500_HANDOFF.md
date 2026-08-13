# Backend Handoff — View POST 500 on under-review (and similar) media

**Date:** 2026-08-03  
**Audience:** Backend / engagement  
**Frontend:** `jevahapp-frontend`  
**Symptom (device logs):**

```
ERROR  Error recording view: [Error: HTTP error! status: 500]
  recordView (app/utils/contentInteraction/view.ts)
```

Content under review still plays in creator/feed contexts; FE posts a qualified view and BE returns **500** → viewCount stays stale (often stuck at 1 from sockets or seed).

**Related:** [`BACKEND_MEDIA_VIEWS_HANDOFF.md`](./BACKEND_MEDIA_VIEWS_HANDOFF.md)

---

## 0. What FE does

```http
POST /api/content/media/:contentId/view
Authorization: Bearer <optional>
Content-Type: application/json
```

```json
{
  "durationMs": 3200,
  "progressPct": 28,
  "isComplete": false,
  "source": "feed",
  "deviceId": "…",
  "sessionId": "…"
}
```

Qualification (video): ≥3s OR ≥25% OR complete — then one POST per mount.

**FE change (2026-08-03):** HTTP **5xx** is soft-failed (15s backoff, no red throw). Fix still required on BE so counts actually increment.

---

## 1. Likely BE bug (under_review)

Hypothesis: view handler loads media with a filter that only allows `moderationStatus: "approved"` (or throws when status is `under_review` / `pending`), then uncaught exception → **500**.

**Product expectation (IG/TikTok-style for own + reviewable content):**

| `moderationStatus` | Playable? | Count view? |
|--------------------|-----------|-------------|
| `approved` | Yes (public feed) | **Yes** |
| `under_review` / `pending` | Yes for owner / admin / review surfaces | **Yes** (analytics + creator dashboard) |
| `rejected` | Usually no | **No** (or counted:false) |
| soft-deleted | No | **No** |

Views are engagement telemetry, not a public ranking unlock — **do not refuse view recording** just because content is under review.

---

## 2. Required contract

### Success (always prefer 200)

```json
{
  "success": true,
  "data": {
    "viewCount": 2,
    "hasViewed": true,
    "counted": true,
    "isNewView": true
  }
}
```

| Case | HTTP | `counted` |
|------|------|-----------|
| First qualified view | 200 | `true` + increment `viewCount` |
| Deduped / below threshold | 200 | `false` (still return current `viewCount`) |
| Rejected / deleted / missing | 200 or 404 | Prefer **200 + counted:false**; avoid 500 |
| Server error | — | **Never 500 for “under_review” alone** |

### Do not

- Throw when media exists but `moderationStatus !== "approved"`
- Require `published === true` for owner/review views if the client can already play the file
- Return 500 for Mongo cast / null `uploadedBy` on under_review docs

---

## 3. Curl repro

Pick an under_review media id (from creator feed / admin):

```bash
BASE=http://127.0.0.1:4000
TOKEN="<jwt>"
ID="<under_review_media_ObjectId>"

curl -i -X POST "$BASE/api/content/media/$ID/view" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "durationMs": 5000,
    "progressPct": 30,
    "isComplete": false,
    "source": "feed",
    "deviceId": "device_under_review_test",
    "sessionId": "session_under_review_test"
  }'
```

**Expect:** `200` + `counted: true` first time.  
**Today (broken):** `500` with stack in BE logs.

Also check BE logs for that request (null deref, CastError, “Media not found” after approved-only query).

---

## 4. Suggested fix sketch

```ts
// Pseudo — find media by id without approved-only filter when recording views
const media = await Media.findById(contentId).select(
  "moderationStatus deletedAt viewCount"
);
if (!media || media.deletedAt) {
  return res.status(200).json({
    success: true,
    data: { viewCount: 0, counted: false },
  });
}
if (media.moderationStatus === "rejected") {
  return res.status(200).json({
    success: true,
    data: { viewCount: media.viewCount ?? 0, counted: false },
  });
}
// approved | under_review | pending → qualify + increment + emit view-updated
```

Emit socket `view-updated` / existing engagement event after a counted view so FE counters stay live.

---

## 5. FE note on Metro noise

`ENOENT … InternalBytecode.js` in Metro is **symbolication noise** after the thrown Error — not a missing app file. Soft-failing 5xx stops the red ERROR spam; BE still must return 200 for under_review views.

---

## 6. Checklist for BE

- [ ] `POST /api/content/media/:id/view` succeeds (200) for `under_review` media
- [ ] Increments `viewCount` when qualified + not deduped
- [ ] Returns `data.counted` + `data.viewCount` always
- [ ] No 500 on missing optional fields (`uploadedBy`, etc.)
- [ ] Same rules for `ebook` / other content types if they share the handler
