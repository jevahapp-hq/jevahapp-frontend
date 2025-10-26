# Media Store Migration Plan

## Overview

We're migrating from multiple conflicting media stores to a single unified `useMediaPlaybackStore.tsx`.

## ✅ Completed Migrations

- `app/categories/VideoComponent.tsx` - **MIGRATED** ✅
- `src/features/media/AllContentTikTok.tsx` - **MIGRATED** ✅

## 🔄 Remaining Components to Migrate

### High Priority (Core Video Playback)

- `app/reels/Reelsviewscroll.tsx` - Uses `useGlobalVideoStore` for video management
- `app/components/MiniVideoCard.tsx` - Uses `useGlobalVideoStore` for video controls
- `app/components/VideoCard.tsx` - Uses `useGlobalVideoStore` (different from VideoComponent)

### Medium Priority (Media Controls)

- `app/components/UnifiedMediaControls.tsx` - Uses both old stores
- `app/categories/SermonComponent.tsx` - Uses `useGlobalVideoStore`
- `app/hooks/useAdvancedAudioPlayer.ts` - Uses `useGlobalMediaStore`

### Lower Priority (Navigation/UI)

- `app/hooks/useVideoNavigation.ts` - Uses `useGlobalVideoStore` for navigation
- `app/components/BottomNav.tsx` - Uses stores for pause-on-navigation
- `app/categories/HomeTabContent.tsx` - Uses stores for background pause
- `app/components/ContentCard.tsx` - Uses stores for media display
- `app/screens/library/AllLibrary.tsx` - Uses stores in library context
- `app/screens/library/VideoLibrary.tsx` - Uses stores for library videos

## 🗂️ Deprecated Stores (DO NOT DELETE YET)

- ⚠️ `app/store/useGlobalVideoStore.tsx` - **DEPRECATED** (18 files still using)
- ⚠️ `app/store/useGlobalMediaStore.tsx` - **DEPRECATED** (18 files still using)

## 🎯 New Unified Store

- ✅ `app/store/useMediaPlaybackStore.tsx` - **ACTIVE** (Use this for all new components)

## Migration Strategy

### Phase 1: Core Video Components (Current)

- [x] VideoComponent.tsx
- [x] AllContentTikTok.tsx
- [ ] Reelsviewscroll.tsx
- [ ] MiniVideoCard.tsx

### Phase 2: Media Controls

- [ ] UnifiedMediaControls.tsx
- [ ] SermonComponent.tsx
- [ ] useAdvancedAudioPlayer.ts

### Phase 3: Navigation & UI

- [ ] useVideoNavigation.ts
- [ ] BottomNav.tsx
- [ ] HomeTabContent.tsx
- [ ] ContentCard.tsx

### Phase 4: Library Components

- [ ] AllLibrary.tsx
- [ ] VideoLibrary.tsx

## When Can We Delete Old Stores?

**Only after ALL components above are migrated** and we verify:

1. No runtime errors
2. All video/audio playback works correctly
3. No references remain in the codebase
4. All tests pass

## Benefits After Migration

- 🎯 Single source of truth for media state
- 🚫 No more conflicting store updates
- 🧹 Cleaner, more maintainable code
- 🔧 Easier debugging and testing
- 📱 Consistent media behavior across app
