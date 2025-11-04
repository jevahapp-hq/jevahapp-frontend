# Backend Comment System Implementation Guide

## Overview

This document describes how the frontend's comment system is implemented to help the backend team align their API endpoints and data structures.

---

## 📱 Frontend Implementation Summary

### User Flow

1. **User opens comment modal** by tapping comment icon on any content
2. **Modal displays** all comments for that content with pagination
3. **User can type** in text input at bottom
4. **User can reply** by tapping "REPLY" on any comment
5. **User submits** by tapping send button or pressing Enter
6. **Optimistic update** - comment appears instantly
7. **Backend sync** - API call validates and saves comment
8. **Real-time refresh** - comments reload to show server state

---

## 🔑 Key Features

### 1. Comment Threading (Nested Replies)

**Structure**: Flat list with nested replies
- **Top-level comments** are displayed in main list
- **Replies** are nested under parent comment
- **Visual indentation** for replies (left margin added)

**Implementation**:
- Frontend sends `parentCommentId` when posting a reply
- Backend should return nested structure with replies included

**Example Data Structure**:
```typescript
{
  id: "comment123",
  userId: "user456",
  username: "John Doe",
  userAvatar: "https://...",
  comment: "Great content!",
  timestamp: "2024-01-15T10:30:00Z",
  likes: 5,
  isLiked: false,
  replies: [
    {
      id: "reply789",
      userId: "user101",
      username: "Jane Smith",
      comment: "@John Doe Thanks!",
      timestamp: "2024-01-15T10:35:00Z",
      likes: 2,
      isLiked: false
    }
  ]
}
```

### 2. Optimistic Updates

**Behavior**: Frontend shows comment immediately before API confirms
- Provides instant feedback to user
- If API fails, comment is removed and error shown

**Implementation**:
- Frontend adds comment to local state immediately
- API call happens in background
- On success: Refresh comments from server
- On failure: Remove optimistic comment, show error

### 3. Authentication Required

**Security**: Users must be logged in to post comments
- Token checked before allowing submission
- Input disabled if not authenticated
- Message shows "Sign in to comment" for guests

**Token Storage**:
- Primary: `AsyncStorage.getItem("userToken")`
- Fallback: `AsyncStorage.getItem("token")`
- OAuth: `SecureStore.getItemAsync("jwt")`

### 4. Real-Time Feedback

**Visual Indicators**:
- **Typing**: Text input shows character limit
- **Send button**: Disabled when empty or not authenticated
- **Submit**: Button changes color (grey → green) when ready
- **Loading**: Spinner during API call

### 5. Pagination

**Default**: 20 comments per page
- Initial load fetches first page
- More can be loaded if `hasMore: true`

---

## 🔌 API Endpoints Expected

### 1. Get Comments

```http
GET /api/content/media/{contentId}/comments?page=1&limit=20
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "commentId123",
        "content": "This is great!",
        "authorId": "userId456",
        "author": {
          "_id": "userId456",
          "firstName": "John",
          "lastName": "Doe",
          "avatar": "https://..."
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "reactionsCount": 5,
        "replies": [
          {
            "_id": "replyId789",
            "content": "@John Doe Thanks!",
            "authorId": "userId101",
            "author": {
              "firstName": "Jane",
              "lastName": "Smith",
              "avatar": "https://..."
            },
            "createdAt": "2024-01-15T10:35:00Z",
            "reactionsCount": 2
          }
        ]
      }
    ],
    "totalComments": 45,
    "hasMore": true
  }
}
```

**Alternative Response Formats Accepted**:
```json
{
  "success": true,
  "data": {
    "items": [...],  // OR payload.items
    "totalCount": 45,  // OR payload.total
    "hasMore": true
  }
}
```

---

### 2. Post Comment

```http
POST /api/content/media/{contentId}/comment
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "User's comment text here",
  "parentCommentId": "optional-parent-id-for-replies"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "newCommentId",
    "content": "User's comment text here",
    "authorId": "userId456",
    "author": {
      "_id": "userId456",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://..."
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "reactionsCount": 0,
    "replies": []
  }
}
```

**Notes**:
- If `parentCommentId` is provided, comment should be a reply to that parent
- Backend should auto-link `authorId` from token, no need to send in body
- Return full comment object for immediate display

---

### 3. Like Comment

```http
POST /api/interactions/comments/{commentId}/reaction
Content-Type: application/json
Authorization: Bearer <token>

{
  "reactionType": "like"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "liked": true,
    "totalLikes": 6
  }
}
```

**Behavior**:
- First call: Adds like, returns `liked: true`
- Second call: Removes like, returns `liked: false`
- Frontend tracks `isLiked` state locally

---

### 4. Delete Comment

```http
DELETE /api/content/comments/{commentId}
Authorization: Bearer <token>
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

---

## 📋 TypeScript Interfaces (Frontend Expectations)

### CommentData Interface

```typescript
interface CommentData {
  id: string;                    // Unique ID
  contentId: string;             // Content being commented on
  userId: string;                // Author ID
  username: string;              // Display name
  userAvatar?: string;           // Avatar URL
  comment: string;               // Comment text
  timestamp: string;             // ISO 8601 format
  likes: number;                 // Total likes count
  replies?: CommentData[];       // Nested replies
}
```

### Alternative Field Names Accepted

Frontend handles these variations:

| Field | Accepts (in order of preference) |
|-------|----------------------------------|
| `id` | `_id`, `id` |
| `userId` | `authorId`, `userId` |
| `username` | `user.username`, `username`, `firstName + lastName` |
| `userAvatar` | `user.avatarUrl`, `userAvatar`, `avatar` |
| `comment` | `content`, `comment`, `text` |
| `timestamp` | `createdAt`, `timestamp` |
| `likes` | `reactionsCount`, `likes`, `likeCount` |

---

## 🎨 UI/UX Specifications

### Input Field Behavior

1. **Placeholder**: "Add a comment..." (authenticated) or "Sign in to comment" (guest)
2. **Multiline**: Supports multiple lines
3. **Return key**: "send" button type
4. **Submit**: Tap send button OR press Enter
5. **Character limit**: None (backend can add if needed)
6. **Mention support**: Auto-adds `@username` when replying

### Modal Layout

```
┌─────────────────────────────────┐
│  Comments             [Close]    │
├─────────────────────────────────┤
│                                  │
│  [Avatar] Username  5MINS AGO    │
│            Comment text here...  │
│            [💚 REPLY]            │
│                                  │
│    └─ [Av] User2    2MINS AGO    │
│       Reply text...              │
│                                  │
├─────────────────────────────────┤
│  [Input field]      [Send]       │
└─────────────────────────────────┘
```

### Reply Functionality

**User Experience**:
1. User taps "REPLY" on any comment
2. Input field pre-fills with `@username`
3. Cursor positioned after mention
4. Sends `parentCommentId` to backend
5. Reply appears nested under parent

**Visual Treatment**:
- Replies indented 36px left margin
- Smaller avatar (24px vs 28px)
- Smaller font size (13px vs 14px)
- No nested replies (2 levels max)

---

## 🔄 State Management Flow

### Comment Modal Open Flow

```
1. User taps comment icon
   ↓
2. CommentModal opens
   ↓
3. Load comments from cache (instant)
   ↓
4. Show cached comments immediately
   ↓
5. Fetch from server (background)
   ↓
6. Replace cached with server data
```

### Post Comment Flow

```
1. User types and submits
   ↓
2. Validation: Check auth token exists
   ↓
3. Optimistic insert: Add to local state
   ↓
4. API call: POST to backend
   ↓
5a. Success → Refresh comments
5b. Failure → Remove optimistic, show error
```

### Reply Flow

```
1. User taps REPLY on comment
   ↓
2. Auto-fill: Add @username to input
   ↓
3. Focus: Input gets focus
   ↓
4. User types reply
   ↓
5. Submit: POST with parentCommentId
   ↓
6. Optimistic insert: Add nested under parent
   ↓
7. API call validates and saves
```

---

## ⚠️ Error Handling

### Authentication Errors

**401 Unauthorized**:
- Hide input field or show "Sign in to comment"
- Disable all comment actions

**403 Forbidden**:
- Show message: "You don't have permission to comment"
- Log user out (token invalid)

### Network Errors

**Timeout**:
- Retry automatically (3 attempts)
- Show: "Failed to load comments"
- Keep cached data if available

**No Internet**:
- Show cached comments
- Disable posting
- Message: "No internet connection"

### Validation Errors

**Empty comment**:
- Client-side validation blocks submission
- No API call made

**Comment too long**:
- If backend has limit, return error
- Frontend should respect limit

**Rate limiting**:
- Backend returns 429
- Frontend shows: "Too many requests, please wait"

---

## 📊 Caching Strategy

### Local Cache

**Storage**: AsyncStorage
**Key format**: `comments-{contentId}`
**TTL**: No expiration (stale after successful fetch)

**Usage**:
- Instant display on modal open
- Background refresh
- Offline support

### Performance Optimizations

1. **Virtualized lists**: Only render visible comments
2. **Memoized components**: Reduce re-renders
3. **Optimistic updates**: Instant feedback
4. **Batch loading**: 20 comments per page
5. **Lazy loading**: Load more on scroll

---

## 🧪 Testing Requirements

### Manual Test Cases

1. ✅ Post comment (authenticated)
2. ✅ Reply to comment
3. ✅ Like comment
4. ✅ Delete comment
5. ✅ Open modal (no comments)
6. ✅ Open modal (many comments)
7. ✅ Pagination works
8. ✅ Offline mode
9. ✅ Network error handling
10. ✅ Guest user behavior

### Backend Validation Needed

- [ ] Auth token validates correctly
- [ ] `parentCommentId` creates proper reply
- [ ] Comments return in correct order (newest first)
- [ ] Pagination returns correct `hasMore` value
- [ ] Total count accurate
- [ ] User can only delete their own comments
- [ ] Nested replies display correctly

---

## 🔗 Content Type Support

### Supported Types

Comments work on these content types:

| Frontend Type | Backend Route |
|---------------|---------------|
| `media` | `/api/content/media/{id}/comment` |
| `video` | `/api/content/video/{id}/comment` |
| `audio` | `/api/content/audio/{id}/comment` |
| `ebook` | `/api/content/ebook/{id}/comment` |
| `sermon` | `/api/content/sermon/{id}/comment` |
| `live` | `/api/content/live/{id}/comment` |

**Implementation**: Frontend maps types using `mapContentTypeToBackend()`

---

## 🚨 Important Notes

### 1. User Data Format

**Expected Author Data**:
```json
{
  "author": {
    "_id": "userId",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://..."
  }
}
```

**OR flattened**:
```json
{
  "authorId": "userId",
  "username": "John Doe",
  "userAvatar": "https://..."
}
```

**Frontend will accept either format** and transform automatically.

### 2. Timestamp Format

**Acceptable**:
- ISO 8601: `"2024-01-15T10:30:00Z"`
- ISO string: `"2024-01-15T10:30:00.000Z"`
- Any parsable date string

### 3. Empty States

**No Comments**:
- Show: "No comments yet"
- Call-to-action: "Be the first to share your thoughts!"

**Guest User**:
- Show: "Sign in to view and add comments"
- Disable input field

---

## 📝 Quick Implementation Checklist

### Must Have

- [ ] `GET /api/content/{type}/{id}/comments` - Return paginated comments
- [ ] `POST /api/content/{type}/{id}/comment` - Accept `{ content, parentCommentId }`
- [ ] Auth middleware on all comment endpoints
- [ ] Return nested replies in `replies` array
- [ ] Pagination with `hasMore` flag
- [ ] User can only delete own comments

### Nice to Have

- [ ] Comment moderation (flag/report)
- [ ] Edit comment functionality
- [ ] Rich text formatting
- [ ] Emoji reactions beyond like
- [ ] Mention notifications
- [ ] Search within comments

---

## 🔍 Frontend Transformation Logic

The frontend automatically handles multiple response formats:

```typescript
// Backend can return ANY of these:

// Format 1: Wrapped
{ "success": true, "data": { "comments": [...] } }

// Format 2: Direct
{ "comments": [...], "total": 45 }

// Format 3: Alternative
{ "items": [...], "totalCount": 45 }

// Field name variations also handled:
"_id" OR "id"
"authorId" OR "userId"  
"author.firstName" OR "username"
"content" OR "comment" OR "text"
"reactionsCount" OR "likes" OR "likeCount"
"createdAt" OR "timestamp"

// Frontend transforms ALL to standardized format
```

---

## 📌 Summary

**Key Points**:
1. ✅ Comments are **threaded** (nested replies)
2. ✅ **Optimistic updates** for instant feedback
3. ✅ **Auth required** for posting
4. ✅ **Pagination** with 20 per page
5. ✅ **Flexible response** formats accepted
6. ✅ **Caching** for performance
7. ✅ **Real-time refresh** after posting

**Backend Should**:
- Accept `{ content, parentCommentId }` in POST body
- Return nested replies in `replies` array
- Validate auth token on all requests
- Provide pagination metadata
- Allow users to delete only their own comments

---

## Questions?

If backend team needs clarification on any implementation detail, please ask!





