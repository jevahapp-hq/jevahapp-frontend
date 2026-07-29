# Backend Handoff — Media View Recording (FE Contract + Corroboration)

**Audience:** Backend / engagement  
**Date:** 2026-07-27  
**Frontend:** `jevahapp-frontend` (Expo / React Native)  
**Related:**
- [`BACKEND_LOCAL_ENGAGEMENT_GAPS_FIX.md`](./BACKEND_LOCAL_ENGAGEMENT_GAPS_FIX.md) (§2.1 View)
- [`BACKEND_ENGAGEMENT_TIKTOK_IG_ALIGNMENT.md`](./BACKEND_ENGAGEMENT_TIKTOK_IG_ALIGNMENT.md)
- [`COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md`](./COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md) (separate stack)

---

## 0. Executive summary

Frontend records **qualified views** for feed media (video, music/audio, ebook, reels) via:

```http
POST /api/content/:contentType/:contentId/view
```

Auth is **optional** (Bearer when logged in). Every request includes `deviceId` + `sessionId` so anonymous views can still dedupe.

**This doc tells you:**
1. What FE **already sends** (exact payload + call sites)
2. What BE **should return / enforce**
3. What we must **corroborate** (thresholds, path types, field names, sockets, gaps)

---

## 1. Canonical endpoint (primary media stack)

| | |
|---|---|
| **Method / path** | `POST /api/content/:contentType/:contentId/view` |
| **FE source** | `app/utils/contentInteraction/view.ts` → `recordView()` |
| **Facade** | `app/utils/contentInteractionAPI.ts` / `service.ts` |
| **Auth** | Optional `Authorization: Bearer <token>` |
| **Headers** | `Content-Type: application/json`, `expo-platform`, optional Bearer |
| **Always appended by FE** | `deviceId`, `sessionId`, `source` (default `"feed"`) |

### 1.1 `:contentType` path segments FE uses

Mapped by `mapContentTypeForBackend()` in `app/utils/engagementHelpers.ts`:

| FE caller sends | Path segment BE receives |
|-----------------|--------------------------|
| `"media"` (video, music, sermon-as-media, reels) | **`media`** |
| `"ebook"` (EbookCard) | **`ebook`** |
| `"podcast"` / `"podcasts"` (supported by mapper) | **`podcast`** — **not currently used by MusicCard** (see gaps) |
| `"devotional"` | **`devotional`** |
| video / audio / music / live / sermon / books aliases | → `media` or `ebook` as above |

**Important:** Almost all playable feed video/audio posts as **`media`**, not `video` / `audio`.

### 1.2 Request body (exact shape FE sends)

```json
{
  "durationMs": 3200,
  "progressPct": 28,
  "isComplete": false,
  "source": "feed",
  "deviceId": "device_<stable-id>",
  "sessionId": "session_<app-session>"
}
```

| Field | Type | Meaning |
|-------|------|---------|
| `durationMs` | number | Watch/listen time so far (ms), or full duration when complete |
| `progressPct` | number | **0–100** (FE always sends percent, not 0–1) |
| `isComplete` | boolean | Near end / finished |
| `source` | string | `"feed"` (default) or `"reels"` |
| `deviceId` | string | Stable device id for anonymous dedupe |
| `sessionId` | string | Current app session |

### 1.3 Response shape FE parses

```ts
viewCount = data?.data?.viewCount ?? data?.totalViews ?? 0
hasViewed = data?.data?.hasViewed
counted   = data?.data?.counted ?? true   // ⚠️ omitted ⇒ treated as counted
```

**Preferred success body:**

```json
{
  "success": true,
  "data": {
    "viewCount": 43,
    "hasViewed": true,
    "counted": true
  }
}
```

| Field | Required? | FE behavior |
|-------|-----------|-------------|
| `data.viewCount` | **Yes** (or top-level `totalViews`) | Updates UI counter when counted |
| `data.counted` | **Strongly yes** | If omitted, FE defaults to **`true`** (can inflate UI) |
| `data.hasViewed` | Optional | Marks user/device as having viewed |

**Below threshold / deduped:** still return **`200`** with `"counted": false` — do **not** 404/400.

**Missing route:** FE soft-skips all view posts for **60s** after a **404** or **429**.

### 1.4 Curl smoke test

```bash
BASE=http://127.0.0.1:4000
TOKEN="<optional JWT>"
CONTENT_ID="<media ObjectId>"
TYPE=media   # or ebook

curl -i -X POST "$BASE/api/content/$TYPE/$CONTENT_ID/view" \
  -H "Content-Type: application/json" \
  ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
  -d '{
    "durationMs": 5000,
    "progressPct": 30,
    "isComplete": false,
    "source": "feed",
    "deviceId": "device_test_handoff",
    "sessionId": "session_test_handoff"
  }'
```

**Expect:** `200` + `data.viewCount` + `data.counted` (true first time in window; false on immediate repeat).

---

## 2. What FE already does (by surface)

### 2.1 Qualification matrix (actual code today)

Locked in `app/utils/contentInteraction/viewQualification.ts`:

| Family | Rule |
|--------|------|
| Video / reels | ≥**3s** OR ≥**25%** OR complete |
| Audio / music / podcast | ≥**10s** OR ≥**20%** OR complete |
| Ebook | ≥**10s** dwell OR ≥**10%** read OR complete |

| Surface | File | Path type | Fires when | Updates store? |
|---------|------|-----------|------------|----------------|
| **VideoCard** | `useVideoViewTracking.ts` | `media` (or mapped) | Video rules | Yes if `counted !== false` |
| **Reels** | `ReelsVideoPlayer.tsx` | `media` | Video rules; `source: "reels"` | Retry if not counted |
| **MusicCard** | `useMusicViewTracking.ts` | `media` **or `podcast`** | Audio rules | Yes if `counted !== false` |
| **EbookCard** | `useEbookViewTracking.ts` | `ebook` | **10s** on-screen dwell | Yes if counted |
| **PdfViewer** | `useEbookReaderViewTracking.ts` | `ebook` | 10s dwell **or** ≥10% pages; `source: "reader"` | Yes if counted |
| **Sermon category** | `SermonVideoCard` + `useSermonInteractions` | mapped | Video rules during play | Yes if counted |
| **VideoComponent / ContentCard** | handlers | mapped | API on play/complete paths | Yes if counted |
| **Copyright-free** | Separate API (§5) | n/a | 3s / 25% / complete | Local modal |

**Once per mount/session** client-side (`hasTrackedView`). Server must still dedupe across remounts.

### 2.2 Client throttles (not a substitute for BE dedupe)

| Guard | Where | Effect |
|-------|-------|--------|
| Global **2.5s** between any view posts | `view.ts` | Can drop views when scrolling fast |
| **60s** backoff after 404/429 | `view.ts` | All views paused |
| Store-level 2.5s | `shareViewActions.ts` | Extra throttle if using store wrapper |

### 2.3 Surfaces still without `/view`

| Surface | Behavior |
|---------|----------|
| Live screens | Concurrent viewers / mock — not qualified content views |
| Gospel / Spotify preview player | No view API |

---

## 3. How FE displays view counts

| Source | Field aliases FE accepts |
|--------|--------------------------|
| List / all-content items | `views` \| `viewCount` \| `totalViews` |
| Metadata / batch-metadata | same + `hasViewed` |
| View POST response | `data.viewCount` → store `contentStats.views` |
| Socket `view-updated` | `{ contentId, viewCount }` → store |

**UI rule:** `Math.max(storeViews, feedFallback)` on cards.

**Note:** `listenCount` / `readCount` appear on some types/upload payloads as **display aliases only**. FE does **not** POST separate listen/read endpoints — everything goes through `/view`.

---

## 4. Realtime (sockets)

| Event | FE handler | Expected payload |
|-------|------------|------------------|
| **`view-updated`** | `SocketManager` → `mutateStats({ views: viewCount })` | `{ contentId, viewCount }` |
| `count-update` / reaction events | May patch `views` from `viewCount` \| `totalViews` \| `views` | Flexible |
| `viewer-count-update` | Stub (log only) | Live concurrent viewers — **not wired to store** |

**Ask:** Emit `view-updated` (or include `viewCount` in `count-update`) after a **counted** view so other clients stay in sync.

---

## 5. Separate stack — copyright-free music

| | |
|---|---|
| **Endpoint** | `POST /api/audio/copyright-free/:songId/view` |
| **Auth** | **Required** Bearer |
| **Body** | `{ durationMs?, progressPct?, isComplete? }` (no deviceId/sessionId today) |
| **Docs** | `COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md` |

Do **not** confuse this with the main media `/api/content/.../view` path.

---

## 6. What backend should implement / enforce

### 6.1 Must-have

1. Mount `POST /api/content/:contentType/:contentId/view` for at least:
   - `media`
   - `ebook`
   - (optional but mapped) `podcast`, `devotional`
2. Accept optional auth + always honor `deviceId` / `sessionId` for anonymous dedupe.
3. Accept body fields in §1.2 (`progressPct` as **0–100**).
4. Return `200` with `data.viewCount` + **`data.counted`** (boolean) always.
5. Never decrement `viewCount`.
6. Idempotent counted views: **1 counted view / (user XOR device) / content / rolling hour** (product default FE expects for main media).

### 6.2 Qualification (server-side source of truth)

FE pre-filters before POST; **BE must re-validate**.

| Content family | **Agreed FE rule (locked)** |
|----------------|-----------------------------|
| Video / reels | ≥**3s** OR ≥**25%** OR complete |
| Audio / music / podcast | ≥**10s** OR ≥**20%** OR complete |
| Ebook (card + reader) | ≥**10s** dwell OR ≥**10%** progress OR complete |

`source` may be `"feed"`, `"reels"`, or `"reader"`.

### 6.3 Counting rules

| Case | HTTP | `counted` | Counter |
|------|------|-----------|---------|
| Qualifies + new in dedupe window | 200 | `true` | +1 |
| Qualifies + already counted in window | 200 | `false` | unchanged |
| Below threshold | 200 | `false` | unchanged |
| Unknown content id | 404 | — | — |
| Rate limited | 429 | — | — |

---

## 7. Corroboration checklist (FE ↔ BE)

Use this as the shared sign-off list.

### Contract
- [ ] `POST /api/content/media/:id/view` returns 200 (not 404) on local + prod
- [ ] `POST /api/content/ebook/:id/view` returns 200
- [ ] Response always includes **`data.counted`** (never omit)
- [ ] Response includes **`data.viewCount`** (authoritative total)
- [ ] Optional Bearer works; anonymous + `deviceId`/`sessionId` also works
- [ ] `source: "feed" | "reels"` accepted (may be logged/analytics only)

### Counting / thresholds
- [ ] Agree video/reels: **3s / 25% / complete** ✅ FE locked
- [ ] Agree audio: **10s / 20% / complete** ✅ FE locked
- [ ] Agree ebook: **10s dwell / 10% read / complete** ✅ FE locked (card + PdfViewer)
- [ ] Dedupe window: **1 counted / user-or-device / content / hour** (main media)
- [ ] Copyright-free dedupe (often **per day**) stays on its own endpoint

### Types / routing
- [ ] Confirm path token for video/music/sermon = **`media`**
- [ ] Confirm ebook path = **`ebook`**
- [ ] Podcasts post as **`podcast`** when `contentType` is podcast ✅ FE locked
- [ ] List/metadata responses expose `viewCount` or `views` consistently

### Realtime / hydration
- [ ] Emit `view-updated` with `{ contentId, viewCount }` after counted views
- [ ] Metadata + batch-metadata include `viewCount` / `hasViewed`
- [ ] Feed list items include current `viewCount` so cold start isn’t stuck at 0

### Out of scope / known FE gaps (do not block BE)
- [ ] Live concurrent viewers (`viewer-count-update`) not wired as qualified content views
- [ ] Dead FE path `/api/media/interactions/:id/view` (`MediaApi.recordView`) — ignore / deprecate
- [ ] Global 2.5s FE throttle may under-count on fast scroll — BE dedupe still required
- [ ] Gospel/Spotify preview player still has no view API

---

## 8. Field name cheat sheet

| Concept | Prefer | Also accepted by FE |
|---------|--------|---------------------|
| Total views | `data.viewCount` / `viewCount` | `totalViews`, `views` |
| This request counted? | `data.counted` | — (must not omit) |
| User/device already viewed | `data.hasViewed` | `hasViewed` |
| Socket bump | `viewCount` on `view-updated` | via `count-update` aliases |

---

## 9. FE code map (for debugging)

| Concern | Path |
|---------|------|
| HTTP POST + throttle | `app/utils/contentInteraction/view.ts` |
| Type mapping | `app/utils/engagementHelpers.ts` → `mapContentTypeForBackend` |
| Video qualification | `src/features/media/components/VideoCard/hooks/useVideoViewTracking.ts` |
| Music qualification | `src/features/media/components/MusicCard/hooks/useMusicViewTracking.ts` |
| Ebook dwell | `src/features/media/components/EbookCard/hooks/useEbookViewTracking.ts` |
| Reels | `app/reels/components/ReelsVideoPlayer.tsx` |
| Store wrapper | `app/store/useInteractionStore/actions/shareViewActions.ts` |
| Socket apply | `app/services/SocketManager.ts` (`view-updated`) |

---

## 10. Ask (backend)

1. Confirm `/view` is mounted for **`media`** + **`ebook`** (+ **`podcast`**) on local and production.
2. Always return **`counted`** + **`viewCount`**.
3. Enforce the locked thresholds in §6.2.
4. Emit **`view-updated`** after counted views.
5. Reply with any differences (path names, dedupe window, required auth) so FE can align in one pass.

**FE already locked (2026-07-29):** audio 10s/20%, ebook 10s/10%, podcast path, reader views, sermon/video category API wiring. See also [`BACKEND_SAVES_SHARES_HANDOFF.md`](./BACKEND_SAVES_SHARES_HANDOFF.md).
