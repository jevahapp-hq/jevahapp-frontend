## Like State Persistence – Backend Fix Spec

### 1. Problem Summary

- On the mobile app, when a user taps the **like** icon:
  - The icon briefly turns red (optimistic UI), then
  - After a short delay (or immediately after network calls), the icon flips back to the unliked state.
- This means the **backend is not returning a `liked: true` state or an updated `likeCount` after the toggle**, or subsequent metadata calls are overwriting it.
- The frontend is already doing the correct optimistic update and then trusting the backend as the source of truth. The fix needs to happen in the backend.

**Goal:**
- Ensure that once a user likes content, the backend stores that state and always returns consistent data so that the like stays red and the count is correct on all screens.

---

### 2. Current Frontend Behavior (What We Already Do)

#### 2.1 Toggle like flow

When a user taps like on any media item (video, audio, ebook, etc.):

1. **Optimistic update in the store**

   ```ts
   // app/store/useInteractionStore.tsx (simplified)
   toggleLike: async (contentId, contentType) => {
     // 1) Optimistically flip liked + adjust count
     set((state) => {
       const s = state.contentStats[contentId] || defaultStats;
       const liked = !s.userInteractions.liked;
       const likes = Math.max(0, (s.likes || 0) + (liked ? 1 : -1));
       return { ...state, contentStats: { ...state.contentStats, [contentId]: { ...s, likes, userInteractions: { ...s.userInteractions, liked } } } };
     });

     // 2) Call backend
     const result = await contentInteractionAPI.toggleLike(contentId, contentType);

     // 3) Reconcile store with backend response
     set((state) => {
       const s = state.contentStats[contentId];
       if (!s) return state;
       return {
         ...state,
         contentStats: {
           ...state.contentStats,
           [contentId]: {
             ...s,
             likes: result.totalLikes,
             userInteractions: { ...s.userInteractions, liked: result.liked },
           },
         },
       };
     });
   }
   ```

2. **API call used**

   ```ts
   // app/utils/contentInteractionAPI.ts
   async toggleLike(contentId: string, contentType: string): Promise<{ liked: boolean; totalLikes: number }> {
     const backendContentType = mapContentTypeToBackend(contentType); // e.g. "video" -> "media"
     const response = await fetch(`${baseURL}/api/content/${backendContentType}/${contentId}/like`, {
       method: "POST",
       headers: await getAuthHeaders(),
     });

     const result = await response.json();
     const liked = result.data?.liked ?? false;
     const totalLikes = result.data?.likeCount ?? 0;
     return { liked, totalLikes };
   }
   ```

3. **UI reads from the store**

   ```ts
   // Example: src/features/media/components/VideoCard.tsx / EbookCard / MusicCard
   const likedFromStore = useUserInteraction(contentId, "liked");
   const likesFromStore = useContentCount(contentId, "likes");
   // The icon color is driven by likedFromStore, and the number by likesFromStore
   ```

If the backend sends back `liked: false` or an unchanged/incorrect `likeCount`, the UI **reverts** to that state, which is exactly the issue we are seeing.

---

### 3. Endpoints the Frontend Uses

#### 3.1 Toggle Like

```http
POST /api/content/{backendContentType}/{contentId}/like
```

- `backendContentType` is mapped by the frontend:

  ```ts
  // app/utils/contentInteractionAPI.ts
  const typeMap: Record<string, string> = {
    video: "media",
    videos: "media",
    audio: "media",
    music: "media",
    sermon: "devotional",
    ebook: "ebook",
    "e-books": "ebook",
    books: "ebook",
    image: "ebook", // PDFs treated as ebooks
    live: "media",
    podcast: "podcast",
    merch: "merch",
    artist: "artist",
  };
  ```

- `contentId` is the Mongo `_id` string (24-hex) for real content.

**Headers:**

```http
Authorization: Bearer <JWT>
Content-Type: application/json
expo-platform: ios | android
```

---

#### 3.2 Single Content Metadata

```http
GET /api/content/{backendContentType}/{contentId}/metadata
```

This is used to hydrate the initial state (likes, saves, views, comments, and user-specific flags like `hasLiked`).

---

#### 3.3 Batch Metadata

```http
POST /api/content/batch-metadata

{
  "contentIds": ["<id1>", "<id2>", ...],
  "contentType": "media" | "ebook" | "devotional" | ...
}
```

This is used to preload stats for lists.

---

### 4. Required Backend Contract

#### 4.1 Toggle Like Endpoint – Required Behavior

**Endpoint:**

```http
POST /api/content/{backendContentType}/{contentId}/like
```

**Required server-side logic (pseudocode):**

```ts
// Input: authenticated userId, backendContentType, contentId

const content = await Content.findById(contentId);
if (!content) return 404;

// likes collection/table keyed by (userId, contentId)
const existing = await Likes.findOne({ userId, contentId });

let liked: boolean;
if (!existing) {
  // first time like
  await Likes.create({ userId, contentId, createdAt: now });
  await Content.updateOne({ _id: contentId }, { $inc: { likeCount: 1 } });
  liked = true;
} else {
  // unlike (toggle off)
  await Likes.deleteOne({ _id: existing._id });
  await Content.updateOne({ _id: contentId }, { $inc: { likeCount: -1 } });
  liked = false;
}

// read the new total count from DB (or track via atomic update + projection)
const updated = await Content.findById(contentId).select("likeCount");
const likeCount = updated?.likeCount || 0;

return {
  success: true,
  message: "Like toggled",
  data: {
    contentId,
    liked,       // <-- final state for THIS user
    likeCount,   // <-- total like count AFTER the toggle
  },
};
```

**Required 200 OK response shape:**

```json
{
  "success": true,
  "message": "Like toggled",
  "data": {
    "contentId": "<id>",
    "liked": true,
    "likeCount": 42
  }
}
```

On unlike:

```json
{
  "success": true,
  "message": "Like removed",
  "data": {
    "contentId": "<id>",
    "liked": false,
    "likeCount": 41
  }
}
```

**Key rule:**
- `data.liked` must **always** reflect the new state for the current user.
- `data.likeCount` must be the **updated total** after the toggle.

If this is not true, the frontend will override its optimistic UI and revert to whatever you send.

---

#### 4.2 Single Metadata Endpoint – Required Behavior

**Endpoint:**

```http
GET /api/content/{backendContentType}/{contentId}/metadata
```

**Required 200 OK response:**

```json
{
  "success": true,
  "data": {
    "contentId": "<id>",
    "likeCount": 42,
    "bookmarkCount": 10,
    "shareCount": 3,
    "viewCount": 123,
    "commentCount": 5,

    "hasLiked": true,
    "hasBookmarked": false,
    "hasShared": false,
    "hasViewed": true
  }
}
```

**Important consistency requirements:**

- After `POST /like` returns `liked: true, likeCount: 42`, the **next** metadata response must return:
  - `hasLiked: true`
  - `likeCount >= 42` (never lower immediately after a like)
- `hasLiked` must be computed from the **same user-like storage** (e.g. `Likes` table/collection) used by the toggle endpoint.

The frontend merges like this:

```ts
// useInteractionStore.loadContentStats
const merged: ContentStats = {
  contentId,
  likes: Math.max(existing?.likes ?? 0, stats.likes ?? 0),
  saves: Math.max(existing?.saves ?? 0, stats.saves ?? 0),
  ...,
  userInteractions: {
    liked: existingLiked || statsLiked,
    saved: existingSaved || statsSaved,
    shared: existingShared || statsShared,
    viewed: existingViewed || statsViewed,
  },
};
```

So if metadata comes back with `hasLiked = false` or a **lower** `likeCount`, it will fight against the local state and can flip the UI back.

---

#### 4.3 Batch Metadata Endpoint – Required Behavior

**Endpoint:**

```http
POST /api/content/batch-metadata
```

**Required 200 OK response shape:**

```json
{
  "success": true,
  "data": [
    {
      "id": "<id1>",
      "likeCount": 42,
      "bookmarkCount": 3,
      "shareCount": 1,
      "viewCount": 100,
      "commentCount": 5,
      "hasLiked": true,
      "hasBookmarked": false,
      "hasShared": false,
      "hasViewed": true
    },
    {
      "id": "<id2>",
      "likeCount": 7,
      "bookmarkCount": 0,
      "shareCount": 0,
      "viewCount": 20,
      "commentCount": 0,
      "hasLiked": false,
      "hasBookmarked": false,
      "hasShared": false,
      "hasViewed": false
    }
  ]
}
```

Same consistency rules as single metadata apply.

---

### 5. Things for Backend to Double‑Check

1. **Per-user storage**
   - Verify there is a per-user likes table/collection keyed by `(userId, contentId)`.
   - Ensure toggle writes/ deletes to that table, not just incrementing a global count.

2. **Atomic updates / race conditions**
   - If using a counter field (`content.likeCount`), use atomic operations like `$inc` to avoid race conditions.
   - Always return the **post-update** value in `likeCount`.

3. **Cache / replication**
   - If using Redis or other caches, make sure they are invalidated or updated immediately after a toggle so metadata endpoints don’t return stale data.

4. **Response mapping**
   - Confirm the JSON keys match what the frontend reads:
     - `data.liked`
     - `data.likeCount`
     - `data.hasLiked` (in metadata)
     - `data.likeCount` (in metadata / batch-metadata)

5. **ID mapping**
   - Confirm the `contentId` we send is the same as the ID you use to:
     - Find content in DB.
     - Store likes.
     - Return stats.

---

### 6. Quick Test Scenarios

To verify the fix, you can run these manual tests:

1. **Single like**
   - User A likes content X once.
   - Expected:
     - `POST /like` returns `{ liked: true, likeCount: N+1 }`.
     - Subsequent `GET /metadata` returns `{ hasLiked: true, likeCount >= N+1 }`.
     - App icon stays red.

2. **Unlike**
   - Same user A unlikes content X.
   - Expected:
     - `POST /like` returns `{ liked: false, likeCount: N }`.
     - `GET /metadata` returns `{ hasLiked: false, likeCount == N }`.

3. **Cross-device / reload**
   - User A likes content X on device 1.
   - Open content X on device 2 or after full app reload.
   - Expected: `GET /metadata` (or batch-metadata) returns `hasLiked: true` and the correct `likeCount`, so the icon is red from the start.

If the backend follows this spec, the frontend will:
- Keep the like icon red after a successful like.
- Show accurate like counts.
- Stay consistent across screens and sessions.