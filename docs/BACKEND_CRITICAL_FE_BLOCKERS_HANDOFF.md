# Backend Handoff — Critical FE Blockers (Auth, Feed, Bookmark, Upload Progress)

**Audience:** Backend  
**Date:** 2026-08-02  
**Frontend:** `jevahapp-frontend`  
**Env context:** Local API often `EXPO_PUBLIC_API_ENV=local` → `http://<LAN-IP>:4000`

Related FE docs (keep in sync):

- [`UPLOAD_MEDIA_DETECT_VERIFY_PROGRESS_HANDOFF.md`](./UPLOAD_MEDIA_DETECT_VERIFY_PROGRESS_HANDOFF.md) — full upload detect/verify/progress contract  
- [`BACKEND_SAVES_SHARES_HANDOFF.md`](./BACKEND_SAVES_SHARES_HANDOFF.md) — saves/shares  
- [`BOOKMARK_TOGGLE_404_BACKEND_FIX.md`](./BOOKMARK_TOGGLE_404_BACKEND_FIX.md) — bookmark route  
- [`FEED_AND_BOOKMARK_BACKEND_SPEC.md`](./FEED_AND_BOOKMARK_BACKEND_SPEC.md) — feed + bookmark spec  

---

## Priority order

| # | Issue | Severity | FE symptom |
|---|--------|----------|------------|
| 1 | Mongo not ready → requests return **401** with mongoose text | P0 | Login fails; fake “session dead”; comments/metadata 401 |
| 2 | `GET .../all-content` → **500** `FETCH_ERROR` | P0 | Empty feed |
| 3 | `POST /api/bookmark/:id/toggle` → **500** (or 404) | P1 | Save/bookmark broken |
| 4 | Upload progress events missing / wrong shape | P1 | Progress bar stuck on simulated climb |
| 5 | Optional `GET /api/media/upload/:uploadId/status` | P2 | FE poll fallback already coded; needs BE |

---

## 1. P0 — Connect Mongo before accepting traffic

### Symptom (FE logs / UI)

Login Alert:

> Cannot call `users.findOne()` before initial connection is complete if `bufferCommands = false`...

Also seen on refresh / blacklist checks:

> `refreshtokens.findOne()` / `blacklistedtokens.findOne()` before initial connection...

Returned as **HTTP 401** with message like `"Invalid token"` + mongoose `detail`.

### Why this breaks product

FE (IG-style) only force-logouts on **real** session death. Infra 401s are treated as outages when detectable — but **login still fails** if `users.findOne` runs pre-connect. Users cannot sign in.

### Required BE fix

```ts
await mongoose.connect(uri);
// only then:
app.listen(port);
```

Or health gate: until connected, return **503** (not 401) with:

```json
{ "success": false, "code": "DB_NOT_READY", "message": "Service temporarily unavailable" }
```

**Never** return 401 for DB not ready. 401 means auth reject.

### Acceptance

- Cold start: no request handler runs until `readyState === 1`
- `/api/auth/login` succeeds once Mongo is up
- No mongoose `bufferCommands` strings in client-facing JSON

---

## 2. P0 — Public feed `FETCH_ERROR` 500

### Request FE makes

```
GET /api/media/public/all-content?page=1&limit=12
```

(Authenticated variant also used when logged in.)

### Response seen

```json
{ "success": false, "message": "Failed to retrieve all content", "code": "FETCH_ERROR" }
```

HTTP **500**.

### Ask

1. Log the underlying exception (often Mongo not ready, aggregation crash, or missing index).
2. Return **503** + `DB_NOT_READY` when Mongo is down (aligned with §1).
3. On empty DB return **200** `{ success: true, media: [], total: 0 }` — not 500.
4. Confirm pagination contract matches FE (`media` / `pagination.total` / `total`).

### Acceptance

- Local + prod: page 1 returns 200 with array (possibly empty)
- No `FETCH_ERROR` on healthy Mongo

---

## 3. P1 — Bookmark / save toggle

### Request FE makes

```
POST /api/bookmark/:contentId/toggle
Authorization: Bearer <jwt>
```

### Observed

- Historically **404** (route missing) — see `BOOKMARK_TOGGLE_404_BACKEND_FIX.md`
- Recently **500** on toggle for valid ObjectIds (including processing media)

### Ask

1. Ensure route exists and is mounted under `/api/bookmark`.
2. Toggle must be idempotent; return `{ saved: boolean, saveCount?: number }`.
3. Do not 500 when media `processingStatus` is `processing` / `pending` — still allow bookmark of the content id.
4. If content missing → **404** with clear code, not 500.

---

## 4. P1 — Upload progress (socket + optional poll)

FE already:

- Sends `X-Upload-ID` on `POST /api/media/upload`
- Listens for Socket.IO `upload-progress`
- Falls back to simulated progress
- After **3s quiet**, polls `GET /api/media/upload/:uploadId/status` (soft-fails on 404)

### Emit (required)

```ts
socket.emit("upload-progress", {
  uploadId: string,     // === X-Upload-ID
  progress: number,     // 0–100, monotonic
  stage: string,        // received | uploading | verifying | processing | finalizing | complete | rejected | error
  message: string,
  timestamp: string     // ISO
});
```

### Poll (recommended)

```
GET /api/media/upload/:uploadId/status
→ { uploadId, progress, stage, message }
```

Full stage map + FormData contract: **`UPLOAD_MEDIA_DETECT_VERIFY_PROGRESS_HANDOFF.md`**.

### Acceptance

- Progress reaches 100 only on `complete` (or HTTP success with prior complete event)
- Reject emits `rejected` then HTTP 403 + `moderationResult`
- FE bar stops simulating once first real event arrives

---

## 5. Auth response hygiene (small, high leverage)

| Situation | Status | Body |
|-----------|--------|------|
| Missing / expired / revoked JWT | 401 / 402 | `{ code: "INVALID_TOKEN" \| "TOKEN_EXPIRED", message }` |
| DB / infra down | **503** | `{ code: "DB_NOT_READY" \| "SERVICE_UNAVAILABLE" }` |
| User deleted | 401 | `{ code: "USER_NOT_FOUND" }` |

FE maps hard codes → logout; 503 → keep session.

---

## 6. Quick verify checklist (BE)

- [ ] `await mongoose.connect` before `listen`
- [ ] `GET /api/media/public/all-content?page=1&limit=12` → 200  
- [ ] Login with valid user while API warm → 200 + token  
- [ ] `POST /api/bookmark/<validId>/toggle` → 200 `{ saved }`  
- [ ] Upload with `X-Upload-ID` → at least one `upload-progress` event  
- [ ] Optional status poll returns same shape  

---

## Out of scope for this handoff

- Full-bleed Reels paging (FE product)  
- Guest home routing (FE product)  
- Gospel classifier policy (see Enoch moderation handoff)
