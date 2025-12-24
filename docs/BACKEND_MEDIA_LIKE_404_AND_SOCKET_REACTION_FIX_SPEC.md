## Backend Fix Spec: `POST /api/content/media/:contentId/like` Returning 404 + Socket “Failed to add reaction”

### 0) Why this doc exists (current production symptom)

Frontend logs show:

- `POST https://jevahapp-backend.onrender.com/api/content/media/{contentId}/like` → **404**
- Socket emits “like/reaction” → backend responds **Failed to add reaction**

This is not a frontend UI bug. A 404 means backend is either:
- missing the route in prod deployment, **or**
- resolving the content type incorrectly, **or**
- failing to find the content record by id (wrong collection / wrong DB / wrong id field).

Until this is fixed, likes will never persist for videos.

---

### 1) Non-negotiable contract (what must work)

#### 1.1 Toggle like (video)

**Endpoint**

```http
POST /api/content/media/{contentId}/like
Authorization: Bearer <JWT>
Content-Type: application/json
```

**Success response (200)**

```json
{
  "success": true,
  "message": "Content liked successfully" | "Content unliked successfully",
  "data": {
    "contentId": "<id>",
    "liked": true,
    "likeCount": 42
  }
}
```

**Failure responses**
- `401` only if token missing/invalid
- `400` only if invalid ObjectId format / invalid contentType
- `404` only if the media record truly does not exist in the target DB

#### 1.2 Metadata must match toggle

```http
GET /api/content/media/{contentId}/metadata
Authorization: Bearer <JWT>   // required for user flags
```

Returns:
- `likeCount` (number)
- `hasLiked` (boolean for authenticated user)

If `POST /like` returns `liked:true`, the next metadata response must return `hasLiked:true`.

---

### 2) The actual bug we must fix (what 404 means here)

If the frontend can render the video card, then a “real” media record exists *somewhere* (at least from the content list endpoint).

So a 404 on the toggle endpoint typically means one of these:

#### A) Route not deployed / wrong base path
- `POST /api/content/media/:id/like` not registered in prod build
- reverse proxy / router mismatch (`/api` stripped or duplicated)

✅ Fix: confirm server registers routes and that the deployed instance has the route.

#### B) Wrong database / environment mismatch
- The list endpoint is reading from DB A, but the like endpoint queries DB B
- Or the deployed `jevahapp-backend.onrender.com` is not the same backend environment used to create content

✅ Fix: verify `MONGO_URI` / DB name for *every* route group is identical in prod.

#### C) Wrong “media id” field
Common: content list returns `id`, but media collection uses `_id` or vice-versa.

✅ Fix: enforce that **all** APIs return `_id` consistently, and that the like controller uses the exact same identifier used in list responses.

#### D) Content type resolution mismatch
Frontend calls `media`. Backend must resolve “video/audio/live” content into the **same** `media` domain.

✅ Fix: `contentType=media` must query the same model/collection used for videos.

---

### 3) Backend must add “diagnostic logging” (1 deploy to resolve quickly)

In the controller for toggle like (media):

Log:
- `contentType`, `contentId`
- `isValidObjectId(contentId)`
- the exact model queried
- the query used (`findById`, `findOne({_id: ...})`, etc.)
- which DB connection is active (db name / host)
- if not found: log a **sample** query against the media collection to confirm connectivity

Example:

```ts
logger.info("toggleLike", {
  contentType,
  contentId,
  dbName: mongoose.connection.name,
  model: "Media",
});
```

This removes guessing.

---

### 4) Required backend implementation (Media likes)

#### 4.1 Data model (professional)

Do NOT store large arrays of user ids on media docs.

Use:

- `Media`:
  - `_id`
  - `likeCount: number` (cached counter)
- `MediaInteraction` / `Like` table:
  - `userId`
  - `contentId` (media _id)
  - `interactionType = "like"`
  - `isRemoved` (soft delete) OR hard delete (either is fine if consistent)

Indexes:
- Unique on `(userId, contentId, interactionType)` where `isRemoved=false` (if soft delete)
  - or `(userId, contentId)` unique if you store a single record and flip `isRemoved`

#### 4.2 Toggle behavior

Pseudocode:

```ts
// 1) validate contentId is ObjectId
// 2) find Media by _id
// 3) find interaction row for (userId, contentId)
// 4) toggle:
//    - if not exists or isRemoved=true => set liked=true, increment likeCount
//    - else => set liked=false, decrement likeCount
// 5) return updated likeCount + liked
```

Must be atomic / race safe:
- use `$inc` for counter
- use transaction or single upsert + update if necessary

---

### 5) Socket.IO “Failed to add reaction” (must align with REST)

Current frontend behavior:
- emits a socket event when user taps like (for realtime)
- still calls REST toggle like for source of truth

Backend must:
- accept the socket “like” event for `media`
- either:
  - call the same service method as REST toggle like, or
  - treat socket as “broadcast only” and never attempt DB writes (recommended is DB write via same service)

**Do not have two separate implementations** (one for REST, one for socket) or counts will drift.

If socket fails, it must not break REST behavior.

---

### 6) Acceptance tests backend must run (copy/paste checklist)

Using prod base URL:

1) Pick a video id that appears in the feed list response: `{contentId}`

2) Verify metadata exists:
- `GET /api/content/media/{contentId}/metadata` should return 200 (even if auth optional)

3) Toggle like:
- `POST /api/content/media/{contentId}/like` should return 200

4) Verify metadata reflects it:
- `GET /api/content/media/{contentId}/metadata` should return `hasLiked:true`

5) Toggle again:
- `POST /api/content/media/{contentId}/like` returns `liked:false`

6) Verify unlike:
- metadata returns `hasLiked:false`

If step (2) returns 404 but the video is visible in feeds:
- your endpoints are reading different DBs or different collections.

---

### 7) What to avoid (things that cause this exact bug)

- Returning a list of videos from one service/model and trying to like via another model
- Using `id` vs `_id` inconsistently (string vs ObjectId)
- Deploying a backend build that doesn’t include the `contentInteraction.routes.ts` mount
- Socket “reaction” code path not sharing the same service method as REST

---

### 8) What backend should send back to frontend team after fix

Provide:
- curl output for:
  - `GET /api/content/media/{id}/metadata`
  - `POST /api/content/media/{id}/like`
  - `GET /api/content/media/{id}/metadata` again
- the exact DB name and collection queried for media likes
- confirmation that the deployed instance is `jevahapp-backend.onrender.com`


