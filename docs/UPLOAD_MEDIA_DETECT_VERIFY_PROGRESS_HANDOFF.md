# Frontend ↔ Backend Handoff — Media Detect, Verify & Upload Progress

**Audience:** Backend + FE upload owners  
**Frontend:** `jevahapp-frontend` (`app/categories/upload/*`)  
**Goal:** Seamless IG/TikTok-style upload — FE detects media correctly, BE verifies/processes, progress bar tracks **real** backend work end-to-end.

---

## Product model (how IG / TikTok would do it)

| Behavior | IG / TikTok | Jevah FE today |
|----------|-------------|----------------|
| Pick file | Auto-classify format from bytes | MIME + extension via `detectFileType` |
| Content type chip | Pre-select matching type; user can override | Auto-suggest `videos` / `music` / `books` on pick (sermon kept if chosen) |
| Category / topic | Required before post; selection sticks immediately | Live checklist; validate with **overrides** (no stale closure) |
| Missing fields | Soft toast + inline checklist | Soft `TopToast` + amber “Almost there” banner |
| Progress | Driven by server stages (upload → process → ready) | Socket `upload-progress` preferred; simulated fallback to 85% until BE events |

**Never** infer media type from title/description (e.g. “Book of Enoch” + MP4 = **video**).

---

## 1. How the frontend detects media

**Source of truth:** file MIME, then extension. Never title.

```
DocumentPicker asset
  → mimeType || getMimeTypeFromName(name)
  → detectFileType({ name, mimeType })
       → "video" | "audio" | "ebook" | "unknown"
  → optional probeVideoDurationSec(uri) for videos (feed seek before BE ffprobe)
```

| Detected | Default contentType chip | Allowed chips |
|----------|--------------------------|---------------|
| video | `videos` | `videos`, `sermon` |
| audio | `music` | `music`, `podcasts`, `sermon` |
| ebook | `books` | `books`, `ebook` |

**Canonical resolve before POST** (`resolveUploadContentType`):

1. Sermon flag / `selectedType === "sermon"` → `sermon`
2. Else file MIME/extension wins over conflicting chip
3. Else explicit chip
4. Else API echo
5. Default → `videos`

Form field sent: `contentType` = resolved value.  
Genre: `genre = JSON.stringify([category.toLowerCase(), "All"])`.

---

## 2. How the frontend verifies (client eligibility)

Before `POST /api/media/upload`, FE runs `validateMediaEligibility`:

- Media file present  
- Title non-empty (≤ 100 chars)  
- Category selected  
- Content type selected (with detection-aware copy)  
- MIME vs selected type compatibility  
- Size vs limits (music 50MB, video/sermon 300MB, books 100MB, podcasts 100MB)

**UX:** live checklist updates as fields change. Post with gaps → toast pointing at first error (no Alert wall).

**Server still owns** gospel moderation / deep AV analysis.

---

## 3. Upload request contract (FE → BE)

```
POST /api/media/upload
Authorization: Bearer <jwt>
Accept: application/json
expo-platform: ios|android|web
X-Upload-ID: <uuid>          ← REQUIRED for progress correlation
Content-Type: multipart/form-data
```

**FormData fields**

| Field | Type | Notes |
|-------|------|--------|
| `file` | binary | `{ uri, type, name, size }` on RN |
| `thumbnail` | binary (optional) | Cover image |
| `title` | string | |
| `description` | string | |
| `fileSize` | string (bytes) | When known |
| `contentType` | string | `videos` \| `music` \| `books` \| `sermon` (resolved) |
| `genre` | JSON string | e.g. `["worship","All"]` |
| `topics` | JSON string | currently `[]` |

Timeouts (cold start tolerant): video **10 min**, other **5 min**.

---

## 4. Progress bar ↔ backend (effortless sync)

### Current FE pipeline

```
createUploadId()
  → connectSocket(uploadId)     // Socket.IO with same JWT
  → startSimulated()            // climbs ~10% → 85% until real events
  → POST /api/media/upload + X-Upload-ID
  → on socket "upload-progress" { uploadId, progress, stage, message }
       → stopSimulated()
       → setUploadState({ status, progress, message })
  → HTTP response → success / moderation / error UI
```

Simulated progress is a **fallback only**. When BE emits events, FE switches to real progress immediately.

### Required BE socket contract

Emit to the authenticated uploader (same user / room as JWT):

```ts
socket.emit("upload-progress", {
  uploadId: string;      // MUST equal X-Upload-ID
  progress: number;      // 0–100 integer
  stage: string;         // see table
  message: string;       // human-readable, shown under the bar
  timestamp: string;     // ISO
});
```

### Recommended stage map (align FE status)

| `stage` | Meaning | FE `status` | Typical `progress` |
|---------|---------|-------------|--------------------|
| `received` | Multipart accepted | `uploading` | 5–15 |
| `uploading` | Bytes landing in storage | `uploading` | 15–55 |
| `scanning` / `verifying` | Virus / moderation / AI | `verifying` | 55–80 |
| `processing` | Transcode / thumbnails / ffprobe | `verifying` | 80–95 |
| `finalizing` | DB write / CDN publish | `uploading` | 95–99 |
| `complete` | Ready for feed | `success` | 100 |
| `rejected` | Moderation reject | `error` | keep last |
| `error` | Hard failure | `error` | keep last |

FE mapping today:

- `complete` → `success`
- `error` \| `rejected` → `error`
- `finalizing` → `uploading`
- anything else → `verifying`

**Ask:** emit at least `received`, `uploading` (or byte %), `verifying`/`processing`, `finalizing`, `complete`|`rejected`|`error`. Prefer monotonic `progress`.

### Optional HTTP progress (even better)

If Socket.IO is flaky on some devices, also support:

```
GET /api/media/upload/:uploadId/status
→ { uploadId, progress, stage, message, mediaId? }
```

FE **already polls** every 800ms while `loading` if no socket event for 3s (404 ⇒ endpoint not ready; FE keeps sim/socket).

### Response body (success)

Return enough for feed insert without a second round-trip:

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "contentType": "videos",
    "title": "...",
    "fileUrl": "...",
    "thumbnailUrl": "...",
    "duration": 123.4,
    "processingStatus": "ready" | "processing" | "pending",
    "hlsUrl": null
  }
}
```

If `processingStatus !== "ready"`, keep emitting progress until seekable/ready so the bar doesn’t jump to 100% then stall on playback.

### Moderation reject (HTTP 403)

Always include:

```json
{
  "message": "...",
  "moderationResult": {
    "status": "rejected" | "under_review",
    "reason": "...",
    "flags": ["..."]
  }
}
```

FE shows premium result modal (not a raw Alert).

---

## 5. Verification ownership (who does what)

| Check | FE | BE |
|-------|----|----|
| Required fields / chip selection | Yes | Soft validate again |
| MIME vs contentType | Yes (UX) | **Authoritative** |
| File size limits | Yes | **Authoritative** (+ nginx) |
| Duration probe | Best-effort local | ffprobe source of truth |
| Gospel / AI moderation | No | Yes |
| Virus / malware | No | Yes |
| Transcode / HLS | No | Yes |
| Progress events | Consume | **Produce** via `upload-progress` |

---

## 6. Seamlessness checklist for backend

1. Accept `X-Upload-ID` and echo it on every progress event.  
2. Do not listen for uploads before Mongo is connected (avoid fake 401s during verify).  
3. Emit progress early (`received` within ~200ms of request start).  
4. Monotonic 0–100; never regress.  
5. On reject, emit `rejected` then return 403 + `moderationResult`.  
6. On success, emit `complete` at 100 **before or with** HTTP 200.  
7. Include `duration` when known so feed scrubber works immediately.  
8. If processing continues after HTTP 200, either keep socket progress until `ready`, or return `processingStatus` and a poll URL.

---

## 7. FE files (reference)

| Path | Role |
|------|------|
| `utils/fileTypeDetection.ts` | MIME/extension detect |
| `utils/resolveUploadContentType.ts` | Canonical type resolve |
| `utils/uploadValidation.ts` | Client eligibility |
| `api/uploadMedia.ts` | FormData + `POST` + `X-Upload-ID` |
| `hooks/uploadFlow/useUploadSocketProgress.ts` | Socket consumer |
| `hooks/uploadFlow/useSimulatedUploadProgress.ts` | Fallback bar |
| `hooks/useUploadFlow.ts` | Orchestration |
| `components/UploadProgressModal.tsx` | Progress UI |

---

## 8. Out of scope / related docs

- Gospel classifier policy: `docs/BACKEND_UPLOAD_ENOCH_MODERATION_HANDOFF.md`  
- Modular upload structure: `docs/UPLOAD_MODULARIZATION.md`
