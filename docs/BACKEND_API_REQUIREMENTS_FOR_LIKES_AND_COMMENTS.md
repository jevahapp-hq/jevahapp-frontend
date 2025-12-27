# Backend API Requirements for Likes and Comments

**Last Updated**: 2025-01-20  
**Frontend Version**: Post-refactor (React Native 2025 best practices)  
**Priority**: 🔴 **CRITICAL** - Affecting user experience

---

## 📋 Table of Contents

1. [Critical Issues](#critical-issues)
2. [Like Persistence Requirements](#like-persistence-requirements)
3. [Comment Persistence Requirements](#comment-persistence-requirements)
4. [API Endpoint Specifications](#api-endpoint-specifications)
5. [Response Format Requirements](#response-format-requirements)
6. [Error Handling](#error-handling)

---

## 🚨 Critical Issues

### Issue #1: Comment Creation 500 Error

**Status**: 🔴 **BLOCKING PRODUCTION**

**Error**: 
```
HTTP 500 - {"success":false,"message":"Failed to create comment"}
```

**Endpoint Affected**: `POST /api/comments`

**Expected Behavior**:
- Comment should be created successfully in the database
- Response should return `200 OK` with the created comment data
- Comment should be immediately queryable after creation

**Current Behavior**:
- Server returns `500 Internal Server Error`
- Comment is NOT persisted in database
- Frontend must rollback optimistic update

**Impact**:
- Users cannot post comments
- Poor user experience (optimistic update then failure)
- Comments are lost

**Required Fix**:
1. Investigate database connection/transaction issues
2. Check validation logic for comment content
3. Ensure proper error handling in comment creation endpoint
4. Return proper error messages (not just generic "Failed to create comment")

---

## ✅ Like Persistence Requirements

### The Problem

When users like content:
- ✅ Like count increases correctly
- ❌ **When app refreshes, like icon is no longer highlighted** (even though count remains higher)
- ❌ User sees they haven't liked content they actually liked

### Root Cause

Backend metadata endpoints are **not consistently returning** `hasLiked: true` for content the user has liked.

### Required Behavior

**Backend MUST ensure read-your-write consistency** for likes across all endpoints:

#### Endpoints Affected:
1. `GET /api/content/{contentType}/{contentId}/metadata`
2. `POST /api/content/batch-metadata`
3. `POST /api/content/{contentType}/{contentId}/like`

### Implementation Requirements

#### 1. Toggle Like Endpoint

**Endpoint**: `POST /api/content/{contentType}/{contentId}/like`

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "liked": true,           // ← MUST be accurate
    "likeCount": 42,         // ← MUST reflect total users who liked
    "contentId": "...",
    "contentType": "media"
  }
}
```

**Requirements**:
- MUST persist like in database (separate likes collection/table)
- MUST return accurate `liked` boolean (true if user liked, false if unliked)
- MUST return accurate `likeCount` (total unique users who liked)
- MUST be idempotent (multiple calls should not create duplicates)

#### 2. Metadata Endpoint (Single)

**Endpoint**: `GET /api/content/{contentType}/{contentId}/metadata`

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "contentId": "...",
    "likes": 42,
    "saves": 10,
    "shares": 5,
    "views": 1000,
    "comments": 25,
    "userInteractions": {
      "liked": true,        // ← CRITICAL: Must query user's like status
      "saved": false,
      "shared": false,
      "viewed": true
    }
  }
}
```

**Requirements**:
- **MUST query the authenticated user's like status from database**
- **MUST return `liked: true` if user has liked this content**
- **MUST return `liked: false` if user has NOT liked this content**
- **NEVER return `liked: false` for content the user has actually liked**
- Use proper JOIN/query to check likes table/collection

#### 3. Batch Metadata Endpoint

**Endpoint**: `POST /api/content/batch-metadata`

**Request Body**:
```json
{
  "contentIds": ["id1", "id2", "id3"],
  "contentType": "media"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id1": {
      "likes": 42,
      "saves": 10,
      "userInteractions": {
        "liked": true,      // ← CRITICAL: Must be accurate
        "saved": false
      }
    },
    "id2": {
      "likes": 100,
      "userInteractions": {
        "liked": false,     // ← CRITICAL: Must be accurate
        "saved": true
      }
    }
  }
}
```

**Requirements**:
- **MUST batch query user's like status for ALL provided contentIds**
- **MUST return accurate `liked` status for each contentId**
- Use efficient query (single database call with IN clause, not N+1 queries)
- **This endpoint is called on app refresh** - persistence depends on it

### Database Schema Recommendations

**DO NOT store likes as array on content document**:
```javascript
// ❌ BAD - Don't do this
Content {
  _id: "...",
  likes: ["userId1", "userId2", ...]  // Grows unbounded, write contention
}
```

**DO use separate likes collection/table**:
```javascript
// ✅ GOOD - Recommended approach
Likes {
  _id: "...",
  userId: "...",
  contentId: "...",
  contentType: "media",
  createdAt: Date
}

// With unique index on (userId, contentId, contentType)
```

### Query Pattern Example (MongoDB)

```javascript
// Get metadata for content with user's like status
async function getContentMetadata(contentId, contentType, userId) {
  // Get basic stats
  const stats = await Content.aggregate([
    { $match: { _id: contentId } },
    {
      $lookup: {
        from: "likes",
        let: { contentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$contentId", "$$contentId"] },
                  { $eq: ["$contentType", contentType] }
                ]
              }
            }
          },
          { $count: "count" }
        ],
        as: "likeCount"
      }
    }
  ]);

  // Check if current user has liked
  const userLike = await Likes.findOne({
    userId,
    contentId,
    contentType
  });

  return {
    likes: stats[0].likeCount[0]?.count || 0,
    userInteractions: {
      liked: !!userLike  // ← This is what frontend needs
    }
  };
}
```

---

## 💬 Comment Persistence Requirements

### The Problem

When users post comments:
- Comments appear immediately (optimistic update)
- **If app refreshes before comment syncs, comment disappears**
- Comment counts don't match actual comments

### Required Behavior

#### 1. Create Comment Endpoint

**Endpoint**: `POST /api/comments`

**Request Body**:
```json
{
  "contentId": "...",
  "contentType": "media",
  "content": "This is my comment text",
  "parentCommentId": "..." // optional, for replies
}
```

**Expected Response** (on success):
```json
{
  "success": true,
  "data": {
    "id": "commentId123",
    "contentId": "...",
    "userId": "...",
    "username": "John Doe",
    "userAvatar": "https://...",
    "comment": "This is my comment text",
    "timestamp": "2025-01-20T10:30:00Z",
    "likes": 0,
    "isLiked": false,
    "replies": []
  }
}
```

**Requirements**:
- **MUST persist comment in database** (currently failing with 500 error)
- **MUST return created comment immediately** (for optimistic update replacement)
- **MUST increment comment count** on the content
- **MUST handle replies** if `parentCommentId` is provided

#### 2. Get Comments Endpoint

**Endpoint**: `GET /api/comments?contentId=...&contentType=...&page=1&limit=20&sortBy=newest`

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "...",
        "userId": "...",
        "username": "John Doe",
        "userAvatar": "https://...",
        "comment": "Great content!",
        "timestamp": "2025-01-20T10:30:00Z",
        "likes": 5,
        "isLiked": false,      // ← Current user's like status
        "replies": []          // ← Nested replies if any
      }
    ],
    "totalComments": 25,
    "hasMore": true,
    "page": 1
  }
}
```

**Requirements**:
- **MUST return comments in correct sort order** (newest, oldest, top)
- **MUST include user's like status** for each comment (`isLiked`)
- **MUST support pagination** (page, limit)
- **MUST return accurate total count**
- **MUST include nested replies** when present

#### 3. Comment Count in Metadata

**Endpoint**: `GET /api/content/{contentType}/{contentId}/metadata`

**Must include**:
```json
{
  "comments": 25  // ← Total number of comments (including replies)
}
```

---

## 📡 API Endpoint Specifications

### Base URL
All endpoints use: `https://jevahapp-backend.onrender.com` (or your production URL)

### Authentication
All endpoints require Bearer token:
```
Authorization: Bearer <jwt_token>
```

### Content Type Mapping
Frontend sends: `"media" | "video" | "audio" | "ebook" | "sermon" | "devotional"`

Backend may need to map these to your internal types. Document the mapping.

---

## 📦 Response Format Requirements

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Technical error details" // optional, for debugging
}
```

### HTTP Status Codes
- `200 OK`: Success
- `400 Bad Request`: Invalid request (missing fields, validation errors)
- `401 Unauthorized`: Missing or invalid auth token
- `404 Not Found`: Content/comment not found
- `500 Internal Server Error`: Server error (should be rare)

---

## ⚠️ Error Handling

### Error Response Format

**When returning errors, use this format**:
```json
{
  "success": false,
  "message": "Failed to create comment",  // ← User-friendly message
  "error": "Database connection timeout"  // ← Technical details (optional)
}
```

### Error Handling Requirements

1. **DO NOT return generic messages**: 
   - ❌ Bad: "Failed to create comment"
   - ✅ Good: "Failed to create comment: Database connection timeout"

2. **Return appropriate HTTP status codes**:
   - `400` for validation errors
   - `401` for authentication errors
   - `404` for not found
   - `500` only for actual server errors

3. **Include error context**:
   - Which field failed validation
   - Why the operation failed
   - How to fix it (if applicable)

---

## 🔄 Real-time Updates (Optional)

The frontend supports real-time updates via Socket.IO:

**Events the frontend listens for**:
- `content-reaction` - When someone likes content
- `content-comment` - When someone posts a comment
- `count-update` - When counts change

**These are optional** - HTTP API endpoints are the source of truth.

---

## ✅ Testing Checklist

Before deploying to production, verify:

### Likes
- [ ] User can like content → `POST /api/content/{type}/{id}/like` returns `liked: true`
- [ ] User can unlike content → Returns `liked: false`
- [ ] After liking, `GET /api/content/{type}/{id}/metadata` returns `liked: true`
- [ ] After refreshing app, like persists (metadata endpoint returns `liked: true`)
- [ ] Like count reflects total users who liked (not just count)

### Comments
- [ ] User can create comment → `POST /api/comments` returns `200 OK` with comment data
- [ ] Comment is immediately queryable → `GET /api/comments` returns new comment
- [ ] Comment count increments correctly in metadata
- [ ] User can reply to comment → Reply is nested correctly
- [ ] Comments persist after app refresh
- [ ] Pagination works correctly
- [ ] Sorting works (newest, oldest, top)

### Batch Operations
- [ ] `POST /api/content/batch-metadata` returns accurate `liked` status for all items
- [ ] Batch endpoint is efficient (single query, not N+1)
- [ ] Batch endpoint handles missing contentIds gracefully

---

## 📝 Implementation Notes

### Why These Requirements Matter

1. **Persistence**: Users expect likes/comments to persist after app refresh
2. **Consistency**: UI shows correct state immediately and after refresh
3. **Performance**: Batch operations prevent multiple API calls
4. **User Experience**: Optimistic updates need accurate backend responses

### Frontend Behavior

The frontend:
- ✅ Does optimistic updates (immediate UI feedback)
- ✅ Rolls back on error (maintains consistency)
- ✅ Trusts backend as source of truth on fresh loads
- ✅ Handles errors gracefully with user-friendly messages

**The backend MUST be reliable** for this to work correctly.

---

## 🆘 Support

If you need clarification on any requirement, please ask. The frontend is ready and waiting for these fixes.

**Priority Fixes**:
1. 🔴 **Fix comment creation 500 error** (blocks comments entirely)
2. 🔴 **Fix like persistence** (affects all users)
3. 🟡 **Improve error messages** (better debugging)

---

## 📚 Related Documentation

- `docs/BACKEND_INTERACTION_API_SPEC.md` - Detailed interaction API spec
- `docs/BACKEND_TIKTOK_STANDARD_LIKES_SPEC.md` - Like system architecture
- `docs/VIDEO_CARD_FOOTER_INTERACTIONS_BACKEND_SPEC.md` - UI interaction spec

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-20  
**Author**: Frontend Team

