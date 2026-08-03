# Backend Handoff — Feed Audio Seek + Views (FE ↔ BE Corroboration)

**Date:** 2026-08-02  
**Audience:** Feed / media / copyright-free backend owners  
**Frontend:** `jevahapp-frontend`  
**Goal:** Scrubbers and ±skip work on music + copyright-free songs; view counts match server truth.

**Related (do not contradict):**
- `docs/BACKEND_VIDEO_DURATION_SEEK_HANDOFF.md` (video MP4 / HLS)
- `docs/BACKEND_MEDIA_VIEWS_HANDOFF.md` (feed `/view`)
- `docs/COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND.md` (CF likes/views)

---

## 0. Executive summary

| Symptom | FE finding | Needs BE? |
|---------|------------|-----------|
| Can’t seek / skip on copyright-free songs | expo-av often reports `durationMillis === 0` and FE used to **wipe** seeded duration; absolute seek gated on `duration > 0` | **Yes** — always return `duration` (seconds) > 0 on list/single/search when playable |
| ± skip feels broken | MusicCard had seek handlers but **no skip UI**; CF modal ±15s needs duration | FE wired ±10s; still needs duration |
| Views look wrong / inflate | FE treated missing `counted` as `true` | **Yes** — always return `counted` + authoritative `viewCount` |
| Dual view stacks | Feed vs CF use different endpoints + thresholds | **Yes** — corroborate both |

**FE shipped (2026-08-02):** preserve BE duration when player reports 0; seed seek from `track.duration`; ±10s on MusicCard overlay; omit-`counted` → do not inflate UI.

---

## 1. Seek contract (audio + copyright-free)

### 1.1 What FE needs on every playable track

```ts
{
  _id: string;
  audioUrl | fileUrl: string;   // progressive HTTP(S), seekable
  duration: number;             // SECONDS, > 0 when playable
  // optional
  processingStatus?: "ready" | "processing" | "pending" | "failed";
}
```

| Field | Rule |
|-------|------|
| `duration` | **Seconds** (e.g. `180` not `180000`). Required when `processingStatus` is `ready` or omitted for CF catalog |
| `audioUrl` / `fileUrl` | Progressive file with valid `Content-Length` / range requests. Avoid live-like or chunked streams without duration metadata |
| `processingStatus` | Artist/upload lane: only mark playable when `ready` **and** `duration > 0` (same as video) |

### 1.2 Why BE duration matters

1. FE seeds store duration = `duration * 1000` before/while expo-av loads.  
2. Many remote MP3s never expose `durationMillis` (CDN / missing metadata).  
3. Scrub + ±skip compute `position = progress * durationMs` — if duration is 0, seek is a **no-op**.  
4. FE will **not** overwrite a known duration with player `0`, but cannot invent length if BE also sends `0` / omits it.

### 1.3 Endpoints that must include `duration`

| Stack | Endpoints |
|-------|-----------|
| Copyright-free | List, search, get-by-id, playlist tracks |
| Feed music / podcast / sermon-as-audio | Feed cards, media detail `GET /api/media/:id` |
| Artist uploads | Same media pipeline as video — ffprobe duration before `ready` |

### 1.4 HTTP media serving (ops)

- Prefer `Accept-Ranges: bytes`  
- Correct `Content-Type` (`audio/mpeg`, `audio/mp4`, …)  
- Avoid wrapping playable audio in redirect chains that strip length

---

## 2. Views contract (two stacks — must corroborate)

### 2.1 Feed / uploaded media

```http
POST /api/content/:contentType/:contentId/view
Authorization: Bearer <optional>
```

Body (FE):

```json
{
  "durationMs": 12000,
  "progressPct": 22,
  "isComplete": false,
  "source": "feed",
  "deviceId": "…",
  "sessionId": "…"
}
```

`:contentType` is usually **`media`** (music/video/sermon), or `podcast` / `ebook` when mapped.

**Response (required):**

```json
{
  "success": true,
  "data": {
    "viewCount": 42,
    "hasViewed": true,
    "counted": true
  }
}
```

| Field | Rule |
|-------|------|
| `counted` | **Always present.** `true` only if this request incremented (or already counted for this user/device). Missing ⇒ FE treats as **not counted** (no UI inflate) |
| `viewCount` | Authoritative total after request |
| Dedup | Per user **or** (`deviceId` + `sessionId`) |

**FE qualification before POST (server must re-validate):**

| Family | Threshold |
|--------|-----------|
| Video / reels | ≥ **3s** OR ≥ **25%** OR complete |
| Feed audio / music / podcast | ≥ **10s** OR ≥ **20%** OR complete |
| Ebook | ≥ **10s** dwell OR ≥ **10%** OR complete |

### 2.2 Copyright-free music

```http
POST /api/audio/copyright-free/:id/view
Authorization: Bearer <required>
```

**FE qualification:** ≥ **3s** OR ≥ **25%** OR complete (`copyrightFree` family).

**BE must:**
1. Increment only when qualified + not already counted for user  
2. Return `{ viewCount, counted?, hasViewed? }`  
3. Include `viewCount` (and likes) on **list / search / single** payloads  
4. Enforce `viewCount >= likeCount` (or document why not)  
5. Prefer socket `copyright-free-song-interaction-updated` after counted view/like

### 2.3 Accuracy bugs to fix on BE (if still present)

- List returns `viewCount: 0` while detail has non-zero  
- View POST 200 but count unchanged  
- Like without view allowed while product expects view ≥ like  
- 404 on `/view` (FE backs off 60s — counts stall)

---

## 3. Forward / backward (±skip)

| Surface | FE behavior | BE dependency |
|---------|-------------|---------------|
| MusicCard feed | ± **10s** buttons + scrub bar | `duration` seconds on media item |
| CF / full song modal | ± **15s** via progress seek | `duration` seconds on CF song |
| Floating mini player | **Previous / next track** (not time skip) | Playlist order |

No BE endpoint required for skip — only reliable duration + seekable URL.

---

## 4. Corroboration checklist (BE)

- [ ] CF list/search/single: `duration` > 0 (seconds) for every playable song  
- [ ] Feed music/podcast items: `duration` > 0 when `processingStatus === "ready"`  
- [ ] Media detail heals duration if feed card omitted it  
- [ ] Progressive audio URLs support range requests  
- [ ] `POST .../view` returns `counted` + `viewCount` always  
- [ ] Same qualification math as §2 (re-validate; don’t trust FE alone)  
- [ ] CF `viewCount` present on list payloads  
- [ ] Optional: emit view/like sockets so UI stays live without refresh  

---

## 5. FE files (reference)

| Path | Role |
|------|------|
| `app/store/audioPlayer/resolveAudioDurationMs.ts` | Duration resolve (never wipe) |
| `app/store/useGlobalAudioPlayerStore.tsx` | CF / global seek |
| `app/hooks/useAdvancedAudioPlayer.ts` | Feed MusicCard player + seek |
| `src/shared/components/AudioControlsOverlay.tsx` | Scrub + ±10s |
| `app/utils/contentInteraction/view.ts` | Feed view POST |
| `app/utils/contentInteraction/viewQualification.ts` | Shared thresholds |
| `app/components/CopyrightFreeSongModal/useCopyrightFreeSongModalLogic.ts` | CF view tracking |

---

## 6. Out of scope

- Video HLS vs MP4 seek → `BACKEND_VIDEO_DURATION_SEEK_HANDOFF.md`  
- Upload progress bar → `UPLOAD_MEDIA_DETECT_VERIFY_PROGRESS_HANDOFF.md`
