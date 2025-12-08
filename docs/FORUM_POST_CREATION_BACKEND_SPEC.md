# Forum Post Creation - Backend API Specification

**Version**: 1.0  
**Last Updated**: 2024-12-19  
**Status**: ✅ Ready for Integration  
**Frontend Status**: ✅ Implemented

---

## 📋 Overview

This document specifies the backend API requirements for creating posts within forums. Users can create posts (conversation threads) in forums they have access to, with support for embedded links, tags, and rich content.

---

## 🔌 API Endpoint

### Create Forum Post

**Endpoint**: `POST /api/community/forum/{forumId}/posts`

**Authentication**: **REQUIRED** (Bearer token)

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <your-token>
```

**URL Parameters**:
- `forumId` (string, required): MongoDB ObjectId of the forum

---

## 📥 Request Body

```json
{
  "content": "This message inspired me, thought to share",
  "embeddedLinks": [
    {
      "url": "https://www.tevah.com/watch?v=0omiX-5T5xk",
      "title": "God is Good by Apostle Emmanuel Iren",
      "description": "Accelerate Conference 2025",
      "thumbnail": "https://example.com/thumb.jpg",
      "type": "video"
    }
  ],
  "tags": ["inspiration", "video"]
}
```

### Field Specifications

#### `content` (Required)
- **Type**: `string`
- **Length**: 1-5000 characters (after trimming)
- **Validation**: 
  - Must not be empty after trimming whitespace
  - Must not exceed 5000 characters
- **Error Response**: 
  ```json
  {
    "success": false,
    "error": "Validation error: content must be between 1 and 5000 characters"
  }
  ```

#### `embeddedLinks` (Optional)
- **Type**: `Array<EmbeddedLink>`
- **Max Items**: 5 links
- **Validation**: 
  - If provided, must be an array
  - Maximum 5 items
  - Each item must have required fields

**EmbeddedLink Object**:
```typescript
{
  url: string;           // Required, valid URL format
  title?: string;        // Optional, max 200 characters
  description?: string;  // Optional, max 500 characters
  thumbnail?: string;    // Optional, valid URL format
  type: "video" | "article" | "resource" | "other";  // Required
}
```

**Validation Rules**:
- `url`: Required, must be valid URL format (http:// or https://)
- `title`: Optional, max 200 characters if provided
- `description`: Optional, max 500 characters if provided
- `thumbnail`: Optional, must be valid URL format if provided
- `type`: Required, must be one of: `"video"`, `"article"`, `"resource"`, `"other"`

**Error Responses**:
```json
// Too many links
{
  "success": false,
  "error": "Validation error: embeddedLinks cannot exceed 5 items"
}

// Invalid URL
{
  "success": false,
  "error": "Validation error: embeddedLinks[0].url must be a valid URL"
}

// Missing type
{
  "success": false,
  "error": "Validation error: embeddedLinks[0].type is required"
}
```

#### `tags` (Optional)
- **Type**: `Array<string>`
- **Max Items**: 10 tags
- **Max Length per Tag**: 50 characters
- **Validation**:
  - If provided, must be an array
  - Maximum 10 items
  - Each tag must be a non-empty string (after trimming)
  - Each tag must not exceed 50 characters

**Error Responses**:
```json
// Too many tags
{
  "success": false,
  "error": "Validation error: tags cannot exceed 10 items"
}

// Tag too long
{
  "success": false,
  "error": "Validation error: tags[0] cannot exceed 50 characters"
}
```

---

## 📤 Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "id": "507f1f77bcf86cd799439021",
    "forumId": "507f1f77bcf86cd799439020",
    "userId": "507f191e810c19729de860eb",
    "content": "This message inspired me, thought to share",
    "embeddedLinks": [
      {
        "url": "https://www.tevah.com/watch?v=0omiX-5T5xk",
        "title": "God is Good by Apostle Emmanuel Iren",
        "description": "Accelerate Conference 2025",
        "thumbnail": "https://example.com/thumb.jpg",
        "type": "video"
      }
    ],
    "tags": ["inspiration", "video"],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "likesCount": 0,
    "commentsCount": 0,
    "userLiked": false,
    "author": {
      "_id": "507f191e810c19729de860eb",
      "username": "joseph_eluwa",
      "firstName": "Joseph",
      "lastName": "Eluwa",
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

### Response Field Requirements

- ✅ `_id` and `id`: Both should be present (MongoDB ObjectId as string)
- ✅ `forumId`: Must match the URL parameter
- ✅ `userId`: Must match the authenticated user's ID
- ✅ `content`: Must match the request body (trimmed)
- ✅ `embeddedLinks`: Must match the request body (if provided)
- ✅ `tags`: Must match the request body (if provided)
- ✅ `createdAt` and `updatedAt`: ISO 8601 timestamp strings
- ✅ `likesCount`: Integer, defaults to 0
- ✅ `commentsCount`: Integer, defaults to 0
- ✅ `userLiked`: Boolean, defaults to false
- ✅ `author`: Populated user object with `_id`, `username`, `firstName`, `lastName`, `avatarUrl`
- ✅ `forum`: Populated forum object with `_id`, `title`, `description` (optional but recommended)

---

## ❌ Error Responses

### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "error": "Validation error: content must be between 1 and 5000 characters"
}
```

**Common Validation Errors**:
- `"content is required"`
- `"content must be between 1 and 5000 characters"`
- `"embeddedLinks cannot exceed 5 items"`
- `"embeddedLinks[0].url must be a valid URL"`
- `"embeddedLinks[0].type is required"`
- `"tags cannot exceed 10 items"`
- `"tags[0] cannot exceed 50 characters"`

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized: Authentication required"
}
```

**When**: No Bearer token provided or token is invalid/expired

### 404 Not Found - Forum Not Found

```json
{
  "success": false,
  "error": "Forum not found or inactive"
}
```

**When**: 
- Forum ID doesn't exist
- Forum exists but `isActive: false`
- Forum ID is not a valid MongoDB ObjectId

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to create post"
}
```

**When**: Database error, server error, or unexpected exception

---

## 🔧 Backend Implementation Requirements

### 1. Authentication & Authorization

```javascript
// Middleware: authenticate
// Must extract user from JWT token
const userId = req.user._id; // From authenticated middleware
```

### 2. Forum Validation

```javascript
// Validate forum exists and is active
const forum = await Forum.findById(forumId);
if (!forum) {
  return res.status(404).json({
    success: false,
    error: "Forum not found"
  });
}

if (!forum.isActive) {
  return res.status(404).json({
    success: false,
    error: "Forum not found or inactive"
  });
}
```

### 3. Request Validation

```javascript
const { content, embeddedLinks = [], tags = [] } = req.body;

// Validate content
if (!content || typeof content !== 'string') {
  return res.status(400).json({
    success: false,
    error: "Validation error: content is required"
  });
}

const trimmedContent = content.trim();
if (trimmedContent.length === 0) {
  return res.status(400).json({
    success: false,
    error: "Validation error: content cannot be empty"
  });
}

if (trimmedContent.length > 5000) {
  return res.status(400).json({
    success: false,
    error: "Validation error: content cannot exceed 5000 characters"
  });
}

// Validate embeddedLinks
if (embeddedLinks && !Array.isArray(embeddedLinks)) {
  return res.status(400).json({
    success: false,
    error: "Validation error: embeddedLinks must be an array"
  });
}

if (embeddedLinks.length > 5) {
  return res.status(400).json({
    success: false,
    error: "Validation error: embeddedLinks cannot exceed 5 items"
  });
}

// Validate each embedded link
for (let i = 0; i < embeddedLinks.length; i++) {
  const link = embeddedLinks[i];
  
  if (!link.url || typeof link.url !== 'string') {
    return res.status(400).json({
      success: false,
      error: `Validation error: embeddedLinks[${i}].url is required`
    });
  }
  
  // Validate URL format
  try {
    new URL(link.url);
  } catch {
    return res.status(400).json({
      success: false,
      error: `Validation error: embeddedLinks[${i}].url must be a valid URL`
    });
  }
  
  if (!link.type || !['video', 'article', 'resource', 'other'].includes(link.type)) {
    return res.status(400).json({
      success: false,
      error: `Validation error: embeddedLinks[${i}].type must be one of: video, article, resource, other`
    });
  }
  
  if (link.title && link.title.length > 200) {
    return res.status(400).json({
      success: false,
      error: `Validation error: embeddedLinks[${i}].title cannot exceed 200 characters`
    });
  }
  
  if (link.description && link.description.length > 500) {
    return res.status(400).json({
      success: false,
      error: `Validation error: embeddedLinks[${i}].description cannot exceed 500 characters`
    });
  }
  
  if (link.thumbnail) {
    try {
      new URL(link.thumbnail);
    } catch {
      return res.status(400).json({
        success: false,
        error: `Validation error: embeddedLinks[${i}].thumbnail must be a valid URL`
      });
    }
  }
}

// Validate tags
if (tags && !Array.isArray(tags)) {
  return res.status(400).json({
    success: false,
    error: "Validation error: tags must be an array"
  });
}

if (tags.length > 10) {
  return res.status(400).json({
    success: false,
    error: "Validation error: tags cannot exceed 10 items"
  });
}

for (let i = 0; i < tags.length; i++) {
  const tag = tags[i];
  if (typeof tag !== 'string' || tag.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: `Validation error: tags[${i}] must be a non-empty string`
    });
  }
  
  if (tag.trim().length > 50) {
    return res.status(400).json({
      success: false,
      error: `Validation error: tags[${i}] cannot exceed 50 characters`
    });
  }
}
```

### 4. Create Post

```javascript
// Create post
const post = await Post.create({
  forumId: forum._id,
  userId: req.user._id,
  content: trimmedContent,
  embeddedLinks: embeddedLinks.map(link => ({
    url: link.url.trim(),
    title: link.title?.trim() || undefined,
    description: link.description?.trim() || undefined,
    thumbnail: link.thumbnail?.trim() || undefined,
    type: link.type
  })),
  tags: tags.map(tag => tag.trim()).filter(tag => tag.length > 0),
  likesCount: 0,
  commentsCount: 0
});
```

### 5. Update Forum Stats

```javascript
// Increment postsCount on forum
await Forum.findByIdAndUpdate(forumId, {
  $inc: { postsCount: 1 }
});

// Update participantsCount if this is user's first post in forum
const existingPosts = await Post.countDocuments({
  forumId: forum._id,
  userId: req.user._id
});

if (existingPosts === 1) {
  // This is user's first post in this forum
  await Forum.findByIdAndUpdate(forumId, {
    $inc: { participantsCount: 1 }
  });
}
```

### 6. Populate & Return Response

```javascript
// Populate author and forum
await post.populate('userId', 'username firstName lastName avatarUrl');
await post.populate('forumId', 'title description');

// Format response
const responseData = {
  _id: post._id,
  id: post._id.toString(),
  forumId: post.forumId._id.toString(),
  userId: post.userId._id.toString(),
  content: post.content,
  embeddedLinks: post.embeddedLinks,
  tags: post.tags,
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
  likesCount: post.likesCount,
  commentsCount: post.commentsCount,
  userLiked: false,
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

res.status(201).json({
  success: true,
  data: responseData
});
```

---

## 📊 Database Schema

### Post Model

```javascript
{
  _id: ObjectId,
  forumId: ObjectId,        // Reference to Forum
  userId: ObjectId,         // Reference to User (author)
  content: String,          // 1-5000 characters
  embeddedLinks: [{
    url: String,            // Required
    title: String,          // Optional, max 200 chars
    description: String,     // Optional, max 500 chars
    thumbnail: String,      // Optional, URL
    type: String            // Required: "video" | "article" | "resource" | "other"
  }],                       // Max 5 items
  tags: [String],           // Max 10 items, each max 50 chars
  likesCount: Number,       // Default: 0
  commentsCount: Number,     // Default: 0
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes (Recommended)

```javascript
// For efficient querying
PostSchema.index({ forumId: 1, createdAt: -1 });  // Get posts by forum, newest first
PostSchema.index({ userId: 1 });                  // Get posts by user
PostSchema.index({ forumId: 1, userId: 1 });      // Check if user has posted in forum
```

---

## ✅ Testing Checklist

### Pre-Integration Testing

- [ ] Endpoint accepts valid POST request with authentication
- [ ] Endpoint rejects requests without authentication (401)
- [ ] Endpoint validates forumId parameter (404 if invalid)
- [ ] Endpoint validates content field (400 if missing/invalid)
- [ ] Endpoint validates embeddedLinks array (400 if invalid)
- [ ] Endpoint validates tags array (400 if invalid)

### Post Creation Testing

- [ ] Post created successfully with minimal data (content only)
- [ ] Post created successfully with embeddedLinks
- [ ] Post created successfully with tags
- [ ] Post created successfully with all fields
- [ ] Forum postsCount increments after creation
- [ ] Forum participantsCount increments if first post by user
- [ ] Response includes populated author object
- [ ] Response includes populated forum object
- [ ] Response has correct structure matching spec

### Validation Testing

- [ ] Rejects empty content (400)
- [ ] Rejects content > 5000 characters (400)
- [ ] Rejects > 5 embeddedLinks (400)
- [ ] Rejects invalid URL in embeddedLinks (400)
- [ ] Rejects missing type in embeddedLinks (400)
- [ ] Rejects > 10 tags (400)
- [ ] Rejects tag > 50 characters (400)
- [ ] Rejects invalid forumId (404)
- [ ] Rejects inactive forum (404)

### Edge Cases

- [ ] Handles special characters in content
- [ ] Handles emojis in content
- [ ] Handles very long URLs in embeddedLinks
- [ ] Handles empty tags array
- [ ] Handles empty embeddedLinks array
- [ ] Handles concurrent post creation
- [ ] Handles database connection errors gracefully (500)

---

## 🔄 Frontend Integration Flow

1. **User Types Post**: User enters content in TextInput
2. **Link Detection**: Frontend auto-detects URLs in content (optional)
3. **Form Validation**: Frontend validates before submission
4. **API Call**: `POST /api/community/forum/{forumId}/posts`
5. **Success**: Post appears immediately in list (optimistic update)
6. **Refresh**: Frontend refreshes posts list to get server response

---

## 📝 Summary

### Key Requirements

1. ✅ **Authentication**: Bearer token required
2. ✅ **Validation**: Comprehensive validation for all fields
3. ✅ **Forum Check**: Verify forum exists and is active
4. ✅ **Stats Update**: Increment forum postsCount and participantsCount
5. ✅ **Response Format**: Match exact structure specified
6. ✅ **Error Handling**: Clear error messages for all failure cases

### Response Structure

All successful responses:
```json
{
  "success": true,
  "data": { ...post object... }
}
```

All error responses:
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-19  
**Maintained By**: Frontend Team  
**For**: Backend Team Integration




