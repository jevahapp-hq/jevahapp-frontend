# Backend Like System Implementation Guide

**Status:** 🔴 CRITICAL - Production Blocker  
**Issue:** Like count returns 0 after successful like operation  
**Root Cause:** Media collection not being updated when likes are created

---

## The Problem

When a user likes content:
- `MediaInteraction` record is created ✅
- `Media.likeCount` is NOT incremented ❌
- Feed returns stale `likeCount: 0` ❌

Views and comments work because they use `$inc`. Likes don't work because the Media document isn't updated.

---

## How Frontend Sends Like Requests

### Like Toggle Request
```http
POST /api/content/media/{contentId}/like
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

Body: {}  // Empty body - backend determines toggle state
```

### Expected Response
```json
{
  "success": true,
  "message": "Like toggled successfully",
  "data": {
    "contentId": "69a2d2dc365de0f3eed7637e",
    "liked": true,
    "likeCount": 1  // Must reflect actual count after operation
  }
}
```

### Current Broken Response
```json
{
  "success": true,
  "data": {
    "contentId": "69a2d2dc365de0f3eed7637e",
    "liked": true,
    "likeCount": 0  // ❌ Wrong - should be 1
  }
}
```

---

## How Views/Comments Work (Correct Implementation)

### View Count Implementation
```javascript
// When view is recorded
async function recordView(contentId, userId) {
  // 1. Create view record (optional - for analytics)
  await View.create({ contentId, userId, timestamp: new Date() });
  
  // 2. INCREMENT the count in Media collection
  await Media.updateOne(
    { _id: contentId },
    { $inc: { viewCount: 1 } }  // ✅ This is what makes it work
  );
  
  // 3. Return fresh count
  const media = await Media.findById(contentId);
  return { viewCount: media.viewCount };
}
```

### Comment Count Implementation
```javascript
// When comment is created
async function createComment(contentId, userId, content) {
  // 1. Create comment
  await Comment.create({ contentId, userId, content });
  
  // 2. INCREMENT the count in Media collection
  await Media.updateOne(
    { _id: contentId },
    { $inc: { commentCount: 1 } }  // ✅ This is what makes it work
  );
  
  // 3. Return fresh count
  const media = await Media.findById(contentId);
  return { commentCount: media.commentCount };
}
```

### Result in Feed
```json
{
  "viewCount": 11,     // ✅ Correct - incremented on each view
  "commentCount": 1,   // ✅ Correct - incremented when comment added
  "likeCount": 0       // ❌ Wrong - not being incremented
}
```

---

## How Likes Should Work (Fix Required)

### Correct Like Implementation
```javascript
async function toggleLike(contentId, userId) {
  // 1. Check if user already liked
  const existingLike = await MediaInteraction.findOne({
    contentId,
    userId,
    deletedAt: null  // Active likes only
  });
  
  let liked;
  let likeCountDelta;
  
  if (existingLike) {
    // UNLIKE: Soft delete the interaction
    existingLike.deletedAt = new Date();
    await existingLike.save();
    liked = false;
    likeCountDelta = -1;
  } else {
    // LIKE: Create new interaction
    await MediaInteraction.create({
      contentId,
      userId,
      createdAt: new Date(),
      deletedAt: null
    });
    liked = true;
    likeCountDelta = 1;
  }
  
  // 2. UPDATE Media.likeCount (THIS IS THE MISSING PIECE!)
  await Media.updateOne(
    { _id: contentId },
    { $inc: { likeCount: likeCountDelta } }  // ✅ ADD THIS LINE
  );
  
  // 3. Return FRESH count from database (not cached)
  const media = await Media.findById(contentId);
  
  return {
    success: true,
    data: {
      contentId,
      liked,
      likeCount: Math.max(0, media.likeCount)  // ✅ Now correct
    }
  };
}
```

---

## Database Schema Requirements

### Media Collection
```javascript
const MediaSchema = new Schema({
  // ... other fields ...
  
  // Count fields (must be updated on each interaction)
  viewCount: { type: Number, default: 0 },      // ✅ Updated on view
  commentCount: { type: Number, default: 0 },   // ✅ Updated on comment
  likeCount: { type: Number, default: 0 },      // ❌ NOT being updated on like
  shareCount: { type: Number, default: 0 },
  
  // ... other fields ...
});
```

### MediaInteraction Collection
```javascript
const MediaInteractionSchema = new Schema({
  contentId: { type: Schema.Types.ObjectId, ref: 'Media', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  interactionType: { type: String, enum: ['like', 'save', 'share'], required: true },
  createdAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }  // Soft delete for unlike
});

// Index for fast lookups
MediaInteractionSchema.index({ contentId: 1, userId: 1, interactionType: 1 });
```

---

## Complete Backend Fix

### Option 1: Fix Toggle Like Endpoint (Recommended)
```javascript
// File: routes/content.js or controllers/likeController.js

router.post('/:contentType/:contentId/like', authenticateToken, async (req, res) => {
  try {
    const { contentId } = req.params;
    const userId = req.user._id;
    
    // 1. Find existing like
    const existing = await MediaInteraction.findOne({
      contentId,
      userId,
      interactionType: 'like',
      deletedAt: null
    });
    
    let liked;
    let delta;
    
    if (existing) {
      // Unlike
      existing.deletedAt = new Date();
      await existing.save();
      liked = false;
      delta = -1;
    } else {
      // Like
      await MediaInteraction.create({
        contentId,
        userId,
        interactionType: 'like',
        createdAt: new Date()
      });
      liked = true;
      delta = 1;
    }
    
    // 2. UPDATE MEDIA LIKE COUNT (CRITICAL FIX)
    await Media.updateOne(
      { _id: contentId },
      { $inc: { likeCount: delta } }
    );
    
    // 3. Get fresh count
    const media = await Media.findById(contentId);
    
    // 4. Invalidate cache if using Redis
    await redis.del(`media:${contentId}:metadata`);
    
    res.json({
      success: true,
      message: liked ? 'Liked successfully' : 'Unliked successfully',
      data: {
        contentId,
        liked,
        likeCount: Math.max(0, media.likeCount)
      }
    });
    
  } catch (error) {
    console.error('Like toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like'
    });
  }
});
```

### Option 2: Use Aggregation Pipeline (Alternative)
```javascript
// If you prefer calculating from interactions table
router.post('/:contentType/:contentId/like', authenticateToken, async (req, res) => {
  // ... toggle logic ...
  
  // Calculate actual count from interactions
  const likeCount = await MediaInteraction.countDocuments({
    contentId,
    interactionType: 'like',
    deletedAt: null
  });
  
  // Update Media with accurate count
  await Media.updateOne(
    { _id: contentId },
    { likeCount }  // Set to calculated value
  );
  
  // ... return response ...
});
```

---

## Feed Endpoint Fix

### Current Problem
Feed returns stale `likeCount` from cached/old data.

### Solution: Return Fresh Count
```javascript
// GET /api/media/all-content
router.get('/all-content', async (req, res) => {
  const media = await Media.find()
    .select('title description fileUrl thumbnailUrl viewCount likeCount commentCount')
    .lean();
  
  // If counts might be stale, recalculate:
  const mediaWithFreshCounts = await Promise.all(
    media.map(async (item) => {
      // Optional: Ensure counts are accurate
      const likeCount = await MediaInteraction.countDocuments({
        contentId: item._id,
        interactionType: 'like',
        deletedAt: null
      });
      
      return {
        ...item,
        likeCount  // Fresh count
      };
    })
  );
  
  res.json({
    success: true,
    data: { media: mediaWithFreshCounts }
  });
});
```

---

## Verification Steps

### 1. Test Like Toggle
```bash
# Like content
curl -X POST "https://api.jevahapp.com/api/content/media/CONTENT_ID/like" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "data": { "liked": true, "likeCount": 1 } }
```

### 2. Check Database
```javascript
// MongoDB shell
const media = db.media.findOne({ _id: ObjectId("CONTENT_ID") });
print(media.likeCount);  // Should be 1 after like
```

### 3. Check Feed
```bash
# Get feed
curl "https://api.jevahapp.com/api/media/all-content" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: likeCount: 1 for liked content
```

### 4. Test Unlike
```bash
# Unlike (same endpoint)
curl -X POST "https://api.jevahapp.com/api/content/media/CONTENT_ID/like" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "data": { "liked": false, "likeCount": 0 } }
```

---

## Common Mistakes to Avoid

### ❌ Wrong: Only create interaction record
```javascript
await MediaInteraction.create({ contentId, userId });  // Only this
// Missing: Media.likeCount update!
```

### ✅ Right: Update both
```javascript
await MediaInteraction.create({ contentId, userId });
await Media.updateOne({ _id: contentId }, { $inc: { likeCount: 1 } });  // Add this!
```

### ❌ Wrong: Return cached count
```javascript
const media = await Media.findById(contentId);  // Might be cached
return { likeCount: media.likeCount };  // Stale value
```

### ✅ Right: Return fresh count
```javascript
await Media.updateOne({ _id: contentId }, { $inc: { likeCount: 1 } });
const media = await Media.findById(contentId);  // Fresh from DB
return { likeCount: media.likeCount };  // Updated value
```

---

## Summary

| Feature | Works? | Implementation |
|---------|--------|----------------|
| View count | ✅ | `$inc: { viewCount: 1 }` on each view |
| Comment count | ✅ | `$inc: { commentCount: 1 }` on each comment |
| Like count | ❌ | **MISSING `$inc: { likeCount: 1 }`** |

**The Fix:** Add `{ $inc: { likeCount: 1 } }` to your like endpoint, just like you do for views and comments.

---

## Timeline

- **Fix required:** Before production
- **Estimated effort:** 30 minutes (single line change)
- **Testing:** 15 minutes

---

## Contact

Frontend is ready and waiting. The API contract is correct. The issue is the Media collection not being updated.
