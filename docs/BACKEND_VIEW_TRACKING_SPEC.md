# Backend View Tracking API Specification

## Overview

This document specifies the backend API requirements for view tracking to ensure accurate, non-duplicated view counts and proper engagement metrics. The frontend tracks views with specific thresholds and deduplication logic that must be respected by the backend.

**Last Updated**: 2024-12-19  
**Frontend Version**: Post-unified-interaction-refactor

---

## 🎯 Core Principles

1. **One view per user per content**: A user should only count as "viewed" once per content item, regardless of how many times they watch it.

2. **Qualified views only**: Views are only recorded when engagement thresholds are met (not just on page load).

3. **View deduplication**: Backend must prevent duplicate view counting if the frontend accidentally calls the API multiple times.

4. **Engagement tracking**: Track view duration and progress for analytics, but count as "viewed" only once.

5. **User-scoped tracking**: Views are tracked per authenticated user (not anonymous or IP-based).

---

## Frontend View Tracking Behavior

### Video Content

**Thresholds** (any one qualifies):
- **3 seconds** of playback, OR
- **25% progress** (25% of video watched), OR
- **Completion** (video finished)

**When view is recorded**:
- Only **once per content item** (frontend uses `hasTrackedView` flag)
- When any threshold is met
- Sends: `{ durationMs, progressPct, isComplete }`

**Example**:
```javascript
// User watches video for 4 seconds → qualifies (3s threshold)
// Frontend calls: POST /api/content/media/{videoId}/view
// Payload: { durationMs: 4000, progressPct: 10, isComplete: false }
// Backend should: Record view, return updated viewCount
```

---

### Audio/Music Content

**Thresholds** (any one qualifies):
- **3 seconds** of playback, OR
- **25% progress** (25% of audio listened), OR
- **Completion** (audio finished)

**When view is recorded**:
- Only **once per content item**
- When any threshold is met
- Sends: `{ durationMs, progressPct, isComplete }`

**Example**:
```javascript
// User listens to 30% of audio → qualifies (25% threshold)
// Frontend calls: POST /api/content/media/{audioId}/view
// Payload: { durationMs: 45000, progressPct: 30, isComplete: false }
// Backend should: Record view, return updated viewCount
```

---

### Ebook/PDF Content

**Thresholds**:
- **5 seconds** after content is opened (fixed time threshold)

**When view is recorded**:
- Only **once per content item**
- After 5 seconds of content being visible
- Sends: `{ durationMs: 5000, progressPct: 0, isComplete: false }`

**Example**:
```javascript
// User opens ebook, waits 5 seconds → qualifies
// Frontend calls: POST /api/content/ebook/{ebookId}/view
// Payload: { durationMs: 5000, progressPct: 0, isComplete: false }
// Backend should: Record view, return updated viewCount
```

---

## Backend API Specification

### Endpoint: Record View

**Endpoint**: `POST /api/content/{contentType}/{contentId}/view`

**Path Parameters**:
- `contentType`: Backend content type (`media`, `devotional`, `ebook`, etc.)
- `contentId`: MongoDB ObjectId of the content

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "durationMs": 4000,
  "progressPct": 25,
  "isComplete": false
}
```

**Request Fields** (all optional, but frontend sends them):
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
- `viewCount` (number, **REQUIRED**): Total view count for this content
- `hasViewed` (boolean, **REQUIRED**): Whether the authenticated user has viewed this content

**Status Codes**:
- `200 OK`: Success (view recorded or already recorded)
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Content not found
- `500 Internal Server Error`: Server error

---

## Critical Backend Requirements

### 1. View Deduplication

**MUST**: The backend **MUST** prevent counting the same user viewing the same content multiple times.

**Implementation Pattern**:

```javascript
// ✅ CORRECT: Check if user already viewed before incrementing
async function recordView(contentId, contentType, userId, payload) {
  // 1. Check if user already viewed this content
  const existingView = await View.findOne({
    userId: userId,
    contentId: contentId,
    contentType: contentType
  });
  
  if (existingView) {
    // User already viewed → update engagement metrics but don't increment count
    existingView.durationMs = Math.max(existingView.durationMs, payload.durationMs || 0);
    existingView.progressPct = Math.max(existingView.progressPct, payload.progressPct || 0);
    existingView.isComplete = existingView.isComplete || payload.isComplete || false;
    existingView.lastViewedAt = new Date();
    await existingView.save();
    
    // Return current count (not incremented)
    const content = await Content.findById(contentId);
    return {
      viewCount: content.viewCount || 0,
      hasViewed: true
    };
  }
  
  // 2. User hasn't viewed → create new view record and increment count
  await View.create({
    userId: userId,
    contentId: contentId,
    contentType: contentType,
    durationMs: payload.durationMs || 0,
    progressPct: payload.progressPct || 0,
    isComplete: payload.isComplete || false,
    viewedAt: new Date()
  });
  
  // Increment view count on content
  const content = await Content.findByIdAndUpdate(
    contentId,
    { $inc: { viewCount: 1 } },
    { new: true }
  );
  
  return {
    viewCount: content.viewCount || 0,
    hasViewed: true
  };
}
```

**Why this matters**: 
- Frontend may call the API multiple times (network retries, component re-renders)
- User may watch the same video multiple times
- **Only the first view should count** toward the total view count

---

### 2. View Count Accuracy

**MUST**: View counts must be accurate and never decrease.

**Implementation**:
- Use atomic increment (`$inc` in MongoDB) to prevent race conditions
- Store view records in a separate collection/table for audit trail
- Never decrement view counts (even if user deletes account, keep historical count)

**Example**:
```javascript
// ✅ CORRECT: Atomic increment
await Content.findByIdAndUpdate(
  contentId,
  { $inc: { viewCount: 1 } },
  { new: true }
);

// ❌ WRONG: Manual increment (race condition risk)
const content = await Content.findById(contentId);
content.viewCount = (content.viewCount || 0) + 1;
await content.save();
```

---

### 3. User-Scoped View Tracking

**MUST**: Views are tracked per authenticated user, not per session or IP address.

**Requirements**:
- Extract user ID from JWT token
- Store `userId` with each view record
- Return `hasViewed: true` if user has viewed, `false` otherwise
- Use `userId` for deduplication checks

**Example**:
```javascript
// Extract user from token
const userId = req.user._id; // or req.user.id, depending on your auth middleware

// Check if this user already viewed
const existingView = await View.findOne({
  userId: userId,  // ← Use authenticated user ID
  contentId: contentId
});
```

---

### 4. Engagement Metrics (Optional but Recommended)

**SHOULD**: Track engagement metrics even if view is already recorded.

**Metrics to track**:
- `durationMs`: Total viewing duration (update to max if user watches longer)
- `progressPct`: Maximum progress reached (update to max)
- `isComplete`: Whether content was completed (set to true if completed)
- `lastViewedAt`: Last time user viewed this content
- `viewCount`: Number of times user viewed (for analytics, separate from content view count)

**Example Schema**:
```javascript
{
  userId: ObjectId,
  contentId: ObjectId,
  contentType: String,
  durationMs: Number,        // Max duration across all views
  progressPct: Number,      // Max progress across all views
  isComplete: Boolean,      // True if ever completed
  firstViewedAt: Date,      // First view timestamp
  lastViewedAt: Date,       // Most recent view timestamp
  viewCount: Number         // Number of times this user viewed (for analytics)
}
```

**Note**: `viewCount` on the `View` record is for analytics (how many times THIS user watched), while `viewCount` on the `Content` record is the total (how many unique users watched).

---

## Database Schema Recommendations

### View Record Collection/Table

```javascript
// MongoDB Example Schema
{
  _id: ObjectId,
  userId: ObjectId,           // Indexed
  contentId: ObjectId,        // Indexed
  contentType: String,        // Indexed
  durationMs: Number,
  progressPct: Number,
  isComplete: Boolean,
  firstViewedAt: Date,
  lastViewedAt: Date,
  viewCount: Number,          // Times this user viewed (analytics)
  createdAt: Date,
  updatedAt: Date
}

// Compound Index for fast lookups
db.views.createIndex({ userId: 1, contentId: 1, contentType: 1 }, { unique: true });
```

**Why unique index**: Prevents duplicate view records per user per content (database-level deduplication).

---

### Content Collection/Table

```javascript
// MongoDB Example Schema
{
  _id: ObjectId,
  title: String,
  contentType: String,
  viewCount: Number,          // Total unique views (incremented once per user)
  likeCount: Number,
  bookmarkCount: Number,
  shareCount: Number,
  commentCount: Number,
  // ... other fields
}
```

---

## API Response Examples

### First View (New View)

**Request**:
```bash
POST /api/content/media/507f1f77bcf86cd799439011/view
Authorization: Bearer <token>
{
  "durationMs": 4000,
  "progressPct": 25,
  "isComplete": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "viewCount": 1235,    // Incremented from 1234
    "hasViewed": true     // User now has viewed
  }
}
```

---

### Subsequent View (Already Viewed)

**Request**:
```bash
POST /api/content/media/507f1f77bcf86cd799439011/view
Authorization: Bearer <token>
{
  "durationMs": 120000,
  "progressPct": 100,
  "isComplete": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "viewCount": 1235,    // NOT incremented (user already viewed)
    "hasViewed": true     // Still true
  }
}
```

**Backend Behavior**:
- View count does NOT increment (user already counted)
- Engagement metrics ARE updated (duration, progress, completion status)
- `hasViewed` remains `true`

---

## Edge Cases & Error Handling

### 1. Multiple Rapid API Calls

**Scenario**: Frontend calls API multiple times in quick succession (network retry, component re-render).

**Backend Behavior**:
- First call: Create view record, increment count
- Subsequent calls: Update engagement metrics, return same count
- Use database unique index to prevent duplicates

**Implementation**:
```javascript
try {
  // Try to create view record
  await View.create({ userId, contentId, ... });
  // Increment count
  await Content.findByIdAndUpdate(contentId, { $inc: { viewCount: 1 } });
} catch (error) {
  if (error.code === 11000) { // Duplicate key error
    // View already exists → update engagement metrics only
    await View.findOneAndUpdate(
      { userId, contentId },
      { 
        $max: { durationMs: payload.durationMs },
        $max: { progressPct: payload.progressPct },
        $set: { isComplete: payload.isComplete || false },
        lastViewedAt: new Date()
      }
    );
  }
}
```

---

### 2. Unauthenticated Requests

**Scenario**: User is not logged in (no token or invalid token).

**Backend Behavior**:
- Return `401 Unauthorized` OR
- Return `200 OK` with `viewCount` (total) but `hasViewed: false`
- **Do NOT** record view (views are user-scoped)

**Recommended**: Return `401 Unauthorized` to enforce authentication.

---

### 3. Content Not Found

**Scenario**: Content ID doesn't exist in database.

**Backend Behavior**:
- Return `404 Not Found`
- Do NOT create view record
- Do NOT increment any counts

---

### 4. Invalid Content Type

**Scenario**: Frontend sends invalid content type.

**Backend Behavior**:
- Map to default type (`media`) OR
- Return `400 Bad Request` with error message

---

## Integration with Metadata Endpoint

The `hasViewed` flag should also be returned in metadata endpoints:

### Single Metadata
```json
GET /api/content/media/{contentId}/metadata

Response:
{
  "success": true,
  "data": {
    "hasViewed": true,    // ← Should match view tracking
    "viewCount": 1235,
    ...
  }
}
```

### Batch Metadata
```json
POST /api/content/batch-metadata

Response:
{
  "success": true,
  "data": [
    {
      "id": "{contentId}",
      "hasViewed": true,   // ← Should match view tracking
      "viewCount": 1235,
      ...
    }
  ]
}
```

**Implementation**: Query the `View` collection to check if user has viewed each content item.

---

## Testing Checklist

Backend team should verify:

- [ ] **First view increments count**: New user viewing content increments `viewCount`
- [ ] **Subsequent views don't increment**: Same user viewing again does NOT increment `viewCount`
- [ ] **Deduplication works**: Multiple rapid API calls only count once
- [ ] **User-scoped**: Different users viewing same content each increment count
- [ ] **Engagement metrics update**: Duration/progress/completion update even if view already recorded
- [ ] **Metadata returns `hasViewed`**: Metadata endpoints return correct `hasViewed` flag
- [ ] **Atomic increments**: No race conditions when multiple users view simultaneously
- [ ] **Authentication required**: Unauthenticated requests return 401 or don't record views
- [ ] **Content type mapping**: Frontend types (`video`, `audio`) map to backend types (`media`)
- [ ] **Error handling**: Invalid content IDs return 404, don't create view records

---

## Performance Considerations

### Efficient Queries

**Use indexes**:
```javascript
// Compound index for fast lookups
db.views.createIndex({ userId: 1, contentId: 1, contentType: 1 }, { unique: true });
db.views.createIndex({ contentId: 1 }); // For content view queries
```

**Batch queries for metadata**:
```javascript
// When returning batch metadata, query all user views at once
const userViews = await View.find({
  userId: userId,
  contentId: { $in: contentIds }
}).lean();

// Create lookup map
const viewsMap = new Map(userViews.map(v => [v.contentId.toString(), true]));

// Use map to set hasViewed flag
contentItems.forEach(item => {
  item.hasViewed = viewsMap.has(item.id);
});
```

---

## Analytics & Reporting (Optional)

If you want to track engagement beyond just view counts:

### Average View Duration
```javascript
// Calculate average view duration per content
const avgDuration = await View.aggregate([
  { $match: { contentId: ObjectId(contentId) } },
  { $group: { _id: null, avgDuration: { $avg: "$durationMs" } } }
]);
```

### Completion Rate
```javascript
// Calculate completion rate (views completed / total views)
const completionRate = await View.aggregate([
  { $match: { contentId: ObjectId(contentId) } },
  { $group: {
    _id: null,
    total: { $sum: 1 },
    completed: { $sum: { $cond: ["$isComplete", 1, 0] } }
  }},
  { $project: { completionRate: { $divide: ["$completed", "$total"] } } }
]);
```

### Re-watch Rate
```javascript
// Calculate how many users watched multiple times
const rewatchRate = await View.aggregate([
  { $match: { contentId: ObjectId(contentId) } },
  { $group: {
    _id: "$userId",
    viewCount: { $sum: 1 }
  }},
  { $match: { viewCount: { $gt: 1 } } },
  { $count: "rewatchedUsers" }
]);
```

---

## Summary

### Key Requirements

1. ✅ **One view per user per content** (deduplication)
2. ✅ **User-scoped tracking** (authenticated users only)
3. ✅ **Atomic increments** (prevent race conditions)
4. ✅ **Engagement metrics** (duration, progress, completion)
5. ✅ **Metadata integration** (`hasViewed` flag in metadata endpoints)

### What Backend Must Do

1. Check if user already viewed before incrementing count
2. Use database unique index to prevent duplicates
3. Update engagement metrics even if view already recorded
4. Return `hasViewed: true` in metadata endpoints
5. Use atomic operations for count increments

### What Frontend Does

1. Tracks view only when thresholds are met (3s, 25%, completion)
2. Uses `hasTrackedView` flag to prevent multiple API calls
3. Sends engagement metrics (`durationMs`, `progressPct`, `isComplete`)
4. Expects `viewCount` and `hasViewed` in response

---

**Document Version**: 1.0  
**Maintained By**: Frontend Team  
**Last Review**: 2024-12-19




