# Canonical Like System Backend Business Logic

**Audience:** Jevah backend engineers  
**Frontend branch:** `feature/feed-playback-engagement`  
**Priority:** High  
**Status:** Canonical contract for implementation and QA  
**Supersedes for general content likes:** older like persistence and inconsistent-response notes in this repository

---

## 1. Goal

The like system must provide one durable, authoritative answer to two different questions:

1. **Did the authenticated user like this content?**
2. **How many users currently like this content?**

Those values are related, but they are not the same:

```text
liked     = whether this JWT user has an active like
likeCount = total active likes from all users
```

The backend must keep them consistent across:

- like and unlike mutations;
- feed reloads;
- metadata requests;
- logout and login;
- different devices;
- concurrent requests;
- cache and database reads;
- app retries and rate limits.

The frontend uses optimistic UI for responsiveness, but the backend is the durable source of truth.

---

## 2. Critical semantic correction

This response is completely valid:

```json
{
  "liked": false,
  "likeCount": 12
}
```

It means:

- the current authenticated user does not like the item;
- twelve other users still like it.

Therefore:

- never infer the current user's state from `likeCount`;
- never implement `liked` as `likeCount > 0`;
- never treat `liked: false` and `likeCount > 0` as a contradiction by itself.

An actual contradiction occurs when the response's `liked` value does not match the active like row for the authenticated user after the mutation.

---

## 3. Canonical content identity

Every like is uniquely identified by:

```text
(userId, contentType, contentId)
```

`contentId` alone is not enough because different content collections can theoretically contain the same identifier.

### Supported backend content types

| Frontend content examples | Canonical backend type | Canonical collection |
|---|---|---|
| video, videos, audio, music, live, sermon, sermons, devotional, teachings | `media` | Media |
| ebook, ebooks, e-books, books | `ebook` | Ebook |
| podcast, podcasts | `podcast` | Podcast |
| artist | `artist` | Artist |
| merch | `merch` | Merch |

The current frontend mapper is:

```text
app/utils/engagementHelpers.ts → mapContentTypeForBackend()
```

The backend must still validate and normalize the path type. It must not trust arbitrary model names supplied by clients.

---

## 4. Authentication and user identity

### Mutation endpoint

Like/unlike mutations require authentication:

```http
Authorization: Bearer <JWT>
```

The backend must:

1. verify the token;
2. map the external auth subject to one canonical internal user record;
3. use that internal `userId` for both writes and reads;
4. never accept a `userId` from the request body;
5. return `401` when authentication is missing or invalid.

### Identity invariant

The same canonical `userId` must be used by:

- the toggle endpoint;
- single metadata;
- batch metadata;
- authenticated feed hydration;
- notification creation;
- Redis keys;
- database uniqueness constraints.

Using a Clerk subject in one path and an internal Mongo `_id` in another will create the appearance that likes do not persist.

---

## 5. Canonical write endpoint supported by the frontend

```http
POST /api/content/:contentType/:contentId/like
Authorization: Bearer <JWT>
Content-Type: application/json
Idempotency-Key: <optional but strongly recommended UUID>
```

The request body may be empty:

```json
{}
```

### Current semantics

This endpoint is a **toggle**:

- no active like → create/reactivate like;
- active like → remove/deactivate like.

### Success response

```http
200 OK
Content-Type: application/json
```

```json
{
  "success": true,
  "message": "Like toggled successfully",
  "data": {
    "contentId": "69abf4886aef561f683a1a32",
    "contentType": "media",
    "liked": true,
    "likeCount": 42,
    "updatedAt": "2026-07-18T06:40:00.000Z"
  }
}
```

### Required response meanings

- `data.contentId`: exact content identifier that was mutated;
- `data.contentType`: normalized backend type;
- `data.liked`: post-mutation state for the authenticated user;
- `data.likeCount`: global active-like count after this mutation;
- `data.updatedAt`: server timestamp for reconciliation.

The current frontend reads:

```text
result.data.liked
result.data.likeCount
```

Both fields must always exist on a successful response and must use stable types:

```text
liked: boolean
likeCount: non-negative integer
```

Do not return alternative shapes such as top-level `isLiked`, `likes`, a string count, or a pre-toggle boolean.

---

## 6. Recommended future write API

A toggle endpoint is vulnerable to duplicate delivery:

```text
request succeeds → response is lost → client retries → second request unlikes it
```

The safest long-term API expresses the desired state:

```http
PUT /api/content/:contentType/:contentId/like
Authorization: Bearer <JWT>
Content-Type: application/json
Idempotency-Key: <UUID>

{
  "liked": true
}
```

or:

```http
DELETE /api/content/:contentType/:contentId/like
```

Desired-state operations are naturally idempotent:

- repeated `PUT { "liked": true }` leaves the item liked;
- repeated `DELETE` leaves the item unliked.

The current frontend uses `POST` toggle, so the backend must support the canonical POST contract now. A future frontend migration may adopt desired-state writes.

---

## 7. Database model

### Recommended Like document

```ts
type Like = {
  _id: ObjectId;
  userId: ObjectId;
  contentType: "media" | "ebook" | "podcast" | "artist" | "merch";
  contentId: ObjectId;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
```

Choose either:

1. hard delete on unlike; or
2. soft delete / `active:false` on unlike.

Do not mix both semantics across endpoints.

### Required unique index

```js
db.likes.createIndex(
  { userId: 1, contentType: 1, contentId: 1 },
  { unique: true, name: "unique_user_content_like" }
);
```

This prevents duplicate active likes from the same user.

### Useful read indexes

```js
db.likes.createIndex(
  { contentType: 1, contentId: 1, active: 1 },
  { name: "content_active_likes" }
);

db.likes.createIndex(
  { userId: 1, active: 1, updatedAt: -1 },
  { name: "user_active_likes" }
);
```

If hard deletes are used and there is no `active` field, remove `active` from the indexes.

---

## 8. Authoritative toggle transaction

The mutation must be atomic from the application's perspective.

### Required algorithm

```text
1. Authenticate request.
2. Normalize and validate contentType.
3. Validate contentId format.
4. Resolve content through the canonical content resolver.
5. Return 404 if content does not exist or is unavailable.
6. Start a database transaction/session.
7. Read the user's like row for (userId, contentType, contentId).
8. If active:
     deactivate/delete it;
     postState = false.
   Else:
     create/reactivate it;
     postState = true.
9. Calculate/update the global active like count exactly once.
10. Commit the transaction.
11. Update/invalidate caches.
12. Return postState and the committed count.
13. Publish realtime/analytics events after commit.
```

### Node/Mongoose-style pseudocode

```js
async function toggleLike(req, res) {
  const userId = req.user._id;
  const contentType = normalizeContentType(req.params.contentType);
  const contentId = validateObjectId(req.params.contentId);

  const content = await resolveContent(contentType, contentId);
  if (!content || content.deletedAt) {
    return res.status(404).json({
      success: false,
      code: "CONTENT_NOT_FOUND",
      message: "Content not found"
    });
  }

  const session = await mongoose.startSession();
  let liked;
  let likeCount;

  try {
    await session.withTransaction(async () => {
      const row = await Like.findOne({
        userId,
        contentType,
        contentId
      }).session(session);

      if (row?.active) {
        row.active = false;
        row.deletedAt = new Date();
        await row.save({ session });
        liked = false;
      } else if (row) {
        row.active = true;
        row.deletedAt = null;
        await row.save({ session });
        liked = true;
      } else {
        await Like.create([{
          userId,
          contentType,
          contentId,
          active: true,
          deletedAt: null
        }], { session });
        liked = true;
      }

      likeCount = await Like.countDocuments({
        contentType,
        contentId,
        active: true
      }).session(session);

      await updateContentLikeCounter({
        contentType,
        contentId,
        likeCount,
        session
      });
    });
  } finally {
    await session.endSession();
  }

  await refreshLikeCaches({
    userId,
    contentType,
    contentId,
    liked,
    likeCount
  });

  publishLikeEventsAfterCommit({
    actorUserId: userId,
    content,
    contentType,
    contentId,
    liked,
    likeCount
  });

  return res.status(200).json({
    success: true,
    message: liked ? "Content liked" : "Content unliked",
    data: {
      contentId: String(contentId),
      contentType,
      liked,
      likeCount,
      updatedAt: new Date().toISOString()
    }
  });
}
```

Production code must also handle duplicate-key races and transaction retries.

---

## 9. Count integrity

`likeCount` means:

```text
number of active unique users liking this content
```

It must never be:

- number of toggle events;
- number of Like documents including inactive/soft-deleted rows;
- derived from whether the current user liked;
- negative;
- incremented twice by both HTTP and socket handlers.

### Source of truth options

**Option A — count active Like rows**

Most accurate and simple, potentially more expensive at large scale.

**Option B — denormalized counter on content**

Faster reads, but update it only when an actual state transition occurs:

```text
inactive → active: +1
active → inactive: -1
active → active: 0
inactive → inactive: 0
```

Use `$inc` inside the same transaction as the Like row change, and clamp/repair corrupted negative counters.

### Reconciliation job

Run a periodic job that compares stored counters with active Like rows and repairs differences.

```js
actual = count(active likes for content);
stored = content.likeCount;
if (actual !== stored) repair and log;
```

### Views are separate

Do not modify `viewCount` merely to make it greater than or equal to `likeCount`. Likes and views are separate business events, and view tracking can be sampled, delayed, blocked, or deduplicated differently.

---

## 10. Idempotency and duplicate delivery

The frontend blocks simultaneous taps, but the network can still retry or duplicate requests.

### Required for robust POST toggle

Support:

```http
Idempotency-Key: <client-generated UUID>
```

Store:

```text
(userId, route, idempotencyKey) → completed status + response body
```

Rules:

1. First key use executes the toggle.
2. Repeated key returns the exact original response.
3. Repeated key must not toggle again.
4. Keys should expire after a reasonable period, such as 24 hours.
5. Same key with a different payload/path must return `409`.

Until the frontend sends this header, the unique index and transaction still protect count integrity, but cannot prevent a legitimate second toggle request from reversing the first.

---

## 11. Rate limiting

Rate limiting protects the service, but it must not make normal interaction frustrating.

### Recommended policy

Use a key such as:

```text
like:{userId}:{contentType}:{contentId}
```

Recommended baseline:

- allow short legitimate like/unlike behavior;
- reject rapid repeated toggles;
- use a separate broader per-user interaction limit;
- do not key primarily by IP because many users may share an IP.

Example policy:

```text
Per content: 4 toggle requests / 10 seconds / user
Global likes: 60 requests / minute / user
```

Tune using production telemetry.

### 429 contract

If rejected, the mutation must not occur.

```http
429 Too Many Requests
Retry-After: 3
Content-Type: application/json
```

```json
{
  "success": false,
  "code": "LIKE_RATE_LIMITED",
  "message": "Too many requests. Please wait a moment before liking again.",
  "data": {
    "retryAfterSeconds": 3
  }
}
```

The current frontend:

- rolls back the optimistic state;
- does not create a local fallback like;
- disables repeated taps during the cooldown;
- reads `Retry-After` when present.

Do not return `200` for a rejected mutation.

---

## 12. Error contract

All errors should have one stable shape:

```json
{
  "success": false,
  "code": "MACHINE_READABLE_CODE",
  "message": "Human-readable message",
  "data": {}
}
```

### Required statuses

| HTTP | Code | Meaning | Mutation occurred? |
|---|---|---|---|
| 400 | `INVALID_CONTENT_TYPE` / `INVALID_CONTENT_ID` | Invalid request | No |
| 401 | `AUTHENTICATION_REQUIRED` | Missing/invalid token | No |
| 403 | `USER_NOT_ALLOWED` | Suspended/restricted user | No |
| 404 | `CONTENT_NOT_FOUND` | Canonical content resolver found nothing | No |
| 409 | `IDEMPOTENCY_CONFLICT` | Key reused for another request | No |
| 429 | `LIKE_RATE_LIMITED` | Too many requests | No |
| 500 | `LIKE_OPERATION_FAILED` | Transaction/internal error | Rolled back |
| 503 | `INTERACTION_SERVICE_UNAVAILABLE` | Temporary outage | No/rolled back |

Never return `success:true` when the write failed.

---

## 13. Single metadata read contract

```http
GET /api/content/:contentType/:contentId/metadata
Authorization: Bearer <JWT>
```

Authentication may be optional for public counts, but if a valid token is supplied it must be used.

```json
{
  "success": true,
  "data": {
    "contentId": "69abf4886aef561f683a1a32",
    "likes": 42,
    "saves": 5,
    "shares": 2,
    "views": 300,
    "comments": 7,
    "userInteractions": {
      "liked": true,
      "saved": false,
      "shared": false,
      "viewed": true
    }
  }
}
```

Rules:

- `likes` equals canonical global `likeCount`;
- `userInteractions.liked` comes from this authenticated user's active Like row;
- unauthenticated requests return public counts and `liked:false`;
- a successful write must be visible to this endpoint immediately afterward.

---

## 14. Batch metadata read contract used by the current frontend

```http
POST /api/content/batch-metadata
Authorization: Bearer <JWT>
Content-Type: application/json
```

### Request

The current frontend sends mixed content types as items:

```json
{
  "items": [
    {
      "contentId": "69abf4886aef561f683a1a32",
      "contentType": "media"
    },
    {
      "contentId": "68cbaaa98149fd4ad4a77511",
      "contentType": "ebook"
    }
  ]
}
```

The backend should accept up to a documented maximum, such as 100 items, and deduplicate repeated `(contentType, contentId)` pairs.

### Response

Return an object keyed by `contentId`:

```json
{
  "success": true,
  "data": {
    "69abf4886aef561f683a1a32": {
      "contentId": "69abf4886aef561f683a1a32",
      "likes": 42,
      "saves": 5,
      "shares": 2,
      "views": 300,
      "comments": 7,
      "userInteractions": {
        "liked": true,
        "saved": false,
        "shared": false,
        "viewed": true
      }
    }
  }
}
```

The current frontend can parse an array for legacy compatibility, but the canonical format is the keyed object.

### Efficient query strategy

Do not run one query per item.

1. Group request items by canonical content type.
2. Fetch counters in bulk.
3. Fetch this user's active likes with one `$in` query per collection/model strategy.
4. Build a Set keyed by `contentType:contentId`.
5. Map each item to counts and `userInteractions`.

Target complexity:

```text
O(number of content-type groups), not O(number of items)
```

---

## 15. Feed response contract

The feed may include interaction state directly:

```json
{
  "_id": "69abf4886aef561f683a1a32",
  "contentType": "video",
  "likeCount": 42,
  "hasLiked": true,
  "userInteractions": {
    "liked": true
  }
}
```

For authenticated responses:

```text
hasLiked === userInteractions.liked === active like for JWT user
```

For unauthenticated responses:

```text
hasLiked === false
```

If the feed does not include per-user state, batch metadata remains mandatory. Either way, feed and metadata must use the same canonical like service.

Do not calculate `hasLiked` from a cached response that is not user-scoped.

---

## 16. Cache design and read-after-write consistency

### Database remains durable source of truth

Recommended ordering:

```text
commit DB transaction → update/invalidate cache → respond
```

Do not acknowledge success and defer the only durable database write to an unmonitored background task.

### Suggested Redis keys

```text
content:{contentType}:{contentId}:likeCount
user:{userId}:like:{contentType}:{contentId}
metadata:{contentType}:{contentId}
batch-metadata caches must be public-only or user-scoped
```

### Required cache properties

1. User-specific liked state must never leak between users.
2. Toggle success updates or invalidates both count and user state.
3. Metadata after a successful toggle must return the new state.
4. Cache failures must not corrupt the database mutation.
5. If cache update fails after commit, invalidate broadly and log for repair.

### Dangerous pattern

Never cache this response globally:

```json
{
  "likeCount": 42,
  "userInteractions": { "liked": true }
}
```

The count is public; `liked` is user-specific.

---

## 17. Realtime events

HTTP is the only mutation authority. A socket event must not perform a second toggle.

### Global room event

Broadcast only global state:

```json
{
  "event": "content-like-count-updated",
  "contentId": "69abf4886aef561f683a1a32",
  "contentType": "media",
  "likeCount": 42,
  "updatedAt": "2026-07-18T06:40:00.000Z"
}
```

### Private user event

If needed, emit to the actor's private room:

```json
{
  "event": "content-like-state-updated",
  "contentId": "69abf4886aef561f683a1a32",
  "contentType": "media",
  "liked": true,
  "likeCount": 42,
  "updatedAt": "2026-07-18T06:40:00.000Z"
}
```

Do not broadcast the actor's `liked:true` to all users; each user's liked state is different.

Publish only after the database transaction commits. Use an outbox pattern if guaranteed event delivery matters.

---

## 18. Notifications and analytics

### Notifications

Create a “liked your content” notification only on a real transition:

```text
inactive → active
```

Rules:

- do not notify on duplicate/idempotent delivery;
- do not notify the owner when liking their own content;
- deduplicate by actor, recipient, content type, and content ID;
- unlike should not create another notification;
- product may remove or retain the old notification on unlike, but must choose one consistent policy.

### Analytics

Record after commit:

```json
{
  "event": "content_like_changed",
  "actorUserId": "...",
  "contentType": "media",
  "contentId": "...",
  "liked": true,
  "likeCount": 42,
  "requestId": "...",
  "occurredAt": "..."
}
```

Do not count rejected 429 requests as successful likes.

---

## 19. Moderation and content lifecycle

Like must be rejected when:

- content does not exist;
- content is hard deleted;
- content is not visible to this user;
- the user is suspended from interactions;
- content type is unsupported.

Define product policy for:

- private/group content;
- blocked users;
- archived content;
- content awaiting moderation;
- content removed after likes exist.

When content is permanently deleted, remove or archive its Like rows and invalidate interaction caches.

---

## 20. Frontend behavior this backend contract supports

The current frontend flow is:

```text
tap heart
→ block a second in-flight tap
→ optimistically flip heart and count
→ POST canonical toggle
→ success: reconcile with data.liked + data.likeCount
→ error: roll back optimistic state
→ 429: honor Retry-After, cool down, show soft message
```

Important:

- no local fallback is used for a valid backend content ID after a 429;
- batch metadata restores durable like state on reload/login;
- the frontend expects an authenticated post-toggle boolean;
- the backend must be correct even if the frontend cache is empty.

There is currently a temporary frontend guard for historically inconsistent successful responses. Once backend acceptance tests pass consistently, frontend should remove that guard and trust successful server state unconditionally.

---

## 21. Concurrency scenarios the backend must handle

### Two requests from the same user at nearly the same time

Without idempotency, two distinct toggle requests legitimately mean two toggles. The backend must still:

- avoid duplicate Like rows;
- avoid count corruption;
- serialize/transactionally handle the state transitions;
- return the committed result of each operation.

### Two different users like simultaneously

Both should end liked and the global count should increase by two.

### One user likes while another unlikes

Both user states must be correct and the global count reflects the net transition.

### Cache is stale

The database transaction decides the mutation. Never toggle solely from a stale cached boolean.

### Response lost after commit

An idempotency key must allow the exact original response to be replayed without toggling again.

---

## 22. Acceptance tests

### Basic state transitions

- [ ] Unliked user POSTs once → `liked:true`; count increases by one.
- [ ] Same user POSTs again → `liked:false`; count decreases by one.
- [ ] Count never goes below zero.
- [ ] A second user can like independently.
- [ ] User A unlikes while User B remains liked → User A gets `liked:false` and `likeCount` remains greater than zero.

### Persistence

- [ ] Like survives app reload.
- [ ] Like survives logout and login.
- [ ] Like appears on another device for the same account.
- [ ] Single metadata returns the post-toggle user state.
- [ ] Batch metadata returns the post-toggle user state.
- [ ] Authenticated feed, if it includes `hasLiked`, matches metadata.

### Authentication and isolation

- [ ] Missing token on POST returns 401.
- [ ] User A's `liked` state never appears as User B's state.
- [ ] Public metadata returns counts but no private user state.
- [ ] Body-provided `userId` is ignored/rejected.

### Counts

- [ ] Duplicate database rows are prevented by unique index.
- [ ] Concurrent likes do not lose increments.
- [ ] Concurrent unlike/like does not create negative or inflated counts.
- [ ] Soft-deleted rows are excluded from counts.
- [ ] Reconciliation job detects and repairs a deliberately corrupted counter.

### Errors and rate limits

- [ ] Invalid ID returns 400 without mutation.
- [ ] Missing content returns 404 without mutation.
- [ ] 429 includes `Retry-After` and does not mutate state.
- [ ] Transaction failure returns 500 and rolls back row and counter.
- [ ] No error response uses `success:true`.

### Idempotency

- [ ] Repeating the same Idempotency-Key returns the same response.
- [ ] Repeating the same key does not toggle again.
- [ ] Reusing a key for another content ID returns 409.

### Realtime and notifications

- [ ] HTTP performs exactly one mutation; socket does not toggle again.
- [ ] Global event contains global count, not another user's private `liked` state.
- [ ] Notification is created only on inactive → active.
- [ ] Duplicate/idempotent delivery does not create duplicate notifications.

---

## 23. Minimum integration test example

```js
describe("POST /api/content/media/:id/like", () => {
  it("persists per-user state and returns authoritative count", async () => {
    const before = await getMetadata({ token: userAToken, contentId });

    const like = await request(app)
      .post(`/api/content/media/${contentId}/like`)
      .set("Authorization", `Bearer ${userAToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({});

    expect(like.status).toBe(200);
    expect(like.body.success).toBe(true);
    expect(like.body.data.liked).toBe(true);
    expect(like.body.data.likeCount).toBe(before.data.likes + 1);

    const userAMetadata = await getMetadata({
      token: userAToken,
      contentId
    });
    expect(userAMetadata.data.userInteractions.liked).toBe(true);

    const userBMetadata = await getMetadata({
      token: userBToken,
      contentId
    });
    expect(userBMetadata.data.userInteractions.liked).toBe(false);
    expect(userBMetadata.data.likes).toBe(like.body.data.likeCount);

    const unlike = await request(app)
      .post(`/api/content/media/${contentId}/like`)
      .set("Authorization", `Bearer ${userAToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({});

    expect(unlike.body.data.liked).toBe(false);
    expect(unlike.body.data.likeCount).toBe(before.data.likes);
  });
});
```

---

## 24. Backend implementation checklist

- [ ] One canonical content-type normalizer and resolver.
- [ ] One canonical auth-to-internal-user resolver.
- [ ] Unique index on `(userId, contentType, contentId)`.
- [ ] Transactional user-state and global-count update.
- [ ] Stable POST response with `data.liked` and `data.likeCount`.
- [ ] Idempotency-Key support for toggle safety.
- [ ] `Retry-After` on 429; rejected request performs no mutation.
- [ ] Single metadata uses canonical like service.
- [ ] Batch metadata accepts current `{ items: [...] }` request shape.
- [ ] Batch metadata performs bulk queries, not N+1.
- [ ] Feed and metadata never use a globally cached user-specific flag.
- [ ] Cache updated/invalidated after committed mutation.
- [ ] HTTP is mutation authority; sockets only distribute committed updates.
- [ ] Notifications occur once per real like transition.
- [ ] Integration/concurrency tests cover all acceptance criteria.
- [ ] Monitoring exists for mismatch, counter drift, 429 volume, and failures.

---

## 25. Observability

Log structured fields without exposing tokens:

```json
{
  "event": "like_toggle_completed",
  "requestId": "...",
  "idempotencyKey": "...",
  "userId": "...",
  "contentType": "media",
  "contentId": "...",
  "previousLiked": false,
  "liked": true,
  "likeCount": 42,
  "status": 200,
  "durationMs": 34
}
```

Track metrics:

- success count by content type;
- unlike count;
- 400/401/404/409/429/500 rates;
- p50/p95/p99 mutation latency;
- transaction retries;
- duplicate-key conflicts;
- idempotency replays;
- cache update failures;
- counter reconciliation drift;
- metadata/write mismatches.

Alert when:

- successful writes are not visible in metadata;
- counters become negative;
- reconciliation drift grows;
- 429 rate sharply increases;
- mutation error rate exceeds threshold.

---

## 26. Final source-of-truth statement

For every `(userId, contentType, contentId)`:

```text
active Like row
    ⇕
POST response data.liked
    ⇕
single metadata userInteractions.liked
    ⇕
batch metadata userInteractions.liked
    ⇕
authenticated feed hasLiked (when provided)
```

All five representations must agree after a successful committed mutation.

The global count must equal the number of active unique user likes, independently of whether the current user is one of them.
