# TikTok-Standard Comments Backend Spec (Fixes slow/missing comments + count mismatch)

This document defines the **backend contract** required for a **TikTok-like comments experience** in Jevah:

- Comments **open instantly** (cached first, then refreshed).
- Comments **always show** for every reel/content (no “Reels comments don’t show at all”).
- The comment **badge count never disagrees** with the number of comments the user sees.
- Pagination and sorting behave like a professional social app.

This spec is written to match the **current frontend behavior** in:
- `app/context/CommentModalContext.tsx`
- `app/utils/contentInteractionAPI.ts`
- `app/store/useInteractionStore.tsx`
- `app/reels/Reelsviewscroll.tsx`

---

## 0) Current problems (what users see) + root causes

### A) “Reels comments don’t show at all”
**Observed:** `Reelsviewscroll.tsx` opens the global comment modal with a **synthetic key** like:

`reel-${title}-${speaker}`

**Frontend API client behavior:** `contentInteractionAPI.getComments()` and `addComment()` **refuse to call the server** unless `contentId` is a valid 24-char ObjectId.

**Result:** For reels, backend is never reached → modal shows empty.

✅ **Backend requirement:** Every reel/content item must have a stable canonical `contentId` (ObjectId) exposed in feed/reels payloads; OR backend must support a compatible **alias identifier** (see §1.3).

### B) “Comments take a while to display”
The modal opens immediately, but if:
- there’s no cache hit, and
- the server is slow, or
- the endpoint returns a shape the mapper can’t read,
then the list remains empty until a successful response arrives.

✅ **Backend requirement:** Fast “page 1” responses + caching headers (ETag / 304) + predictable response shape (see §4, §6).

### C) “Badge says 3 comments, I open and only see 2”
This typically happens when:
- `commentCount` (badge) includes **replies** but the list only loads **top-level** comments, or
- `totalComments` returned from API is inconsistent with the items returned, or
- soft-deleted/hidden comments are included in counts but not returned in list, or
- the list endpoint is paginated but the initial page size is smaller than the count, with no clear “hasMore”.

✅ **Backend requirement:** Define **exact count semantics** and keep them consistent across:
- metadata (`commentCount`)
- comments list response (`totalComments`, `hasMore`)
- real-time events and write operations (create/delete).

---

## 1) Canonical identifiers (critical for Reels)

### 1.1 Canonical content id
All content that supports comments MUST expose a canonical, stable identifier:

- **`contentId`**: a 24-char hex Mongo ObjectId (or backend-equivalent string that matches `/^[a-f\\d]{24}$/i`).

This is required because the frontend’s comments API client validates IDs strictly.

### 1.2 Feed/reels payload requirement
Wherever the frontend gets “reels” items (feed, all-media, reels list), each item MUST include:

- `id` or `_id` (ObjectId string)
- `contentType` (mapped to backend type; see §2.2)
- `commentCount` (optional but strongly recommended; see §5)

### 1.3 Backwards-compatible alias id (optional but recommended)
To make the system robust even if some clients still send synthetic ids (like `reel-title-speaker`), backend MAY support:

- `contentKey`: string “external id” (not ObjectId)

If you implement this:
- Accept either `contentId` (ObjectId) or `contentKey` (string) in requests.
- Store comments keyed by `(contentType, contentId)` when possible.
- If only `contentKey` exists, store by `(contentType, contentKey)` and allow later migration if a real ObjectId becomes available.

**Important:** This is a safety net. The preferred fix is to ensure the client sends the true `contentId`.

---

## 2) Product behavior (TikTok-like)

### 2.1 Ordering + pagination
TikTok-style comment UX typically:
- loads newest comments first,
- supports sorting (“Top”, “Newest”),
- paginates efficiently,
- can show replies nested under top-level items.

Frontend currently supports:
- `sortBy=newest|oldest|top`
- `page` + `limit`

Backend MUST support these query params (see §4.2).

### 2.2 Content type mapping
Frontend maps multiple UI types into backend “content types”.
The comment endpoints are called as:

`/api/content/:contentType/:contentId/comments`

Where `:contentType` is typically one of:
- `media` (videos, audio/music, reels)
- `devotional` (sermons)
- `ebook`

Backend MUST accept these values and interpret them consistently.

---

## 3) The “professional app” comments array shape

### 3.1 What the UI expects
The global modal normalizes server comments into this shape:

```ts
type Comment = {
  id: string;
  userName: string;
  avatar: string;
  timestamp: string;   // ISO string
  comment: string;     // body text
  likes: number;
  isLiked: boolean;
  replies?: Comment[]; // one-level nesting
  parentId?: string;
  userId?: string;
}
```

### 3.2 Backend MUST return stable ids and fields
To avoid UI breaks, each returned comment object MUST have:
- **id**: `_id` (and ideally `id` as alias)
- **text**: `content` (and ideally `comment` as alias)
- **timestamp**: `createdAt` (ISO)
- **likes**: `likesCount` (and ideally `reactionsCount` as alias)
- **user identity**: either a populated `user` object OR `author` object containing name + avatar
- **isLiked**: boolean (if authenticated); otherwise `false`

### 3.3 Replies representation
Backend may include replies in-line under each top-level comment:

- `replies: Comment[]` (direct replies only)

This matches the existing UI which renders one nesting level.

If backend prefers separate reply pagination, you can still return:
- `replies: []`
- `repliesCount`
and later add a “load replies” endpoint (not required to fix today’s issues).

---

## 4) Required endpoints

### 4.1 Create comment (or reply)
**POST** `/api/comments`

Request body:
```json
{
  "contentId": "64f8...abc",
  "contentType": "media",
  "content": "Amazing 🙏",
  "parentCommentId": "64f9...def"
}
```

Rules:
- `parentCommentId` optional:
  - omitted/null → top-level
  - present → reply to that comment
- Must be authenticated.

Response (canonical):
```json
{
  "success": true,
  "data": {
    "id": "64fa...123",
    "_id": "64fa...123",
    "contentId": "64f8...abc",
    "contentType": "media",
    "content": "Amazing 🙏",
    "comment": "Amazing 🙏",
    "createdAt": "2025-12-24T12:34:56.000Z",
    "likesCount": 0,
    "reactionsCount": 0,
    "parentCommentId": null,
    "user": {
      "id": "user123",
      "_id": "user123",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://.../avatar.jpg",
      "username": "john_doe"
    }
  }
}
```

### 4.2 Fetch comments for content (page + sort)
**GET** `/api/content/:contentType/:contentId/comments?page=1&limit=10&sortBy=newest`

Query params:
- `page` (1-based)
- `limit`
- `sortBy` ∈ `newest | oldest | top`

Auth:
- MUST work **without auth** (read-only viewing).
- If authenticated, include `isLiked` per comment for that user.

Response (canonical):
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "64fa...123",
        "id": "64fa...123",
        "content": "Amazing 🙏",
        "comment": "Amazing 🙏",
        "createdAt": "2025-12-24T12:34:56.000Z",
        "timestamp": "2025-12-24T12:34:56.000Z",
        "likesCount": 5,
        "reactionsCount": 5,
        "isLiked": false,
        "userId": "user123",
        "user": {
          "firstName": "John",
          "lastName": "Doe",
          "avatar": "https://.../avatar.jpg",
          "username": "john_doe"
        },
        "replies": [
          {
            "_id": "64fb...999",
            "content": "Amen",
            "createdAt": "2025-12-24T12:40:00.000Z",
            "likesCount": 0,
            "isLiked": false,
            "parentCommentId": "64fa...123",
            "user": { "firstName": "Mary", "lastName": "Smith", "avatar": "" }
          }
        ]
      }
    ],
    "total": 37,
    "totalComments": 37,
    "hasMore": true,
    "page": 1,
    "limit": 10
  }
}
```

**Important:** the frontend currently reads totals from `data.total` OR `data.totalCount`.
Return `total` (or `totalCount`) every time.

### 4.3 Toggle like on a comment
**POST** `/api/comments/:commentId/like`

Auth required.

Response:
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likesCount": 6,
    "reactionsCount": 6
  }
}
```

---

## 5) Count semantics (so the badge never lies)

### 5.1 Define ONE source of truth: `commentCount`
Backend MUST define:

- **`commentCount`** = total number of **visible comment items** for the content, including replies
  - \(commentCount = topLevelCount + replyCount\)

This aligns with common social apps where the count is “conversation size”, not just threads.

### 5.2 List endpoint totals MUST match badge semantics
The list endpoint MUST return a total that matches `commentCount`.

In other words:
- `data.total` (or `data.totalCount`) MUST equal `commentCount`.

If you only paginate **top-level** comments, you still must compute the total across top-level + replies, and return it.

### 5.3 If moderation/soft-delete exists
Counts MUST reflect only items that will be returned to the viewer.

If you hide/remove comments:
- decrement counts (or compute counts from filtered query),
- do NOT include deleted/hidden items in `total` if they won’t be shown.

---

## 6) Performance + caching (for instant feeling)

### 6.1 Fast first page
Target p95 server time for:
- `GET /comments?page=1&limit=10` ≤ 150–250ms

Recommended indexes:
- `(contentType, contentId, createdAt DESC)`
- `(contentType, contentId, likesCount DESC)` for `sortBy=top`
- `(parentCommentId, createdAt ASC)` for replies

### 6.2 HTTP caching for page 1 (ETag)
For unauthenticated GET responses (or responses that don’t vary per-user):
- include `ETag`
- support `If-None-Match` → return `304 Not Modified`

Headers suggestion:
- `Cache-Control: public, max-age=15, stale-while-revalidate=60`

For authenticated responses that include `isLiked`:
- `Cache-Control: private, max-age=10, stale-while-revalidate=30`
- `Vary: Authorization`

### 6.3 Socket event to keep UI in sync
On successful create/delete/like (optional for like), emit an event to the content room:

Event name (recommended): `content:comment`
Payload:
```json
{
  "contentType": "media",
  "contentId": "64f8...abc",
  "action": "created",
  "commentId": "64fa...123",
  "commentCount": 38
}
```

Frontend behavior: it refreshes page 1 and also refreshes stats.

---

## 7) Metadata endpoint requirements (badge count source)

The app uses metadata/batch-metadata to show counts on cards.
Backend must ensure comment counts are available and consistent.

### 7.1 Single content metadata
**GET** `/api/content/:contentType/:contentId/metadata`

Must return:
- `commentCount` (per §5)
- optionally also `topLevelCommentCount`, `replyCount`

### 7.2 Batch metadata (highly recommended)
**POST** `/api/content/batch-metadata`

Request:
```json
{ "contentType": "media", "contentIds": ["64f8...abc","64f8...def"] }
```

Response: array of:
- `id`
- `commentCount`
- other counts (likes/bookmarks/views/shares) if available

This prevents N+1 calls and improves feed performance.

---

## 8) Validation + error handling (don’t break UI)

### 8.1 Always return stable shapes
Even on empty:
```json
{ "success": true, "data": { "comments": [], "total": 0, "hasMore": false, "page": 1, "limit": 10 } }
```

### 8.2 Avoid returning different field names per endpoint
Use canonical fields everywhere, plus aliases for backwards compatibility:
- `content` + `comment`
- `likesCount` + `reactionsCount`
- `_id` + `id`

### 8.3 Auth rules
- `GET comments`: public (read-only)
- `POST comment`, `POST like`, `DELETE`: authenticated

Return:
- `401` for missing token on write endpoints
- `403` for permission issues (e.g., delete not owner)
- `404` only when content truly not found

---

## 9) Implementation checklist (backend)

- **Identifiers**
  - [ ] Ensure every “reel” item returned to the app includes a real ObjectId `id/_id`.
  - [ ] (Optional) Support `contentKey` alias for older clients.

- **Endpoints**
  - [ ] `POST /api/comments` (create comment + reply)
  - [ ] `GET /api/content/:type/:id/comments` (page/sort, returns `total`, `hasMore`)
  - [ ] `POST /api/comments/:commentId/like` (toggle)

- **Counts**
  - [ ] Define `commentCount` = top-level + replies (visible)
  - [ ] Ensure list endpoint `total` equals `commentCount`
  - [ ] Ensure metadata `commentCount` equals list `total`

- **Performance**
  - [ ] Index for newest/top
  - [ ] ETag + 304 support
  - [ ] Batch metadata endpoint

- **Realtime**
  - [ ] Emit `content:comment` events with updated `commentCount`

---

## 10) Notes for the backend team (why this fixes the reported issues)

- **Reels comments not showing** is solved by guaranteeing a real `contentId` for reels, because the frontend refuses non-ObjectId ids for comments.
- **Slow display** is improved by fast page-1 responses + ETag/304, enabling the frontend’s cache-first strategy to feel instant.
- **Count mismatch** is solved by enforcing a single semantic (`commentCount`) and using it consistently in both metadata and list totals.



