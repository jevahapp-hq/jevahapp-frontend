# Copyright-Free Music View Tracking - Backend Implementation Guide

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Frontend Behavior](#frontend-behavior)
4. [API Endpoint Specification](#api-endpoint-specification)
5. [Database Schema](#database-schema)
6. [Implementation Logic](#implementation-logic)
7. [Code Examples](#code-examples)
8. [Error Handling](#error-handling)
9. [Real-Time Updates](#real-time-updates)
10. [Security Considerations](#security-considerations)
11. [Testing](#testing)
12. [Migration Guide](#migration-guide)

---

## Overview

This document provides a complete guide for implementing view tracking for copyright-free music in the backend. The view tracking system ensures accurate, non-duplicated view counts by tracking one view per authenticated user per song.

### Key Features

- ✅ **One view per user per song**: Each user counts as one view, regardless of how many times they listen
- ✅ **Engagement thresholds**: Views are only recorded when users meet engagement criteria
- ✅ **Deduplication**: Backend prevents duplicate view counting
- ✅ **Analytics tracking**: Stores engagement metrics (duration, progress, completion)
- ✅ **Real-time updates**: Supports WebSocket updates for live view count changes

### Frontend Integration

The frontend sends view tracking requests when users meet engagement thresholds:
- **3 seconds** of playback, OR
- **25% progress** (25% of song listened), OR
- **Completion** (song finished)

---

## Core Principles

### 1. One View Per User Per Song

**CRITICAL**: A user should only count as "viewed" once per song, regardless of:
- How many times they listen to the song
- How many times the frontend calls the API
- Network retries or duplicate requests

### 2. Qualified Views Only

Views are only recorded when engagement thresholds are met:
- Not on page load
- Not on modal open
- Only after meaningful engagement (3s, 25%, or completion)

### 3. View Deduplication

The backend **MUST** prevent duplicate view counting:
- Check if user already viewed before incrementing count
- Handle concurrent requests gracefully
- Use database constraints to prevent duplicates

### 4. User-Scoped Tracking

- Views are tracked per **authenticated user** (not anonymous or IP-based)
- Requires valid JWT token
- Unauthenticated requests should not record views

### 5. Engagement Analytics

Track engagement metrics for analytics:
- `durationMs`: Total listening duration
- `progressPct`: Maximum progress reached (0-100)
- `isComplete`: Whether song was played to completion

---

## Frontend Behavior

### When Views Are Recorded

The frontend tracks views with the following logic:

```javascript
// Frontend view tracking thresholds
const VIEW_THRESHOLDS = {
  MIN_DURATION_MS: 3000,      // 3 seconds
  MIN_PROGRESS_PCT: 25,        // 25% of song
  COMPLETION: true             // Song finished
};

// View is recorded when ANY threshold is met:
if (
  durationMs >= VIEW_THRESHOLDS.MIN_DURATION_MS ||
  progressPct >= VIEW_THRESHOLDS.MIN_PROGRESS_PCT ||
  isComplete === true
) {
  // Frontend calls: POST /api/audio/copyright-free/{songId}/view
  await recordView(songId, { durationMs, progressPct, isComplete });
}
```

### Frontend Request Format

```javascript
// Example frontend request
POST /api/audio/copyright-free/song-in-the-name-of-jesus/view
Headers:
  Authorization: Bearer {jwt_token}
  Content-Type: application/json
Body:
{
  "durationMs": 45000,      // 45 seconds of listening
  "progressPct": 30,        // 30% of song completed
  "isComplete": false       // Song not finished yet
}
```

### Frontend State Management

- Frontend uses `hasTrackedView` flag to prevent duplicate calls
- View count is updated optimistically, then synced with backend response
- Real-time updates via WebSocket keep view counts synchronized

---

## API Endpoint Specification

### Endpoint: Record View

**URL**: `POST /api/audio/copyright-free/{songId}/view`

**Method**: `POST`

**Authentication**: Required (Bearer token)

**Path Parameters**:
- `songId` (string, required): The unique identifier of the copyright-free song

**Request Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "durationMs": 45000,
  "progressPct": 30,
  "isComplete": false
}
```

**Request Fields** (all optional, but recommended):
- `durationMs` (number): Listening duration in milliseconds
- `progressPct` (number): Listening progress percentage (0-100)
- `isComplete` (boolean): Whether the song was played to completion

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "viewCount": 1251,
    "hasViewed": true
  }
}
```

**Response Fields**:
- `viewCount` (number, **REQUIRED**): Total view count for this song
- `hasViewed` (boolean, **REQUIRED**): Whether the authenticated user has viewed this song

**Error Responses**:

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "Song not found",
  "code": "NOT_FOUND"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to record view",
  "code": "SERVER_ERROR"
}
```

---

## Database Schema

### Song Collection

```javascript
// MongoDB Schema for Copyright-Free Song
{
  _id: ObjectId,
  title: String,
  artist: String,
  audioUrl: String,
  thumbnailUrl: String,
  duration: Number,           // Song duration in milliseconds
  viewCount: Number,          // Total unique views (default: 0)
  likeCount: Number,          // Total likes (default: 0)
  bookmarkCount: Number,      // Total bookmarks (default: 0)
  createdAt: Date,
  updatedAt: Date
}
```

### View Tracking Collection

```javascript
// MongoDB Schema for View Records
{
  _id: ObjectId,
  userId: ObjectId,          // Reference to User
  songId: ObjectId,           // Reference to Song
  durationMs: Number,         // Listening duration in milliseconds
  progressPct: Number,        // Maximum progress reached (0-100)
  isComplete: Boolean,        // Whether song was completed
  viewedAt: Date,            // First view timestamp
  lastViewedAt: Date,        // Last view timestamp (for analytics)
  createdAt: Date,
  updatedAt: Date
}

// Indexes (CRITICAL for performance and deduplication)
db.views.createIndex({ userId: 1, songId: 1 }, { unique: true });
db.views.createIndex({ songId: 1 });  // For querying song views
db.views.createIndex({ userId: 1 });  // For querying user views
```

**Important**: The unique index on `{ userId: 1, songId: 1 }` ensures that each user can only have one view record per song, preventing duplicates at the database level.

---

## Implementation Logic

### Core View Recording Logic

```javascript
/**
 * Record a view for a copyright-free song
 * @param {string} songId - The song ID
 * @param {string} userId - The authenticated user ID
 * @param {Object} payload - View engagement data
 * @param {number} payload.durationMs - Listening duration
 * @param {number} payload.progressPct - Progress percentage
 * @param {boolean} payload.isComplete - Whether completed
 * @returns {Promise<Object>} View count and status
 */
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

### Alternative: Upsert Pattern (Simpler)

```javascript
/**
 * Record view using upsert pattern (simpler but less explicit)
 */
async function recordViewUpsert(songId, userId, payload = {}) {
  const { durationMs = 0, progressPct = 0, isComplete = false } = payload;

  // Validate song exists
  const song = await Song.findById(songId);
  if (!song) {
    throw new Error('Song not found');
  }

  // Use findOneAndUpdate with upsert to handle race conditions
  const viewRecord = await View.findOneAndUpdate(
    { userId, songId },
    {
      $setOnInsert: {
        userId,
        songId,
        viewedAt: new Date()
      },
      $max: {
        durationMs: durationMs || 0,
        progressPct: progressPct || 0
      },
      $set: {
        isComplete: isComplete || viewRecord?.isComplete || false,
        lastViewedAt: new Date()
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  // Check if this was a new view (upsert created new document)
  const isNewView = viewRecord.viewedAt.getTime() === viewRecord.lastViewedAt.getTime();

  if (isNewView) {
    // Increment view count only for new views
    await Song.findByIdAndUpdate(songId, { $inc: { viewCount: 1 } });
  }

  // Get updated song with new view count
  const updatedSong = await Song.findById(songId);

  return {
    viewCount: updatedSong.viewCount || 0,
    hasViewed: true,
    isNewView: isNewView
  };
}
```

---

## Code Examples

### Node.js/Express Implementation

```javascript
// routes/copyrightFreeMusic.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { recordView } = require('../services/viewService');
const Song = require('../models/Song');

/**
 * POST /api/audio/copyright-free/:songId/view
 * Record a view for a copyright-free song
 */
router.post('/:songId/view', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const userId = req.user.id; // From auth middleware
    const { durationMs, progressPct, isComplete } = req.body;

    // Record the view
    const result = await recordView(songId, userId, {
      durationMs,
      progressPct,
      isComplete
    });

    // Emit real-time update via WebSocket (if configured)
    if (req.app.get('io')) {
      req.app.get('io').to(`content:audio:${songId}`).emit(
        'copyright-free-song-interaction-updated',
        {
          songId,
          viewCount: result.viewCount,
          likeCount: (await Song.findById(songId)).likeCount || 0
        }
      );
    }

    // Return success response
    res.json({
      success: true,
      data: {
        viewCount: result.viewCount,
        hasViewed: result.hasViewed
      }
    });
  } catch (error) {
    console.error('Error recording view:', error);

    // Handle specific errors
    if (error.message === 'Song not found') {
      return res.status(404).json({
        success: false,
        error: 'Song not found',
        code: 'NOT_FOUND'
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      error: 'Failed to record view',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
```

### Python/Flask Implementation

```python
# routes/copyright_free_music.py
from flask import Blueprint, request, jsonify
from middleware.auth import require_auth
from models import Song, View
from database import db
from datetime import datetime

copyright_free_bp = Blueprint('copyright_free', __name__)

@copyright_free_bp.route('/api/audio/copyright-free/<song_id>/view', methods=['POST'])
@require_auth
def record_view(song_id):
    """Record a view for a copyright-free song"""
    try:
        user_id = request.user.id  # From auth decorator
        payload = request.get_json() or {}
        
        duration_ms = payload.get('durationMs', 0)
        progress_pct = payload.get('progressPct', 0)
        is_complete = payload.get('isComplete', False)
        
        # Validate song exists
        song = Song.query.get(song_id)
        if not song:
            return jsonify({
                'success': False,
                'error': 'Song not found',
                'code': 'NOT_FOUND'
            }), 404
        
        # Check if user already viewed
        view_record = View.query.filter_by(
            userId=user_id,
            songId=song_id
        ).first()
        
        if view_record:
            # Update engagement metrics but don't increment count
            view_record.durationMs = max(view_record.durationMs, duration_ms)
            view_record.progressPct = max(view_record.progressPct, progress_pct)
            view_record.isComplete = view_record.isComplete or is_complete
            view_record.lastViewedAt = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'success': True,
                'data': {
                    'viewCount': song.viewCount or 0,
                    'hasViewed': True
                }
            }), 200
        
        # Create new view record
        view_record = View(
            userId=user_id,
            songId=song_id,
            durationMs=duration_ms,
            progressPct=progress_pct,
            isComplete=is_complete,
            viewedAt=datetime.utcnow(),
            lastViewedAt=datetime.utcnow()
        )
        
        db.session.add(view_record)
        
        # Increment view count
        song.viewCount = (song.viewCount or 0) + 1
        db.session.commit()
        
        # Emit real-time update (if WebSocket configured)
        # socketio.emit('copyright-free-song-interaction-updated', {
        #     'songId': song_id,
        #     'viewCount': song.viewCount
        # })
        
        return jsonify({
            'success': True,
            'data': {
                'viewCount': song.viewCount,
                'hasViewed': True
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f'Error recording view: {e}')
        return jsonify({
            'success': False,
            'error': 'Failed to record view',
            'code': 'SERVER_ERROR'
        }), 500
```

### MongoDB Aggregation for Analytics

```javascript
/**
 * Get view analytics for a song
 */
async function getViewAnalytics(songId) {
  const analytics = await View.aggregate([
    { $match: { songId: mongoose.Types.ObjectId(songId) } },
    {
      $group: {
        _id: null,
        totalViews: { $sum: 1 },
        avgDurationMs: { $avg: '$durationMs' },
        avgProgressPct: { $avg: '$progressPct' },
        completionRate: {
          $avg: { $cond: ['$isComplete', 1, 0] }
        },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        totalViews: 1,
        avgDurationMs: 1,
        avgProgressPct: 1,
        completionRate: { $multiply: ['$completionRate', 100] },
        uniqueUsers: { $size: '$uniqueUsers' }
      }
    }
  ]);

  return analytics[0] || {
    totalViews: 0,
    avgDurationMs: 0,
    avgProgressPct: 0,
    completionRate: 0,
    uniqueUsers: 0
  };
}
```

---

## Error Handling

### Error Scenarios

1. **Song Not Found** (404)
   - Song ID doesn't exist in database
   - Return: `{ success: false, error: "Song not found", code: "NOT_FOUND" }`

2. **Unauthorized** (401)
   - Missing or invalid JWT token
   - Return: `{ success: false, error: "Authentication required", code: "UNAUTHORIZED" }`

3. **Duplicate View** (200, but no increment)
   - User already viewed song
   - Return current count without incrementing
   - This is **NOT an error** - it's expected behavior

4. **Race Condition** (Handled gracefully)
   - Multiple concurrent requests from same user
   - Database unique constraint prevents duplicates
   - Return current count without incrementing

5. **Server Error** (500)
   - Database connection issues
   - Unexpected errors
   - Return: `{ success: false, error: "Failed to record view", code: "SERVER_ERROR" }`

### Error Handling Best Practices

```javascript
async function recordViewSafe(songId, userId, payload) {
  try {
    return await recordView(songId, userId, payload);
  } catch (error) {
    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      const song = await Song.findById(songId);
      return {
        viewCount: song.viewCount || 0,
        hasViewed: true,
        isNewView: false
      };
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      throw new Error('Invalid view data');
    }
    
    // Re-throw other errors
    throw error;
  }
}
```

---

## Real-Time Updates

### WebSocket Event Emission

When a view is recorded, emit a real-time update to connected clients:

```javascript
// After successfully recording view
io.to(`content:audio:${songId}`).emit(
  'copyright-free-song-interaction-updated',
  {
    songId: songId,
    viewCount: updatedViewCount,
    likeCount: song.likeCount || 0
  }
);
```

### Frontend WebSocket Listener

The frontend listens for these updates:

```javascript
socket.on('copyright-free-song-interaction-updated', (data) => {
  if (data.songId === currentSongId) {
    setViewCount(data.viewCount);
  }
});
```

### Benefits

- **Live updates**: View counts update in real-time across all clients
- **Consistency**: All users see the same view count
- **Better UX**: No need to refresh to see updated counts

---

## Security Considerations

### 1. Authentication Required

- **MUST**: All view tracking requests require valid JWT token
- **MUST**: Extract user ID from token, not from request body
- **MUST**: Reject unauthenticated requests with 401

### 2. Rate Limiting

Implement rate limiting to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

const viewRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many view requests, please try again later'
});

router.post('/:songId/view', authenticateToken, viewRateLimit, recordViewHandler);
```

### 3. Input Validation

Validate request payload:

```javascript
const { body, validationResult } = require('express-validator');

const validateViewPayload = [
  body('durationMs').optional().isInt({ min: 0 }),
  body('progressPct').optional().isFloat({ min: 0, max: 100 }),
  body('isComplete').optional().isBoolean()
];

router.post(
  '/:songId/view',
  authenticateToken,
  validateViewPayload,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... handle view recording
  }
);
```

### 4. SQL Injection Prevention

- Use parameterized queries
- Use ORM methods (Mongoose, Sequelize) instead of raw queries
- Validate and sanitize song IDs

### 5. View Count Manipulation Prevention

- **MUST**: Only increment count when creating NEW view record
- **MUST**: Use database transactions for atomicity
- **MUST**: Use unique constraints to prevent duplicates
- **MUST**: Never allow direct view count updates via API

---

## Testing

### Unit Tests

```javascript
// tests/viewService.test.js
const { recordView } = require('../services/viewService');
const Song = require('../models/Song');
const View = require('../models/View');

describe('View Service', () => {
  beforeEach(async () => {
    // Clear test data
    await Song.deleteMany({});
    await View.deleteMany({});
  });

  test('should record first view and increment count', async () => {
    const song = await Song.create({
      title: 'Test Song',
      viewCount: 0
    });

    const result = await recordView(song._id, 'user123', {
      durationMs: 5000,
      progressPct: 30
    });

    expect(result.viewCount).toBe(1);
    expect(result.hasViewed).toBe(true);
    expect(result.isNewView).toBe(true);

    const viewRecord = await View.findOne({
      userId: 'user123',
      songId: song._id
    });
    expect(viewRecord).toBeTruthy();
  });

  test('should not increment count for duplicate view', async () => {
    const song = await Song.create({
      title: 'Test Song',
      viewCount: 1
    });

    await View.create({
      userId: 'user123',
      songId: song._id,
      viewedAt: new Date()
    });

    const result = await recordView(song._id, 'user123', {
      durationMs: 10000,
      progressPct: 50
    });

    expect(result.viewCount).toBe(1); // Not incremented
    expect(result.hasViewed).toBe(true);
    expect(result.isNewView).toBe(false);
  });

  test('should handle concurrent requests gracefully', async () => {
    const song = await Song.create({
      title: 'Test Song',
      viewCount: 0
    });

    // Simulate concurrent requests
    const promises = Array(10).fill(null).map(() =>
      recordView(song._id, 'user123', { durationMs: 5000 })
    );

    const results = await Promise.all(promises);

    // Only one view should be counted
    const finalSong = await Song.findById(song._id);
    expect(finalSong.viewCount).toBe(1);

    // All requests should return hasViewed: true
    results.forEach(result => {
      expect(result.hasViewed).toBe(true);
    });
  });
});
```

### Integration Tests

```javascript
// tests/api/copyrightFreeMusic.test.js
const request = require('supertest');
const app = require('../../app');
const { generateToken } = require('../../utils/auth');

describe('POST /api/audio/copyright-free/:songId/view', () => {
  let token;
  let songId;

  beforeAll(async () => {
    token = generateToken({ id: 'user123' });
    // Create test song
    const song = await Song.create({ title: 'Test Song' });
    songId = song._id.toString();
  });

  test('should record view with valid token', async () => {
    const res = await request(app)
      .post(`/api/audio/copyright-free/${songId}/view`)
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

  test('should return 401 without token', async () => {
    const res = await request(app)
      .post(`/api/audio/copyright-free/${songId}/view`)
      .send({ durationMs: 5000 });

    expect(res.status).toBe(401);
  });

  test('should return 404 for non-existent song', async () => {
    const res = await request(app)
      .post('/api/audio/copyright-free/invalid-id/view')
      .set('Authorization', `Bearer ${token}`)
      .send({ durationMs: 5000 });

    expect(res.status).toBe(404);
  });
});
```

---

## Migration Guide

### Step 1: Create Database Schema

```javascript
// migrations/create_view_tracking.js
async function up() {
  // Create View collection
  await db.createCollection('views');
  
  // Create indexes
  await db.collection('views').createIndex(
    { userId: 1, songId: 1 },
    { unique: true, name: 'user_song_unique' }
  );
  
  await db.collection('views').createIndex(
    { songId: 1 },
    { name: 'song_index' }
  );
  
  await db.collection('views').createIndex(
    { userId: 1 },
    { name: 'user_index' }
  );
  
  // Add viewCount field to songs (if not exists)
  await db.collection('songs').updateMany(
    { viewCount: { $exists: false } },
    { $set: { viewCount: 0 } }
  );
}

async function down() {
  await db.collection('views').drop();
  await db.collection('songs').updateMany(
    {},
    { $unset: { viewCount: '' } }
  );
}
```

### Step 2: Implement Endpoint

1. Create route handler
2. Add authentication middleware
3. Implement view recording logic
4. Add error handling
5. Add real-time updates (optional)

### Step 3: Test Implementation

1. Test first view (should increment count)
2. Test duplicate view (should not increment)
3. Test concurrent requests (should handle gracefully)
4. Test error cases (404, 401, 500)

### Step 4: Deploy

1. Deploy backend changes
2. Monitor error rates
3. Verify view counts are accurate
4. Check real-time updates (if implemented)

---

## Summary

### Critical Requirements

1. ✅ **One view per user per song**: Use unique database constraint
2. ✅ **Deduplication**: Check existing view before incrementing
3. ✅ **Authentication**: Require valid JWT token
4. ✅ **Atomic operations**: Use database transactions
5. ✅ **Error handling**: Handle all error scenarios gracefully

### Endpoint Summary

```
POST /api/audio/copyright-free/{songId}/view
Headers: Authorization: Bearer {token}
Body: { durationMs?, progressPct?, isComplete? }
Response: { success: true, data: { viewCount: number, hasViewed: boolean } }
```

### Database Schema

```javascript
// View Record
{
  userId: ObjectId,
  songId: ObjectId,
  durationMs: Number,
  progressPct: Number,
  isComplete: Boolean,
  viewedAt: Date,
  lastViewedAt: Date
}

// Unique Index: { userId: 1, songId: 1 }
```

### Implementation Checklist

- [ ] Create View collection with unique index
- [ ] Implement recordView function with deduplication
- [ ] Create POST endpoint with authentication
- [ ] Add error handling for all scenarios
- [ ] Implement real-time updates (optional)
- [ ] Add rate limiting
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Deploy and monitor

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation

