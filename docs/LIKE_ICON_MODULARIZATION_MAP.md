# Like Icon – Where It Lives & How to Centralize

**Purpose:** Map all like consumption points so we can modularize and trace errors. A single source of truth makes debugging easier.

---

## Current Architecture

### ✅ Centralized Path (useInteractionStore)

| Component | Like Source | Toggle | Batch Load |
|-----------|-------------|--------|------------|
| **AllContentTikTok** (VideoCard, MusicCard, EbookCard) | contentStats via useContentStatsHelpers | toggleLike | loadBatchContentStats (focus + feed data) |
| **Reels** | contentStats | toggleLike | loadContentStats |
| **EbookComponent** | contentStats | toggleLike | — |
| **VideoComponent** | contentStats | — | loadBatchContentStats |
| **InteractionButtons** / CardFooterActions | contentStats | toggleLike | loadContentStats |

**Flow:** contentInteractionAPI.toggleLike / getBatchMetadata → useInteractionStore → components read contentStats

---

### ⚠️ Decentralized Paths (Potential Bugs)

| Component | Like Source | Toggle | Issue |
|-----------|-------------|--------|-------|
| **ContentCard** | Local state (mappedContent.isLiked) | onLike prop + socketManager.sendLike | Does NOT read from useInteractionStore. If parent doesn’t wire store, likes won’t persist. |
| **CopyrightFreeSongModal** | Local state (song.isLiked) | copyrightFreeMusicAPI.toggleLike | Separate API – not useInteractionStore. Different backend. |
| **ExploreSearch** | item.isLiked from API | — | Depends on search API including hasLiked. |

---

## Where Errors Can Come From

| Symptom | Likely Location |
|---------|-----------------|
| Main feed (AllContentTikTok) likes don’t persist | Backend batch-metadata or like endpoint |
| Reels likes don’t persist | Backend; Reels uses same store |
| ContentCard likes don’t persist | Frontend – check who passes onLike and if it uses store |
| Copyright-free song likes don’t persist | copyrightFreeMusicAPI / separate backend |
| Feed likes work but search results don’t | ExploreSearch – different API, may not return hasLiked |

---

## Modularization Plan

### 1. Create `useLike(contentId, contentType)` Hook

Centralize like logic in one hook:

```typescript
// app/hooks/useLike.ts
export function useLike(contentId: string, contentType: string) {
  const contentStats = useInteractionStore(s => s.contentStats[contentId]);
  const toggleLike = useInteractionStore(s => s.toggleLike);
  
  const isLiked = contentStats?.userInteractions?.liked ?? false;
  const likeCount = contentStats?.likes ?? 0;
  
  const handleLike = useCallback(async () => {
    await toggleLike(contentId, contentType);
  }, [contentId, contentType, toggleLike]);
  
  return { isLiked, likeCount, handleLike };
}
```

All card components use this hook instead of local state or prop drilling.

### 2. Migrate ContentCard to useInteractionStore

ContentCard currently uses local state + onLike prop. Options:

- **A)** Have ContentCard use `useLike` and read from store; remove onLike prop for like.
- **B)** Ensure every parent that renders ContentCard passes `onLike` that calls `toggleLike` and ContentCard syncs from contentStats when it mounts.

### 3. Ensure Batch Metadata Runs Everywhere

| Screen | Batch Call? | Location |
|--------|-------------|----------|
| Home feed (AllContentTikTok) | ✅ | useFocusEffect, useAllContentTikTokFeedData |
| Reels | loadContentStats per item | Reelsviewscroll |
| VideoComponent | ✅ | useEffect with uploadedVideos |
| AllLibrary | — | Consider adding for saved items |
| ExploreSearch | — | Consider adding for search results |

### 4. Add Debug Logging (Dev Only)

In `contentInteractionAPI.getBatchMetadata` and `loadBatchContentStats`:

- Log when batch-metadata is called (with contentIds length, has token).
- Log parsed result count and sample `userInteractions.liked` values.

This helps confirm whether the backend is returning `hasLiked` and whether the frontend is parsing it.

---

## Files to Touch for Modularization

| File | Change |
|------|--------|
| `app/hooks/useLike.ts` | **Create** – shared like hook |
| `app/components/ContentCard.tsx` | Use useLike or wire onLike to store |
| `src/features/media/components/VideoCard.tsx` | Use useLike instead of props |
| `src/features/media/components/MusicCard.tsx` | Use useLike instead of props |
| `src/features/media/components/EbookCard.tsx` | Use useLike instead of props |
| `app/reels/Reelsviewscroll.tsx` | Already uses store – verify flow |
| `app/categories/EbookComponent.tsx` | Already uses toggleLike – verify |

---

## Quick Diagnostic

When likes don’t persist after logout/login:

1. **Network tab:** Is `POST /api/content/batch-metadata` called with `Authorization` header after login?
2. **Response:** Does the batch response include `hasLiked: true` for liked items?
3. **Store:** After batch load, does `useInteractionStore.getState().contentStats[contentId].userInteractions.liked` equal `true`?
4. **Component:** Does the card read from `contentStats` or from local state?

If 1–3 are OK and 4 uses local state, the bug is frontend (component not using store). If 1–2 fail, the bug is backend.
