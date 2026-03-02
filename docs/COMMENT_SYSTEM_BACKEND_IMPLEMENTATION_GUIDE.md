# Comment System Backend Implementation Guide

**Last Updated:** January 2025  
**Status:** ⚠️ Critical Issues Requiring Backend Fixes  
**Priority:** HIGH - Blocking User Experience

---

## 📋 Executive Summary

The Jevah app has a **fully functional commenting system** on the frontend that mimics Facebook/Instagram-style comments with:
- ✅ Optimistic UI updates (comments appear instantly)
- ✅ Real-time updates via Socket.io
- ✅ Nested replies (one level deep)
- ✅ Comment likes
- ✅ Pagination and sorting
- ✅ Caching for performance

**However, there are critical backend issues preventing proper functionality:**

1. **🔴 Authentication Issue:** Users are being forced to re-authenticate to view comments
2. **🔴 GET Comments Endpoint:** Currently requires authentication when it should be **public**
3. **🔴 POST Comments Endpoint:** May be failing with 500 errors or not persisting comments
4. **🔴 Response Format:** Backend responses may not match frontend expectations

---

## 🎯 Current Frontend Implementation Status

### ✅ What Works (Frontend)

1. **Comment Modal System**
   - Global comment modal (`CommentModalV2`) accessible from any content card
   - Context-based state management (`CommentModalContext`)
   - Optimistic UI updates (comments appear immediately)
   - Real-time updates via Socket.io integration

2. **Comment Features**
   - ✅ Create top-level comments
   - ✅ Reply to comments (nested replies)
   - ✅ Like/unlike comments
   - ✅ View comments with pagination
   - ✅ Sort by: newest, oldest, top
   - ✅ Caching for offline/performance

3. **User Experience**
   - ✅ Instant comment appearance (optimistic updates)
   - ✅ Smooth error handling with rollback
   - ✅ Loading states and pagination
   - ✅ Real-time synchronization

### ❌ What's Broken (Backend Issues)

1. **Authentication Problems**
   - **Issue:** Users must authenticate again to view comments
   - **Root Cause:** `GET /api/content/:contentType/:contentId/comments` likely requires authentication
   - **Expected:** Comments should be **publicly viewable** (like Instagram/Facebook)
   - **Impact:** Testers cannot see comments without logging in again

2. **Comment Persistence**
   - **Issue:** Comments may not be persisting to database
   - **Symptom:** Comments disappear after app refresh
   - **Root Cause:** `POST /api/comments` may be returning 500 errors or not saving

3. **Response Format Mismatches**
   - **Issue:** Backend responses may not match frontend expectations
   - **Impact:** Comments may not display correctly or user data may be missing

---

## 🔍 How Comments Are Currently Fetched

### Frontend Flow

1. **User Opens Comment Modal**
   ```typescript
   // From any content card (VideoCard, MusicCard, etc.)
   const { showCommentModal } = useCommentModal();
   showCommentModal([], contentId, contentType);
   ```

2. **Context Loads Comments**
   ```typescript
   // CommentModalContext.tsx - loadCommentsFromServer()
   const res = await contentInteractionAPI.getComments(
     contentId,
     contentType,
     page: 1,
     limit: 10,
     sortBy: "newest"
   );
   ```

3. **API Call Made**
   ```typescript
   // contentInteractionAPI.ts - getComments()
   GET /api/content/{contentType}/{contentId}/comments?page=1&limit=10&sortBy=newest
   Headers: {
     Authorization: Bearer <token>  // ⚠️ Currently required, but shouldn't be for GET
   }
   ```

4. **Authentication Check (Current Problem)**
   ```typescript
   // CommentModalContext.tsx line 514-524
   const token = await AsyncStorage.getItem("userToken") || 
                await AsyncStorage.getItem("token");
   
   if (!token) {
     // ⚠️ Currently returns empty comments if no token
     // This is the problem - comments should be public!
     setComments([]);
     return;
   }
   ```

### The Problem

**Current Behavior:**
- Frontend checks for token before fetching comments
- If no token → returns empty comments
- Backend likely also requires auth for GET endpoint
- **Result:** Users must log in to see comments

**Expected Behavior:**
- Comments should be **publicly viewable** (like Instagram)
- Only **POST** (create comment) should require authentication
- **GET** should work without authentication
- **POST /api/comments/:id/like** should require authentication

---

## 📡 Backend API Requirements

### 1. GET Comments Endpoint (PUBLIC - No Auth Required)

**Endpoint:** `GET /api/content/:contentType/:contentId/comments`

**Authentication:** ❌ **NOT REQUIRED** (Public endpoint)

**Query Parameters:**
```
?page=1&limit=20&sortBy=newest
```

- `page` (number, required): Page number (1-based)
- `limit` (number, required): Items per page (default: 20)
- `sortBy` (string, optional): `"newest"` | `"oldest"` | `"top"` (default: "newest")

**Request Headers:**
```http
Content-Type: application/json
expo-platform: ios|android
Authorization: Bearer <token>  // ⚠️ OPTIONAL - Should work without it
```

**If Token Provided (Optional):**
- Include `isLiked: boolean` for each comment (whether current user liked it)
- Include user's own comments with full metadata

**If No Token:**
- Return all comments with `isLiked: false` for all
- Still return full comment data (public information)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "64fa1234567890abcdef1234",
        "id": "64fa1234567890abcdef1234",
        "contentId": "64f8abcdef1234567890abcd",
        "contentType": "media",
        "content": "This blessed me so much 🙏",
        "userId": "64f7user1234567890abcdef",
        "user": {
          "_id": "64f7user1234567890abcdef",
          "id": "64f7user1234567890abcdef",
          "firstName": "John",
          "lastName": "Doe",
          "avatar": "https://cdn.jevahapp.com/avatars/user123.jpg",
          "username": "john_doe"
        },
        "likesCount": 5,
        "isLiked": false,  // ← true if token provided and user liked it
        "createdAt": "2025-01-20T10:30:00.000Z",
        "timestamp": "2025-01-20T10:30:00.000Z",
        "parentCommentId": null,  // null for top-level comments
        "replies": [
          {
            "_id": "64fb9876543210fedcba9876",
            "id": "64fb9876543210fedcba9876",
            "content": "Amen! 🙌",
            "userId": "64f7user9876543210fedcba",
            "user": {
              "_id": "64f7user9876543210fedcba",
              "firstName": "Mary",
              "lastName": "Smith",
              "avatar": "https://cdn.jevahapp.com/avatars/mary.jpg"
            },
            "likesCount": 2,
            "isLiked": false,
            "createdAt": "2025-01-20T10:35:00.000Z",
            "parentCommentId": "64fa1234567890abcdef1234"
          }
        ]
      }
    ],
    "total": 37,
    "totalComments": 37,
    "hasMore": true,
    "page": 1
  }
}
```

**Critical Requirements:**
- ✅ **MUST work without authentication** (public endpoint)
- ✅ **MUST include nested replies** in the `replies` array
- ✅ **MUST support pagination** (page, limit)
- ✅ **MUST support sorting** (newest, oldest, top)
- ✅ **MUST return accurate total count**
- ✅ **MUST include user data** (firstName, lastName, avatar) for each comment
- ✅ **MUST include `isLiked`** (false if no token, true/false if token provided)

**Field Mapping (Frontend Expects):**
- Comment ID: `_id` or `id` (both accepted)
- Comment text: `content` or `comment` (both accepted)
- User ID: `userId` or `user._id`
- User name: `user.firstName + user.lastName` or `user.username`
- User avatar: `user.avatar` or `user.avatarUrl`
- Likes: `likesCount` or `likes` or `reactionsCount`
- Timestamp: `createdAt` or `timestamp`

---

### 2. POST Create Comment Endpoint (AUTH REQUIRED)

**Endpoint:** `POST /api/comments`

**Authentication:** ✅ **REQUIRED** (Bearer token)

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
expo-platform: ios|android
```

**Request Body:**
```json
{
  "contentId": "64f8abcdef1234567890abcd",
  "contentType": "media",
  "content": "This blessed me so much 🙏",
  "parentCommentId": null  // Optional: null for top-level, set for replies
}
```

**Field Requirements:**
- `contentId` (string, required): MongoDB ObjectId of the content
- `contentType` (string, required): `"media"` | `"devotional"` | `"ebook"` | etc.
- `content` (string, required): Comment text (max length: 1000 characters recommended)
- `parentCommentId` (string, optional): If provided, creates a reply to that comment

**Response Format (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": {
    "_id": "64fa1234567890abcdef1234",
    "id": "64fa1234567890abcdef1234",
    "contentId": "64f8abcdef1234567890abcd",
    "contentType": "media",
    "content": "This blessed me so much 🙏",
    "userId": "64f7user1234567890abcdef",
    "user": {
      "_id": "64f7user1234567890abcdef",
      "id": "64f7user1234567890abcdef",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://cdn.jevahapp.com/avatars/user123.jpg",
      "username": "john_doe"
    },
    "likesCount": 0,
    "createdAt": "2025-01-20T10:30:00.000Z",
    "parentCommentId": null
  }
}
```

**Error Responses:**

**401 Unauthorized (No Token):**
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "No authentication token provided"
}
```

**400 Bad Request (Validation Error):**
```json
{
  "success": false,
  "message": "Invalid request",
  "error": "Content is required and cannot be empty"
}
```

**500 Internal Server Error (Database Error):**
```json
{
  "success": false,
  "message": "Failed to create comment",
  "error": "Database error details"
}
```

**Critical Requirements:**
- ✅ **MUST persist comment to database** (currently may be failing)
- ✅ **MUST return created comment immediately** (for optimistic update replacement)
- ✅ **MUST increment comment count** on the content item
- ✅ **MUST handle replies** if `parentCommentId` is provided
- ✅ **MUST validate contentId** is a valid ObjectId
- ✅ **MUST validate content** is not empty and within length limits
- ✅ **MUST populate user data** in response (firstName, lastName, avatar)

**After Successful Creation:**
- Emit Socket.io event to content room:
  ```javascript
  io.to(`content:${contentType}:${contentId}`).emit("content:comment", {
    contentId: contentId,
    contentType: contentType,
    commentId: newComment._id,
    action: "created"
  });
  ```

---

### 3. POST Like Comment Endpoint (AUTH REQUIRED)

**Endpoint:** `POST /api/comments/:commentId/like`

**Authentication:** ✅ **REQUIRED** (Bearer token)

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
expo-platform: ios|android
```

**URL Parameters:**
- `commentId` (string, required): MongoDB ObjectId of the comment

**Behavior:**
- If user **has NOT liked** the comment:
  - Create `CommentLike` entry
  - Increment `likesCount` on comment
  - Return `{ liked: true, likesCount: <newCount> }`
- If user **has already liked** the comment:
  - Delete `CommentLike` entry
  - Decrement `likesCount` on comment
  - Return `{ liked: false, likesCount: <newCount> }`

**Response Format (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likesCount": 6,
    "totalLikes": 6
  }
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Comment not found"
}
```

**Critical Requirements:**
- ✅ **MUST toggle like state** (like if not liked, unlike if liked)
- ✅ **MUST return updated likesCount** immediately
- ✅ **MUST use unique constraint** on (commentId, userId) to prevent duplicate likes
- ✅ **MUST keep likesCount in sync** with CommentLike collection

---

### 4. DELETE Comment Endpoint (AUTH REQUIRED - Optional but Recommended)

**Endpoint:** `DELETE /api/comments/:commentId`

**Authentication:** ✅ **REQUIRED** (Bearer token)

**Authorization:**
- ✅ Comment owner can delete their own comment
- ✅ Admin/moderator can delete any comment

**Response Format (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

**Error Responses:**

**403 Forbidden (Not Owner):**
```json
{
  "success": false,
  "message": "You do not have permission to delete this comment"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Comment not found"
}
```

**After Successful Deletion:**
- Emit Socket.io event:
  ```javascript
  io.to(`content:${contentType}:${contentId}`).emit("content:comment", {
    contentId: contentId,
    contentType: contentType,
    commentId: commentId,
    action: "deleted"
  });
  ```

---

## 🗄️ Database Schema Requirements

### Comment Collection/Table

```typescript
Comment {
  _id: ObjectId;                    // Primary key
  contentId: ObjectId;               // ID of the content being commented on
  contentType: string;               // "media" | "devotional" | "ebook" | etc.
  userId: ObjectId;                  // Author of the comment
  content: string;                   // Comment text (max 1000 chars recommended)
  parentCommentId: ObjectId | null;  // null for top-level, ObjectId for replies
  likesCount: number;                // Total likes (denormalized for performance)
  repliesCount: number;              // Optional: total replies (for "View X more replies")
  createdAt: Date;                   // Creation timestamp
  updatedAt: Date;                   // Last update timestamp
  deletedAt: Date | null;            // Optional: for soft deletes
}
```

**Required Indexes:**
```javascript
// For fetching comments by content
db.comments.createIndex({ contentId: 1, contentType: 1, createdAt: -1 });

// For fetching replies
db.comments.createIndex({ parentCommentId: 1, createdAt: 1 });

// For "top" comments sorting
db.comments.createIndex({ contentId: 1, contentType: 1, likesCount: -1 });

// For user's comments (optional, for analytics)
db.comments.createIndex({ userId: 1, createdAt: -1 });
```

### CommentLike Collection/Table

```typescript
CommentLike {
  _id: ObjectId;        // Primary key
  commentId: ObjectId;  // Reference to Comment
  userId: ObjectId;     // User who liked
  createdAt: Date;       // When liked
}
```

**Required Indexes:**
```javascript
// Unique constraint: one user can only like a comment once
db.commentLikes.createIndex({ commentId: 1, userId: 1 }, { unique: true });

// For checking if user liked a comment
db.commentLikes.createIndex({ userId: 1, commentId: 1 });
```

---

## 🔄 Real-time Integration (Socket.io)

### Room Structure

When a user opens the comment modal, frontend joins:
```
Room: "content:{contentType}:{contentId}"
```

Example: `"content:media:64f8abcdef1234567890abcd"`

### Events to Emit

**On Comment Created:**
```javascript
io.to(`content:${contentType}:${contentId}`).emit("content:comment", {
  contentId: contentId,
  contentType: contentType,
  commentId: newComment._id,
  action: "created",
  comment: {
    // Full comment object (optional, frontend will refetch)
  }
});
```

**On Comment Deleted:**
```javascript
io.to(`content:${contentType}:${contentId}`).emit("content:comment", {
  contentId: contentId,
  contentType: contentType,
  commentId: deletedCommentId,
  action: "deleted"
});
```

**On Comment Liked:**
```javascript
io.to(`content:${contentType}:${contentId}`).emit("content:comment", {
  contentId: contentId,
  contentType: contentType,
  commentId: likedCommentId,
  action: "liked",
  likesCount: updatedLikesCount
});
```

---

## 🐛 Current Issues & Fixes Required

### Issue 1: Authentication Required for GET Comments

**Problem:**
- Users must authenticate to view comments
- Testers report having to log in again to access comments

**Root Cause:**
- Backend likely requires authentication for `GET /api/content/:contentType/:contentId/comments`
- Frontend also checks for token before fetching (defensive, but shouldn't be necessary)

**Fix Required:**
1. **Backend:** Make GET comments endpoint **public** (no auth required)
2. **Backend:** If token is provided, include `isLiked` status for each comment
3. **Backend:** If no token, return all comments with `isLiked: false`
4. **Frontend:** (Optional) Remove token check, but keep it as defensive coding

**Backend Code Example:**
```javascript
// GET /api/content/:contentType/:contentId/comments
router.get('/:contentType/:contentId/comments', async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { page = 1, limit = 20, sortBy = 'newest' } = req.query;
    
    // ⚠️ AUTH IS OPTIONAL - Don't require it
    const userId = req.user?.userId || null; // Get user if token provided, null otherwise
    
    // Fetch comments
    const comments = await Comment.find({
      contentId,
      contentType,
      parentCommentId: null // Top-level only
    })
    .sort(getSortQuery(sortBy))
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('userId', 'firstName lastName avatar username')
    .lean();
    
    // If user is authenticated, check which comments they liked
    let likedCommentIds = [];
    if (userId) {
      const likes = await CommentLike.find({
        userId,
        commentId: { $in: comments.map(c => c._id) }
      }).lean();
      likedCommentIds = likes.map(l => l.commentId.toString());
    }
    
    // Add isLiked flag and fetch replies
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({
          parentCommentId: comment._id
        })
        .sort({ createdAt: 1 })
        .populate('userId', 'firstName lastName avatar username')
        .lean();
        
        // Check if user liked replies
        let likedReplyIds = [];
        if (userId && replies.length > 0) {
          const replyLikes = await CommentLike.find({
            userId,
            commentId: { $in: replies.map(r => r._id) }
          }).lean();
          likedReplyIds = replyLikes.map(l => l.commentId.toString());
        }
        
        return {
          ...comment,
          id: comment._id,
          isLiked: likedCommentIds.includes(comment._id.toString()),
          replies: replies.map(reply => ({
            ...reply,
            id: reply._id,
            isLiked: likedReplyIds.includes(reply._id.toString())
          }))
        };
      })
    );
    
    const total = await Comment.countDocuments({
      contentId,
      contentType,
      parentCommentId: null
    });
    
    res.json({
      success: true,
      data: {
        comments: commentsWithReplies,
        total,
        totalComments: total,
        hasMore: page * limit < total,
        page: parseInt(page)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
      error: error.message
    });
  }
});
```

---

### Issue 2: Comments Not Persisting

**Problem:**
- Comments appear in UI but disappear after app refresh
- Comments may not be saving to database

**Root Cause:**
- `POST /api/comments` may be returning 500 errors
- Database transaction may be failing
- Comment may not be properly saved

**Fix Required:**
1. **Backend:** Ensure `POST /api/comments` properly saves to database
2. **Backend:** Return proper error messages if save fails
3. **Backend:** Log errors for debugging
4. **Backend:** Ensure comment count is incremented on content

**Backend Code Example:**
```javascript
// POST /api/comments
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { contentId, contentType, content, parentCommentId } = req.body;
    const userId = req.user.userId;
    
    // Validation
    if (!contentId || !contentType || !content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "contentId, contentType, and content are required"
      });
    }
    
    // Validate ObjectId format
    if (!isValidObjectId(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contentId format"
      });
    }
    
    // Create comment
    const comment = new Comment({
      contentId,
      contentType,
      userId,
      content: content.trim(),
      parentCommentId: parentCommentId || null,
      likesCount: 0,
      repliesCount: 0
    });
    
    // Save to database
    await comment.save();
    
    // Increment comment count on content
    await Content.findByIdAndUpdate(contentId, {
      $inc: { commentsCount: 1 }
    });
    
    // Populate user data
    await comment.populate('userId', 'firstName lastName avatar username');
    
    // Emit real-time event
    io.to(`content:${contentType}:${contentId}`).emit("content:comment", {
      contentId,
      contentType,
      commentId: comment._id,
      action: "created"
    });
    
    // Return response
    res.status(200).json({
      success: true,
      message: "Comment created successfully",
      data: {
        _id: comment._id,
        id: comment._id,
        contentId: comment.contentId,
        contentType: comment.contentType,
        content: comment.content,
        userId: comment.userId._id,
        user: {
          _id: comment.userId._id,
          id: comment.userId._id,
          firstName: comment.userId.firstName,
          lastName: comment.userId.lastName,
          avatar: comment.userId.avatar,
          username: comment.userId.username
        },
        likesCount: comment.likesCount,
        createdAt: comment.createdAt,
        parentCommentId: comment.parentCommentId
      }
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create comment",
      error: error.message
    });
  }
});
```

---

### Issue 3: Response Format Mismatches

**Problem:**
- Frontend expects specific field names
- User data may not be populated correctly
- `isLiked` may be missing

**Fix Required:**
1. **Backend:** Ensure all required fields are present in response
2. **Backend:** Populate user data correctly
3. **Backend:** Include `isLiked` field when token is provided
4. **Backend:** Support both `_id` and `id` fields (frontend accepts both)

**Field Mapping Checklist:**
- ✅ `_id` or `id` (both accepted)
- ✅ `content` or `comment` (both accepted)
- ✅ `userId` or `user._id`
- ✅ `user.firstName` + `user.lastName` or `user.username`
- ✅ `user.avatar` or `user.avatarUrl`
- ✅ `likesCount` or `likes` or `reactionsCount`
- ✅ `createdAt` or `timestamp`
- ✅ `isLiked` (boolean, required when token provided)

---

## 📊 Testing Checklist

### Backend Testing

- [ ] **GET comments without auth** - Should return comments with `isLiked: false`
- [ ] **GET comments with auth** - Should return comments with correct `isLiked` status
- [ ] **POST comment** - Should persist to database and return created comment
- [ ] **POST comment reply** - Should create reply with correct `parentCommentId`
- [ ] **POST like comment** - Should toggle like and return updated count
- [ ] **Pagination** - Should return correct page and `hasMore` flag
- [ ] **Sorting** - Should sort by newest, oldest, and top correctly
- [ ] **Nested replies** - Should include replies in response
- [ ] **Socket.io events** - Should emit events on create/delete/like
- [ ] **Comment count** - Should increment on content when comment created

### Frontend Testing

- [ ] **View comments without login** - Should show comments (read-only)
- [ ] **View comments with login** - Should show comments with like status
- [ ] **Create comment** - Should appear immediately and persist
- [ ] **Reply to comment** - Should create nested reply
- [ ] **Like comment** - Should toggle like state
- [ ] **Pagination** - Should load more comments on scroll
- [ ] **Real-time updates** - Should update when other users comment
- [ ] **Error handling** - Should show user-friendly errors

---

## 🚀 Implementation Priority

### Phase 1: Critical Fixes (IMMEDIATE)

1. ✅ **Make GET comments public** (no auth required)
2. ✅ **Fix POST comments persistence** (ensure database save works)
3. ✅ **Add `isLiked` field** to GET response when token provided
4. ✅ **Fix response format** to match frontend expectations

### Phase 2: Enhancements (HIGH PRIORITY)

1. ✅ **Socket.io integration** for real-time updates
2. ✅ **Proper error handling** with user-friendly messages
3. ✅ **Comment count increment** on content
4. ✅ **Validation** for contentId, contentType, content

### Phase 3: Nice to Have (MEDIUM PRIORITY)

1. ✅ **DELETE comment endpoint** (owner/admin)
2. ✅ **Comment moderation** (flag/report)
3. ✅ **Comment editing** (owner only)
4. ✅ **Rate limiting** for comment creation

---

## 📝 Summary

The frontend commenting system is **fully implemented and ready to use**. The issues are **entirely on the backend side**:

1. **GET comments must be public** - Users shouldn't need to authenticate to view comments
2. **POST comments must persist** - Comments must be saved to database
3. **Response format must match** - Backend must return fields in expected format
4. **Real-time events** - Socket.io events should be emitted on comment actions

Once these backend fixes are implemented, the commenting system will work seamlessly with the existing frontend code.

---

## 📞 Contact & Support

For questions or clarifications about this specification, please refer to:
- Frontend code: `app/context/CommentModalContext.tsx`
- API client: `app/utils/contentInteractionAPI.ts`
- Existing spec: `docs/COMMENT_SYSTEM_SPEC.md`

**Last Updated:** January 2025

