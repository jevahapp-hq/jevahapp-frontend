# Backend Briefing: Fix Like 500 + Instagram / TikTok Like Business Logic

**Audience:** Jevah backend engineers  
**Date:** 2026-07-23  
**Priority:** P0 — likes failing in production for authenticated users  
**Frontend:** `jevahapp-frontend` (Expo / React Native)  
**Related canonical spec:** [`LIKE_SYSTEM_BACKEND_BUSINESS_LOGIC_SPEC.md`](./LIKE_SYSTEM_BACKEND_BUSINESS_LOGIC_SPEC.md)

---

## 0. Executive summary

Production likes are intermittently failing with:

```http
POST /api/content/media/:contentId/like
→ 500
{
  "success": false,
  "code": "LIKE_OPERATION_FAILED",
  "message": "Failed to toggle like",
  "data": {}
}
```

**This is a backend failure.** The frontend request shape is correct (auth + toggle POST + `Idempotency-Key`).

Frontend now **rolls back** the optimistic heart on this error (it no longer fake-succeeds via offline queue). Users see the heart snap back. The durable fix must happen on the API.

This document covers:

1. Exact failing request (reproduce)
2. What Instagram / TikTok like business logic means for us
3. Required write / read contracts
4. Root-cause checklist for `LIKE_OPERATION_FAILED`
5. Acceptance tests / QA matrix

---

## 1. Production incident — reproduce this first

### Observed failing call (frontend logs, 2026-07-23)

```text
URL:    https://api.jevahapp.com/api/content/media/6929da46d4ec2df1331c8b6e/like
Method: POST
Auth:   Bearer present (hasAuth: true)
Header: Idempotency-Key: 28122c71-e7d7-4003-8846-8a40e4eb3523
Body:   (empty / none)

Status: 500
Body:   {"success":false,"code":"LIKE_OPERATION_FAILED","message":"Failed to toggle like","data":{}}
```

### Curl reproduce

```bash
TOKEN="<valid user JWT>"
CONTENT_ID="6929da46d4ec2df1331c8b6e"
KEY="$(uuidgen)"   # or any UUID v4

curl -i -X POST \
  "https://api.jevahapp.com/api/content/media/${CONTENT_ID}/like" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${KEY}" \
  -d '{}'
```

**Expected (healthy):** `200` with `data.liked` boolean + `data.likeCount` integer.  
**Actual (broken):** `500` + `LIKE_OPERATION_FAILED`.

### What frontend does today

| Step | Behavior |
|------|----------|
| Tap heart | Optimistic flip + count ±1 |
| POST like | Same URL/headers as above |
| `200` | Reconcile UI to `data.liked` / `data.likeCount` |
| `429` | Rollback + short cooldown |
| `500` / `LIKE_OPERATION_FAILED` | **Rollback** (do not offline-queue) |
| True offline / network drop | Durable offline queue with same `Idempotency-Key` |

Frontend source: `app/utils/contentInteraction/like.ts`.

---

## 2. Instagram / TikTok product rules (business logic)

Match these product semantics. Deviations feel “broken” even if the DB is technically correct.

### 2.1 Two different questions (never conflate)

| Concept | Meaning | Who owns it |
|---------|---------|-------------|
| **`liked`** | Did *this authenticated user* like this item? | Per `(userId, contentType, contentId)` |
| **`likeCount`** | How many users currently like this item? | Global aggregate for that content |

```text
liked     = my heart filled?          → boolean for JWT user
likeCount = how many hearts exist?    → non-negative integer
```

**Valid and common (same as IG/TikTok):**

```json
{ "liked": false, "likeCount": 128 }
```

Meaning: I do not like it; 128 other people do.

**Invalid / bug:**

- `liked = (likeCount > 0)`  
- Inferring my state from the global count  
- Returning `liked: true` in metadata while toggle said `liked: false`

### 2.2 One control = like and unlike

| User action | Resulting state |
|-------------|-----------------|
| Tap heart when empty | Like → `liked: true`, `likeCount += 1` |
| Tap heart when filled | Unlike → `liked: false`, `likeCount = max(0, count - 1)` |

There is **one** mutation endpoint (toggle). No separate “like” vs “unlike” URL is required for the current mobile client.

### 2.3 Instant UI, durable server truth

| Layer | Responsibility |
|-------|----------------|
| Client | Optimistic heart (feels instant) |
| Server | Atomic write; response is source of truth after network |
| Realtime | Broadcast **count** updates to other viewers; never flip *my* heart from someone else’s like |

### 2.4 Persistence across sessions (IG/TikTok standard)

After like → force quit → reopen → login:

1. Heart must still be filled for that user.
2. Count must match active likes.
3. Logout must clear *client* cache; after login, server hydration (`batch-metadata` / feed flags) restores `liked`.

If logout/login clears hearts, the bug is almost always:

- like not persisted; or
- metadata/batch-metadata using a **different user id** than the toggle writer; or
- feed missing `hasLiked` and client not hydrating via batch-metadata (frontend already hydrates — backend must return correct `userInteractions.liked`).

### 2.5 Double-tap video (product note)

On this app, **double-tap video = play/pause**, not like.  
Likes stay on the heart control. Backend does not need a special double-tap endpoint.

### 2.6 Spam / rapid taps

IG/TikTok do not let spam taps corrupt counts.

Backend must:

1. **Idempotency-Key** — same key → replay same response, **do not toggle again**.
2. **Unique index** on `(userId, contentType, contentId)` so one user cannot create two active likes.
3. **Rate limit** (recommended): ~4 toggles / 10s / user / content → `429 LIKE_RATE_LIMITED`.
4. Atomic counter update inside a transaction (no race that double-increments).

### 2.7 Deleted / unavailable content

| Situation | HTTP | Code |
|-----------|------|------|
| Content hard-deleted / not found | `404` | `CONTENT_NOT_FOUND` |
| Soft-deleted / unpublished / banned | `404` or `403` | explicit code — **never** generic `500` |
| User likes then content deleted | Like row cleaned or ignored; count not resurrected |

**Do not** return `LIKE_OPERATION_FAILED` for “content missing”. That hides the real cause and breaks client UX (looks like a random server crash).

### 2.8 Realtime (other people scrolling)

After a successful like commit:

- Emit count-only update to the content room (`likeCount` / engagement counts).
- **Do not** emit an event that flips another user’s `liked` boolean.
- Socket must **not** perform a second mutation (HTTP is the only write authority).

---

## 3. API contracts the frontend already uses

### 3.1 Toggle (write)

```http
POST /api/content/:contentType/:contentId/like
Authorization: Bearer <JWT>          # required
Content-Type: application/json
Idempotency-Key: <uuid-v4>           # sent by current app; must be honored
```

**Path `contentType` for feed video/audio/sermon:** `media`  
(Frontend maps video/audio/music/sermon → `media`.)

**Success `200`:**

```json
{
  "success": true,
  "message": "Like toggled successfully",
  "data": {
    "contentId": "6929da46d4ec2df1331c8b6e",
    "contentType": "media",
    "liked": true,
    "likeCount": 42,
    "updatedAt": "2026-07-23T11:07:00.000Z"
  }
}
```

Frontend reads **only**:

```text
result.data.liked
result.data.likeCount
```

Both required. Types: `boolean` + non-negative `number`.

### 3.2 Batch metadata (hydrate hearts on feed)

```http
POST /api/content/batch-metadata
Authorization: Bearer <JWT>
Content-Type: application/json
```

Must return, per content id:

```json
{
  "userInteractions": { "liked": true },
  "likes": 42
}
```

Same `userId` identity as the toggle writer.

### 3.3 Error shape (stable)

```json
{
  "success": false,
  "code": "MACHINE_READABLE_CODE",
  "message": "Human-readable message",
  "data": {}
}
```

| HTTP | Code | When | Mutation? |
|------|------|------|-----------|
| 400 | `INVALID_CONTENT_TYPE` / `INVALID_CONTENT_ID` | Bad params | No |
| 401 | `AUTHENTICATION_REQUIRED` | Missing/invalid JWT | No |
| 404 | `CONTENT_NOT_FOUND` | Content missing / gone | No |
| 409 | `IDEMPOTENCY_CONFLICT` | Key reused for different payload | No |
| 429 | `LIKE_RATE_LIMITED` | Spam | No |
| 500 | `LIKE_OPERATION_FAILED` | **Unexpected** tx/internal failure after rollback | No (rolled back) |
| 503 | `INTERACTION_SERVICE_UNAVAILABLE` | Dependency down | No |

`LIKE_OPERATION_FAILED` must be rare. Prefer mapping known failures to 400/401/404/429.

---

## 4. Authoritative toggle algorithm (implement / verify this)

```text
1. Authenticate JWT → resolve canonical internal userId
   (same id used by metadata / batch-metadata — not raw Clerk subject in one path and Mongo _id in another)
2. Normalize contentType (media | ebook | podcast | artist | merch)
3. Validate contentId as ObjectId
4. Resolve content in the canonical collection for that type
5. If missing / deleted → 404 CONTENT_NOT_FOUND (not 500)
6. If Idempotency-Key present:
     - lookup completed response for (userId, route, key)
     - if found → return stored 200 body; do not toggle again
7. Start DB transaction
8. Load Like row for (userId, contentType, contentId)
9. If active → deactivate/soft-delete → liked=false
   Else → create/reactivate → liked=true
10. Update global likeCount exactly once (±1 or recount under lock)
11. Commit
12. Write/invalidate Redis (or equivalent) for count + hasLiked
13. Store idempotency replay record
14. Return 200 { liked, likeCount, contentId, contentType, updatedAt }
15. After commit: publish realtime count-update
```

### Required data constraints

```js
// Prevent duplicate likes per user
db.likes.createIndex(
  { userId: 1, contentType: 1, contentId: 1 },
  { unique: true, name: "unique_user_content_like" }
);
```

### Identity invariant (most common “likes don’t stick” bug)

The **same** canonical `userId` must be used by:

- `POST .../like`
- `GET .../metadata`
- `POST .../batch-metadata`
- Redis keys
- uniqueness constraints

If toggle writes Clerk `sub` and metadata reads Mongo `_id`, hearts look random across reload.

---

## 5. Root-cause checklist for `LIKE_OPERATION_FAILED`

Investigate in this order for content `6929da46d4ec2df1331c8b6e` (and any other failing ids).

### A. Content resolution

- [ ] Does `Media` (or canonical collection) contain this `_id`?
- [ ] Is it soft-deleted / moderation-rejected / unpublished?
- [ ] Is the handler looking in the wrong collection for `contentType=media`?
- [ ] After feed delete, is the client still able to like a stale id? (Should be `404`, not `500`.)

### B. User resolution

- [ ] Does JWT map to an existing internal user document?
- [ ] Does that user have a valid ObjectId `_id`?
- [ ] Any path that throws when `req.user` is partially hydrated?

### C. Transaction / persistence

- [ ] Is the Mongo session/transaction actually supported on the cluster (replica set required for transactions)?
- [ ] Unique index collision mishandled (should upsert/reactivate, not 500)?
- [ ] Counter update throws (null `likeCount` on parent doc, NaN, missing field)?
- [ ] Uncaught exception swallowed into generic `LIKE_OPERATION_FAILED` with empty `data`?

### D. Idempotency store

- [ ] Idempotency middleware throws instead of failing open / returning 503?
- [ ] Key store unavailable → should be `503 INTERACTION_SERVICE_UNAVAILABLE`, not opaque 500.

### E. Logging (please add if missing)

On every `LIKE_OPERATION_FAILED`, log:

```json
{
  "event": "like_toggle_failed",
  "contentId": "...",
  "contentType": "media",
  "userId": "...",
  "idempotencyKey": "...",
  "stage": "resolve_content|load_like|write_like|update_count|commit|redis|idempotency",
  "errorName": "...",
  "errorMessage": "...",
  "stack": "..."
}
```

Empty `data: {}` in the HTTP body is fine for clients; **server logs must not be empty**.

### F. Quick SQL/Mongo probes

```js
// Content exists?
db.media.findOne({ _id: ObjectId("6929da46d4ec2df1331c8b6e") }, { title: 1, deletedAt: 1, moderationStatus: 1, likeCount: 1 })

// Existing like rows for a user
db.likes.find({ contentId: ObjectId("6929da46d4ec2df1331c8b6e") }).limit(20)

// Duplicate rows (should be impossible with unique index)
db.likes.aggregate([
  { $match: { contentId: ObjectId("6929da46d4ec2df1331c8b6e") } },
  { $group: { _id: { userId: "$userId", contentType: "$contentType" }, n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } }
])
```

---

## 6. Required behavior after fix

### Happy path

1. User A likes → `200 liked:true likeCount:N+1`
2. Metadata / batch-metadata for User A → `userInteractions.liked: true`, `likes: N+1`
3. User A unlikes → `200 liked:false likeCount:N`
4. User B still sees count `N` if they had liked earlier (independent state)
5. Replay same `Idempotency-Key` → identical `200` body, **no second toggle**
6. Missing content → `404 CONTENT_NOT_FOUND`
7. Spam → `429 LIKE_RATE_LIMITED`
8. True internal failure → `500 LIKE_OPERATION_FAILED` with **rollback** + structured server log

### Consistency rules

- Never return `success: true` if the write rolled back.
- Never leave Redis saying liked while DB says unliked (or vice versa) for longer than the sync window; metadata must prefer a consistent read path (documented in the canonical spec).
- Count must never go negative.

---

## 7. QA matrix (backend)

| # | Case | Expect |
|---|------|--------|
| 1 | Like fresh item | `200 liked:true`, count +1 |
| 2 | Unlike same item | `200 liked:false`, count −1 |
| 3 | Like → metadata | `liked:true` |
| 4 | Like → batch-metadata | map entry `liked:true` |
| 5 | Like → logout → login → batch-metadata | still `liked:true` |
| 6 | Two devices same user | both converge to server state |
| 7 | Two users like same item | count +2; each has own `liked` |
| 8 | Same Idempotency-Key twice | same body; count unchanged on 2nd |
| 9 | New Idempotency-Key while liked | toggles to unlike |
| 10 | Deleted content id | `404`, not `500` |
| 11 | Invalid ObjectId | `400` |
| 12 | No auth | `401` |
| 13 | Burst 20 taps / 2s | `429` after limit; no corrupt count |
| 14 | Concurrent likes from 2 users | final count exact; no lost updates |

---

## 8. What frontend will not change

- Endpoint path: `POST /api/content/:contentType/:contentId/like`
- Content type for feed AV: `media`
- Success field names: `data.liked`, `data.likeCount`
- Sending `Idempotency-Key` per gesture
- Optimistic UI + rollback on 4xx/5xx server errors
- Hydration via `batch-metadata` after feed load

Backend owns durability, identity consistency, correct status codes, and eliminating `LIKE_OPERATION_FAILED` for known cases (missing content, bad user, unique conflicts).

---

## 9. Deliverables requested from backend

1. **Root cause** for `6929da46d4ec2df1331c8b6e` (and whether it is systemic).
2. **Fix** so toggle returns `200` or a precise `4xx`, not opaque `500`, for known states.
3. **Structured logging** on `LIKE_OPERATION_FAILED` with `stage` + error.
4. Confirm **idempotency** replay behavior for `Idempotency-Key`.
5. Confirm **userId identity** is identical across toggle + batch-metadata.
6. Short note in PR: which step in §4 was throwing.

---

## 10. References in this repo

| Doc | Use |
|-----|-----|
| [`LIKE_SYSTEM_BACKEND_BUSINESS_LOGIC_SPEC.md`](./LIKE_SYSTEM_BACKEND_BUSINESS_LOGIC_SPEC.md) | Full canonical backend implementation spec |
| [`LIKE_UNLIKE_FRONTEND_CONTRACT.md`](./LIKE_UNLIKE_FRONTEND_CONTRACT.md) | What mobile already integrates against |
| [`FRONTEND_LIKES_INSTAGRAM_TIKTOK.md`](./FRONTEND_LIKES_INSTAGRAM_TIKTOK.md) | Client UX wiring |
| [`BACKEND_LIKE_PERSISTENCE_HOW_TO_FIX.md`](./BACKEND_LIKE_PERSISTENCE_HOW_TO_FIX.md) | Logout/login persistence checklist |

**Frontend contact surface:** `app/utils/contentInteraction/like.ts`, `app/store/useInteractionStore/actions/likeActions.ts`.
