# Backend Like Count Fix - Production Critical

**Status:** 🔴 CRITICAL - BLOCKING PRODUCTION  
**Issue:** Like count returns 0 even after user successfully likes content  
**Affected Endpoint:** `POST /api/content/:contentType/:contentId/like`

---

## The Problem

When a user likes content:
1. Frontend calls `POST /api/content/media/:id/like`
2. Backend responds with `liked: true` (correct)
3. Backend responds with `likeCount: 0` (**WRONG** - should be at least 1)

### Current Broken Response
```json
{
  "success": true,
  "data": {
    "contentId": "69a2d2dc365de0f3eed7637e",
    "liked": true,
    "likeCount": 0  // ❌ WRONG - user just liked, should be >= 1
  }
}
```

### Expected Correct Response
```json
{
  "success": true,
  "data": {
    "contentId": "69a2d2dc365de0f3eed7637e",
    "liked": true,
    "likeCount": 1  // ✅ CORRECT - reflects the user's like
  }
}
```

---

## Root Cause (Most Likely)

The `likeCount` is being calculated **before** the like is persisted, or the aggregation query is stale/cached.

Common backend bugs:

1. **Race Condition:** Count query runs before DB write completes
2. **Stale Cache:** Redis/cache returns old count before invalidation
3. **Wrong Query:** Counting from wrong table/collection
4. **Transaction Issue:** Like saved but not committed when count is read

---

## Required Fix

### Option 1: Return Incremented Count (Recommended - Fastest)

Instead of querying the count after save, calculate it:

```javascript
// PSEUDOCODE - Adapt to your stack
async function toggleLike(contentId, userId) {
  const existingLike = await MediaInteraction.findOne({
    contentId,
    userId,
    deletedAt: null
  });
  
  let liked;
  let likeCountDelta;
  
  if (existingLike) {
    // Unlike
    existingLike.deletedAt = new Date();
    await existingLike.save();
    liked = false;
    likeCountDelta = -1;
  } else {
    // Like
    await MediaInteraction.create({
      contentId,
      userId,
      createdAt: new Date(),
      deletedAt: null
    });
    liked = true;
    likeCountDelta = 1;
  }
  
  // Get current count and apply delta
  const currentCount = await Media.countDocuments({ _id: contentId });
  const newLikeCount = Math.max(0, (currentCount.likeCount || 0) + likeCountDelta);
  
  // Update the count in DB
  await Media.updateOne(
    { _id: contentId },
    { $inc: { likeCount: likeCountDelta } }
  );
  
  return {
    success: true,
    data: {
      contentId,
      liked,
      likeCount: newLikeCount  // ✅ Return the updated count
    }
  };
}
```

### Option 2: Force Fresh Read (If Using Cache)

```javascript
// PSEUDOCODE
async function toggleLike(contentId, userId) {
  // ... perform like/unlike ...
  
  // Force fresh count from DB, not cache
  const freshCount = await MediaInteraction.countDocuments({
    contentId,
    deletedAt: null
  });
  
  // Invalidate cache
  await redis.del(`content:${contentId}:likeCount`);
  
  return {
    success: true,
    data: {
      contentId,
      liked,
      likeCount: freshCount  // ✅ Fresh from DB
    }
  };
}
```

### Option 3: Use Database Transaction (Most Reliable)

```javascript
// PSEUDOCODE
async function toggleLike(contentId, userId) {
  const session = await mongoose.startSession();
  
  try {
    const result = await session.withTransaction(async () => {
      // 1. Toggle like
      const existing = await MediaInteraction.findOne({
        contentId,
        userId,
        deletedAt: null
      }).session(session);
      
      let liked;
      if (existing) {
        existing.deletedAt = new Date();
        await existing.save({ session });
        liked = false;
      } else {
        await MediaInteraction.create([{
          contentId,
          userId,
          createdAt: new Date()
        }], { session });
        liked = true;
      }
      
      // 2. Update count atomically
      const update = liked
        ? { $inc: { likeCount: 1 } }
        : { $inc: { likeCount: -1 } };
        
      const updated = await Media.findByIdAndUpdate(
        contentId,
        update,
        { new: true, session }  // new: true returns updated doc
      );
      
      return {
        contentId,
        liked,
        likeCount: Math.max(0, updated.likeCount)
      };
    });
    
    return { success: true, data: result };
  } finally {
    await session.endSession();
  }
}
```

---

## Verification Steps

### 1. Test the Fix
```bash
# 1. Get initial state
curl -X GET "https://api.jevahapp.com/api/content/media/CONTENT_ID/metadata" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Note the likeCount

# 2. Like the content
curl -X POST "https://api.jevahapp.com/api/content/media/CONTENT_ID/like" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
# Expect: likeCount = previous + 1

# 3. Verify metadata
curl -X GET "https://api.jevahapp.com/api/content/media/CONTENT_ID/metadata" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expect: likes = previous + 1, userInteractions.liked = true
```

### 2. Edge Cases to Test
- [ ] Like content that has 0 likes → should return 1
- [ ] Like content that has 5 likes → should return 6
- [ ] Unlike content → should decrement by 1
- [ ] Rapid like/unlike (spam) → count should stay consistent
- [ ] Multiple users liking same content → count should be accurate

---

## Quick Checklist for Backend Team

- [ ] `POST /api/content/:type/:id/like` returns correct `likeCount`
- [ ] Count increments when liking, decrements when unliking
- [ ] Count never goes below 0
- [ ] `GET /api/content/:type/:id/metadata` returns matching count
- [ ] `POST /api/content/batch-metadata` returns matching counts
- [ ] No caching issues (count is fresh, not stale)

---

## Related Endpoints That Must Stay in Sync

| Endpoint | Must Return |
|----------|-------------|
| `POST /api/content/:type/:id/like` | `data.likeCount` = updated count |
| `GET /api/content/:type/:id/metadata` | `data.likes` = same as above |
| `POST /api/content/batch-metadata` | `data[id].likes` = same as above |
| `GET /api/media/all-content` | `likeCount` in feed items (optional but recommended) |

---

## Frontend Workaround (Already Applied)

We've added frontend logic to handle this backend bug temporarily:

```javascript
// If user liked but server returns 0, preserve optimistic count
const finalLikes = userJustLiked && serverCount === 0 && optimisticCount > 0
  ? optimisticCount  // Use frontend count
  : Math.max(serverCount, userJustLiked ? 1 : 0);
```

**Remove this workaround once backend is fixed.**

---

## Timeline

- **Frontend workaround:** ✅ Applied
- **Backend fix needed:** 🔴 Before production
- **Testing required:** 1-2 hours after fix

---

## Contact

Frontend team has verified the issue is in backend response.  
Frontend expects: `data.likeCount` to reflect the actual count after toggle.
