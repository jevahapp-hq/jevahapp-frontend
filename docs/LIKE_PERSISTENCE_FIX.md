# Like Persistence Fix (Logout/Login)

## Problem
After logging out and back in (or app reload), liked content showed as unliked (heart icon reverted to outline).

## Root Causes & Fixes

### 1. Batch-metadata response format (fixed)
Backend returns `data` as **object** keyed by contentId. Frontend now parses correctly.

### 2. No content IDs after login (fixed)
`refreshAllStatsAfterLogin()` used `Object.keys(contentStats)` — empty after logout. Now falls back to IDs from **content cache** (useContentCacheStore) so batch-metadata runs with the right IDs.

### 3. Auth preload (existing)
`authService.ts` calls `loadBatchContentStats(ids, "media", { forceRefresh: true })` after `getAllContentWithAuth()` preload.

### 4. Backend must return hasLiked (backend fix required)
If likes still don't persist, the backend must:
- Persist likes in `POST /api/content/:contentType/:contentId/like`
- Return `userInteractions.liked` in `POST /api/content/batch-metadata` when `Authorization: Bearer <JWT>` is sent

See **`docs/BACKEND_LIKE_PERSISTENCE_HOW_TO_FIX.md`** for the full backend checklist and verification steps.

## Flow

1. **Like** → `POST /api/content/media/:id/like` (persists)
2. **Logout** → `clearCache()` wipes contentStats
3. **Login** → `refreshAllStatsAfterLogin()` gets IDs from content cache, calls `loadBatchContentStats` with auth
4. **Feed focus** → `useFocusEffect` and `useAllContentTikTokFeedData` also call `loadBatchContentStats` with auth

## Related
- `docs/BACKEND_LIKE_PERSISTENCE_HOW_TO_FIX.md` – **Backend team: use this to fix**
- `docs/LIKE_UNLIKE_FRONTEND_CONTRACT.md` – Full contract
