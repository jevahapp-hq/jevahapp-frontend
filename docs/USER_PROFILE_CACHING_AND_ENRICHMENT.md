# User Profile Caching and Content Enrichment

## Problem
Fullname and avatar were not loading consistently in content items because:
1. Backend may not always populate `uploadedBy` with full user data (firstName, lastName, avatar)
2. Content items sometimes only have `uploadedBy` as a string ID instead of a populated object
3. No caching mechanism to enrich content with user data when backend doesn't provide it

## Solution Implemented

### 1. User Profile Caching (`app/utils/dataFetching.ts`)

**New Class: `UserProfileCache`**
- Caches user profiles by `userId` for 30 minutes
- Provides methods to enrich content items with cached user data
- Automatically enriches `uploadedBy`, `author`, and `authorInfo` fields

**Key Methods:**
- `getUserProfile(userId)`: Get cached user profile
- `cacheUserProfile(userId, userData)`: Cache user profile
- `enrichContentWithUserData(content)`: Enrich single content item
- `enrichContentArray(contentArray)`: Enrich array of content items

### 2. Automatic Caching on Profile Fetch

**Updated `getUserProfile()` method:**
- Now automatically caches user profile by userId when fetched
- Cache key: `user:${userId}`
- Cache duration: 30 minutes (same as avatar cache)

**Updated `useUserProfile` hook:**
- Caches user profile when fetched successfully
- Ensures user data is available for content enrichment

### 3. Content Enrichment

**Updated `transformApiResponseToMediaItem()`:**
- Automatically enriches content with cached user data before transformation
- Ensures `uploadedBy`, `author`, and `authorInfo` have fullname and avatar

**Updated `getMediaList()`:**
- Enriches entire media array before returning
- Ensures all content items have user data populated

## How It Works

1. **User logs in** → `getUserProfile()` is called → User profile is cached by userId
2. **Content is fetched** → Backend may or may not populate `uploadedBy` with full data
3. **Enrichment happens** → If `uploadedBy` is missing firstName/lastName/avatar:
   - Extract userId from `uploadedBy` (object or string)
   - Look up cached user profile
   - Merge cached data into content item
4. **Content is displayed** → Fullname and avatar are now available

## Enrichment Logic

The enrichment utility handles multiple scenarios:

1. **Populated object missing data**: If `uploadedBy` is an object but missing firstName/avatar, enrich from cache
2. **String ID**: If `uploadedBy` is just a string ID, convert to object with cached data
3. **Author/AuthorInfo**: Also enriches `author` and `authorInfo` fields if they exist

## Backend Communication

**See detailed backend specification:** `docs/BACKEND_USER_DATA_POPULATION_SPEC.md`

**Summary for backend team:**
- ✅ Frontend now caches user profiles and enriches content automatically
- ⚠️ **Backend should still populate `uploadedBy` with full user data** (firstName, lastName, avatar) for optimal performance
- ✅ If backend doesn't populate, frontend will enrich from cache (works but slower)
- 📋 Backend spec includes: required fields, endpoints, implementation examples, and testing checklist

## Testing Checklist

- [ ] User profile is cached when user logs in
- [ ] Content items show fullname when backend doesn't populate `uploadedBy`
- [ ] Content items show avatar when backend doesn't populate `uploadedBy`
- [ ] Content items work when `uploadedBy` is a string ID
- [ ] Content items work when `uploadedBy` is a populated object
- [ ] Cache persists for 30 minutes
- [ ] Multiple content items are enriched correctly
- [ ] Author and authorInfo fields are also enriched

## Files Modified

1. `app/utils/dataFetching.ts`
   - Added `UserProfileCache` class
   - Updated `getUserProfile()` to cache user data
   - Updated `getMediaList()` to enrich content arrays

2. `app/hooks/useUserProfile.ts`
   - Added caching when user profile is fetched

3. `src/shared/utils/contentHelpers.ts`
   - Updated `transformApiResponseToMediaItem()` to use enrichment

## Next Steps

1. **Test the implementation** with real content that has missing user data
2. **Monitor cache performance** - check if cache is being used effectively
3. **Backend optimization** - Consider telling backend to always populate `uploadedBy` for better performance
4. **Cache invalidation** - May need to invalidate cache when user updates profile

## Cache Keys Used

- `user:${userId}` - User profile cache (30 minutes)
- `avatar:${userId}` - Avatar URL cache (30 minutes)
- `GET:/auth/me` - User profile API response cache (5 minutes)

