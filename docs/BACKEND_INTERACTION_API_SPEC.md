# Backend Interaction API Specification

## Overview

This document specifies the backend API requirements for the unified interaction system (likes, saves, views, shares, comments) to ensure seamless integration with the frontend. The frontend uses a **single source of truth** (`useInteractionStore`) that expects consistent, reliable responses from the backend.

**Last Updated**: 2024-12-19  
**Frontend Version**: Post-unified-interaction-refactor

---

## 🚨 Problem Statement: Like Persistence Issue

### Current Issue

**Symptom**: When users like content, the like count increases correctly, but when they navigate away and return, the **like icon is no longer highlighted red** (even though the count remains higher).

**Root Cause**: The backend's metadata endpoints (`/api/content/{contentType}/{contentId}/metadata` and `/api/content/batch-metadata`) are **not consistently returning the `hasLiked` flag** as `true` for content that the user has liked.

### Why This Happens

1. User clicks like → Frontend calls `POST /api/content/media/{id}/like` → Backend correctly updates database
2. User navigates to another tab → Frontend calls `POST /api/content/batch-metadata` to load new content
3. User returns to original tab → Frontend calls `POST /api/content/batch-metadata` again
4. **Problem**: Backend returns `hasLiked: false` (or omits the field) even though the user liked it
5. Frontend merge logic tries to preserve the like, but if backend consistently returns `false`, the UI eventually shows unliked state

### What Backend Must Fix

**Critical Requirement**: When returning metadata (single or batch), the backend **MUST**:
- Query the authenticated user's like/bookmark interactions
- Return `hasLiked: true` if the user has liked the content
- Return `hasBookmarked: true` if the user has bookmarked the content
- **Never return `hasLiked: false` for content the user has actually liked**

### Expected Behavior (TikTok/Instagram Style)

- User likes content → Heart turns red immediately ✅
- User navigates away → Heart stays red when they return ✅
- User logs out and logs back in → Heart still red ✅
- Like count persists correctly ✅

**This requires the backend to correctly track and return user-specific interaction flags.**

---

## Core Principles

1. **User-first merge logic**: The frontend uses "prefer true" logic for boolean flags (`hasLiked`, `hasBookmarked`, etc.). If either the local state OR the server says "true", the UI will show it as true. This prevents UI regression when backend responses are slightly delayed.

2. **Counts must never decrease**: Like counts, save counts, etc. should use `Math.max(existing, server)` to prevent counts from going backwards.

3. **Consistent content type mapping**: All endpoints must accept and return content types using the backend's internal mapping (see Content Type Mapping below).

4. **User-scoped interactions**: All interaction endpoints must be user-scoped (require authentication) and return user-specific flags (`hasLiked`, `hasBookmarked`, etc.).

---

## Content Type Mapping

The frontend sends content types that must be mapped to backend types:

| Frontend Type | Backend Type | Notes |
|--------------|--------------|-------|
| `video`, `videos` | `media` | Video content |
| `audio`, `music` | `media` | Audio/music content |
| `sermon`, `devotional` | `devotional` | Sermons and teachings |
| `ebook`, `e-books`, `books`, `image` | `ebook` | PDFs and ebooks |
| `live` | `media` | Live streaming content |
| `podcast` | `podcast` | Podcast content |
| `merch` | `merch` | Merchandise |
| `artist` | `artist` | Artist profiles |

**Default fallback**: If content type is not recognized, use `media`.

---

## Authentication

All interaction endpoints **MUST** require authentication via Bearer token:

```
Authorization: Bearer <jwt_token>
```

**Unauthenticated requests** should return `401 Unauthorized` or gracefully return `hasLiked: false`, `hasBookmarked: false`, etc. (counts can still be returned).

---

## Endpoints

### 1. Toggle Like

**Endpoint**: `POST /api/content/{contentType}/{contentId}/like`

**Path Parameters**:
- `contentType`: Backend content type (`media`, `devotional`, `ebook`, etc.)
- `contentId`: MongoDB ObjectId of the content

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**: None (empty body or `{}`)

**Response Format**:
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

**Response Fields**:
- `liked` (boolean, **REQUIRED**): Current like state for the authenticated user
- `likeCount` (number, **REQUIRED**): Total like count for this content

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Content not found
- `500 Internal Server Error`: Server error

**Important**: 
- The `liked` flag **MUST** reflect the current state after the toggle (if user liked it, return `true`; if unliked, return `false`).
- The `likeCount` **MUST** be the accurate total count after the toggle operation.

---

### 2. Toggle Save (Bookmark)

**Endpoint**: `POST /api/bookmark/{contentId}/toggle`

**Path Parameters**:
- `contentId`: MongoDB ObjectId of the content

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**: None (empty body or `{}`)

**Response Format**:
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

**Response Fields**:
- `bookmarked` (boolean, **REQUIRED**): Current bookmark state for the authenticated user
- `bookmarkCount` (number, **REQUIRED**): Total bookmark count for this content

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Content not found
- `500 Internal Server Error`: Server error

**Note**: This endpoint is **content-type agnostic** (works for all content types).

---

### 3. Get Content Metadata (Single)

**Endpoint**: `GET /api/content/{contentType}/{contentId}/metadata`

**Path Parameters**:
- `contentType`: Backend content type (`media`, `devotional`, `ebook`, etc.)
- `contentId`: MongoDB ObjectId of the content

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "likeCount": 42,
    "bookmarkCount": 15,
    "shareCount": 8,
    "viewCount": 1234,
    "commentCount": 7,
    "hasLiked": true,
    "hasBookmarked": false,
    "hasShared": false,
    "hasViewed": true
  }
}
```

**Response Fields** (all **REQUIRED**):
- `id` (string): Content ID (should match `contentId` from path)
- `likeCount` (number): Total likes
- `bookmarkCount` (number): Total bookmarks/saves
- `shareCount` (number): Total shares
- `viewCount` (number): Total views
- `commentCount` (number): Total comments
- `hasLiked` (boolean): **User has liked this content** (user-scoped)
- `hasBookmarked` (boolean): **User has bookmarked this content** (user-scoped)
- `hasShared` (boolean): **User has shared this content** (user-scoped)
- `hasViewed` (boolean): **User has viewed this content** (user-scoped)

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid token (can still return counts, but booleans should be `false`)
- `404 Not Found`: Content not found
- `500 Internal Server Error`: Server error

**Critical Requirements**:
1. **User-scoped flags**: `hasLiked`, `hasBookmarked`, `hasShared`, `hasViewed` **MUST** be based on the authenticated user's interactions.
2. **Accurate counts**: All counts should reflect the current database state.
3. **Consistent field names**: Use exact field names as specified (e.g., `hasLiked`, not `liked` or `userLiked`).

---

### 4. Get Batch Content Metadata

**Endpoint**: `POST /api/content/batch-metadata`

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "contentIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  "contentType": "media"
}
```

**Request Fields**:
- `contentIds` (array of strings, **REQUIRED**): Array of MongoDB ObjectIds
- `contentType` (string, **REQUIRED**): Backend content type (`media`, `devotional`, `ebook`, etc.)

**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "likeCount": 42,
      "bookmarkCount": 15,
      "shareCount": 8,
      "viewCount": 1234,
      "commentCount": 7,
      "hasLiked": true,
      "hasBookmarked": false,
      "hasShared": false,
      "hasViewed": true
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "likeCount": 5,
      "bookmarkCount": 2,
      "shareCount": 1,
      "viewCount": 89,
      "commentCount": 0,
      "hasLiked": false,
      "hasBookmarked": true,
      "hasShared": false,
      "hasViewed": false
    }
  ]
}
```

**Response Fields**: Same as single metadata endpoint, but returned as an **array of objects**.

**Status Codes**:
- `200 OK`: Success (even if some IDs are invalid, return valid ones)
- `401 Unauthorized`: Missing or invalid token
- `400 Bad Request`: Invalid request body
- `500 Internal Server Error`: Server error

**Important**:
- Return **only valid content IDs** (skip invalid ones, don't fail the entire request).
- If an ID doesn't exist, **omit it from the response** (don't return `null` or error objects).
- **All fields must be present** for each returned item (same structure as single metadata).

---

### 5. Record View

**Endpoint**: `POST /api/content/{contentType}/{contentId}/view`

**Path Parameters**:
- `contentType`: Backend content type (`media`, `devotional`, `ebook`, etc.)
- `contentId`: MongoDB ObjectId of the content

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body** (optional):
```json
{
  "durationMs": 30000,
  "progressPct": 75,
  "isComplete": false
}
```

**Request Fields** (all optional):
- `durationMs` (number): Viewing duration in milliseconds
- `progressPct` (number): Viewing progress percentage (0-100)
- `isComplete` (boolean): Whether the content was viewed to completion

**Response Format**:
```json
{
  "success": true,
  "data": {
    "viewCount": 1235,
    "hasViewed": true
  }
}
```

**Response Fields**:
- `viewCount` (number, **REQUIRED**): Updated total view count
- `hasViewed` (boolean, **REQUIRED**): User has viewed this content (should be `true` after recording)

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Content not found
- `500 Internal Server Error`: Server error

---

### 6. Record Share

**Endpoint**: `POST /api/interactions/share`

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "contentId": "507f1f77bcf86cd799439011",
  "contentType": "media",
  "platform": "internal"
}
```

**Request Fields**:
- `contentId` (string, **REQUIRED**): MongoDB ObjectId of the content
- `contentType` (string, **REQUIRED**): Backend content type
- `platform` (string, optional): Share platform (`internal`, `external`, etc.)

**Response Format**:
```json
{
  "success": true,
  "data": {
    "shareCount": 9
  }
}
```

**Response Fields**:
- `shareCount` (number, **REQUIRED**): Updated total share count

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Content not found
- `500 Internal Server Error`: Server error

---

### 7. Get Bookmark Status

**Endpoint**: `GET /api/bookmark/{contentId}/status`

**Path Parameters**:
- `contentId`: MongoDB ObjectId of the content

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "isBookmarked": true,
    "bookmarkCount": 15
  }
}
```

**Response Fields**:
- `isBookmarked` (boolean, **REQUIRED**): Current bookmark state for the authenticated user
- `bookmarkCount` (number, **REQUIRED**): Total bookmark count

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Content not found
- `500 Internal Server Error`: Server error

---

## Frontend Merge Logic (For Reference)

The frontend uses the following merge logic when loading metadata:

### Counts (likes, saves, views, shares, comments)
```javascript
finalCount = Math.max(existingCount ?? 0, serverCount ?? 0)
```
**Rationale**: Counts should never decrease (prevent UI regression).

### Boolean Flags (hasLiked, hasBookmarked, hasShared, hasViewed)
```javascript
finalFlag = (existingFlag ?? false) || (serverFlag ?? false)
```
**Rationale**: If either source says "true", keep it true (prevent UI regression when backend is slightly delayed).

**Example**:
- User likes content → local state: `hasLiked: true`
- User navigates away → backend batch load returns `hasLiked: false` (not yet synced)
- Frontend merge: `true || false = true` → **UI stays red** ✅

---

## Error Handling

### Graceful Degradation

If an endpoint fails or returns an error:

1. **404 Not Found**: Frontend will use fallback local storage (for offline support).
2. **401 Unauthorized**: Frontend will still display counts, but booleans will default to `false`.
3. **500 Internal Server Error**: Frontend will retry or use cached data.

### Recommended Backend Behavior

- **Don't fail entire batch requests** if one ID is invalid → return valid ones, skip invalid ones.
- **Always return consistent structure** → even on errors, return `{ success: false, message: "..." }`.
- **Validate ObjectIds** → return `400 Bad Request` for invalid IDs before processing.

---

## 🔍 Troubleshooting: Diagnosing Like Persistence Issues

### Step 1: Verify Toggle Like Endpoint

**Test**: After a user likes content, check the response:

```bash
POST /api/content/media/{contentId}/like
Authorization: Bearer <user_token>

Expected Response:
{
  "success": true,
  "data": {
    "liked": true,        // ← MUST be true if user just liked it
    "likeCount": 43       // ← Should increase
  }
}
```

**If `liked` is `false` after clicking like**: The toggle endpoint is not correctly updating the user's like state.

---

### Step 2: Verify Metadata Endpoint Returns User's Like State

**Test**: Immediately after liking, call the metadata endpoint:

```bash
GET /api/content/media/{contentId}/metadata
Authorization: Bearer <user_token>

Expected Response:
{
  "success": true,
  "data": {
    "hasLiked": true,     // ← MUST be true if user liked it
    "likeCount": 43,
    ...
  }
}
```

**If `hasLiked` is `false`**: The metadata endpoint is not querying the user's like interactions correctly.

**Common Causes**:
- Not joining/querying the user's like records in the database query
- Using wrong user ID (not the authenticated user)
- Not checking the correct collection/table for likes
- Caching issue (returning stale data)

---

### Step 3: Verify Batch Metadata Endpoint

**Test**: Call batch metadata with the liked content ID:

```bash
POST /api/content/batch-metadata
Authorization: Bearer <user_token>
{
  "contentIds": ["{contentId}"],
  "contentType": "media"
}

Expected Response:
{
  "success": true,
  "data": [
    {
      "id": "{contentId}",
      "hasLiked": true,   // ← MUST be true
      "likeCount": 43,
      ...
    }
  ]
}
```

**If `hasLiked` is `false` in batch response**: The batch endpoint has the same issue as single metadata.

**Common Causes**:
- Batch endpoint uses different query logic than single metadata
- Not efficiently joining user interactions in batch queries
- Missing user context in batch processing

---

### Step 4: Check Database State

**Verify the database actually has the like record**:

```javascript
// MongoDB example
db.likes.findOne({
  userId: ObjectId("{authenticated_user_id}"),
  contentId: ObjectId("{content_id}"),
  contentType: "media"
})

// Should return a document if user liked it
```

**If no document exists**: The toggle like endpoint is not creating the like record.

**If document exists but metadata returns `false`**: The metadata endpoint is not querying correctly.

---

### Step 5: Verify User Authentication

**Check**: Is the authenticated user ID correct?

```bash
# Extract user ID from JWT token
# Verify the token is valid and user exists
# Ensure metadata endpoints use THIS user ID, not a different one
```

**Common Issues**:
- Using wrong user ID field (e.g., `userId` vs `_id` vs `user._id`)
- Not extracting user from JWT token correctly
- Using a different user context in batch vs single queries

---

### Step 6: Check Content Type Mapping

**Verify**: Is the content type being mapped correctly?

```bash
# Frontend sends: "video" or "videos"
# Backend should map to: "media"
# Then query likes table with contentType: "media"
```

**If mapping is wrong**: Likes might be stored with one type but queried with another.

---

### Quick Diagnostic Checklist

Run these checks in order:

1. ✅ **Toggle Like creates DB record**: Check database after clicking like
2. ✅ **Toggle Like returns correct state**: Response `liked: true` after like
3. ✅ **Single metadata returns `hasLiked: true`**: Call metadata endpoint after like
4. ✅ **Batch metadata returns `hasLiked: true`**: Call batch endpoint after like
5. ✅ **User ID is consistent**: Same user ID used in all queries
6. ✅ **Content type is mapped**: Frontend type → Backend type mapping is correct
7. ✅ **No caching issues**: Fresh queries return correct data

**If any step fails**, that's where the bug is.

---

## 💡 Correct Implementation Pattern

### Metadata Endpoint Implementation (Pseudo-code)

```javascript
// ✅ CORRECT: Query user's interactions
async function getContentMetadata(contentId, contentType, userId) {
  // 1. Get content stats (counts)
  const content = await Content.findById(contentId);
  
  // 2. Query user's like interaction
  const userLike = await Like.findOne({
    userId: userId,           // ← Use authenticated user ID
    contentId: contentId,
    contentType: contentType
  });
  
  // 3. Query user's bookmark interaction
  const userBookmark = await Bookmark.findOne({
    userId: userId,           // ← Use authenticated user ID
    contentId: contentId
  });
  
  // 4. Return with user-scoped flags
  return {
    id: contentId,
    likeCount: content.likeCount || 0,
    bookmarkCount: content.bookmarkCount || 0,
    viewCount: content.viewCount || 0,
    shareCount: content.shareCount || 0,
    commentCount: content.commentCount || 0,
    hasLiked: !!userLike,        // ← TRUE if user liked it
    hasBookmarked: !!userBookmark, // ← TRUE if user bookmarked it
    hasShared: false,            // ← Query if needed
    hasViewed: false             // ← Query if needed
  };
}

// ✅ CORRECT: Batch metadata with efficient joins
async function getBatchMetadata(contentIds, contentType, userId) {
  // Use aggregation or joins to get all user interactions at once
  const userLikes = await Like.find({
    userId: userId,
    contentId: { $in: contentIds },
    contentType: contentType
  }).lean();
  
  const userBookmarks = await Bookmark.find({
    userId: userId,
    contentId: { $in: contentIds }
  }).lean();
  
  // Create lookup maps
  const likesMap = new Map(userLikes.map(l => [l.contentId.toString(), true]));
  const bookmarksMap = new Map(userBookmarks.map(b => [b.contentId.toString(), true]));
  
  // Get content stats
  const contents = await Content.find({
    _id: { $in: contentIds }
  });
  
  // Return array with user flags
  return contents.map(content => ({
    id: content._id.toString(),
    likeCount: content.likeCount || 0,
    bookmarkCount: content.bookmarkCount || 0,
    viewCount: content.viewCount || 0,
    shareCount: content.shareCount || 0,
    commentCount: content.commentCount || 0,
    hasLiked: likesMap.has(content._id.toString()),      // ← Check map
    hasBookmarked: bookmarksMap.has(content._id.toString()), // ← Check map
    hasShared: false,
    hasViewed: false
  }));
}
```

### ❌ Common Mistakes to Avoid

```javascript
// ❌ WRONG: Not querying user's interactions
async function getContentMetadata(contentId, contentType, userId) {
  const content = await Content.findById(contentId);
  return {
    hasLiked: false,  // ← Always false! Not checking user's likes
    hasBookmarked: false,
    // ...
  };
}

// ❌ WRONG: Using wrong user ID
async function getContentMetadata(contentId, contentType, userId) {
  const userLike = await Like.findOne({
    userId: req.body.userId,  // ← Wrong! Should use authenticated user
    contentId: contentId
  });
}

// ❌ WRONG: Not mapping content type
async function getContentMetadata(contentId, contentType, userId) {
  const userLike = await Like.findOne({
    contentType: contentType,  // ← Wrong! Frontend sends "video", need "media"
    contentId: contentId
  });
}

// ❌ WRONG: Batch endpoint missing user context
async function getBatchMetadata(contentIds, contentType) {
  // Missing userId parameter! Can't check user's interactions
  const contents = await Content.find({ _id: { $in: contentIds } });
  return contents.map(c => ({
    hasLiked: false,  // ← Always false!
    // ...
  }));
}
```

---

## Testing Checklist

Backend team should verify:

- [ ] **Toggle Like** returns accurate `liked` and `likeCount` immediately after toggle
- [ ] **Toggle Save** returns accurate `bookmarked` and `bookmarkCount` immediately after toggle
- [ ] **Get Metadata (Single)** returns all required fields with correct user-scoped booleans
- [ ] **Get Batch Metadata** returns array with same structure as single, handles invalid IDs gracefully
- [ ] **Record View** updates `viewCount` and sets `hasViewed: true`
- [ ] **Record Share** updates `shareCount`
- [ ] **All endpoints require authentication** (return 401 for missing/invalid tokens)
- [ ] **Content type mapping** works correctly (frontend sends `video`, backend expects `media`)
- [ ] **User-scoped flags** (`hasLiked`, `hasBookmarked`) are based on authenticated user, not global state
- [ ] **Counts are accurate** and reflect current database state
- [ ] **Response format matches exactly** (field names, structure, types)

---

## Example Integration Flow

### Scenario: User likes a video, navigates away, comes back

1. **User clicks like**:
   - Frontend calls: `POST /api/content/media/{videoId}/like`
   - Backend returns: `{ liked: true, likeCount: 43 }`
   - Frontend updates local store: `hasLiked: true, likes: 43`

2. **User navigates to another tab**:
   - Frontend calls: `POST /api/content/batch-metadata` with new content IDs
   - Backend returns batch metadata (may not include the liked video)

3. **User returns to original tab**:
   - Frontend calls: `POST /api/content/batch-metadata` with video IDs
   - Backend **MUST** return: `{ id: "{videoId}", hasLiked: true, likeCount: 43, ... }`
   - Frontend merge: `true || true = true` → **Heart stays red** ✅

**If backend returns `hasLiked: false`** (incorrectly):
   - Frontend merge: `true || false = true` → **Heart still stays red** ✅ (graceful fallback)

---

## Questions or Issues?

If backend implementation differs from this spec, please coordinate with frontend team to ensure:
1. Response field names match exactly
2. User-scoped flags are correctly implemented
3. Batch endpoints handle edge cases gracefully
4. Content type mapping is consistent

---

**Document Version**: 1.0  
**Maintained By**: Frontend Team  
**Last Review**: 2024-12-19

