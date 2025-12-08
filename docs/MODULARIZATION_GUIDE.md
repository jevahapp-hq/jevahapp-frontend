# Codebase Modularization Guide

This document outlines the modularization changes made to reduce code duplication (DRY violations) and improve maintainability.

## Overview

The codebase has been refactored to:
1. **Consolidate API clients** into a single base implementation
2. **Merge duplicate components** into shared versions
3. **Create base service classes** for all API services
4. **Centralize type definitions** for consistency

## Changes Made

### 1. Unified Base API Client

**Location**: `src/core/api/BaseApiClient.ts`

All API clients now extend from `BaseApiClient` which provides:
- Automatic token refresh on 401/402 errors
- Consistent error handling
- Request/response interceptors
- Timeout handling
- Retry logic

**Migration**:
```typescript
// Before
class MyService {
  private async makeRequest() { /* custom implementation */ }
}

// After
import { BaseApiClient } from "../../core/api/BaseApiClient";

class MyService extends BaseApiClient {
  // Use protected methods: get(), post(), put(), delete()
  async getData() {
    return this.get<MyDataType>("/api/endpoint");
  }
}
```

### 2. Base Service Class

**Location**: `src/core/services/BaseService.ts`

All services should extend `BaseService` which extends `BaseApiClient` and adds:
- Content type mapping utilities
- ObjectId validation
- Data extraction helpers
- Error handling utilities

**Usage**:
```typescript
import { BaseService } from "../../core/services/BaseService";

class ContentService extends BaseService {
  async getContent(contentId: string) {
    if (!this.isValidObjectId(contentId)) {
      return { success: false, error: "Invalid ID" };
    }
    
    const response = await this.get(`/api/content/${contentId}`);
    return this.extractData(response);
  }
}
```

### 3. Unified CommentIcon Component

**Location**: `src/shared/components/CommentIcon/CommentIcon.tsx`

The duplicate `CommentIcon` components have been merged into a single shared component that:
- Supports both animated and non-animated variants
- Handles comment modal integration
- Uses shared types

**Migration**:
```typescript
// Before - app/components/CommentIcon.tsx
import CommentIcon from "../components/CommentIcon";

// After - Use shared component
import { CommentIcon } from "../../src/shared/components/CommentIcon";
// OR keep using app/components/CommentIcon (it re-exports the shared one)
```

### 4. Shared Comment Types

**Location**: `src/shared/types/comment.types.ts`

All comment-related types are now centralized:
- `Comment` - Main comment interface
- `CommentIconProps` - CommentIcon component props
- `CommentData` - API response comment data

**Usage**:
```typescript
import { Comment, CommentIconProps } from "../../src/shared/types/comment.types";
// OR
import { Comment, CommentIconProps } from "../../src/shared/types";
```

## Migration Checklist

### For API Services

- [ ] Extend `BaseService` instead of implementing custom API clients
- [ ] Use protected methods (`get`, `post`, `put`, `delete`) instead of custom `fetch` calls
- [ ] Remove duplicate token refresh logic
- [ ] Use `mapContentTypeToBackend()` for content type mapping
- [ ] Use `isValidObjectId()` for ID validation
- [ ] Use `extractData()` for consistent data extraction

### For Components

- [ ] Use shared `CommentIcon` from `src/shared/components/CommentIcon`
- [ ] Import types from `src/shared/types` instead of defining locally
- [ ] Remove duplicate responsive utility functions (use shared ones)

### For Types

- [ ] Import from `src/shared/types` instead of defining locally
- [ ] Use `Comment` type from shared types
- [ ] Use `CommentIconProps` from shared types

## Files to Update

### High Priority (Duplicate Code)

1. **API Services** - Migrate to `BaseService`:
   - `app/services/bibleApiService.ts`
   - `app/services/gospelMusicService.ts`
   - `app/services/copyrightFreeMusicAPI.ts`
   - `app/services/commentService.ts`
   - `app/services/dailyVerseService.ts`
   - `app/services/hymnAudioService.ts`

2. **API Clients** - Consolidate:
   - `app/utils/api.ts` - `APIClient` class
   - `app/utils/dataFetching.ts` - `ApiClient` class
   - `src/core/api/ApiClient.ts` - `ApiClient` class

3. **Components** - Use shared versions:
   - `app/components/CommentIcon.tsx` ✅ (already updated)
   - `app/components/InteractionButtons.tsx` - Check for duplication
   - `src/shared/components/InteractionButtons/InteractionButtons.tsx`

### Medium Priority

1. **Utilities** - Extract common patterns:
   - Token management (already centralized in `TokenUtils`)
   - Response parsing
   - Error handling

2. **Types** - Consolidate:
   - Media types
   - API response types
   - Component prop types

## Breaking Changes

### None Expected

All changes are backward compatible:
- Old imports still work (they re-export new implementations)
- Existing components continue to function
- API services can be migrated gradually

## Testing

After migration, verify:
1. ✅ API calls work correctly
2. ✅ Token refresh works
3. ✅ Comment components display correctly
4. ✅ No console errors
5. ✅ Types are correctly imported

## Next Steps

1. **Phase 1** (Current): Base infrastructure ✅
   - BaseApiClient ✅
   - BaseService ✅
   - Unified CommentIcon ✅
   - Shared comment types ✅

2. **Phase 2** (Next): Migrate API services
   - Update all services to extend BaseService
   - Remove duplicate API client implementations
   - Consolidate error handling

3. **Phase 3** (Future): Component consolidation
   - Merge duplicate InteractionButtons
   - Extract shared media card logic
   - Create shared form components

## Questions or Issues?

If you encounter any issues during migration:
1. Check this guide first
2. Review the base class implementations
3. Check existing migrated examples
4. Create an issue with details

---

**Last Updated**: 2024-12-19
**Status**: Phase 1 Complete ✅

