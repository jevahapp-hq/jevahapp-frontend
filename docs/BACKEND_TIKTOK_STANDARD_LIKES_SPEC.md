## TikTok-Style Likes – Backend Contract + Persistence Requirements

### 1) Why this doc exists (current production issue)

The frontend is already doing **optimistic likes** (heart turns red immediately) and then it **reconciles** with backend responses / metadata.

The UI breaks (heart flickers back / counts jump / reels show nothing) when backend returns:
- `liked=false` even though the user just liked, or
- a stale / inconsistent `likeCount`, or
- metadata endpoints return `hasLiked=false` right after a successful toggle.

**Goal**: backend must provide **read-your-write consistency** for likes so the UI stays stable across feed, reels, detail pages, and after refresh.

---

### 2) Frontend expectations (source of truth + caching)

#### 2.1 What the UI needs for a stable experience

For every content item in a feed/reels, the frontend needs:
- **`likeCount`**: total likes (a number)
- **`hasLiked`** (or `viewerHasLiked`): whether the *current authenticated user* has liked this item (boolean)

The UI does **not** need the full list of likers for rendering the heart. That should be a separate endpoint.

#### 2.2 Where the frontend caches

Frontend caches likes in a session store (Zustand) keyed by `contentId`. It will:
- optimistically flip `hasLiked` and update `likeCount`
- call backend toggle endpoint
- then apply backend response as the final source of truth

If the backend later returns stale metadata (e.g., `hasLiked=false`), the UI can flip back.

So: **toggle response and metadata must match**.

---

### 3) Data model (professional, scalable)

#### 3.1 Do NOT store `likes: [userId]` on the content document

In a professional app, storing a growing array of user IDs on each content doc:
- explodes document size
- causes write contention/hot documents
- makes pagination of likers hard
- makes unique enforcement harder

#### 3.2 Recommended model

Use:

##### A) `likes` collection/table (source of truth)

**Like**
- `_id`
- `userId`
- `contentId`
- `contentType` (e.g. `media|ebook|devotional|...`)
- `createdAt`

**Uniqueness**:
- Unique index on `(userId, contentId, contentType)`

##### B) cached counter on content (fast reads)

On each content document:
- `likeCount: number` (default 0)
- `updatedAt`

Keep `likeCount` correct using atomic increments.

---

### 4) Required endpoints + exact response shapes

#### 4.1 Toggle like (single endpoint, TikTok-style)

**Endpoint**

```http
POST /api/content/{contentType}/{contentId}/like
Authorization: Bearer <JWT>
```

**Behavior**
- If user has NOT liked: create like row + increment `likeCount`
- If user HAS liked: delete like row + decrement `likeCount` (clamp at 0)

**Response (MUST be post-toggle final state)**

```json
{
  "success": true,
  "message": "Like toggled",
  "data": {
    "contentId": "string",
    "liked": true,
    "likeCount": 42
  }
}
```

**Critical rules**
- `data.liked` is the authenticated user’s final state **after** the toggle.
- `data.likeCount` is the total likes **after** the toggle.
- Never return stale counts.

**Idempotency note**
- Toggle is inherently not idempotent; that’s fine if the UI calls once per tap.
- If you want strict idempotency, add separate endpoints:
  - `POST /like` (idempotent “ensure liked”)
  - `DELETE /like` (idempotent “ensure unliked”)
  - But then the frontend must change. For now, keep toggle.

#### 4.2 Single item metadata (feeds + refresh)

**Endpoint**

```http
GET /api/content/{contentType}/{contentId}/metadata
Authorization: Bearer <JWT>   // optional, but if present must include user-specific flags
```

**Response**

```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "likeCount": 42,
    "hasLiked": true
  }
}
```

**Rules**
- If authenticated, `hasLiked` must be computed from the `likes` collection.
- After a successful toggle, this endpoint must reflect the new state immediately.

#### 4.3 Batch metadata (feeds / lists)

**Endpoint**

```http
POST /api/content/batch-metadata
Authorization: Bearer <JWT>   // optional, but recommended
Content-Type: application/json

{
  "contentType": "media",
  "contentIds": ["id1","id2"]
}
```

**Response**

```json
{
  "success": true,
  "data": [
    { "id": "id1", "likeCount": 42, "hasLiked": true },
    { "id": "id2", "likeCount": 7,  "hasLiked": false }
  ]
}
```

**Rules**
- Must be consistent with toggle + single metadata.
- If authenticated, include `hasLiked` for each item.

#### 4.4 Likers list (for “Liked by …” UI)

**Endpoint**

```http
GET /api/content/{contentType}/{contentId}/likers?page=1&limit=20
```

**Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "userId": "string",
        "username": "string",
        "avatarUrl": "string|null",
        "likedAt": "ISO-8601"
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 1234,
    "hasMore": true
  }
}
```

**Note**
- This is optional for MVP, but it’s the correct “professional app” approach instead of embedding huge arrays.

---

### 5) Consistency & caching (how to prevent flicker)

If you use Redis / CDN / query caches:
- On toggle:
  - update DB (likes row + content likeCount)
  - then **invalidate or update** cached metadata for that contentId immediately
- Metadata endpoints must not return stale values after toggle.

**Recommended approach**
- Use atomic update and return the updated count from the DB write (transaction or findOneAndUpdate returning new doc).
- If caching, write-through cache: set cache to the new values right after DB update.

---

### 6) Real-time (optional but ideal)

If using Socket.IO:
- Emit a public event with counts only:
  - `content:likeCountUpdated` → `{ contentId, contentType, likeCount }`
- Do NOT broadcast user-specific `hasLiked` to other users.

Frontend can update counts in visible feeds, but the heart state for the current user still comes from `hasLiked`.

---

### 7) Backend checklist (must pass)

- [ ] Unique constraint `(userId, contentId, contentType)`
- [ ] Atomic `$inc` updates for `likeCount`
- [ ] Toggle endpoint returns correct `{ liked, likeCount }`
- [ ] Metadata returns consistent `{ likeCount, hasLiked }`
- [ ] Batch metadata returns consistent `{ likeCount, hasLiked }`
- [ ] Cache invalidation/update on toggle

---

### 8) Quick manual tests

1) **Like**
- User A toggles like on content X.
- Toggle response: `liked=true`, `likeCount=N+1`
- Immediately call metadata: must return `hasLiked=true`, `likeCount>=N+1`

2) **Unlike**
- Same user toggles again.
- Toggle response: `liked=false`, `likeCount=N`
- Metadata: `hasLiked=false`, `likeCount==N`

3) **Reload**
- User likes, kills app, reopens feed.
- Batch metadata must return `hasLiked=true` for that user.


