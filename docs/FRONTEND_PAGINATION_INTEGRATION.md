# Frontend Pagination Integration Guide

## Overview

This document explains how the frontend integrates with the new paginated backend API while maintaining backward compatibility.

## Current Implementation

The frontend `useMedia` hook and `MediaApi` have been updated to support pagination parameters while maintaining backward compatibility with the old API format.

## API Client Updates

### MediaApi Changes

The `getAllContentPublic()` and `getAllContentWithAuth()` methods now accept optional pagination parameters:

```typescript
// Without pagination (backward compatible)
const response = await mediaApi.getAllContentPublic();

// With pagination
const response = await mediaApi.getAllContentPublic({
  page: 1,
  limit: 50,
  contentType: "video",
  sort: "createdAt",
  order: "desc"
});
```

### Response Format Handling

The API client handles both response formats:

#### New Format (Preferred):
```json
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

#### Old Format (Backward Compatible):
```json
{
  "success": true,
  "media": [...],
  "total": 1000
}
```

## Frontend Integration

### useMedia Hook

The `useMedia` hook automatically requests paginated data:

```typescript
// First page (default: 50 items)
const { allContent, loading, error } = useMedia({ immediate: true });

// The hook will automatically call:
// GET /api/media/public/all-content?page=1&limit=50
```

### Loading More Content

To load more pages, update the hook to support pagination:

```typescript
// In useMedia hook
const loadMoreContent = useCallback(async () => {
  if (hasMorePages) {
    const nextPage = currentPage + 1;
    const response = await mediaApi.getAllContentPublic({
      page: nextPage,
      limit: 50
    });
    
    if (response.success) {
      setAllContent(prev => [...prev, ...response.media]);
      setCurrentPage(nextPage);
      setHasMorePages(response.pagination?.hasNextPage || false);
    }
  }
}, [currentPage, hasMorePages]);
```

## Backward Compatibility

The frontend maintains full backward compatibility:

1. **Old API Format**: If the backend returns the old format (no pagination), the frontend will still work
2. **No Pagination Parameters**: If pagination parameters aren't provided, the backend should return the first 50 items (not all items)
3. **Gradual Migration**: The backend can be updated incrementally without breaking the frontend

## Testing Checklist

- [ ] Test with old API format (no pagination)
- [ ] Test with new API format (with pagination)
- [ ] Test pagination parameters (page, limit)
- [ ] Test content type filtering
- [ ] Test loading more pages
- [ ] Test error handling
- [ ] Test with slow network conditions
- [ ] Test with very large datasets (1000+ items)

## Migration Path

1. **Phase 1**: Backend adds pagination support (optional parameters)
2. **Phase 2**: Frontend starts using pagination parameters
3. **Phase 3**: Backend makes pagination required (enforce max limit)
4. **Phase 4**: Remove old format support (if needed)

## Performance Benefits

With pagination implemented:
- ✅ **Faster initial load**: Only load 50 items instead of 1000+
- ✅ **Reduced memory usage**: Process smaller datasets
- ✅ **Better network performance**: Smaller payloads
- ✅ **Improved UX**: Faster time to interactive

## Example Usage

```typescript
// In AllContentTikTok component
const { allContent, loading, error, loadMore } = useMedia({
  immediate: true,
  page: 1,
  limit: 50
});

// Load more when user scrolls to bottom
const handleLoadMore = useCallback(() => {
  if (!loading && hasMorePages) {
    loadMore();
  }
}, [loading, hasMorePages, loadMore]);
```

---

**Last Updated**: [Date]
**Status**: Ready for Backend Integration


