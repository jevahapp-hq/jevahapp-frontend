# Forum Thread Page - Dynamic Content Backend Specification

**Version**: 1.0  
**Last Updated**: 2024-12-19  
**Status**: ✅ Ready for Integration  
**Frontend Status**: ⚠️ Currently Using Hardcoded Data

---

## 📋 Overview

The Thread Page (`ThreadScreen.tsx`) currently displays hardcoded post and comment data. This document specifies the backend API endpoints needed to make the thread page fully dynamic, displaying real post content, comments, and user interactions.

---

## 🎯 Current State (Hardcoded)

### What's Currently Hardcoded:

1. **Main Post**:
   - Post content, author name, timestamp
   - Likes count, comments count
   - Post ID is passed via router params but not used

2. **Comments (Replies)**:
   - All comments are hardcoded
   - No API calls to fetch comments
   - Comment creation not implemented

3. **User Info**:
   - Current user avatar is hardcoded ("JD")
   - No dynamic user data

4. **Interactions**:
   - Like button doesn't work
   - Comment creation doesn't work

---

## 🔄 Required Flow

### User Journey:

```
1. User clicks on a post in ForumScreen
   ↓
2. Router navigates to ThreadScreen with postId param
   ↓
3. ThreadScreen loads:
   a. Fetch single post by ID (mainPost)
   b. Fetch comments for that post
   c. Fetch current user info (for avatar)
   ↓
4. Display dynamic content:
   - Post content, author, timestamp
   - All comments with nested replies
   - Like/unlike functionality
   - Comment creation functionality
```

---

## 🔌 Required API Endpoints

### 1. Get Single Post by ID ⚠️ **NEW ENDPOINT NEEDED**

**Endpoint**: `GET /api/community/forum/posts/{postId}`

**Authentication**: Optional (public endpoint, but auth recommended for user-specific data like `userLiked`)

**URL Parameters**:
- `postId` (string, required): MongoDB ObjectId of the post

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "id": "507f1f77bcf86cd799439021",
    "forumId": "507f1f77bcf86cd799439020",
    "userId": "507f191e810c19729de860eb",
    "content": "I posted a prayer in our community group for guidance on a difficult decision I had to make at work. I was torn between two options and didn't know which path to take. The support and prayers I received from this community were incredible.\n\nMatthew 18:19 says, \"Again I say to you, if two of you agree on earth about anything they ask, it will be done for them by my Father in heaven.\"\n\nThrough your prayers and the peace that came over me, I was able to make the right decision. I can see God's hand in it all, and the outcome has been better than I could have imagined. Thank you all for being such a wonderful community and for lifting me up in prayer. 🙏✨",
    "embeddedLinks": [
      {
        "url": "https://www.tevah.com/watch?v=0omiX-5T5xk",
        "title": "God is Good by Apostle Emmanuel Iren",
        "description": "Accelerate Conference 2025",
        "thumbnail": "https://example.com/thumb.jpg",
        "type": "video"
      }
    ],
    "tags": ["prayer", "testimony"],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "likesCount": 1200,
    "commentsCount": 1200,
    "userLiked": false,
    "author": {
      "_id": "507f191e810c19729de860eb",
      "username": "lizzy_dahunsi",
      "firstName": "Lizzy",
      "lastName": "Dahunsi",
      "avatarUrl": "https://example.com/avatar.jpg"
    },
    "forum": {
      "_id": "507f1f77bcf86cd799439020",
      "title": "Prayer Requests",
      "description": "Share your prayer requests"
    }
  }
}
```

**Error Responses**:

**404 - Post Not Found**:
```json
{
  "success": false,
  "error": "Post not found"
}
```

**400 - Invalid Post ID**:
```json
{
  "success": false,
  "error": "Invalid post ID"
}
```

**Critical Requirements**:
- ✅ Must populate `author` field with user details (`username`, `firstName`, `lastName`, `avatarUrl`)
- ✅ Must populate `forum` field with forum details (`_id`, `title`, `description`)
- ✅ Must include `userLiked` boolean (true if authenticated user has liked the post)
- ✅ Must include `likesCount` and `commentsCount`
- ✅ Must include `embeddedLinks` array if post has embedded links
- ✅ Must include `tags` array if post has tags
- ✅ Timestamps must be ISO 8601 format strings

---

### 2. Get Comments for Post ✅ **EXISTS** (Verify Implementation)

**Endpoint**: `GET /api/community/forum/posts/{postId}/comments`

**Authentication**: Optional (public endpoint, but auth recommended for user-specific data)

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `includeReplies` (boolean, optional): Include nested replies (default: true)

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "comment123",
        "id": "comment123",
        "postId": "507f1f77bcf86cd799439021",
        "userId": "user456",
        "content": "Congratulations",
        "parentCommentId": null,
        "createdAt": "2024-01-15T10:35:00.000Z",
        "updatedAt": "2024-01-15T10:35:00.000Z",
        "likesCount": 5,
        "userLiked": false,
        "author": {
          "_id": "user456",
          "username": "elizabeth",
          "firstName": "Elizabeth",
          "lastName": "",
          "avatarUrl": "https://example.com/avatar2.jpg"
        },
        "replies": [
          {
            "_id": "reply123",
            "id": "reply123",
            "postId": "507f1f77bcf86cd799439021",
            "userId": "507f191e810c19729de860eb",
            "content": "Oh yes! Our God answers prayers",
            "parentCommentId": "comment123",
            "createdAt": "2024-01-15T10:40:00.000Z",
            "updatedAt": "2024-01-15T10:40:00.000Z",
            "likesCount": 2,
            "userLiked": false,
            "author": {
              "_id": "507f191e810c19729de860eb",
              "username": "lizzy_dahunsi",
              "firstName": "Lizzy",
              "lastName": "Dahunsi",
              "avatarUrl": "https://example.com/avatar.jpg"
            },
            "replies": []
          }
        ]
      },
      {
        "_id": "comment124",
        "id": "comment124",
        "postId": "507f1f77bcf86cd799439021",
        "userId": "user789",
        "content": "Your testimony shall be permanent",
        "parentCommentId": null,
        "createdAt": "2024-01-15T10:45:00.000Z",
        "updatedAt": "2024-01-15T10:45:00.000Z",
        "likesCount": 3,
        "userLiked": true,
        "author": {
          "_id": "user789",
          "username": "grace",
          "firstName": "Grace",
          "lastName": "",
          "avatarUrl": "https://example.com/avatar3.jpg"
        },
        "replies": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

**Critical Requirements**:
- ✅ Must return nested structure with `replies` array inside each comment
- ✅ Must populate `author` field for each comment and reply
- ✅ Must include `userLiked` boolean for each comment/reply
- ✅ Must sort by `createdAt` ascending (oldest first) for top-level comments
- ✅ Must sort replies by `createdAt` ascending within each comment
- ✅ Must exclude replies from top-level comments array (only include in `replies` field)
- ✅ Must include `parentCommentId` to identify reply relationships
- ✅ Must include pagination metadata

---

### 3. Create Comment ✅ **EXISTS** (Verify Implementation)

**Endpoint**: `POST /api/community/forum/posts/{postId}/comments`

**Authentication**: **REQUIRED** (Bearer token)

**Request Body**:

```json
{
  "content": "This is a great post!",
  "parentCommentId": null
}
```

**For Replies**:
```json
{
  "content": "I agree with you!",
  "parentCommentId": "comment123"
}
```

**Success Response (201)**:

```json
{
  "success": true,
  "data": {
    "_id": "newcomment123",
    "id": "newcomment123",
    "postId": "507f1f77bcf86cd799439021",
    "userId": "currentuser123",
    "content": "This is a great post!",
    "parentCommentId": null,
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z",
    "likesCount": 0,
    "userLiked": false,
    "author": {
      "_id": "currentuser123",
      "username": "current_user",
      "firstName": "Current",
      "lastName": "User",
      "avatarUrl": "https://example.com/current-avatar.jpg"
    },
    "replies": []
  }
}
```

**Critical Requirements**:
- ✅ Must increment `commentsCount` on the post
- ✅ Must populate `author` field with current user details
- ✅ Must return same structure as GET comments endpoint
- ✅ If `parentCommentId` is provided, validate that parent comment exists
- ✅ If `parentCommentId` is provided, validate that parent comment belongs to the same post

---

### 4. Like/Unlike Post ✅ **EXISTS** (Verify Implementation)

**Endpoint**: `POST /api/community/forum/posts/{postId}/like`

**Authentication**: **REQUIRED** (Bearer token)

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likesCount": 1201
  }
}
```

**Critical Requirements**:
- ✅ Must toggle like status (if already liked, unlike; if not liked, like)
- ✅ Must return updated `likesCount`
- ✅ Must return `liked` boolean indicating current state
- ✅ Must update `likesCount` on the post document

---

### 5. Like/Unlike Comment ✅ **EXISTS** (Verify Implementation)

**Endpoint**: `POST /api/community/forum/comments/{commentId}/like`

**Authentication**: **REQUIRED** (Bearer token)

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likesCount": 6
  }
}
```

**Critical Requirements**:
- ✅ Must toggle like status
- ✅ Must return updated `likesCount`
- ✅ Must return `liked` boolean indicating current state
- ✅ Must work for both top-level comments and nested replies

---

### 6. Get Current User Info ✅ **EXISTS** (Verify Available Fields)

**Endpoint**: `GET /api/auth/me` or similar user profile endpoint

**Authentication**: **REQUIRED** (Bearer token)

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "_id": "currentuser123",
    "username": "current_user",
    "firstName": "Current",
    "lastName": "User",
    "avatarUrl": "https://example.com/current-avatar.jpg",
    "email": "user@example.com"
  }
}
```

**Critical Requirements**:
- ✅ Must return `_id`, `username`, `firstName`, `lastName`, `avatarUrl`
- ✅ Used to display current user's avatar in comment input

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ThreadScreen.tsx                          │
│  (Receives postId via router params)                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  GET Single Post │              │  GET Comments    │
│  /posts/{postId} │              │  /posts/{postId}/ │
│                  │              │  comments        │
└──────────────────┘              └──────────────────┘
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Display Main    │              │  Display Comments│
│  Post Content    │              │  with Replies    │
└──────────────────┘              └──────────────────┘
        │                                   │
        │                                   │
        └───────────┬───────────────────────┘
                    │
                    ▼
        ┌──────────────────┐
        │  User Interactions│
        │  - Like Post      │
        │  - Create Comment  │
        │  - Like Comment   │
        └──────────────────┘
```

---

## 🔧 Backend Implementation Guide

### 1. Get Single Post Endpoint (NEW)

```javascript
// GET /api/community/forum/posts/:postId
router.get('/forum/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Validate postId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid post ID"
      });
    }
    
    // Find post
    const post = await Post.findById(postId)
      .populate('userId', 'username firstName lastName avatarUrl')
      .populate('forumId', 'title description')
      .lean();
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found"
      });
    }
    
    // Check if user has liked this post (if authenticated)
    let userLiked = false;
    if (req.user) {
      const like = await PostLike.findOne({
        postId: post._id,
        userId: req.user._id
      });
      userLiked = !!like;
    }
    
    // Format response
    const responseData = {
      _id: post._id.toString(),
      id: post._id.toString(),
      forumId: post.forumId._id.toString(),
      userId: post.userId._id.toString(),
      content: post.content,
      embeddedLinks: post.embeddedLinks || [],
      tags: post.tags || [],
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      userLiked: userLiked,
      author: {
        _id: post.userId._id.toString(),
        username: post.userId.username,
        firstName: post.userId.firstName,
        lastName: post.userId.lastName,
        avatarUrl: post.userId.avatarUrl
      },
      forum: {
        _id: post.forumId._id.toString(),
        title: post.forumId.title,
        description: post.forumId.description
      }
    };
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error getting post:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch post"
    });
  }
});
```

### 2. Get Comments Endpoint (VERIFY)

```javascript
// GET /api/community/forum/posts/:postId/comments
router.get('/forum/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20, includeReplies = true } = req.query;
    
    // Validate postId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid post ID"
      });
    }
    
    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found"
      });
    }
    
    // Get top-level comments (parentCommentId is null)
    const query = {
      postId: post._id,
      parentCommentId: null
    };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const comments = await Comment.find(query)
      .sort({ createdAt: 1 }) // Oldest first
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username firstName lastName avatarUrl')
      .lean();
    
    // Get total count
    const total = await Comment.countDocuments(query);
    
    // For each comment, get replies if includeReplies is true
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        let replies = [];
        
        if (includeReplies) {
          replies = await Comment.find({
            postId: post._id,
            parentCommentId: comment._id
          })
            .sort({ createdAt: 1 }) // Oldest first
            .populate('userId', 'username firstName lastName avatarUrl')
            .lean();
          
          // Check if user has liked each reply
          if (req.user) {
            replies = await Promise.all(
              replies.map(async (reply) => {
                const like = await CommentLike.findOne({
                  commentId: reply._id,
                  userId: req.user._id
                });
                return {
                  ...reply,
                  _id: reply._id.toString(),
                  id: reply._id.toString(),
                  userLiked: !!like,
                  likesCount: reply.likesCount || 0,
                  author: {
                    _id: reply.userId._id.toString(),
                    username: reply.userId.username,
                    firstName: reply.userId.firstName,
                    lastName: reply.userId.lastName,
                    avatarUrl: reply.userId.avatarUrl
                  },
                  replies: [] // Replies don't have nested replies
                };
              })
            );
          }
        }
        
        // Check if user has liked this comment
        let userLiked = false;
        if (req.user) {
          const like = await CommentLike.findOne({
            commentId: comment._id,
            userId: req.user._id
          });
          userLiked = !!like;
        }
        
        return {
          ...comment,
          _id: comment._id.toString(),
          id: comment._id.toString(),
          userLiked: userLiked,
          likesCount: comment.likesCount || 0,
          author: {
            _id: comment.userId._id.toString(),
            username: comment.userId.username,
            firstName: comment.userId.firstName,
            lastName: comment.userId.lastName,
            avatarUrl: comment.userId.avatarUrl
          },
          replies: replies.map(reply => ({
            ...reply,
            _id: reply._id.toString(),
            id: reply._id.toString()
          }))
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        comments: commentsWithReplies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / parseInt(limit)),
          hasMore: skip + comments.length < total
        }
      }
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch comments"
    });
  }
});
```

---

## ✅ Testing Checklist

### Get Single Post Endpoint

- [ ] Returns post with correct structure
- [ ] Populates author field correctly
- [ ] Populates forum field correctly
- [ ] Returns correct `userLiked` status for authenticated users
- [ ] Returns `userLiked: false` for unauthenticated users
- [ ] Returns 404 for non-existent post
- [ ] Returns 400 for invalid post ID
- [ ] Includes embeddedLinks if present
- [ ] Includes tags if present
- [ ] Timestamps are ISO 8601 format

### Get Comments Endpoint

- [ ] Returns nested structure with replies
- [ ] Populates author for each comment and reply
- [ ] Returns correct `userLiked` status
- [ ] Sorts top-level comments by createdAt ascending
- [ ] Sorts replies by createdAt ascending
- [ ] Pagination works correctly
- [ ] Excludes replies from top-level array
- [ ] Returns empty array if no comments
- [ ] Returns 404 if post doesn't exist

### Create Comment Endpoint

- [ ] Creates top-level comment successfully
- [ ] Creates reply to comment successfully
- [ ] Validates parentCommentId exists
- [ ] Validates parentCommentId belongs to same post
- [ ] Increments commentsCount on post
- [ ] Returns populated author field
- [ ] Returns correct structure matching GET endpoint

### Like Post/Comment Endpoints

- [ ] Toggles like status correctly
- [ ] Returns updated likesCount
- [ ] Returns correct `liked` boolean
- [ ] Updates likesCount on post/comment document

---

## 📝 Summary

### Endpoints Status

| Endpoint | Status | Priority |
|----------|--------|----------|
| GET Single Post | ⚠️ **NEW - REQUIRED** | **HIGH** |
| GET Comments | ✅ Exists - Verify | **HIGH** |
| POST Create Comment | ✅ Exists - Verify | **HIGH** |
| POST Like Post | ✅ Exists - Verify | **MEDIUM** |
| POST Like Comment | ✅ Exists - Verify | **MEDIUM** |
| GET Current User | ✅ Exists - Verify | **MEDIUM** |

### Critical Requirements

1. ✅ **Get Single Post** endpoint must be implemented (currently missing)
2. ✅ **Comments** must be returned in nested structure with `replies` array
3. ✅ **Author** field must be populated for all posts and comments
4. ✅ **userLiked** boolean must be included for authenticated users
5. ✅ **Timestamps** must be ISO 8601 format strings
6. ✅ **Pagination** must be included for comments endpoint

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-19  
**Maintained By**: Frontend Team  
**For**: Backend Team Integration



