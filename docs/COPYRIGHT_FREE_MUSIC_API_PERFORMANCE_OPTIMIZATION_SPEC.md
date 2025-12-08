# Copyright-Free Music API Performance Optimization Specification

**Date**: 2024-12-19  
**Status**: 🔴 **CRITICAL - Performance Issue**  
**Priority**: High  
**Affected Endpoints**: 
- `GET /api/audio/copyright-free` (List songs)
- `GET /api/audio/copyright-free/{songId}` (Get single song)

---

## 📋 Executive Summary

The copyright-free music screens are experiencing **slow loading times** due to backend API response latency. The frontend has implemented caching and lazy loading optimizations, but the **initial API calls are still too slow**, creating a poor user experience. This document provides specific backend optimization recommendations to reduce API response times from **seconds to milliseconds**.

---

## 🔍 Current Frontend Behavior

### How Songs Are Loaded

1. **Initial Load**:
   - Frontend calls: `GET /api/audio/copyright-free?page=1&limit=20&sort=popular`
   - If cache exists (< 10 minutes old), shows cached data immediately
   - Then fetches fresh data in background
   - If no cache, user sees loading spinner until API responds

2. **Song Details** (when opening options modal):
   - Frontend calls: `GET /api/audio/copyright-free/{songId}`
   - Used to refresh view/like counts before showing options modal
   - Currently adds noticeable delay when opening options

3. **Search**:
   - Frontend calls: `GET /api/search?q={query}&contentType=copyright-free&page=1&limit=20`
   - Debounced to avoid excessive calls, but still slow when triggered

### Current Performance Issues

- **List endpoint**: Takes 2-5+ seconds to respond
- **Single song endpoint**: Takes 1-3+ seconds to respond
- **Search endpoint**: Takes 2-4+ seconds to respond
- **User experience**: Long loading spinners, perceived slowness

---

## 📤 Frontend Request Details

### Endpoint 1: List Songs

**URL**: `GET /api/audio/copyright-free`

**Query Parameters**:
```
page=1
limit=20
sortBy=popular
category=Gospel Music (optional)
search=query (optional)
```

**Request Headers**:
```
Authorization: Bearer {jwt_token} (optional, but recommended)
Content-Type: application/json
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "songs": [
      {
        "_id": "692d7baeee2475007039982e",
        "id": "692d7baeee2475007039982e",
        "title": "In The Name of Jesus",
        "artist": "Tadashikeiji",
        "singer": "Tadashikeiji",
        "year": 2024,
        "audioUrl": "https://...",
        "fileUrl": "https://...",
        "thumbnailUrl": "https://...",
        "category": "Gospel Music",
        "duration": 180,
        "contentType": "copyright-free-music",
        "description": "...",
        "viewCount": 1250,
        "views": 1250,
        "likeCount": 89,
        "likes": 89,
        "isLiked": false,
        "isInLibrary": false,
        "isPublicDomain": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### Endpoint 2: Get Single Song

**URL**: `GET /api/audio/copyright-free/{songId}`

**Path Parameters**:
- `songId`: MongoDB ObjectId (e.g., `"692d7baeee2475007039982e"`)

**Request Headers**:
```
Authorization: Bearer {jwt_token} (optional, but recommended)
Content-Type: application/json
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "692d7baeee2475007039982e",
    "id": "692d7baeee2475007039982e",
    "title": "In The Name of Jesus",
    "artist": "Tadashikeiji",
    "viewCount": 1250,
    "likeCount": 89,
    "isLiked": false,
    // ... same format as list endpoint
  }
}
```

---

## 🎯 Performance Targets

### Target Response Times

- **List endpoint** (`GET /api/audio/copyright-free`): **< 500ms** (currently 2-5+ seconds)
- **Single song endpoint** (`GET /api/audio/copyright-free/{songId}`): **< 200ms** (currently 1-3+ seconds)
- **Search endpoint** (`GET /api/search?contentType=copyright-free`): **< 500ms** (currently 2-4+ seconds)

### Success Metrics

- **95th percentile response time** < 500ms for list endpoint
- **95th percentile response time** < 200ms for single song endpoint
- **Database query time** < 100ms per query
- **Cache hit rate** > 80% for popular queries

---

## 🔬 Root Cause Analysis

### Likely Performance Bottlenecks

#### 1. **Missing Database Indexes** ⚠️ **CRITICAL**

**Problem**: Queries without proper indexes can cause full collection scans.

**Impact**: 
- Sorting by `viewCount` or `createdAt` without indexes = O(n) scan
- Filtering by `category` without indexes = O(n) scan
- Searching by `title`/`artist` without indexes = O(n) scan

**Required Indexes**:
```javascript
// For sorting by popularity (viewCount)
db.copyrightFreeSongs.createIndex(
  { viewCount: -1 },
  { name: "viewCount_desc_index", background: true }
);

// For sorting by newest (createdAt)
db.copyrightFreeSongs.createIndex(
  { createdAt: -1 },
  { name: "createdAt_desc_index", background: true }
);

// For filtering by category
db.copyrightFreeSongs.createIndex(
  { category: 1 },
  { name: "category_index", background: true }
);

// For text search (title, artist, description)
db.copyrightFreeSongs.createIndex(
  { title: "text", artist: "text", description: "text" },
  { name: "text_search_index", background: true }
);

// Compound index for category + sort
db.copyrightFreeSongs.createIndex(
  { category: 1, viewCount: -1 },
  { name: "category_viewCount_index", background: true }
);

// For single song lookup (should already exist, but verify)
db.copyrightFreeSongs.createIndex(
  { _id: 1 },
  { name: "_id_index" }
);
```

#### 2. **Inefficient Queries** ⚠️ **HIGH PRIORITY**

**Problem**: Fetching unnecessary fields or not using lean queries.

**Impact**:
- Mongoose overhead for hydration
- Unnecessary data transfer
- Slower serialization

**Optimization**:
```javascript
// ❌ BAD: Fetches all fields and hydrates full Mongoose documents
const songs = await CopyrightFreeSong.find({ category })
  .sort({ viewCount: -1 })
  .limit(20);

// ✅ GOOD: Only fetch needed fields, use lean() for plain objects
const songs = await CopyrightFreeSong.find(
  { category },
  {
    _id: 1,
    id: 1,
    title: 1,
    artist: 1,
    singer: 1,
    year: 1,
    audioUrl: 1,
    fileUrl: 1,
    thumbnailUrl: 1,
    category: 1,
    duration: 1,
    contentType: 1,
    description: 1,
    viewCount: 1,
    likeCount: 1,
    isLiked: 1,
    isInLibrary: 1,
    isPublicDomain: 1,
    createdAt: 1,
    updatedAt: 1,
  }
)
  .sort({ viewCount: -1 })
  .limit(20)
  .lean(); // Returns plain JavaScript objects, not Mongoose documents
```

#### 3. **N+1 Query Problem** ⚠️ **HIGH PRIORITY**

**Problem**: If `uploadedBy` is populated, each song triggers a separate user lookup.

**Impact**:
- 20 songs = 20+ database queries
- Each query adds 10-50ms latency
- Total: 200-1000ms+ just for user lookups

**Optimization**:
```javascript
// ❌ BAD: Populates each song individually (N+1 queries)
const songs = await CopyrightFreeSong.find()
  .populate('uploadedBy')
  .limit(20);

// ✅ GOOD: Batch populate or don't populate if not needed
const songs = await CopyrightFreeSong.find()
  .limit(20)
  .lean();

// If user info is needed, fetch in one batch query
const userIds = [...new Set(songs.map(s => s.uploadedBy))];
const users = await User.find({ _id: { $in: userIds } })
  .select('_id firstName lastName')
  .lean();

// Map users to songs in memory
const userMap = new Map(users.map(u => [u._id.toString(), u]));
songs.forEach(song => {
  song.uploadedBy = userMap.get(song.uploadedBy?.toString());
});
```

#### 4. **No Response Caching** 🟡 **MEDIUM PRIORITY**

**Problem**: Same queries executed repeatedly without caching.

**Impact**:
- Popular queries (e.g., `sort=popular&limit=20`) hit database every time
- No benefit from repeated requests

**Optimization**:
```javascript
// Use Redis or in-memory cache for popular queries
const cacheKey = `copyright-free-songs:${page}:${limit}:${sort}:${category || 'all'}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// Execute query
const songs = await CopyrightFreeSong.find(...)
  .sort({ viewCount: -1 })
  .limit(20)
  .lean();

// Cache for 5 minutes
await redis.setex(cacheKey, 300, JSON.stringify(songs));

return songs;
```

#### 5. **Inefficient Aggregation for Pagination** 🟡 **MEDIUM PRIORITY**

**Problem**: Counting total documents separately can be slow.

**Impact**:
- `countDocuments()` can be slow on large collections
- Adds 100-500ms+ to response time

**Optimization**:
```javascript
// ❌ BAD: Separate count query
const total = await CopyrightFreeSong.countDocuments({ category });
const songs = await CopyrightFreeSong.find({ category })
  .sort({ viewCount: -1 })
  .limit(20)
  .skip((page - 1) * limit);

// ✅ GOOD: Use estimated count or skip count if not critical
// Option 1: Use estimatedDocumentCount (faster, approximate)
const total = await CopyrightFreeSong.estimatedDocumentCount();

// Option 2: Skip count for first page (most common)
const songs = await CopyrightFreeSong.find({ category })
  .sort({ viewCount: -1 })
  .limit(limit)
  .skip((page - 1) * limit)
  .lean();

// Only count if user requests page > 1 or needs exact total
const total = page === 1 ? null : await CopyrightFreeSong.countDocuments({ category });
```

#### 6. **Large Response Payloads** 🟢 **LOW PRIORITY**

**Problem**: Sending unnecessary or large fields.

**Impact**:
- Network transfer time
- JSON serialization overhead

**Optimization**:
- Don't send `description` field in list view (only in detail view)
- Don't send full `uploadedBy` object (just `_id` or minimal fields)
- Compress responses with gzip (should be handled by server middleware)

---

## 🛠️ Backend Implementation Recommendations

### 1. **Create Required Database Indexes** 🔴 **CRITICAL - DO FIRST**

**Script to run in MongoDB**:
```javascript
// Connect to your database
use jevahapp; // or your database name

// Create indexes for copyright-free songs collection
db.copyrightFreeSongs.createIndex(
  { viewCount: -1 },
  { name: "viewCount_desc_index", background: true }
);

db.copyrightFreeSongs.createIndex(
  { createdAt: -1 },
  { name: "createdAt_desc_index", background: true }
);

db.copyrightFreeSongs.createIndex(
  { category: 1 },
  { name: "category_index", background: true }
);

db.copyrightFreeSongs.createIndex(
  { category: 1, viewCount: -1 },
  { name: "category_viewCount_compound", background: true }
);

// Text search index (if using MongoDB text search)
db.copyrightFreeSongs.createIndex(
  { title: "text", artist: "text", description: "text" },
  { name: "text_search_index", background: true }
);

// Verify indexes were created
db.copyrightFreeSongs.getIndexes();
```

**Expected Impact**: **50-80% reduction in query time** for sorted/filtered queries.

### 2. **Optimize Query Implementation** 🔴 **CRITICAL**

**Sample Optimized Route Handler**:
```javascript
// GET /api/audio/copyright-free
router.get('/', authenticateOptional, async (req, res) => {
  try {
    const startTime = Date.now();
    const { page = 1, limit = 20, sortBy = 'popular', category, search } = req.query;
    
    // Build query
    const query = {};
    if (category) {
      query.category = category;
    }
    if (search) {
      query.$text = { $search: search };
    }
    
    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'popular':
        sort = { viewCount: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'title':
        sort = { title: 1 };
        break;
      default:
        sort = { viewCount: -1 };
    }
    
    // Fields to select (only what frontend needs)
    const selectFields = {
      _id: 1,
      title: 1,
      artist: 1,
      singer: 1,
      year: 1,
      audioUrl: 1,
      fileUrl: 1,
      thumbnailUrl: 1,
      category: 1,
      duration: 1,
      contentType: 1,
      viewCount: 1,
      likeCount: 1,
      isLiked: 1,
      isInLibrary: 1,
      isPublicDomain: 1,
      createdAt: 1,
      updatedAt: 1,
      // Don't include description in list view (too large)
    };
    
    // Execute query with lean() for performance
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const songs = await CopyrightFreeSong.find(query, selectFields)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Returns plain objects, not Mongoose documents
    
    // Transform songs to include both id and _id for compatibility
    const transformedSongs = songs.map(song => ({
      ...song,
      id: song._id.toString(),
      // Ensure viewCount/likeCount default to 0
      viewCount: song.viewCount || 0,
      likeCount: song.likeCount || 0,
      views: song.viewCount || 0,
      likes: song.likeCount || 0,
    }));
    
    // Get total count (only if needed for pagination)
    // For first page, we can skip count to save time
    let total = null;
    if (page === '1' && !category && !search) {
      // Estimate for first page (faster)
      total = await CopyrightFreeSong.estimatedDocumentCount();
    } else {
      total = await CopyrightFreeSong.countDocuments(query);
    }
    
    const totalPages = Math.ceil(total / parseInt(limit));
    
    const queryTime = Date.now() - startTime;
    console.log(`✅ Copyright-free songs query took ${queryTime}ms`);
    
    res.json({
      success: true,
      data: {
        songs: transformedSongs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching copyright-free songs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch songs',
      code: 'SERVER_ERROR',
    });
  }
});
```

**Expected Impact**: **40-60% reduction in response time** by using lean queries and selective fields.

### 3. **Optimize Single Song Endpoint** 🔴 **CRITICAL**

**Sample Optimized Route Handler**:
```javascript
// GET /api/audio/copyright-free/:songId
router.get('/:songId', authenticateOptional, async (req, res) => {
  try {
    const { songId } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid song ID',
        code: 'INVALID_ID',
      });
    }
    
    // Fetch song with lean() and only needed fields
    const song = await CopyrightFreeSong.findById(songId, {
      _id: 1,
      id: 1,
      title: 1,
      artist: 1,
      singer: 1,
      year: 1,
      audioUrl: 1,
      fileUrl: 1,
      thumbnailUrl: 1,
      category: 1,
      duration: 1,
      contentType: 1,
      description: 1, // Include description for detail view
      viewCount: 1,
      likeCount: 1,
      isLiked: 1,
      isInLibrary: 1,
      isPublicDomain: 1,
      createdAt: 1,
      updatedAt: 1,
    }).lean();
    
    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found',
        code: 'NOT_FOUND',
      });
    }
    
    // Transform for frontend compatibility
    const transformedSong = {
      ...song,
      id: song._id.toString(),
      viewCount: song.viewCount || 0,
      likeCount: song.likeCount || 0,
      views: song.viewCount || 0,
      likes: song.likeCount || 0,
    };
    
    res.json({
      success: true,
      data: transformedSong,
    });
  } catch (error) {
    console.error('Error fetching song:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch song',
      code: 'SERVER_ERROR',
    });
  }
});
```

**Expected Impact**: **60-80% reduction in response time** for single song lookups.

### 4. **Implement Response Caching** 🟡 **MEDIUM PRIORITY**

**Using Redis (recommended)**:
```javascript
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// GET /api/audio/copyright-free
router.get('/', authenticateOptional, async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'popular', category, search } = req.query;
    
    // Build cache key
    const cacheKey = `copyright-free-songs:${page}:${limit}:${sortBy}:${category || 'all'}:${search || 'none'}`;
    
    // Try cache first
    const cached = await client.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }
    
    // Execute query (same as above)
    const songs = await CopyrightFreeSong.find(...)
      .sort(sort)
      .limit(parseInt(limit))
      .lean();
    
    const response = {
      success: true,
      data: {
        songs: transformedSongs,
        pagination: { ... },
      },
    };
    
    // Cache for 5 minutes (300 seconds)
    await client.setex(cacheKey, 300, JSON.stringify(response));
    
    res.setHeader('X-Cache', 'MISS');
    res.json(response);
  } catch (error) {
    // Handle error
  }
});
```

**Cache Invalidation**:
```javascript
// When a song is updated (liked, viewed, etc.), invalidate relevant cache keys
const invalidateCache = async () => {
  const pattern = 'copyright-free-songs:*';
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(...keys);
  }
};

// Call after song updates
await invalidateCache();
```

**Expected Impact**: **80-95% reduction in response time** for cached requests.

### 5. **Optimize Search Endpoint** 🟡 **MEDIUM PRIORITY**

**If using unified search endpoint** (`/api/search?contentType=copyright-free`):

```javascript
// Ensure search uses indexes
db.copyrightFreeSongs.createIndex(
  { title: "text", artist: "text", description: "text" },
  { name: "text_search_index" }
);

// Use text search with limit
const songs = await CopyrightFreeSong.find(
  { $text: { $search: query } },
  { score: { $meta: "textScore" } }
)
  .sort({ score: { $meta: "textScore" } })
  .limit(20)
  .lean();
```

**Expected Impact**: **50-70% reduction in search response time**.

---

## 🧪 Testing & Validation

### Performance Testing Script

```javascript
// test-copyright-free-performance.js
const axios = require('axios');

const API_BASE = 'https://jevahapp-backend-rped.onrender.com';
const TOKEN = 'your-test-token';

async function testPerformance() {
  console.log('🧪 Testing Copyright-Free Music API Performance\n');
  
  // Test 1: List endpoint
  console.log('1️⃣ Testing GET /api/audio/copyright-free...');
  const start1 = Date.now();
  try {
    const res1 = await axios.get(`${API_BASE}/api/audio/copyright-free`, {
      params: { page: 1, limit: 20, sortBy: 'popular' },
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const time1 = Date.now() - start1;
    console.log(`   ✅ Response time: ${time1}ms`);
    console.log(`   📊 Songs returned: ${res1.data.data.songs.length}`);
    console.log(`   ${time1 < 500 ? '✅ PASS' : '❌ FAIL'} (target: < 500ms)\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // Test 2: Single song endpoint
  console.log('2️⃣ Testing GET /api/audio/copyright-free/{songId}...');
  const songId = '692d7baeee2475007039982e';
  const start2 = Date.now();
  try {
    const res2 = await axios.get(`${API_BASE}/api/audio/copyright-free/${songId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const time2 = Date.now() - start2;
    console.log(`   ✅ Response time: ${time2}ms`);
    console.log(`   ${time2 < 200 ? '✅ PASS' : '❌ FAIL'} (target: < 200ms)\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // Test 3: Search endpoint
  console.log('3️⃣ Testing GET /api/search?contentType=copyright-free...');
  const start3 = Date.now();
  try {
    const res3 = await axios.get(`${API_BASE}/api/search`, {
      params: { q: 'jesus', contentType: 'copyright-free', limit: 20 },
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const time3 = Date.now() - start3;
    console.log(`   ✅ Response time: ${time3}ms`);
    console.log(`   ${time3 < 500 ? '✅ PASS' : '❌ FAIL'} (target: < 500ms)\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
}

testPerformance();
```

### Database Query Analysis

**Use MongoDB explain() to analyze query performance**:
```javascript
// Analyze query execution
const explain = await CopyrightFreeSong.find({ category: 'Gospel Music' })
  .sort({ viewCount: -1 })
  .limit(20)
  .explain('executionStats');

console.log('Execution time:', explain.executionStats.executionTimeMillis, 'ms');
console.log('Index used:', explain.executionStats.executionStages.indexName);
console.log('Documents examined:', explain.executionStats.totalDocsExamined);
console.log('Documents returned:', explain.executionStats.totalDocsReturned);
```

**What to look for**:
- `executionTimeMillis` < 100ms ✅
- `indexName` is present (not `null`) ✅
- `totalDocsExamined` ≈ `totalDocsReturned` ✅ (efficient)
- `totalDocsExamined` >> `totalDocsReturned` ❌ (inefficient, needs index)

---

## 📊 Expected Performance Improvements

### Before Optimization

- **List endpoint**: 2-5+ seconds
- **Single song**: 1-3+ seconds
- **Search**: 2-4+ seconds
- **Database queries**: 500-2000ms
- **User experience**: Poor (long loading spinners)

### After Optimization

- **List endpoint**: **< 500ms** (80-90% improvement)
- **Single song**: **< 200ms** (85-95% improvement)
- **Search**: **< 500ms** (75-90% improvement)
- **Database queries**: **< 100ms** (80-95% improvement)
- **User experience**: Excellent (instant or near-instant loading)

### With Caching

- **Cached list requests**: **< 50ms** (95%+ improvement)
- **Cached single song**: **< 50ms** (95%+ improvement)
- **Cache hit rate**: 80-90% for popular queries

---

## 🎯 Implementation Priority

### Phase 1: Critical (Do First) 🔴

1. ✅ **Create database indexes** (5 minutes)
   - Impact: 50-80% improvement
   - Risk: Low (background index creation)

2. ✅ **Use lean() queries** (10 minutes)
   - Impact: 40-60% improvement
   - Risk: Low (just add `.lean()`)

3. ✅ **Select only needed fields** (15 minutes)
   - Impact: 20-40% improvement
   - Risk: Low (just specify fields)

### Phase 2: High Priority 🟡

4. ✅ **Optimize single song endpoint** (20 minutes)
   - Impact: 60-80% improvement
   - Risk: Low

5. ✅ **Implement response caching** (1-2 hours)
   - Impact: 80-95% improvement for cached requests
   - Risk: Medium (requires Redis setup)

### Phase 3: Nice to Have 🟢

6. ✅ **Optimize pagination counting** (15 minutes)
   - Impact: 10-20% improvement
   - Risk: Low

7. ✅ **Add query performance monitoring** (30 minutes)
   - Impact: Better visibility
   - Risk: Low

---

## 📝 Action Items for Backend Team

### Immediate Actions (Today)

1. ✅ **Run index creation script** (see section 1)
2. ✅ **Add `.lean()` to all copyright-free song queries**
3. ✅ **Select only needed fields** in queries
4. ✅ **Test performance** using the testing script

### Short-term Actions (This Week)

5. ✅ **Implement response caching** with Redis
6. ✅ **Add performance monitoring** to track response times
7. ✅ **Optimize search endpoint** if using text search

### Long-term Actions (This Month)

8. ✅ **Add database query monitoring** (e.g., MongoDB Atlas Performance Advisor)
9. ✅ **Implement CDN caching** for static assets (thumbnails, audio files)
10. ✅ **Consider pagination optimization** for very large result sets

---

## 🔄 Monitoring & Maintenance

### Key Metrics to Track

- **Average response time** for list endpoint
- **95th percentile response time** for list endpoint
- **Average response time** for single song endpoint
- **Cache hit rate** (if caching implemented)
- **Database query time** (from MongoDB logs)
- **Error rate** (500 errors, timeouts)

### Alerting Thresholds

- **Response time > 1 second**: Warning
- **Response time > 2 seconds**: Critical
- **Error rate > 1%**: Warning
- **Error rate > 5%**: Critical
- **Cache hit rate < 50%**: Warning (if caching enabled)

---

## 📞 Contact & Support

If the backend team needs additional information or clarification:

- **Frontend Implementation**: See `app/components/CopyrightFreeSongs.tsx` and `app/services/copyrightFreeMusicAPI.ts`
- **Current API Usage**: Frontend requests `limit: 20` by default, sorts by `popular` by default
- **Caching Strategy**: Frontend uses AsyncStorage cache with 10-minute TTL

---

## 🔄 Status Updates

Once optimizations are implemented, please update this document with:
- Indexes created
- Query optimizations applied
- Caching implementation status
- Performance test results
- Before/after response time comparisons

---

**Last Updated**: 2024-12-19  
**Document Version**: 1.0  
**Status**: Awaiting Backend Implementation

