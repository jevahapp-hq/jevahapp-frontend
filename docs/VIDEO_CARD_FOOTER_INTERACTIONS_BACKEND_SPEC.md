# Video Card Footer Interactions - Backend Implementation Guide

## Overview

This document describes how the **footer section interactions** work in video cards (and other media content cards) and what the backend needs to implement to support them. The footer includes: **Views**, **Likes**, **Comments**, **Library/Save**, and **Share** functionality.

**Last Updated**: 2024-12-19  
**Status**: ✅ Frontend Implementation Complete - Backend Integration Guide

---

## Table of Contents

1. [Footer Components Overview](#footer-components-overview)
2. [Views Display](#views-display)
3. [Like Functionality](#like-functionality)
4. [Comment Functionality](#comment-functionality)
5. [Library/Save Functionality](#librarysave-functionality)
6. [Share Functionality](#share-functionality)
7. [Real-Time Updates](#real-time-updates)
8. [Backend Endpoints Summary](#backend-endpoints-summary)
9. [Response Format Standards](#response-format-standards)
10. [Implementation Checklist](#implementation-checklist)

---

## Footer Components Overview

The footer section in video cards displays 5 interaction buttons:

```
[👁️ Views] [❤️ Likes] [💬 Comments] [🔖 Library] [📤 Share]
```

**Location**: Below the video player, in the `CardFooterActions` component  
**Component Path**: `src/shared/components/CardFooterActions.tsx`  
**Usage**: Used in `VideoCard`, `MusicCard`, `EbookCard`, and other media cards

---

## Views Display

### Frontend Behavior

**Display Only** - Views are displayed in the footer but **not triggered by footer interaction**.

- **Icon**: 👁️ (visibility icon)
- **Display**: Shows total view count
- **Interaction**: None (read-only display)

### How Views Are Tracked

Views are **automatically tracked** when users watch videos, not through footer interaction:

**Tracking Logic** (in `VideoCard.tsx`):
```typescript
// Views are recorded when engagement thresholds are met:
// - 3 seconds of playback, OR
// - 25% progress, OR
// - Video completion

if (qualifies || finished) {
  await contentInteractionAPI.recordView(contentId, "media", {
    durationMs: finished ? durationMs : positionMs,
    progressPct: Math.round(progress * 100),
    isComplete: finished,
  });
}
```

### Backend Requirements

**Endpoint**: `POST /api/content/{contentType}/{contentId}/view`

**Request**:
```http
POST /api/content/media/{contentId}/view
Authorization: Bearer {token}
Content-Type: application/json

{
  "durationMs": 30000,
  "progressPct": 75,
  "isComplete": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "viewCount": 1235,
    "hasViewed": true
  }
}
```

**Logic**:
- ✅ **One view per user per content** (deduplication)
- ✅ **Increment count only on first view**
- ✅ **Track engagement metrics** (duration, progress, completion)
- ✅ **Return updated view count**

**See**: `docs/COPYRIGHT_FREE_MUSIC_VIEW_TRACKING_BACKEND_SPEC.md` for detailed view tracking implementation.

---

## Like Functionality

### Frontend Behavior

**Toggle Action** - Users can like/unlike videos by clicking the heart icon.

**Component**: `LikeButton` (when `useEnhancedComponents=true`) or `AnimatedLikeButton` (fallback)

**Flow**:
1. User clicks like button
2. **Optimistic update**: UI immediately shows new like state
3. API call to backend
4. **Update from response**: UI syncs with backend response
5. **Revert on error**: If API fails, revert to previous state

### Frontend Implementation

**Component**: `src/shared/components/LikeButton.tsx`

```typescript
// Optimistic update
const newLiked = !liked;
const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
setLiked(newLiked);
setLikeCount(newCount);

// API call
const result = await contentInteractionAPI.toggleLike(contentId, contentType);

// Update from response
if (result.liked !== undefined) {
  setLiked(result.liked);
  setLikeCount(result.totalLikes);
}
```

### Backend Requirements

**Endpoint**: `POST /api/content/{contentType}/{contentId}/like`

**Request**:
```http
POST /api/content/media/{contentId}/like
Authorization: Bearer {token}
Content-Type: application/json

{}
```

**Response**:
```json
{
  "success": true,
  "message": "Like toggled successfully",
  "data": {
    "liked": true,
    "likeCount": 42
  }
}
```

**Response Fields** (REQUIRED):
- `liked` (boolean): Current like state for authenticated user
- `likeCount` (number): Total like count after toggle

**Logic**:
- ✅ **Toggle behavior**: If user hasn't liked → add like, increment count
- ✅ **Toggle behavior**: If user already liked → remove like, decrement count
- ✅ **Return current state**: Always return `liked` and `likeCount` after toggle
- ✅ **Atomic operation**: Ensure count accuracy (handle race conditions)

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Content not found
- `500 Internal Server Error`: Server error

**Example Flow**:
```
Initial: liked=false, likeCount=10
User clicks like → POST /api/content/media/123/like
Backend: Add like → liked=true, likeCount=11
Response: { liked: true, likeCount: 11 }

User clicks like again → POST /api/content/media/123/like
Backend: Remove like → liked=false, likeCount=10
Response: { liked: false, likeCount: 10 }
```

---

## Comment Functionality

### Frontend Behavior

**Modal Action** - Clicking the comment icon opens a comment modal (Instagram-style bottom sheet).

**Component**: `CommentIcon` → Opens `CommentModalV2`

**Flow**:
1. User clicks comment icon
2. **Modal opens instantly** (optimistic UI)
3. **Fetch comments** from backend (async, non-blocking)
4. **Join real-time room** for live comment updates
5. User can post comments, reply, like comments

### Frontend Implementation

**Component**: `src/shared/components/CommentIcon/CommentIcon.tsx`

```typescript
const handlePress = () => {
  // Open modal immediately
  showCommentModal([], contentId, contentType);
  
  // Backend calls happen async:
  // - GET /api/content/{contentType}/{contentId}/comments
  // - Join Socket.IO room for real-time updates
};
```

**Comment Modal**: `app/components/CommentModalV2.tsx`
- Displays comments in a scrollable list
- Allows posting new comments
- Supports replies and comment likes
- Real-time updates via WebSocket

### Backend Requirements

**Primary Endpoint**: `GET /api/content/{contentType}/{contentId}/comments`

**Request**:
```http
GET /api/content/media/{contentId}/comments?page=1&limit=20&sortBy=recent
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "comment123",
        "userId": "user456",
        "userName": "John Doe",
        "userAvatar": "https://...",
        "comment": "Great video!",
        "likes": 5,
        "isLiked": false,
        "replies": [
          {
            "_id": "reply789",
            "userId": "user101",
            "userName": "Jane Smith",
            "comment": "I agree!",
            "likes": 2,
            "isLiked": false
          }
        ],
        "replyCount": 1,
        "createdAt": "2024-12-19T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasMore": true
    },
    "totalComments": 45
  }
}
```

**Post Comment Endpoint**: `POST /api/comments`

**Request**:
```http
POST /api/comments
Authorization: Bearer {token}
Content-Type: application/json

{
  "contentId": "content123",
  "contentType": "media",
  "comment": "This is amazing!",
  "parentId": null  // null for top-level, commentId for replies
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "newComment456",
    "userId": "currentUser",
    "userName": "Current User",
    "userAvatar": "https://...",
    "comment": "This is amazing!",
    "likes": 0,
    "isLiked": false,
    "replies": [],
    "replyCount": 0,
    "createdAt": "2024-12-19T10:05:00Z"
  }
}
```

**Like Comment Endpoint**: `POST /api/comments/{commentId}/like`

**Request**:
```http
POST /api/comments/{commentId}/like
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 6
  }
}
```

**Logic**:
- ✅ **Pagination**: Support `page`, `limit`, `sortBy` query params
- ✅ **Nested replies**: Comments can have replies (use `parentId`)
- ✅ **User info**: Include `userName`, `userAvatar` for each comment
- ✅ **Like status**: Include `isLiked` for authenticated users
- ✅ **Real-time**: Emit Socket.IO events when comments are added/liked

**See**: `docs/COMMENT_SYSTEM_SPEC.md` for detailed comment system implementation.

---

## Library/Save Functionality

### Frontend Behavior

**Toggle Action** - Users can save/unsave videos to their library (bookmark).

**Component**: `SaveButton` (when `useEnhancedComponents=true`) or `TouchableOpacity` with bookmark icon (fallback)

**Flow**:
1. User clicks save/library button
2. **Optimistic update**: UI immediately shows new save state
3. API call to backend
4. **Update from response**: UI syncs with backend response
5. **Sync library store**: Update local library state
6. **Revert on error**: If API fails, revert to previous state

### Frontend Implementation

**Component**: `src/shared/components/SaveButton.tsx`

```typescript
// Optimistic update
const newSaved = !saved;
const newCount = newSaved ? saveCount + 1 : Math.max(0, saveCount - 1);
setSaved(newSaved);
setSaveCount(newCount);

// API call
const result = await mediaApi.toggleSave(contentId, contentType);

// Update from response
if (result.data) {
  setSaved(result.data.bookmarked ?? result.data.saved);
  setSaveCount(result.data.bookmarkCount ?? result.data.saveCount);
}
```

### Backend Requirements

**Endpoint**: `POST /api/bookmark/{contentId}/toggle`

**Request**:
```http
POST /api/bookmark/{contentId}/toggle
Authorization: Bearer {token}
Content-Type: application/json

{}
```

**Response**:
```json
{
  "success": true,
  "message": "Bookmark toggled successfully",
  "data": {
    "bookmarked": true,
    "bookmarkCount": 15
  }
}
```

**Response Fields** (REQUIRED):
- `bookmarked` (boolean): Current bookmark state for authenticated user
- `bookmarkCount` (number): Total bookmark count after toggle

**Logic**:
- ✅ **Toggle behavior**: If user hasn't bookmarked → add bookmark, increment count
- ✅ **Toggle behavior**: If user already bookmarked → remove bookmark, decrement count
- ✅ **Return current state**: Always return `bookmarked` and `bookmarkCount` after toggle
- ✅ **Library sync**: When bookmarked, content should appear in user's library
- ✅ **Atomic operation**: Ensure count accuracy (handle race conditions)

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Content not found
- `500 Internal Server Error`: Server error

**Get Bookmark Status Endpoint**: `GET /api/bookmark/{contentId}/status`

**Request**:
```http
GET /api/bookmark/{contentId}/status
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isBookmarked": true,
    "bookmarkCount": 15
  }
}
```

**Example Flow**:
```
Initial: bookmarked=false, bookmarkCount=5
User clicks save → POST /api/bookmark/123/toggle
Backend: Add bookmark → bookmarked=true, bookmarkCount=6
Response: { bookmarked: true, bookmarkCount: 6 }
Content now appears in user's library

User clicks save again → POST /api/bookmark/123/toggle
Backend: Remove bookmark → bookmarked=false, bookmarkCount=5
Response: { bookmarked: false, bookmarkCount: 5 }
Content removed from user's library
```

---

## Share Functionality

### Frontend Behavior

**Native Share** - Clicking share opens the device's native share sheet.

**Component**: `AnimatedShareButton` → React Native `Share` API

**Flow**:
1. User clicks share button
2. **Native share sheet opens** (device-specific UI)
3. User selects share method (WhatsApp, Email, Copy link, etc.)
4. **Track share** (only if user actually shared)
5. Update share count (optional, not always displayed)

### Frontend Implementation

**Component**: `src/shared/components/CardFooterActions.tsx`

```typescript
const handleShare = async () => {
  const result = await Share.share({
    title: contentTitle,
    message: `Check out this ${contentType}: ${contentTitle}`,
    url: contentUrl || "",
  });

  // Only track if user actually shared
  if (result.action === Share.sharedAction) {
    await contentInteractionAPI.recordShare(
      contentId,
      contentType,
      result.activityType || "generic"
    );
  }
};
```

### Backend Requirements

**Endpoint**: `POST /api/interactions/share`

**Request**:
```http
POST /api/interactions/share
Authorization: Bearer {token}
Content-Type: application/json

{
  "contentId": "content123",
  "contentType": "media",
  "platform": "internal"  // or "external", "whatsapp", "email", etc.
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "shareCount": 9
  }
}
```

**Response Fields**:
- `shareCount` (number): Updated total share count (optional, may not be displayed)

**Logic**:
- ✅ **Track share**: Increment share count for content
- ✅ **Platform tracking**: Store share platform if provided
- ✅ **Optional count**: Share count may not be displayed in UI (tracking only)
- ✅ **No toggle**: Shares are additive (no unshare)

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Content not found
- `500 Internal Server Error`: Server error

**Note**: Share count is tracked but may not always be displayed in the footer. The primary purpose is analytics.

---

## Real-Time Updates

### WebSocket Events

All interactions should emit WebSocket events for real-time updates across clients.

**Socket Event**: `content-interaction-updated`

**Event Payload**:
```json
{
  "contentId": "content123",
  "contentType": "media",
  "interactionType": "like",  // "like", "comment", "save", "view", "share"
  "likeCount": 42,
  "viewCount": 1235,
  "commentCount": 15,
  "bookmarkCount": 8,
  "liked": true,  // Current like state (for like events)
  "bookmarked": false  // Current bookmark state (for save events)
}
```

**Frontend Listener** (in `VideoCard.tsx`):
```typescript
socket.on('content-interaction-updated', (data) => {
  if (data.contentId === contentId) {
    // Update counts in real-time
    if (data.likeCount !== undefined) setLikeCount(data.likeCount);
    if (data.viewCount !== undefined) setViewCount(data.viewCount);
    if (data.commentCount !== undefined) setCommentCount(data.commentCount);
    if (data.bookmarkCount !== undefined) setSaveCount(data.bookmarkCount);
    if (data.liked !== undefined) setIsLiked(data.liked);
    if (data.bookmarked !== undefined) setIsSaved(data.bookmarked);
  }
});
```

**Backend Implementation**:
- Emit event after successful interaction (like, save, comment, view)
- Include all relevant counts in event payload
- Use room-based broadcasting: `socket.to(contentRoom).emit('content-interaction-updated', data)`

---

## Backend Endpoints Summary

| Interaction | Method | Endpoint | Auth Required |
|------------|--------|----------|---------------|
| **Views** | POST | `/api/content/{contentType}/{contentId}/view` | ✅ Yes |
| **Likes** | POST | `/api/content/{contentType}/{contentId}/like` | ✅ Yes |
| **Comments** | GET | `/api/content/{contentType}/{contentId}/comments` | Optional |
| **Post Comment** | POST | `/api/comments` | ✅ Yes |
| **Like Comment** | POST | `/api/comments/{commentId}/like` | ✅ Yes |
| **Save/Library** | POST | `/api/bookmark/{contentId}/toggle` | ✅ Yes |
| **Get Save Status** | GET | `/api/bookmark/{contentId}/status` | ✅ Yes |
| **Share** | POST | `/api/interactions/share` | ✅ Yes |

---

## Response Format Standards

### Standard Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Interaction-specific data
  }
}
```

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Interaction-Specific Response Formats

**Like Response**:
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 42
  }
}
```

**Save Response**:
```json
{
  "success": true,
  "data": {
    "bookmarked": true,
    "bookmarkCount": 15
  }
}
```

**View Response**:
```json
{
  "success": true,
  "data": {
    "viewCount": 1235,
    "hasViewed": true
  }
}
```

**Share Response**:
```json
{
  "success": true,
  "data": {
    "shareCount": 9
  }
}
```

---

## Implementation Checklist

### Views
- [ ] Implement `POST /api/content/{contentType}/{contentId}/view`
- [ ] Deduplication logic (one view per user)
- [ ] Engagement tracking (duration, progress, completion)
- [ ] Return updated view count
- [ ] Emit WebSocket event on view

### Likes
- [ ] Implement `POST /api/content/{contentType}/{contentId}/like`
- [ ] Toggle logic (add/remove like)
- [ ] Increment/decrement count correctly
- [ ] Return `liked` and `likeCount` in response
- [ ] Handle race conditions (atomic operations)
- [ ] Emit WebSocket event on like toggle

### Comments
- [ ] Implement `GET /api/content/{contentType}/{contentId}/comments`
- [ ] Implement `POST /api/comments` (create comment/reply)
- [ ] Implement `POST /api/comments/{commentId}/like`
- [ ] Pagination support (page, limit, sortBy)
- [ ] Nested replies support
- [ ] User info in comments (name, avatar)
- [ ] Like status for authenticated users
- [ ] Emit WebSocket events for new comments/likes

### Save/Library
- [ ] Implement `POST /api/bookmark/{contentId}/toggle`
- [ ] Implement `GET /api/bookmark/{contentId}/status`
- [ ] Toggle logic (add/remove bookmark)
- [ ] Increment/decrement count correctly
- [ ] Return `bookmarked` and `bookmarkCount` in response
- [ ] Library sync (content appears in user's library when bookmarked)
- [ ] Handle race conditions (atomic operations)
- [ ] Emit WebSocket event on bookmark toggle

### Share
- [ ] Implement `POST /api/interactions/share`
- [ ] Track share count
- [ ] Platform tracking (optional)
- [ ] Emit WebSocket event on share (optional)

### Real-Time Updates
- [ ] Set up Socket.IO rooms per content
- [ ] Emit `content-interaction-updated` events
- [ ] Include all relevant counts in event payload
- [ ] Room-based broadcasting

### Error Handling
- [ ] Return proper HTTP status codes (200, 401, 404, 500)
- [ ] Standard error response format
- [ ] Handle missing/invalid tokens
- [ ] Handle content not found
- [ ] Handle race conditions gracefully

---

## Frontend Integration Notes

### Content Type Mapping

Frontend sends content types that may need mapping:

| Frontend Type | Backend Type |
|--------------|--------------|
| `media` | `media` |
| `videos` | `media` |
| `video` | `media` |
| `devotional` | `devotional` |
| `ebook` | `ebook` |
| `sermon` | `sermon` |

**Backend should handle**: `media`, `devotional`, `ebook`, `sermon` as valid content types.

### Authentication

- **Required for**: Likes, Comments (post), Save, Share, Views
- **Optional for**: Comments (get) - can return counts without auth
- **Token format**: `Bearer {jwt_token}` in `Authorization` header

### Optimistic Updates

Frontend performs optimistic updates for better UX:
- UI updates immediately on user action
- API call happens in background
- UI syncs with backend response
- Reverts on error

**Backend should**: Return accurate state immediately to sync with optimistic updates.

---

## Testing Examples

### Test Like Toggle

```bash
# Initial state: User hasn't liked
curl -X POST http://localhost:3000/api/content/media/123/like \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"

# Expected: { "success": true, "data": { "liked": true, "likeCount": 1 } }

# Toggle again: User already liked
curl -X POST http://localhost:3000/api/content/media/123/like \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"

# Expected: { "success": true, "data": { "liked": false, "likeCount": 0 } }
```

### Test Save Toggle

```bash
# Initial state: User hasn't saved
curl -X POST http://localhost:3000/api/bookmark/123/toggle \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"

# Expected: { "success": true, "data": { "bookmarked": true, "bookmarkCount": 1 } }

# Check status
curl -X GET http://localhost:3000/api/bookmark/123/status \
  -H "Authorization: Bearer {token}"

# Expected: { "success": true, "data": { "isBookmarked": true, "bookmarkCount": 1 } }
```

### Test View Tracking

```bash
# Record view
curl -X POST http://localhost:3000/api/content/media/123/view \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"durationMs": 30000, "progressPct": 75, "isComplete": false}'

# Expected: { "success": true, "data": { "viewCount": 1, "hasViewed": true } }

# Record view again (same user) - should not increment
curl -X POST http://localhost:3000/api/content/media/123/view \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"durationMs": 60000, "progressPct": 100, "isComplete": true}'

# Expected: { "success": true, "data": { "viewCount": 1, "hasViewed": true } } (no increment)
```

---

## Summary

The video card footer interactions require the following backend endpoints:

1. **Views**: Automatic tracking (not footer-triggered)
2. **Likes**: Toggle endpoint with count updates
3. **Comments**: Get/post/like comments with pagination
4. **Save/Library**: Toggle bookmark with library sync
5. **Share**: Track share count (analytics)

All interactions should:
- ✅ Return accurate state immediately
- ✅ Support optimistic updates
- ✅ Emit WebSocket events for real-time updates
- ✅ Handle errors gracefully
- ✅ Support authentication

**Status**: Frontend is ready - backend needs to implement these endpoints according to this specification.

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-19
