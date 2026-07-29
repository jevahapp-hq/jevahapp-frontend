# Backend Handoff — Saves (Bookmarks) & Shares

**Audience:** Backend / engagement  
**Date:** 2026-07-29  
**Frontend:** `jevahapp-frontend`  
**Related:** [`BACKEND_MEDIA_VIEWS_HANDOFF.md`](./BACKEND_MEDIA_VIEWS_HANDOFF.md), [`BACKEND_LOCAL_ENGAGEMENT_GAPS_FIX.md`](./BACKEND_LOCAL_ENGAGEMENT_GAPS_FIX.md)

---

## 0. Executive summary

Frontend **already calls** save + share APIs from the feed. Gaps are usually:

1. Route missing / 404 (FE soft-skips share; save retries aliases then throws)
2. Response field aliases inconsistent
3. `contentType` path/body mismatch (`media` vs `videos` vs `ebook`)
4. Auth required for saves; shares soft-fail without blocking UX

This doc is the FE contract + corroboration checklist.

---

## 1. Save / bookmark

### 1.1 Primary endpoint

| | |
|---|---|
| **Method / path** | `POST /api/bookmark/:contentId/toggle` |
| **FE** | `app/utils/contentInteraction/save.ts` → `toggleSave()` |
| **Auth** | Bearer expected (via `getAuthHeaders`) |
| **Body** | `{ "contentType": "<typeAttempt>" }` |

**Type attempts (in order on 404):** mapped backend type → original FE type → `videos` / `video` / `media`.

**Fallback if all 404:**

```http
POST /api/media/interactions/:contentId/save
Body: { "contentType": "media" }
```

### 1.2 Status

```http
GET /api/bookmark/:contentId/status
```

FE parses:

```ts
saved: data.data?.isBookmarked ?? false
totalSaves: data.data?.bookmarkCount ?? 0
```

### 1.3 Toggle response FE expects

```json
{
  "success": true,
  "data": {
    "bookmarked": true,
    "isBookmarked": true,
    "bookmarkCount": 12,
    "saves": 12
  }
}
```

Aliases accepted: `bookmarked` | `isBookmarked`; `bookmarkCount` | `saves`.

### 1.4 Behavior

- Toggle is **idempotent flip** (save ↔ unsave)
- FE syncs local library store on success
- On hard failure FE **rethrows** (no ghost library items)

---

## 2. Share

### 2.1 Endpoint

| | |
|---|---|
| **Method / path** | `POST /api/content/:contentType/:contentId/share` |
| **FE** | `app/utils/contentInteraction/share.ts` → `recordShare()` |
| **Auth** | Optional / soft (analytics must never block native share sheet) |
| **Body** | `{ "platform": "internal" \| "<shareMethod>", "message"?: "..." }` |

`contentType` path segment uses `mapContentTypeForBackend()` (`media` | `ebook` | `podcast` | …).

`shareMethod` `"generic"` / `"internal"` → `platform: "internal"`.

### 2.2 Response FE expects

```json
{
  "success": true,
  "data": {
    "shareCount": 4,
    "totalShares": 4,
    "shared": true
  }
}
```

### 2.3 Soft-fail rules

| HTTP | FE behavior |
|------|-------------|
| 404 / 405 | Quiet no-op (`ok: false`) — share sheet still closes normally |
| Other errors / network | Quiet no-op |
| 200 | Updates share count in UI when available |

**Legacy / unused:** `MediaApi.recordShare` → `POST /api/media/interactions/:id/share` — prefer unified content path.

---

## 3. Display / hydration aliases

| Concept | Prefer | Also accepted |
|---------|--------|---------------|
| Saves total | `bookmarkCount` / `saves` / `saved` | metadata/list fields |
| User saved? | `isBookmarked` / `bookmarked` / `hasBookmarked` | |
| Shares total | `shareCount` / `totalShares` / `shares` / `sheared` | |
| User shared? | `shared` / `hasShared` | |

Batch metadata + feed items should include these so cold start isn’t stuck at 0.

---

## 4. Sockets (optional but preferred)

| Event | Useful payload |
|-------|----------------|
| `count-update` / reaction | `contentId`, `saves`/`bookmarkCount`, `shares`/`shareCount` |
| Dedicated save/share events | Same fields |

FE already applies live count patches when present.

---

## 5. Curl smoke tests

```bash
BASE=http://127.0.0.1:4000
TOKEN="<JWT>"
ID="<content ObjectId>"
TYPE=media

# Save toggle
curl -i -X POST "$BASE/api/bookmark/$ID/toggle" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"contentType\":\"$TYPE\"}"

# Save status
curl -i "$BASE/api/bookmark/$ID/status" \
  -H "Authorization: Bearer $TOKEN"

# Share
curl -i -X POST "$BASE/api/content/$TYPE/$ID/share" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"platform":"internal"}'
```

---

## 6. Corroboration checklist

### Save
- [ ] `POST /api/bookmark/:id/toggle` mounted local + prod
- [ ] Accepts `contentType` in body (`media` / `ebook` / `podcast` / `videos`)
- [ ] Returns `isBookmarked` + `bookmarkCount` (or documented aliases)
- [ ] `GET .../status` returns same shape
- [ ] Auth: logged-in required? (FE assumes Bearer available for feed saves)
- [ ] Unsave decrements / flips correctly; never goes negative

### Share
- [ ] `POST /api/content/:type/:id/share` mounted
- [ ] Accepts `{ platform, message? }`
- [ ] Returns `shareCount` / `totalShares`
- [ ] 404 should remain soft (or mount route so analytics count)
- [ ] Deduping: optional (e.g. 1 share credit / user / content / hour) — document if any

### Types
- [ ] Path `media` for video/music/sermon; `ebook` for books; `podcast` when applicable
- [ ] Bookmark body `contentType` matches how media is stored in DB

### Hydration
- [ ] Feed list + metadata include save/share totals + user flags
- [ ] Socket count updates include saves/shares when they change

---

## 7. FE code map

| Concern | Path |
|---------|------|
| Toggle save | `app/utils/contentInteraction/save.ts` |
| Share record | `app/utils/contentInteraction/share.ts` |
| Type mapping | `app/utils/engagementHelpers.ts` |
| Feed handlers | `AllContentTikTok/hooks/useAllContentTikTokHandlers.ts` |
| Store wrappers | `app/store/useInteractionStore/actions/shareViewActions.ts` |

---

## 8. Ask (backend)

1. Confirm bookmark toggle + status on local/prod with the response aliases above.
2. Confirm share endpoint mounted (today often 404 → silent FE skip).
3. Document auth requirements and any dedupe windows.
4. Prefer one canonical `contentType` vocabulary aligned with views/likes (`media` | `ebook` | `podcast`).
