# Copyright-Free Music View Tracking - Complete Backend Specification

**Version**: 2.0  
**Last Updated**: 2024-12-19  
**Status**: ✅ Ready for Implementation  
**Frontend Integration**: Fully Implemented

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [API Endpoint Specification](#api-endpoint-specification)
3. [Request/Response Formats](#requestresponse-formats)
4. [Database Schema](#database-schema)
5. [Business Logic Requirements](#business-logic-requirements)
6. [Error Handling](#error-handling)
7. [Real-Time Updates](#real-time-updates)
8. [Frontend Integration Details](#frontend-integration-details)
9. [Testing Requirements](#testing-requirements)
10. [Implementation Checklist](#implementation-checklist)

---

## 🎯 Executive Summary

This document specifies the **exact** backend implementation required for copyright-free music view tracking. The frontend is **already implemented** and expects this exact API behavior.

### Critical Requirements

1. ✅ **One view per user per song** - Database-level deduplication required
2. ✅ **Authentication required** - All requests must include valid JWT token
3. ✅ **Idempotent operations** - Multiple calls from same user = same result
4. ✅ **Return current view count** - Always return updated `viewCount` in response
5. ✅ **Support both field names** - Accept `views`/`viewCount`, `likes`/`likeCount` for compatibility

---

## 🔌 API Endpoint Specification

### Endpoint: Record View

**URL**: `POST /api/audio/copyright-free/{songId}/view`

**Method**: `POST`

**Authentication**: **REQUIRED** (Bearer token)

**Base URL**: `{API_BASE_URL}/api/audio/copyright-free`

**Path Parameters**:
- `songId` (string, required): The unique identifier of the copyright-free song
  - Supports both `id` and `_id` formats
  - Example: `"692d7baeee2475007039982e"` or `"song-in-the-name-of-jesus"`

**Request Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body** (JSON):
```json
{
  "durationMs": 45000,
  "progressPct": 30,
  "isComplete": false
}
```

**Request Fields** (all optional, but recommended):
- `durationMs` (number, optional): Listening duration in milliseconds
  - Example: `45000` (45 seconds)
- `progressPct` (number, optional): Listening progress percentage (0-100)
  - Example: `30` (30% of song)
- `isComplete` (boolean, optional): Whether the song was played to completion
  - Example: `false` or `true`

**Note**: Frontend may send empty body `{}` - backend should handle gracefully.

---

## 📥 Request/Response Formats

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "viewCount": 1251,
    "hasViewed": true
  }
}
```

**Response Fields** (all REQUIRED):
- `success` (boolean): Always `true` for successful requests
- `data` (object): Response data object
  - `viewCount` (number, **REQUIRED**): Total view count for this song
    - Must be the **current** view count after processing this request
    - If user already viewed, return current count (don't increment)
    - If new view, return incremented count
  - `hasViewed` (boolean, **REQUIRED**): Whether the authenticated user has viewed this song
    - `true` if user has viewed (either before or after this request)
    - `false` should never be returned (if request succeeds, user has viewed)

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**When**: Missing or invalid JWT token

#### 404 Not Found
```json
{
  "success": false,
  "error": "Song not found",
  "code": "NOT_FOUND"
}
```

**When**: Song ID doesn't exist in database

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to record view",
  "code": "SERVER_ERROR"
}
```

**When**: Database error, unexpected server error

---

## 🗄️ Database Schema

### Song Collection

```javascript
{
  _id: ObjectId,
  id: String,                    // Optional: string ID (for compatibility)
  title: String,
  artist: String,
  audioUrl: String,
  thumbnailUrl: String,
  duration: Number,               // Song duration in seconds
  viewCount: Number,              // Total unique views (default: 0)
  likeCount: Number,              // Total likes (default: 0)
  createdAt: Date,
  updatedAt: Date
}
```

**Required Fields**:
- `_id` or `id`: Unique identifier
- `viewCount`: Must exist and default to 0 if not set

### View Tracking Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,               // Reference to User (REQUIRED)
  songId: ObjectId,               // Reference to Song (REQUIRED)
  durationMs: Number,              // Listening duration in milliseconds
  progressPct: Number,            // Maximum progress reached (0-100)
  isComplete: Boolean,            // Whether song was completed
  viewedAt: Date,                 // First view timestamp
  lastViewedAt: Date,             // Last view timestamp (for analytics)
  createdAt: Date,
  updatedAt: Date
}
```

### Required Database Indexes

**CRITICAL**: These indexes are required for performance and deduplication:

```javascript
// Unique index to prevent duplicate views (CRITICAL)
db.views.createIndex(
  { userId: 1, songId: 1 }, 
  { unique: true, name: "user_song_unique" }
);

// Index for querying song views
db.views.createIndex(
  { songId: 1 }, 
  { name: "song_index" }
);

// Index for querying user views
db.views.createIndex(
  { userId: 1 }, 
  { name: "user_index" }
);
```

**Important**: The unique index `{ userId: 1, songId: 1 }` ensures that each user can only have one view record per song, preventing duplicates at the database level.

---

## ⚙️ Business Logic Requirements

### Core View Recording Logic

```javascript
async function recordView(songId, userId, payload = {}) {
  const { durationMs = 0, progressPct = 0, isComplete = false } = payload;

  // Step 1: Validate song exists
  const song = await Song.findById(songId);
  if (!song) {
    throw new Error('Song not found');
  }

  // Step 2: Check if user already viewed this song
  let viewRecord = await View.findOne({
    userId: userId,
    songId: songId
  });

  if (viewRecord) {
    // User already viewed → Update engagement metrics but DON'T increment count
    viewRecord.durationMs = Math.max(viewRecord.durationMs, durationMs || 0);
    viewRecord.progressPct = Math.max(viewRecord.progressPct, progressPct || 0);
    viewRecord.isComplete = viewRecord.isComplete || isComplete;
    viewRecord.lastViewedAt = new Date();
    await viewRecord.save();

    // Return current count (NOT incremented)
    return {
      viewCount: song.viewCount || 0,
      hasViewed: true,
      isNewView: false
    };
  }

  // Step 3: User hasn't viewed → Create new view record and increment count
  // Use transaction to ensure atomicity
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create view record
    viewRecord = await View.create([{
      userId: userId,
      songId: songId,
      durationMs: durationMs || 0,
      progressPct: progressPct || 0,
      isComplete: isComplete || false,
      viewedAt: new Date(),
      lastViewedAt: new Date()
    }], { session });

    // Increment view count on song
    const updatedSong = await Song.findByIdAndUpdate(
      songId,
      { $inc: { viewCount: 1 } },
      { new: true, session }
    );

    await session.commitTransaction();

    return {
      viewCount: updatedSong.viewCount || 0,
      hasViewed: true,
      isNewView: true
    };
  } catch (error) {
    await session.abortTransaction();
    
    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      // Another request already created the view record
      // Fetch the existing record and return current count
      const existingView = await View.findOne({
        userId: userId,
        songId: songId
      });
      const currentSong = await Song.findById(songId);
      
      return {
        viewCount: currentSong.viewCount || 0,
        hasViewed: true,
        isNewView: false
      };
    }
    
    throw error;
  } finally {
    session.endSession();
  }
}
```

### Key Business Rules

1. **One View Per User Per Song**
   - Check if view record exists before creating
   - Use database unique constraint as backup
   - Never increment count if user already viewed

2. **Atomic Operations**
   - Use database transactions
   - Ensure view record creation and count increment happen together
   - Handle race conditions gracefully

3. **Update Engagement Metrics**
   - Always update `durationMs`, `progressPct`, `isComplete` even if view exists
   - Use `Math.max()` to keep highest values
   - Update `lastViewedAt` timestamp

4. **Return Current Count**
   - Always return the current `viewCount` from database
   - Don't return calculated values
   - Ensure count is accurate even with concurrent requests

---

## 🚨 Error Handling

### Error Scenarios

#### 1. Song Not Found (404)
```javascript
if (!song) {
  return res.status(404).json({
    success: false,
    error: 'Song not found',
    code: 'NOT_FOUND'
  });
}
```

#### 2. Unauthorized (401)
```javascript
if (!userId) {
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    code: 'UNAUTHORIZED'
  });
}
```

#### 3. Duplicate View (200 OK, but no increment)
```javascript
// This is NOT an error - it's expected behavior
if (viewRecord) {
  // Return current count without incrementing
  return res.json({
    success: true,
    data: {
      viewCount: song.viewCount || 0,
      hasViewed: true
    }
  });
}
```

#### 4. Race Condition (Handle gracefully)
```javascript
catch (error) {
  if (error.code === 11000) { // Duplicate key error
    // Another request already created the view
    const existingView = await View.findOne({ userId, songId });
    const currentSong = await Song.findById(songId);
    
    return res.json({
      success: true,
      data: {
        viewCount: currentSong.viewCount || 0,
        hasViewed: true
      }
    });
  }
  throw error;
}
```

#### 5. Server Error (500)
```javascript
catch (error) {
  console.error('Error recording view:', error);
  return res.status(500).json({
    success: false,
    error: 'Failed to record view',
    code: 'SERVER_ERROR'
  });
}
```

---

## 🔄 Real-Time Updates

### WebSocket Event Emission

After successfully recording a view, emit a real-time update:

**Event Name**: `copyright-free-song-interaction-updated`

**Room**: `content:audio:{songId}`

**Payload**:
```json
{
  "songId": "692d7baeee2475007039982e",
  "viewCount": 1251,
  "likeCount": 89
}
```

**Implementation Example** (Node.js/Socket.IO):
```javascript
// After successfully recording view
if (io) {
  io.to(`content:audio:${songId}`).emit(
    'copyright-free-song-interaction-updated',
    {
      songId: songId,
      viewCount: updatedViewCount,
      likeCount: song.likeCount || 0
    }
  );
}
```

**When to Emit**:
- After successfully creating a new view record
- After updating engagement metrics (even if count didn't increment)
- Only emit if view count actually changed (for new views)

---

## 🔗 Frontend Integration Details

### Frontend Request Flow

1. **User plays song** → Frontend tracks playback progress
2. **Engagement threshold met** → One of:
   - 3 seconds of playback (`positionMs >= 3000`)
   - 25% progress (`progressPct >= 25`)
   - Song completed (`isComplete === true`)
3. **Frontend calls API** → `POST /api/audio/copyright-free/{songId}/view`
4. **Frontend receives response** → Updates UI with `viewCount`
5. **Frontend listens for real-time updates** → Updates count if WebSocket event received

### Frontend Request Examples

**Example 1: User listened for 5 seconds (30% progress)**
```json
POST /api/audio/copyright-free/692d7baeee2475007039982e/view
{
  "durationMs": 5000,
  "progressPct": 30,
  "isComplete": false
}
```

**Example 2: User completed the song**
```json
POST /api/audio/copyright-free/692d7baeee2475007039982e/view
{
  "durationMs": 180000,
  "progressPct": 100,
  "isComplete": true
}
```

**Example 3: Empty payload (frontend fallback)**
```json
POST /api/audio/copyright-free/692d7baeee2475007039982e/view
{}
```

### Frontend Expected Response Format

Frontend expects **exactly** this format:

```typescript
{
  success: boolean;
  data: {
    viewCount: number;    // REQUIRED - current total view count
    hasViewed: boolean;   // REQUIRED - always true if success
  };
}
```

**Frontend handles**:
- `success: false` → Shows error or ignores silently
- `data.viewCount` → Updates UI display
- `data.hasViewed` → Used for internal state tracking

### Frontend Logging

Frontend logs the following (for debugging):
- `📊 Recording view for song` - Before API call
- `🌐 Calling POST` - API request details
- `📥 Response status` - HTTP status
- `✅ View RECORDED and PERSISTED` - Success confirmation
- `❌ Failed to record view` - Error details

**Backend should ensure**:
- Consistent response format
- Accurate view counts
- Proper error messages

---

## 🧪 Testing Requirements

### Unit Tests

#### Test 1: First View (Should Increment Count)
```javascript
test('should record first view and increment count', async () => {
  const song = await Song.create({ title: 'Test Song', viewCount: 0 });
  const userId = 'user123';

  const result = await recordView(song._id, userId, {
    durationMs: 5000,
    progressPct: 30
  });

  expect(result.viewCount).toBe(1);
  expect(result.hasViewed).toBe(true);

  const updatedSong = await Song.findById(song._id);
  expect(updatedSong.viewCount).toBe(1);
});
```

#### Test 2: Duplicate View (Should Not Increment)
```javascript
test('should not increment count for duplicate view', async () => {
  const song = await Song.create({ title: 'Test Song', viewCount: 1 });
  const userId = 'user123';

  // Create existing view
  await View.create({ userId, songId: song._id });

  const result = await recordView(song._id, userId, {
    durationMs: 10000,
    progressPct: 50
  });

  expect(result.viewCount).toBe(1); // Not incremented
  expect(result.hasViewed).toBe(true);
});
```

#### Test 3: Concurrent Requests (Should Handle Gracefully)
```javascript
test('should handle concurrent requests gracefully', async () => {
  const song = await Song.create({ title: 'Test Song', viewCount: 0 });
  const userId = 'user123';

  // Simulate 10 concurrent requests
  const promises = Array(10).fill(null).map(() =>
    recordView(song._id, userId, { durationMs: 5000 })
  );

  const results = await Promise.all(promises);

  // Only one view should be counted
  const finalSong = await Song.findById(song._id);
  expect(finalSong.viewCount).toBe(1);

  // All requests should succeed
  results.forEach(result => {
    expect(result.hasViewed).toBe(true);
  });
});
```

### Integration Tests

#### Test 1: API Endpoint - Success
```javascript
test('POST /api/audio/copyright-free/:songId/view - should record view', async () => {
  const song = await Song.create({ title: 'Test Song' });
  const token = generateToken({ id: 'user123' });

  const res = await request(app)
    .post(`/api/audio/copyright-free/${song._id}/view`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      durationMs: 5000,
      progressPct: 30
    });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.viewCount).toBeGreaterThan(0);
  expect(res.body.data.hasViewed).toBe(true);
});
```

#### Test 2: API Endpoint - Unauthorized
```javascript
test('POST /api/audio/copyright-free/:songId/view - should return 401 without token', async () => {
  const song = await Song.create({ title: 'Test Song' });

  const res = await request(app)
    .post(`/api/audio/copyright-free/${song._id}/view`)
    .send({ durationMs: 5000 });

  expect(res.status).toBe(401);
  expect(res.body.success).toBe(false);
  expect(res.body.code).toBe('UNAUTHORIZED');
});
```

#### Test 3: API Endpoint - Song Not Found
```javascript
test('POST /api/audio/copyright-free/:songId/view - should return 404 for invalid song', async () => {
  const token = generateToken({ id: 'user123' });

  const res = await request(app)
    .post('/api/audio/copyright-free/invalid-id/view')
    .set('Authorization', `Bearer ${token}`)
    .send({ durationMs: 5000 });

  expect(res.status).toBe(404);
  expect(res.body.success).toBe(false);
  expect(res.body.code).toBe('NOT_FOUND');
});
```

---

## ✅ Implementation Checklist

### Database Setup
- [ ] Create `views` collection with required fields
- [ ] Create unique index on `{ userId: 1, songId: 1 }`
- [ ] Create index on `{ songId: 1 }`
- [ ] Create index on `{ userId: 1 }`
- [ ] Ensure `songs` collection has `viewCount` field (default: 0)

### API Endpoint
- [ ] Implement `POST /api/audio/copyright-free/{songId}/view`
- [ ] Add authentication middleware
- [ ] Validate song exists
- [ ] Check for existing view record
- [ ] Create new view record if needed
- [ ] Increment view count atomically
- [ ] Update engagement metrics
- [ ] Return correct response format
- [ ] Handle errors properly

### Business Logic
- [ ] Implement one-view-per-user-per-song logic
- [ ] Use database transactions for atomicity
- [ ] Handle race conditions gracefully
- [ ] Update engagement metrics on duplicate views
- [ ] Return accurate view counts

### Real-Time Updates
- [ ] Emit WebSocket event after view recorded
- [ ] Join users to content room: `content:audio:{songId}`
- [ ] Send event: `copyright-free-song-interaction-updated`
- [ ] Include `viewCount` and `likeCount` in payload

### Error Handling
- [ ] Return 401 for missing/invalid token
- [ ] Return 404 for non-existent song
- [ ] Return 500 for server errors
- [ ] Handle duplicate key errors (race conditions)
- [ ] Log errors for debugging

### Testing
- [ ] Unit tests for view recording logic
- [ ] Integration tests for API endpoint
- [ ] Test concurrent requests
- [ ] Test duplicate views
- [ ] Test error scenarios

### Documentation
- [ ] API documentation updated
- [ ] Database schema documented
- [ ] Error codes documented
- [ ] Real-time events documented

---

## 📝 Additional Notes

### Field Name Compatibility

Frontend supports both field name formats for backward compatibility:
- `views` OR `viewCount` → Both should work
- `likes` OR `likeCount` → Both should work

**Backend should**:
- Accept both formats in requests (if applicable)
- Return both formats in responses (recommended)
- Or return one format consistently (frontend handles both)

### Performance Considerations

1. **Database Indexes**: Critical for performance with unique constraint
2. **Transactions**: Use for atomicity, but keep them short
3. **Caching**: Consider caching view counts if needed (but ensure consistency)
4. **Rate Limiting**: Consider rate limiting to prevent abuse

### Security Considerations

1. **Authentication**: Always require valid JWT token
2. **User ID**: Extract from token, never from request body
3. **Input Validation**: Validate `durationMs`, `progressPct` ranges
4. **SQL Injection**: Use parameterized queries or ORM
5. **Rate Limiting**: Implement to prevent abuse

---

## 🔗 Related Endpoints

### Get Song by ID (for fetching latest view count)

**Endpoint**: `GET /api/audio/copyright-free/{songId}`

**Response should include**:
```json
{
  "success": true,
  "data": {
    "id": "692d7baeee2475007039982e",
    "title": "Song Title",
    "viewCount": 1251,
    "views": 1251,  // For compatibility
    "likeCount": 89,
    "likes": 89     // For compatibility
  }
}
```

**Frontend uses this** to fetch latest view count when options modal opens.

---

## 📞 Support

For questions or clarifications:
- Check frontend implementation: `app/components/CopyrightFreeSongModal.tsx`
- Check API service: `app/services/copyrightFreeMusicAPI.ts`
- Review existing docs: `docs/COPYRIGHT_FREE_MUSIC_VIEW_TRACKING_BACKEND_SPEC.md`

---

**Document Version**: 2.0  
**Last Updated**: 2024-12-19  
**Status**: ✅ Ready for Implementation  
**Frontend Status**: ✅ Fully Implemented and Tested

