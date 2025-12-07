## Comment System Specification (Facebook / Instagram Style)

This document describes how the **global commenting system** in Jevah works today on the frontend, and the **exact backend contract** it expects. The goal is to behave like Facebook / Instagram comments: fast, optimistic, real‑time, with replies and likes.

---

## 1. High‑Level Overview

- **Global, reusable comment surface**: a single modal (`CommentModalV2`) that any content card (video, audio, devotional, etc.) can open.
- **Global context & state**: `CommentModalContext` manages:
  - Which content is being commented on (`contentId`, `contentType`).
  - Comment list, likes, replies, pagination, and visibility.
  - Optimistic updates and real‑time refresh via Socket.io.
- **Backend contract**:
  - `POST /api/comments` – create comment or reply.
  - `GET /api/content/:contentType/:contentId/comments` – fetch comments.
  - `POST /api/comments/:commentId/like` – toggle like.
  - `DELETE /api/comments/:commentId` – delete comment (optional but recommended).

If backend follows this spec, the existing UI will behave like a modern social comment system without further frontend changes.

---

## 2. Frontend Architecture

### 2.1. Main pieces

- **`app/context/CommentModalContext.tsx`**
  - Context provider that exposes:
    - `showCommentModal`, `hideCommentModal`
    - `comments`, `submitComment`, `replyToComment`, `likeComment`
    - `loadMoreComments`
  - Handles:
    - Fetching from backend (`contentInteractionAPI.getComments`).
    - Posting comments / replies (`contentInteractionAPI.addComment`).
    - Toggling likes (`contentInteractionAPI.toggleCommentLike`).
    - Optimistic UI and merging with server results.
    - Joining/leaving real‑time rooms via `SocketManager`.

- **`app/components/CommentModalV2.tsx`**
  - The actual **UI sheet** (Instagram‑style bottom sheet).
  - Shows scrollable list of comments + nested replies.
  - Has an input bar anchored to the bottom; supports “replying to X” with @mention prefill.

- **Triggers (cards, media lists, etc.)**
  - Any card can open the comment modal via:
    - `const { showCommentModal } = useCommentModal();`
    - `showCommentModal(initialComments, contentId, contentType, contentOwnerName);`

### 2.2. Comment shape in the modal

The context and modal use this normalized shape:

```ts
type Comment = {
  id: string;
  userName: string;
  avatar: string;
  timestamp: string;         // ISO string
  comment: string;           // text body
  likes: number;
  isLiked: boolean;
  replies?: Comment[];       // one level of nested replies
  parentId?: string;         // if this is a reply
};
```

Replies are currently **one level deep** visually (comment + its direct replies). This is enough to mimic Instagram’s common pattern.

---

## 3. Frontend Behaviour (What the UX Feels Like)

### 3.1. Opening the modal

- Any content card calls `showCommentModal` with:
  - `contentId` (backend id of the content).
  - `contentType` (e.g. `"media"` or `"devotional"`).
  - Optional initial comments.
- The context:
  - Sets modal **visible immediately** (no blocking awaits).
  - Kicks off:
    - `loadCommentsFromServer(contentId, contentType, 1, sortBy="newest", replace=true)`.
    - `joinRealtimeRoom(contentId, contentType)` to get live updates.

### 3.2. Loading comments

- Implemented in `loadCommentsFromServer` using `contentInteractionAPI.getComments`.
- Behaviour:
  - If user has **no auth token**, it logs a warning and sets comments to empty (read‑only UI).
  - Otherwise:
    - Calls `GET /api/content/:contentType/:contentId/comments?page=&limit=`.
    - Maps server comments to the `Comment` shape.
    - Merges new results with existing ones by `id` to preserve optimistic entries at the top.
  - Tracks `page` and `hasMore` for infinite scroll via `loadMoreComments`.

### 3.3. Adding a top‑level comment (Facebook / Instagram style)

From the modal (`CommentModalV2`), when user hits send:

- **Preconditions**:
  - User must be authenticated (token in AsyncStorage).
  - `currentContentId` must be set.

- **Flow** (Facebook‑style optimistic UX):
  1. Build an optimistic comment:
     - `id = "temp-" + Date.now()`
     - `userName` from current user refs.
     - `timestamp = now`
     - `likes = 0`, `isLiked = false`, `replies = []`.
  2. Insert this optimistic comment at the **top** of `comments` array.
  3. Optimistically **bump comment count** in global stats via `useInteractionStore.mutateStats`.
  4. Call:
     - `contentInteractionAPI.addComment(currentContentId, text.trim(), currentContentType)`
     - which issues `POST /api/comments` (see backend spec below).
  5. After success, refresh from server:
     - `loadCommentsFromServer(contentId, contentType, 1, sortBy, replace=false)`
     - This merges server comments with existing ones so the optimistic item doesn’t “flicker”.
  6. If API call fails:
     - Remove any comment with id starting with `temp-`.

This is intentionally designed to feel like Instagram: the comment appears immediately, then quietly syncs with the server.

### 3.4. Replying to a comment

When user taps **REPLY**:

- UI:
  - Sets `replyingTo = { id: commentId, name: userName }`.
  - Prefills input with `@username ` and focuses the input.
- On send:
  - Same auth checks as top‑level comment.
  - Adds an **optimistic reply** with:
    - `parentId = commentId`
    - Pushed into that comment’s `replies` array.
  - Calls:
    - `contentInteractionAPI.addComment(currentContentId, replyText, currentContentType, parentCommentId = commentId)`
  - Error handling:
    - On failure, remove any reply with `id` starting with `temp-` from that comment’s `replies`.

### 3.5. Liking / unliking a comment

When the heart icon is pressed:

- Context immediately:
  - Flips `isLiked` locally.
  - Adjusts `likes` by `+1` or `-1`.
- It then calls:
  - `contentInteractionAPI.toggleCommentLike(commentId)`
  - which issues `POST /api/comments/:commentId/like`.
- If backend fails:
  - The context **reverts** the local `isLiked` and `likes` back to their previous values.

### 3.6. Real‑time updates

When the modal opens:

- `joinRealtimeRoom(contentId, contentType)` via `SocketManager`:
  - Connects to backend Socket.io server.
  - Joins a **content room** for that specific content id/type.
- When backend emits a new comment event for that content:
  - Listener `onContentComment` is invoked.
  - Client calls `loadCommentsFromServer(contentId, contentType, 1, sortBy, replace=true)`.
  - Also calls `useInteractionStore.refreshContentStats(contentId)` to keep badges in sync.

This keeps multiple users’ views synchronized in near real‑time.

---

## 4. Backend Data Model

### 4.1. Comment entity

**Recommended fields (Mongo‑style, but can be mapped to SQL):**

```ts
Comment {
  _id: ObjectId;
  contentId: ObjectId;                 // ID of the content being commented on
  contentType: string;                 // e.g. "video", "audio", "devotional", "post"
  userId: ObjectId;                    // author id
  content: string;                     // comment text
  parentCommentId?: ObjectId | null;   // null for top-level comments, set for replies
  likesCount: number;                  // total likes
  repliesCount: number;                // optional, for "View 10 more replies"
  createdAt: Date;
  updatedAt: Date;
}
```

**Optional denormalized user data** (for speed, but not required if you can join/populate quickly):

- `username`
- `userAvatar`
- `userFirstName`, `userLastName`

### 4.2. Indices

- **By content** (for listing comments on a post):
  - `({ contentId: 1, contentType: 1, createdAt: -1 })`
- **By parent comment** (for replies):
  - `({ parentCommentId: 1, createdAt: 1 })`
- **For “top” comments**:
  - `({ contentId: 1, contentType: 1, likesCount: -1 })`
- **Optional for analytics**:
  - `({ userId: 1, createdAt: -1 })`

### 4.3. Comment likes

To support toggling like/unlike, use a separate table/collection:

```ts
CommentLike {
  _id: ObjectId;
  commentId: ObjectId;
  userId: ObjectId;
  createdAt: Date;
}
```

- Ensure a **unique index** on `(commentId, userId)` so one user can only like once.
- `likesCount` on `Comment` should be kept in sync by increment/decrement operations.

---

## 5. Backend API Contract

All endpoints assume Bearer token auth consistent with the rest of Jevah’s APIs.

### 5.1. Create comment or reply

- **Method**: `POST`
- **URL**: `/api/comments`

**Request body:**

```json
{
  "contentId": "64f8...abc",
  "contentType": "media",
  "content": "This blessed me so much 🙏",
  "parentCommentId": "64f9...def"
}
```

- `parentCommentId` is optional:
  - Omit / null → top‑level comment.
  - Present → reply to that comment.

**Response (what the frontend already expects via `contentInteractionAPI.addComment`):**

```json
{
  "success": true,
  "message": "Comment created",
  "data": {
    "id": "64fa...123",
    "_id": "64fa...123",
    "contentId": "64f8...abc",
    "contentType": "media",
    "content": "This blessed me so much 🙏",
    "user": {
      "id": "user123",
      "_id": "user123",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://.../avatar.jpg",
      "username": "john_doe"
    },
    "likesCount": 0,
    "createdAt": "2025-12-01T12:34:56.000Z",
    "parentCommentId": null
  }
}
```

- Notes:
  - Frontend reads `data.id` or `data._id`.
  - Frontend expects `data.user` for name and avatar.
  - Frontend expects `data.content` as the text.
  - Frontend expects `data.createdAt` for timestamps.
  - Frontend expects `data.likesCount` (or a compatible field) for likes.

### 5.2. Get comments for content

- **Method**: `GET`
- **URL**: `/api/content/:contentType/:contentId/comments?page=:page&limit=:limit`

Example:  
`GET /api/content/media/64f8...abc/comments?page=1&limit=20`

**Query options (recommended):**

- `page` – 1‑based page number.
- `limit` – page size (e.g. 20).
- Optional `sortBy`: `"newest" | "oldest" | "top"`.
- Optional `sortOrder`: `"asc" | "desc"`.

**Response (mapped by `contentInteractionAPI.getComments`):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "64fa...123",
        "content": "This blessed me so much 🙏",
        "userId": "user123",
        "user": {
          "firstName": "John",
          "lastName": "Doe",
          "avatar": "https://.../avatar.jpg",
          "username": "john_doe"
        },
        "likesCount": 5,
        "createdAt": "2025-12-01T12:34:56.000Z",
        "parentCommentId": null,
        "replies": [
          {
            "_id": "64fb...456",
            "content": "Amen 🙌",
            "userId": "user999",
            "user": {
              "firstName": "Mary",
              "lastName": "Smith",
              "avatar": "https://.../mary.jpg"
            },
            "likesCount": 2,
            "createdAt": "2025-12-01T12:40:00.000Z",
            "parentCommentId": "64fa...123"
          }
        ]
      }
    ],
    "total": 37,
    "hasMore": true
  }
}
```

- The frontend transformation logic is tolerant of slightly different payloads, but **at minimum** needs:
  - Comment id: `_id` or `id`.
  - `content` (text).
  - `userId` or `user._id`.
  - User name: can be `user.firstName` + `user.lastName`, or `username`, or fallback.
  - `user.avatar` (or `avatar`).
  - `likesCount` (or compatible).
  - `createdAt`.

### 5.3. Toggle like on a comment

- **Method**: `POST`
- **URL**: `/api/comments/:commentId/like`

**Behaviour:**

- If the requesting user **has not liked** this comment:
  - Create a `CommentLike` entry.
  - Increment `likesCount` on that comment.
  - Return `{ liked: true, likesCount: <newCount> }`.
- If the user **has already liked**:
  - Delete the `CommentLike` row.
  - Decrement `likesCount`.
  - Return `{ liked: false, likesCount: <newCount> }`.

**Response (used by `contentInteractionAPI.toggleCommentLike`):**

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likesCount": 6
  }
}
```

### 5.4. Delete a comment

- **Method**: `DELETE`
- **URL**: `/api/comments/:commentId`
- **Auth**:
  - Owner of the comment, or
  - Admin / moderator.

**Behaviour:**

- Delete or soft‑delete the comment.
- Optionally delete or soft‑delete replies (or re‑attach them, depending on policy).
- Decrement `commentsCount` on the related content if you track it separately.

**Response:**

```json
{
  "success": true,
  "message": "Comment deleted"
}
```

---

## 6. Realtime Integration (Socket.io)

The frontend uses `SocketManager` and `joinContentRoom(contentId, contentType)` when opening the modal. Backend should:

- Create a **room per content**:
  - E.g. room key `"content:<contentType>:<contentId>"`.
- When `POST /api/comments` succeeds:
  - Emit to that room:

```js
io.to(roomKey).emit("content:comment", {
  contentId: "<contentId>",
  contentType: "<contentType>",
  commentId: "<newCommentId>",
  action: "created"
});
```

- The frontend handler will:
  - Check if `data.contentId` matches the current `currentContentId`.
  - If so, call `loadCommentsFromServer(..., page=1, replace=true)` and refresh stats.

You can later add more actions (e.g. `"deleted"`, `"updated"`) and branch in the client.

---

## 7. Edge Cases & UX Notes

- **Unauthenticated users**:
  - Can open the comment modal and **view** comments.
  - Input shows “Sign in to comment” and is disabled.
  - `submitComment` / `replyToComment` early‑return if there is no token.
  - Backend should still serve comments to unauthenticated users.

- **Error handling**:
  - On create error:
    - Frontend removes any `temp-*` optimistic entries.
  - On like error:
    - Frontend reverts `isLiked` / `likes` values.
  - On network error while loading:
    - Frontend logs and shows empty state (does not crash).

- **Pagination**:
  - Backend must return:
    - `comments`: array
    - `total` (or `totalCount`)
    - `hasMore` (or enough data to compute `hasMore`)
  - Frontend computes `hasMore` using `page * limit < total` if necessary.

---

## 8. Backend Implementation Checklist

- **Data model**:
  - [ ] Implement `Comment` and `CommentLike` entities with indices as described.
- **Endpoints**:
  - [ ] `POST /api/comments` that matches the request/response spec.
  - [ ] `GET /api/content/:contentType/:contentId/comments` with pagination + basic sorts.
  - [ ] `POST /api/comments/:commentId/like` as a toggle.
  - [ ] `DELETE /api/comments/:commentId` for owner/admin.
- **Realtime**:
  - [ ] Socket.io (or equivalent) event `content:comment` emitted to the appropriate content room on new comments (and optionally deletes/updates).
- **Auth**:
  - [ ] Same Bearer token parsing as other Jevah endpoints.
  - [ ] Enforce that only logged‑in users can create/like/delete comments.

Once these are in place, the existing Jevah frontend will behave like a modern, high‑quality commenting system similar to Facebook / Instagram without additional UI changes.





