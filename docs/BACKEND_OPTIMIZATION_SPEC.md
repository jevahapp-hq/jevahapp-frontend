# Backend Optimization Specification for All Content Endpoint

## Overview

This document outlines critical backend optimizations needed for the `/api/media/public/all-content` and `/api/media/all-content` endpoints to prevent production crashes and ensure optimal performance.

## Problem Statement

The frontend `AllContentTikTok` component is experiencing crashes in production due to:
- **Memory exhaustion** from processing very large datasets (>1000 items)
- **Network timeouts** when fetching large payloads
- **UI freezing** during data transformation
- **Race conditions** when data arrives after component unmount

**Current Frontend Protection**: The frontend now limits processing to 1000 items, but this is a temporary workaround. The backend should implement proper pagination to prevent these issues at the source.

---

## 1. Pagination Implementation

### 1.1 Endpoint Updates

#### Current Endpoints (to be updated):
```
GET /api/media/public/all-content
GET /api/media/all-content
```

#### Updated Endpoints (with pagination):
```
GET /api/media/public/all-content?page=1&limit=50&contentType=ALL
GET /api/media/all-content?page=1&limit=50&contentType=ALL
```

### 1.2 Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (1-indexed) |
| `limit` | integer | No | 50 | Items per page (max: 100) |
| `contentType` | string | No | "ALL" | Filter by content type |
| `sort` | string | No | "createdAt" | Sort field (createdAt, views, likes, etc.) |
| `order` | string | No | "desc" | Sort order (asc, desc) |

### 1.3 Response Format

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": {
    "media": [
      {
        "_id": "string",
        "title": "string",
        "contentType": "video|audio|ebook|sermon|devotional",
        "fileUrl": "string",
        "thumbnailUrl": "string",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601",
        // ... other fields
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250,
      "totalPages": 25,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

#### Error Response (400/500):
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### 1.4 Implementation Requirements

#### Backend Code Example (Node.js/Express):
```javascript
// GET /api/media/public/all-content
router.get('/public/all-content', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      contentType = 'ALL',
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10))); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    if (contentType && contentType !== 'ALL') {
      query.contentType = contentType;
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [media, total] = await Promise.all([
      Media.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
      Media.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: {
        media,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content',
      code: 'FETCH_ERROR'
    });
  }
});
```

### 1.5 Frontend Compatibility

The frontend `useMedia` hook will automatically handle pagination:

```typescript
// Frontend will call:
// First page: GET /api/media/public/all-content?page=1&limit=50
// Load more: GET /api/media/public/all-content?page=2&limit=50
```

**Backward Compatibility**: If `page` and `limit` are not provided, return first 50 items (not all items).

---

## 2. Server-Side Filtering

### 2.1 Content Type Filtering

Filter content by type on the server to reduce payload size:

```javascript
// Example: Filter for videos only
GET /api/media/public/all-content?contentType=video&page=1&limit=50
```

### 2.2 Advanced Filtering Options

Add additional filters to reduce data transfer:

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `minViews` | integer | Minimum view count |
| `minLikes` | integer | Minimum like count |
| `dateFrom` | ISO8601 | Filter by date range (from) |
| `dateTo` | ISO8601 | Filter by date range (to) |
| `search` | string | Search in title, description |

### 2.3 Implementation Example

```javascript
router.get('/public/all-content', async (req, res) => {
  const {
    contentType,
    category,
    minViews,
    minLikes,
    dateFrom,
    dateTo,
    search,
    page = 1,
    limit = 50
  } = req.query;

  const query = {};

  // Content type filter
  if (contentType && contentType !== 'ALL') {
    query.contentType = contentType;
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // View count filter
  if (minViews) {
    query.viewCount = { $gte: parseInt(minViews, 10) };
  }

  // Like count filter
  if (minLikes) {
    query.likeCount = { $gte: parseInt(minLikes, 10) };
  }

  // Date range filter
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  // Text search
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // ... rest of pagination logic
});
```

---

## 3. Response Compression

### 3.1 Enable Gzip Compression

Compress responses to reduce network transfer time:

#### Express.js Example:
```javascript
const compression = require('compression');

// Enable compression middleware
app.use(compression({
  filter: (req, res) => {
    // Compress responses > 1KB
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9)
  threshold: 1024 // Only compress if response > 1KB
}));
```

#### Nginx Configuration (if using reverse proxy):
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types application/json application/javascript text/css text/plain;
gzip_comp_level 6;
```

### 3.2 Response Size Monitoring

Monitor response sizes and log warnings for large responses:

```javascript
router.get('/public/all-content', async (req, res) => {
  // ... fetch data ...

  const responseData = {
    success: true,
    data: {
      media,
      pagination: { /* ... */ }
    }
  };

  const responseSize = JSON.stringify(responseData).length;
  
  // Log warning if response > 500KB
  if (responseSize > 500 * 1024) {
    console.warn(`Large response detected: ${responseSize} bytes for page ${page}`);
  }

  res.json(responseData);
});
```

### 3.3 Field Selection

Only return necessary fields to reduce payload size:

```javascript
// Only select fields needed by frontend
const media = await Media.find(query)
  .select('_id title contentType fileUrl thumbnailUrl createdAt updatedAt viewCount likeCount')
  .sort(sortObj)
  .skip(skip)
  .limit(limitNum)
  .lean()
  .exec();
```

---

## 4. Performance Optimization

### 4.1 Database Indexing

Ensure proper indexes exist for fast queries:

```javascript
// MongoDB Indexes
db.media.createIndex({ contentType: 1, createdAt: -1 });
db.media.createIndex({ category: 1, createdAt: -1 });
db.media.createIndex({ viewCount: -1 });
db.media.createIndex({ likeCount: -1 });
db.media.createIndex({ title: 'text', description: 'text' }); // For text search
```

### 4.2 Caching Strategy

Implement caching for frequently accessed data:

```javascript
const Redis = require('redis');
const client = Redis.createClient();

router.get('/public/all-content', async (req, res) => {
  const cacheKey = `all-content:${JSON.stringify(req.query)}`;
  
  // Try cache first
  const cached = await client.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Fetch from database
  const data = await fetchMedia(req.query);

  // Cache for 5 minutes
  await client.setex(cacheKey, 300, JSON.stringify(data));

  res.json(data);
});
```

### 4.3 Query Optimization

- Use `.lean()` in Mongoose to return plain JavaScript objects (faster)
- Use `.select()` to only fetch needed fields
- Use aggregation pipeline for complex queries
- Avoid N+1 queries by using `.populate()` efficiently

---

## 5. Monitoring & Observability

### 5.1 Metrics to Track

#### Response Time Monitoring:
```javascript
router.get('/public/all-content', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // ... fetch data ...
    
    const duration = Date.now() - startTime;
    
    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow query detected: ${duration}ms for page ${req.query.page}`);
    }
    
    // Send metrics to monitoring service
    metrics.timing('api.all-content.duration', duration);
    metrics.increment('api.all-content.requests');
    
    res.json(data);
  } catch (error) {
    metrics.increment('api.all-content.errors');
    throw error;
  }
});
```

#### Key Metrics:
- **Response time** (p50, p95, p99)
- **Request rate** (requests per second)
- **Error rate** (errors per second)
- **Response size** (bytes)
- **Cache hit rate** (if using caching)
- **Database query time**

### 5.2 Alerts

Set up alerts for:
- **Response time > 2 seconds** (p95)
- **Error rate > 1%**
- **Response size > 1MB**
- **Database query time > 500ms**
- **Memory usage > 80%**

### 5.3 Logging

Log important events:
```javascript
logger.info('All content fetched', {
  page: req.query.page,
  limit: req.query.limit,
  contentType: req.query.contentType,
  totalItems: total,
  duration: Date.now() - startTime,
  responseSize: JSON.stringify(data).length
});
```

---

## 6. Error Handling

### 6.1 Graceful Degradation

Handle errors gracefully without crashing:

```javascript
router.get('/public/all-content', async (req, res) => {
  try {
    // ... fetch data ...
  } catch (error) {
    console.error('Error fetching all content:', error);
    
    // Return partial data if available
    if (partialData) {
      return res.status(206).json({
        success: true,
        data: partialData,
        warning: 'Partial data returned due to error',
        error: error.message
      });
    }
    
    // Return error response
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content',
      code: 'FETCH_ERROR'
    });
  }
});
```

### 6.2 Rate Limiting

Implement rate limiting to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

router.get('/public/all-content', limiter, async (req, res) => {
  // ... handler ...
});
```

---

## 7. Testing Requirements

### 7.1 Load Testing

Test with various scenarios:

#### Test Case 1: Large Dataset
```bash
# Test with 10,000 items
# Expected: Should return paginated results (50 items per page)
curl "https://api.example.com/api/media/public/all-content?page=1&limit=50"
```

#### Test Case 2: Slow Network Conditions
- Simulate 3G network (slow connection)
- Test timeout handling
- Verify partial data loading works

#### Test Case 3: Rapid Requests
```bash
# Test rapid page navigation
for i in {1..10}; do
  curl "https://api.example.com/api/media/public/all-content?page=$i&limit=50" &
done
```

### 7.2 Performance Benchmarks

Target performance metrics:

| Metric | Target | Warning Threshold |
|--------|--------|-------------------|
| Response Time (p95) | < 500ms | > 1s |
| Response Time (p99) | < 1s | > 2s |
| Response Size | < 100KB | > 500KB |
| Database Query Time | < 200ms | > 500ms |
| Memory Usage | < 70% | > 85% |

### 7.3 Test Scenarios

1. **Very Large Datasets (1000+ items)**
   - Verify pagination works correctly
   - Verify response time stays under 1s
   - Verify memory usage doesn't spike

2. **Slow Network Conditions**
   - Test with network throttling (3G speed)
   - Verify timeout handling
   - Verify partial data loading

3. **Rapid Navigation (Mount/Unmount Cycles)**
   - Test rapid page changes
   - Verify no memory leaks
   - Verify no race conditions

4. **Concurrent Requests**
   - Test multiple users accessing simultaneously
   - Verify rate limiting works
   - Verify no database connection pool exhaustion

---

## 8. Migration Plan

### Phase 1: Add Pagination (Week 1)
1. Update endpoints to accept `page` and `limit` parameters
2. Implement pagination logic
3. Update response format to include pagination metadata
4. Deploy to staging environment
5. Test with frontend

### Phase 2: Add Filtering (Week 2)
1. Add server-side filtering options
2. Optimize database queries
3. Add proper indexes
4. Deploy to staging
5. Test performance improvements

### Phase 3: Add Compression (Week 3)
1. Enable response compression
2. Monitor response sizes
3. Optimize field selection
4. Deploy to production

### Phase 4: Monitoring & Optimization (Week 4)
1. Set up monitoring and alerts
2. Analyze performance metrics
3. Optimize slow queries
4. Fine-tune caching strategy

---

## 9. Frontend Integration

### 9.1 Backward Compatibility

The frontend will handle both old and new API formats:

```typescript
// Old format (no pagination) - still supported
{
  "success": true,
  "media": [...],
  "total": 1000
}

// New format (with pagination) - preferred
{
  "success": true,
  "data": {
    "media": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1000,
      "totalPages": 20,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### 9.2 Frontend Updates Required

The frontend `useMedia` hook will automatically:
- Request paginated data (`page=1&limit=50`)
- Load more pages as user scrolls
- Handle both response formats for backward compatibility

---

## 10. Checklist for Backend Team

### Implementation Checklist:
- [ ] Add `page` and `limit` query parameters
- [ ] Implement pagination logic (skip/limit)
- [ ] Add pagination metadata to response
- [ ] Validate pagination parameters (max limit: 100)
- [ ] Add server-side filtering options
- [ ] Create database indexes for performance
- [ ] Enable response compression (gzip)
- [ ] Implement field selection (only return needed fields)
- [ ] Add caching layer (Redis recommended)
- [ ] Set up monitoring and alerts
- [ ] Add rate limiting
- [ ] Implement error handling
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Perform load testing
- [ ] Update API documentation
- [ ] Deploy to staging
- [ ] Test with frontend
- [ ] Deploy to production

### Testing Checklist:
- [ ] Test with 1000+ items (pagination works)
- [ ] Test with slow network (timeout handling)
- [ ] Test rapid navigation (no memory leaks)
- [ ] Test concurrent requests (rate limiting)
- [ ] Test error scenarios (graceful degradation)
- [ ] Verify response times meet targets
- [ ] Verify response sizes are reasonable
- [ ] Verify memory usage is stable

---

## 11. Success Criteria

The optimization is successful when:
1. ✅ **No crashes** in production from large datasets
2. ✅ **Response time** < 500ms (p95) for paginated requests
3. ✅ **Response size** < 100KB per page
4. ✅ **Memory usage** stable (no memory leaks)
5. ✅ **Error rate** < 0.1%
6. ✅ **Frontend compatibility** maintained (backward compatible)

---

## 12. Support & Questions

For questions or issues:
- **Backend Team Lead**: [Contact Info]
- **Frontend Team Lead**: [Contact Info]
- **Documentation**: This spec document
- **API Documentation**: [Link to API docs]

---

## Appendix A: Example API Calls

### Get First Page (Videos Only):
```bash
curl "https://api.example.com/api/media/public/all-content?page=1&limit=50&contentType=video"
```

### Get Second Page:
```bash
curl "https://api.example.com/api/media/public/all-content?page=2&limit=50"
```

### Search with Filters:
```bash
curl "https://api.example.com/api/media/public/all-content?page=1&limit=50&search=gospel&minLikes=10&sort=likes&order=desc"
```

---

## Appendix B: Database Schema Recommendations

```javascript
// Media Schema (MongoDB/Mongoose)
{
  _id: ObjectId,
  title: String,
  contentType: String, // 'video', 'audio', 'ebook', etc.
  fileUrl: String,
  thumbnailUrl: String,
  category: String,
  viewCount: Number,
  likeCount: Number,
  createdAt: Date,
  updatedAt: Date,
  // ... other fields
}

// Indexes
indexes: [
  { contentType: 1, createdAt: -1 },
  { category: 1, createdAt: -1 },
  { viewCount: -1 },
  { likeCount: -1 },
  { title: 'text', description: 'text' }
]
```

---

**Last Updated**: [Date]
**Version**: 1.0
**Status**: Ready for Implementation


