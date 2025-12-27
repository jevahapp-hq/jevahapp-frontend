# Like Functionality - Comprehensive Fix Documentation

## 📋 Table of Contents
1. [Problem Summary](#problem-summary)
2. [Current Frontend Implementation](#current-frontend-implementation)
3. [404 Error Analysis & Fix](#404-error-analysis--fix)
4. [Backend Requirements](#backend-requirements)
5. [State Persistence & Sync Logic](#state-persistence--sync-logic)
6. [Error Handling & Fallback Strategies](#error-handling--fallback-strategies)
7. [Testing Checklist](#testing-checklist)
8. [Implementation Examples](#implementation-examples)

---

## 🚨 Problem Summary

### Current Issues

1. **404 Error on Like Toggle**
   - Error: `POST /api/content/media/{contentId}/like` returns `404 Not Found`
   - Symptom: Socket reaction error, then HTTP fallback fails
   - Impact: Like state not persisted, icon doesn't stay red

2. **Like State Not Persisting**
   - Symptom: Like icon turns red on click, then reverts to unliked state
   - Root Cause: Backend not returning correct `liked: true` state or metadata endpoints returning `hasLiked: false`

3. **Inconsistent State Across Navigation**
   - Symptom: User likes content, navigates away, returns → like icon is no longer red
   - Root Cause: Metadata endpoints not querying user's like interactions correctly

### Expected Behavior (TikTok/Instagram Style)

✅ **User clicks like** → Heart turns red immediately  
✅ **User navigates away** → Heart stays red when they return  
✅ **User logs out and logs back in** → Heart still red  
✅ **Like count persists correctly** across all screens

---

## 🔍 Current Frontend Implementation

### 1. Like Toggle Flow

**Location**: `app/utils/contentInteractionAPI.ts`

```typescript
async toggleLike(contentId: string, contentType: string): Promise<{ liked: boolean; totalLikes: number }> {
  // 1. Map content type (frontend → backend)
  const backendContentType = this.mapContentTypeToBackend(contentType);
  
  // 2. Validate ObjectId
  if (!this.isValidObjectId(contentId)) {
    return this.fallbackToggleLike(contentId);
  }
  
  // 3. Make HTTP request
  const response = await fetch(
    `${this.baseURL}/api/content/${backendContentType}/${contentId}/like`,
    {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
    }
  );
  
  // 4. Handle 404 - fallback to local storage
  if (response.status === 404) {
    console.warn(`⚠️ Content not found (404). Falling back to local like.`);
    return this.fallbackToggleLike(contentId);
  }
  
  // 5. Parse response
  const result = await response.json();
  return {
    liked: result.data?.liked ?? false,
    totalLikes: result.data?.likeCount ?? 0,
  };
}
```

### 2. Optimistic Updates

**Location**: `app/store/useInteractionStore.tsx`

```typescript
toggleLike: async (contentId: string, contentType: string) => {
  // 1. Optimistic update (immediate UI feedback)
  set((state) => {
    const stats = state.contentStats[contentId] || defaultStats;
    const newLiked = !stats.userInteractions.liked;
    const newLikes = Math.max(0, (stats.likes || 0) + (newLiked ? 1 : -1));
    
    return {
      contentStats: {
        ...state.contentStats,
        [contentId]: {
          ...stats,
          likes: newLikes,
          userInteractions: { ...stats.userInteractions, liked: newLiked },
        },
      },
    };
  });
  
  // 2. Call API
  const result = await contentInteractionAPI.toggleLike(contentId, contentType);
  
  // 3. Update with server response (source of truth)
  set((state) => ({
    contentStats: {
      ...state.contentStats,
      [contentId]: {
        ...state.contentStats[contentId],
        likes: result.totalLikes,
        userInteractions: {
          ...state.contentStats[contentId].userInteractions,
          liked: result.liked,
        },
      },
    },
  }));
}
```

### 3. Socket.IO Real-time Updates

**Location**: `app/services/SocketManager.ts`

```typescript
sendLike(contentId: string, contentType: string): void {
  if (this.socket && this.socket.connected) {
    try {
      this.socket.emit("content-reaction", {
        contentId,
        contentType,
        actionType: "like",
      });
    } catch (error) {
      // Non-blocking - HTTP API will handle it
      console.warn("⚠️ Socket like send failed (HTTP will handle):", error);
    }
  }
}
```

**Note**: Socket errors are handled gracefully - HTTP API is the fallback.

### 4. Content Type Mapping

**Location**: `app/utils/contentInteractionAPI.ts`

```typescript
private mapContentTypeToBackend(contentType: string): string {
  const typeMap: Record<string, string> = {
    video: "media",
    videos: "media",
    audio: "media",
    music: "media",
    sermon: "devotional",
    devotional: "devotional",
    ebook: "ebook",
    "e-books": "ebook",
    books: "ebook",
    image: "ebook",
    live: "media",
    podcast: "podcast",
    merch: "merch",
    artist: "artist",
  };
  
  return typeMap[contentType.toLowerCase()] || "media";
}
```

---

## 🔧 404 Error Analysis & Fix

### Root Cause Analysis

The 404 error occurs when:
1. **Content doesn't exist** in the database
2. **Content ID is invalid** (not a valid MongoDB ObjectId)
3. **Content type mapping is incorrect** (backend can't find content with that type)
4. **Route doesn't exist** (backend endpoint not implemented for that content type)

### Frontend Handling (Current)

✅ **Already implemented**: Frontend gracefully handles 404 by falling back to local storage:

```typescript
if (response.status === 404) {
  console.warn(`⚠️ TOGGLE LIKE: Content not found (404) for ${backendContentType}/${contentId}. Falling back to local like.`);
  return this.fallbackToggleLike(contentId);
}
```

**Issue**: Local storage fallback means the like is only stored locally, not synced with backend. This causes:
- Like state lost on app restart
- Like state not visible to other users
- Like count not accurate

### Backend Fix Required

**The backend MUST**:

1. **Validate content exists** before processing like toggle
2. **Return proper error messages** for debugging
3. **Handle invalid content types** gracefully
4. **Ensure route exists** for all content types

**Recommended Backend Implementation**:

```javascript
// Backend: POST /api/content/{contentType}/{contentId}/like
async function toggleLike(req, res) {
  const { contentType, contentId } = req.params;
  const userId = req.user._id; // From JWT token
  
  // 1. Validate content type
  const validTypes = ['media', 'devotional', 'ebook', 'podcast', 'merch', 'artist'];
  if (!validTypes.includes(contentType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid content type: ${contentType}`,
    });
  }
  
  // 2. Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(contentId)) {
    return res.status(400).json({
      success: false,
      message: `Invalid content ID: ${contentId}`,
    });
  }
  
  // 3. Check if content exists
  const ContentModel = getContentModel(contentType); // Helper to get correct model
  const content = await ContentModel.findById(contentId);
  
  if (!content) {
    return res.status(404).json({
      success: false,
      message: `Content not found: ${contentId} (type: ${contentType})`,
      data: {
        contentId,
        contentType,
        exists: false,
      },
    });
  }
  
  // 4. Toggle like (create or delete)
  const existingLike = await Like.findOne({
    userId,
    contentId,
    contentType,
  });
  
  let liked;
  let likeCount;
  
  if (existingLike) {
    // Unlike: delete like record
    await existingLike.deleteOne();
    await ContentModel.findByIdAndUpdate(contentId, {
      $inc: { likeCount: -1 },
    });
    liked = false;
    likeCount = Math.max(0, (content.likeCount || 0) - 1);
  } else {
    // Like: create like record
    await Like.create({
      userId,
      contentId,
      contentType,
      createdAt: new Date(),
    });
    await ContentModel.findByIdAndUpdate(contentId, {
      $inc: { likeCount: 1 },
    });
    liked = true;
    likeCount = (content.likeCount || 0) + 1;
  }
  
  // 5. Return updated state
  return res.status(200).json({
    success: true,
    message: "Like toggled successfully",
    data: {
      liked,        // ← MUST be true if user just liked it
      likeCount,    // ← MUST be accurate count after toggle
    },
  });
}
```

---

## 🎯 Backend Requirements

### 1. Toggle Like Endpoint

**Endpoint**: `POST /api/content/{contentType}/{contentId}/like`

**Requirements**:

| Requirement | Description | Critical |
|------------|-------------|----------|
| **Authentication** | Must require valid JWT token | ✅ Yes |
| **Content Validation** | Must verify content exists before toggling | ✅ Yes |
| **Atomic Updates** | Use transactions or atomic operations | ✅ Yes |
| **Response Format** | Must return `{ liked: boolean, likeCount: number }` | ✅ Yes |
| **State Accuracy** | `liked` must reflect final state after toggle | ✅ Yes |
| **Count Accuracy** | `likeCount` must be accurate after toggle | ✅ Yes |

**Response Format** (MUST match exactly):

```json
{
  "success": true,
  "message": "Like toggled successfully",
  "data": {
    "liked": true,        // ← Current state for authenticated user
    "likeCount": 42       // ← Total count after toggle
  }
}
```

**Error Responses**:

```json
// 404 - Content not found
{
  "success": false,
  "message": "Content not found: {contentId} (type: {contentType})",
  "data": {
    "contentId": "...",
    "contentType": "...",
    "exists": false
  }
}

// 400 - Invalid content type or ID
{
  "success": false,
  "message": "Invalid content type: {contentType}",
  "data": {
    "contentType": "...",
    "validTypes": ["media", "devotional", "ebook", ...]
  }
}

// 401 - Unauthorized
{
  "success": false,
  "message": "Authentication required",
  "data": null
}
```

### 2. Metadata Endpoints

**Single Metadata**: `GET /api/content/{contentType}/{contentId}/metadata`  
**Batch Metadata**: `POST /api/content/batch-metadata`

**Critical Requirements**:

1. **User-Scoped Flags**: `hasLiked` MUST be based on authenticated user's interactions
2. **Consistent State**: Must match toggle endpoint response immediately after toggle
3. **Query User Interactions**: Must query `likes` collection/table for user's like state

**Response Format**:

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "likeCount": 42,
    "hasLiked": true,        // ← MUST be true if user liked it
    "bookmarkCount": 15,
    "hasBookmarked": false,
    "viewCount": 1234,
    "shareCount": 8,
    "commentCount": 7
  }
}
```

**Batch Response Format**:

```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "likeCount": 42,
      "hasLiked": true,      // ← MUST be true if user liked it
      "bookmarkCount": 15,
      "hasBookmarked": false,
      "viewCount": 1234,
      "shareCount": 8,
      "commentCount": 7
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "likeCount": 5,
      "hasLiked": false,     // ← Must be false if user hasn't liked it
      "bookmarkCount": 2,
      "hasBookmarked": true,
      "viewCount": 89,
      "shareCount": 1,
      "commentCount": 0
    }
  ]
}
```

### 3. Database Schema Requirements

**Likes Collection/Table**:

```javascript
{
  _id: ObjectId,
  userId: ObjectId,        // Reference to User
  contentId: ObjectId,     // Reference to Content
  contentType: String,     // "media", "devotional", "ebook", etc.
  createdAt: Date
}

// Unique index on (userId, contentId, contentType)
db.likes.createIndex(
  { userId: 1, contentId: 1, contentType: 1 },
  { unique: true }
);
```

**Content Document** (cached counter):

```javascript
{
  _id: ObjectId,
  // ... other fields
  likeCount: Number,       // Cached total count (default: 0)
  updatedAt: Date
}
```

**Important**: Use atomic increments to keep `likeCount` accurate:

```javascript
// Increment
await ContentModel.findByIdAndUpdate(contentId, {
  $inc: { likeCount: 1 },
});

// Decrement (with clamp at 0)
await ContentModel.findByIdAndUpdate(contentId, {
  $inc: { likeCount: -1 },
}, {
  // Ensure likeCount never goes below 0
  $min: { likeCount: 0 }
});
```

---

## 🔄 State Persistence & Sync Logic

### Frontend State Management

**Location**: `app/store/useInteractionStore.tsx`

The frontend uses a **single source of truth** (Zustand store) that:

1. **Optimistically updates** UI immediately on user action
2. **Calls backend API** to persist state
3. **Updates with server response** as final source of truth
4. **Merges metadata** using "prefer true" logic for booleans

**Merge Logic**:

```typescript
// Counts: Never decrease (prevent UI regression)
finalCount = Math.max(existingCount ?? 0, serverCount ?? 0);

// Booleans: Prefer true (prevent UI regression)
finalFlag = (existingFlag ?? false) || (serverFlag ?? false);
```

**Example Flow**:

1. User clicks like → Local state: `hasLiked: true, likes: 43`
2. Backend API called → Response: `{ liked: true, likeCount: 43 }`
3. Store updated → Final state: `hasLiked: true, likes: 43`
4. User navigates away → Batch metadata returns `hasLiked: false` (stale)
5. Frontend merge → `true || false = true` → **Heart stays red** ✅

### Backend Sync Requirements

**The backend MUST ensure**:

1. **Read-Your-Write Consistency**: After a toggle, metadata endpoints must return the new state immediately
2. **Cache Invalidation**: If using caching, invalidate/update cache on toggle
3. **Transaction Safety**: Use transactions to ensure atomic updates

**Recommended Backend Pattern**:

```javascript
// Toggle like with transaction
async function toggleLike(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // 1. Check existing like
    const existingLike = await Like.findOne({
      userId: req.user._id,
      contentId: req.params.contentId,
      contentType: req.params.contentType,
    }).session(session);
    
    // 2. Toggle like
    if (existingLike) {
      await existingLike.deleteOne({ session });
      await ContentModel.findByIdAndUpdate(
        req.params.contentId,
        { $inc: { likeCount: -1 } },
        { session }
      );
    } else {
      await Like.create([{
        userId: req.user._id,
        contentId: req.params.contentId,
        contentType: req.params.contentType,
        createdAt: new Date(),
      }], { session });
      await ContentModel.findByIdAndUpdate(
        req.params.contentId,
        { $inc: { likeCount: 1 } },
        { session }
      );
    }
    
    // 3. Get updated count
    const content = await ContentModel.findById(req.params.contentId).session(session);
    
    // 4. Commit transaction
    await session.commitTransaction();
    
    // 5. Invalidate cache (if using)
    await invalidateContentCache(req.params.contentId);
    
    // 6. Return response
    return res.json({
      success: true,
      data: {
        liked: !existingLike,  // ← Final state
        likeCount: content.likeCount,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

---

## 🛡️ Error Handling & Fallback Strategies

### Frontend Fallback Strategy

**Current Implementation**:

1. **Socket Error** → Ignore (non-blocking), HTTP API handles it
2. **404 Error** → Fallback to local storage (AsyncStorage)
3. **Network Error** → Fallback to local storage
4. **500 Error** → Retry once, then fallback to local storage

**Local Storage Fallback**:

```typescript
private async fallbackToggleLike(contentId: string): Promise<{ liked: boolean; totalLikes: number }> {
  const userId = await this.getCurrentUserId();
  const key = `userLikes_${userId}`;
  const likesStr = await AsyncStorage.getItem(key);
  const likes = likesStr ? JSON.parse(likesStr) : {};
  
  const isLiked = likes[contentId] || false;
  likes[contentId] = !isLiked;
  
  await AsyncStorage.setItem(key, JSON.stringify(likes));
  
  return {
    liked: !isLiked,
    totalLikes: Object.values(likes).filter(Boolean).length,
  };
}
```

**Limitations of Local Storage Fallback**:

- ❌ Not synced with backend
- ❌ Lost on app reinstall
- ❌ Not visible to other users
- ❌ Counts not accurate

**Recommendation**: Local storage should only be used as a last resort. The backend should fix 404 errors so this fallback is rarely needed.

### Backend Error Handling

**Recommended Error Responses**:

```javascript
// 400 - Bad Request (invalid input)
{
  "success": false,
  "message": "Invalid content ID or type",
  "data": {
    "contentId": "...",
    "contentType": "...",
    "errors": ["..."]
  }
}

// 401 - Unauthorized
{
  "success": false,
  "message": "Authentication required",
  "data": null
}

// 404 - Not Found
{
  "success": false,
  "message": "Content not found",
  "data": {
    "contentId": "...",
    "contentType": "...",
    "exists": false
  }
}

// 500 - Internal Server Error
{
  "success": false,
  "message": "Internal server error",
  "data": {
    "error": "...",
    "requestId": "..."
  }
}
```

---

## ✅ Testing Checklist

### Backend Team Checklist

#### 1. Toggle Like Endpoint
- [ ] **Valid Request**: Returns `{ liked: true, likeCount: N+1 }` when user likes
- [ ] **Valid Request**: Returns `{ liked: false, likeCount: N }` when user unlikes
- [ ] **404 Handling**: Returns proper 404 error when content doesn't exist
- [ ] **400 Handling**: Returns proper 400 error for invalid content type or ID
- [ ] **401 Handling**: Returns proper 401 error when not authenticated
- [ ] **Atomic Updates**: Like count updates atomically (no race conditions)
- [ ] **Unique Constraint**: Prevents duplicate likes (same user, same content)

#### 2. Metadata Endpoints
- [ ] **Single Metadata**: Returns `hasLiked: true` immediately after toggle
- [ ] **Batch Metadata**: Returns `hasLiked: true` for liked content
- [ ] **Consistent State**: Metadata matches toggle response after toggle
- [ ] **User-Scoped**: `hasLiked` is based on authenticated user, not global state
- [ ] **Accurate Counts**: All counts reflect current database state

#### 3. Database Schema
- [ ] **Unique Index**: `(userId, contentId, contentType)` is unique
- [ ] **Atomic Increments**: `likeCount` updates atomically
- [ ] **Transaction Safety**: Toggle operations use transactions

#### 4. Content Type Mapping
- [ ] **All Types Supported**: All frontend content types map to backend types
- [ ] **Default Fallback**: Unknown types default to `media`
- [ ] **Case Insensitive**: Mapping works regardless of case

### Frontend Team Checklist

- [ ] **Optimistic Updates**: UI updates immediately on like click
- [ ] **Server Reconciliation**: UI updates with server response
- [ ] **404 Fallback**: Falls back to local storage on 404
- [ ] **State Persistence**: Like state persists across navigation
- [ ] **Merge Logic**: Uses "prefer true" logic for booleans
- [ ] **Count Logic**: Uses `Math.max` to prevent count regression

---

## 💻 Implementation Examples

### Backend: Complete Toggle Like Implementation

```javascript
// routes/content.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Like = require('../models/Like');
const { getContentModel } = require('../utils/contentModels');
const mongoose = require('mongoose');

router.post('/:contentType/:contentId/like', authenticate, async (req, res) => {
  const { contentType, contentId } = req.params;
  const userId = req.user._id;
  
  // 1. Validate content type
  const validTypes = ['media', 'devotional', 'ebook', 'podcast', 'merch', 'artist'];
  if (!validTypes.includes(contentType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid content type: ${contentType}`,
      data: {
        contentType,
        validTypes,
      },
    });
  }
  
  // 2. Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(contentId)) {
    return res.status(400).json({
      success: false,
      message: `Invalid content ID: ${contentId}`,
      data: {
        contentId,
      },
    });
  }
  
  // 3. Get content model
  const ContentModel = getContentModel(contentType);
  if (!ContentModel) {
    return res.status(400).json({
      success: false,
      message: `Content model not found for type: ${contentType}`,
    });
  }
  
  // 4. Check if content exists
  const content = await ContentModel.findById(contentId);
  if (!content) {
    return res.status(404).json({
      success: false,
      message: `Content not found: ${contentId} (type: ${contentType})`,
      data: {
        contentId,
        contentType,
        exists: false,
      },
    });
  }
  
  // 5. Toggle like with transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Check existing like
    const existingLike = await Like.findOne({
      userId,
      contentId,
      contentType,
    }).session(session);
    
    let liked;
    let likeCount;
    
    if (existingLike) {
      // Unlike: delete like record
      await existingLike.deleteOne({ session });
      await ContentModel.findByIdAndUpdate(
        contentId,
        { $inc: { likeCount: -1 } },
        { session }
      );
      liked = false;
      likeCount = Math.max(0, (content.likeCount || 0) - 1);
    } else {
      // Like: create like record
      await Like.create([{
        userId,
        contentId,
        contentType,
        createdAt: new Date(),
      }], { session });
      await ContentModel.findByIdAndUpdate(
        contentId,
        { $inc: { likeCount: 1 } },
        { session }
      );
      liked = true;
      likeCount = (content.likeCount || 0) + 1;
    }
    
    // Commit transaction
    await session.commitTransaction();
    
    // Invalidate cache (if using Redis/CDN)
    // await invalidateContentCache(contentId);
    
    // Return response
    return res.status(200).json({
      success: true,
      message: "Like toggled successfully",
      data: {
        liked,        // ← MUST be true if user just liked it
        likeCount,    // ← MUST be accurate count after toggle
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Toggle like error:', error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: {
        error: error.message,
      },
    });
  } finally {
    session.endSession();
  }
});

module.exports = router;
```

### Backend: Metadata Endpoint with User Interactions

```javascript
// routes/content.js
router.get('/:contentType/:contentId/metadata', authenticate, async (req, res) => {
  const { contentType, contentId } = req.params;
  const userId = req.user._id;
  
  // 1. Get content
  const ContentModel = getContentModel(contentType);
  const content = await ContentModel.findById(contentId);
  
  if (!content) {
    return res.status(404).json({
      success: false,
      message: "Content not found",
    });
  }
  
  // 2. Query user's interactions
  const userLike = await Like.findOne({
    userId,
    contentId,
    contentType,
  });
  
  const userBookmark = await Bookmark.findOne({
    userId,
    contentId,
  });
  
  // 3. Return metadata with user-scoped flags
  return res.json({
    success: true,
    data: {
      id: content._id.toString(),
      likeCount: content.likeCount || 0,
      hasLiked: !!userLike,        // ← TRUE if user liked it
      bookmarkCount: content.bookmarkCount || 0,
      hasBookmarked: !!userBookmark,
      viewCount: content.viewCount || 0,
      shareCount: content.shareCount || 0,
      commentCount: content.commentCount || 0,
    },
  });
});
```

### Backend: Batch Metadata with Efficient Queries

```javascript
router.post('/batch-metadata', authenticate, async (req, res) => {
  const { contentIds, contentType } = req.body;
  const userId = req.user._id;
  
  // 1. Validate input
  if (!Array.isArray(contentIds) || contentIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "contentIds must be a non-empty array",
    });
  }
  
  // 2. Get content model
  const ContentModel = getContentModel(contentType);
  if (!ContentModel) {
    return res.status(400).json({
      success: false,
      message: `Invalid content type: ${contentType}`,
    });
  }
  
  // 3. Get all content
  const contents = await ContentModel.find({
    _id: { $in: contentIds },
  });
  
  // 4. Get all user interactions in one query (efficient)
  const userLikes = await Like.find({
    userId,
    contentId: { $in: contentIds },
    contentType,
  }).lean();
  
  const userBookmarks = await Bookmark.find({
    userId,
    contentId: { $in: contentIds },
  }).lean();
  
  // 5. Create lookup maps
  const likesMap = new Map(
    userLikes.map(l => [l.contentId.toString(), true])
  );
  const bookmarksMap = new Map(
    userBookmarks.map(b => [b.contentId.toString(), true])
  );
  
  // 6. Return array with user flags
  const metadata = contents.map(content => ({
    id: content._id.toString(),
    likeCount: content.likeCount || 0,
    hasLiked: likesMap.has(content._id.toString()),      // ← Check map
    bookmarkCount: content.bookmarkCount || 0,
    hasBookmarked: bookmarksMap.has(content._id.toString()),
    viewCount: content.viewCount || 0,
    shareCount: content.shareCount || 0,
    commentCount: content.commentCount || 0,
  }));
  
  return res.json({
    success: true,
    data: metadata,
  });
});
```

---

## 📝 Summary

### Key Points for Backend Team

1. **404 Errors**: Must validate content exists before processing like toggle
2. **Response Format**: Must return `{ liked: boolean, likeCount: number }` exactly
3. **State Accuracy**: `liked` must reflect final state after toggle
4. **Metadata Consistency**: Metadata endpoints must return `hasLiked: true` for liked content
5. **User-Scoped Flags**: All boolean flags must be based on authenticated user's interactions
6. **Atomic Updates**: Use transactions to ensure data consistency
7. **Cache Invalidation**: Invalidate cache on toggle to prevent stale data

### Key Points for Frontend Team

1. **Optimistic Updates**: UI updates immediately for better UX
2. **Server Reconciliation**: Server response is source of truth
3. **Fallback Strategy**: Local storage fallback for offline/error cases
4. **Merge Logic**: "Prefer true" for booleans, `Math.max` for counts
5. **State Persistence**: Zustand store maintains state across navigation

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-27  
**Maintained By**: Frontend Team  
**Status**: Active

