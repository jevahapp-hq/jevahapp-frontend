# Video Auto-Play Issue Analysis & Solution

## 🔍 Root Cause Identified

### Problem 1: Auto-Play Enabled by Default

**Location:** `app/store/useGlobalVideoStore.tsx:65`

```typescript
isAutoPlayEnabled: true,  // ❌ BAD: Auto-play enabled by default
```

**Impact:** Videos automatically play when they become visible, even if user hasn't clicked play.

### Problem 2: Auto-Play Logic in Visibility Handler

**Location:** `app/store/useGlobalVideoStore.tsx:265-323`

```typescript
handleVideoVisibilityChange: (visibleVideoKey: string | null) => {
  // ... automatically plays visible video when auto-play is enabled
  newPlayingVideos[visibleVideoKey] = true; // ❌ Auto-plays without user interaction
};
```

**Impact:** Scrolling triggers video play automatically.

### Problem 3: VideoCard Sync Logic

**Location:** `src/features/media/components/VideoCard.tsx:580-607`

```typescript
useEffect(() => {
  // Syncs video playback with state
  if (isPlaying && !status.isPlaying) {
    await videoRef.current.playAsync(); // ⚠️ Might trigger unintended play
  }
}, [isPlaying]);
```

**Impact:** State changes trigger video playback even if user didn't click.

---

## ✅ Solution: Modularized Video Playback Control

### Created: `useVideoPlaybackControl` Hook

**Location:** `src/shared/hooks/useVideoPlaybackControl.ts`

**Features:**

1. ✅ **Manual play/pause only** (no auto-play)
2. ✅ **Proper state synchronization**
3. ✅ **Only one video plays at a time**
4. ✅ **Centralized control logic**
5. ✅ **Easy to debug and maintain**

### Key Changes:

#### 1. Disabled Auto-Play by Default

```typescript
// Before
isAutoPlayEnabled: true,  // ❌

// After
isAutoPlayEnabled: false,  // ✅ Manual play only
```

#### 2. Safe Sync Logic

```typescript
// Only sync if video was manually played or auto-play explicitly enabled
if (!enableAutoPlay && !isCurrentlyPlaying && !shouldPlayThisVideo) {
  return; // Don't auto-play
}
```

#### 3. Manual Control Functions

```typescript
const { play, pause, toggle, isPlaying } = useVideoPlaybackControl({
  videoKey,
  videoRef,
  enableAutoPlay: false, // Explicit opt-in for auto-play
});
```

---

## 🎯 Instagram/TikTok-Like Behavior

### Expected Behavior:

1. ✅ Videos **do NOT** play automatically on load
2. ✅ User must **click play button** to start
3. ✅ Only **one video plays at a time**
4. ✅ When user plays new video, **previous one pauses**
5. ✅ Scrolling **pauses all videos** (optional, can be enabled)

### Implementation:

```typescript
// In VideoCard component
const { isPlaying, play, pause, toggle } = useVideoPlaybackControl({
  videoKey: key,
  videoRef,
  enableAutoPlay: false, // Manual play only
});

// Play button handler
<MediaPlayButton
  isPlaying={isPlaying}
  onPress={toggle} // Only plays when user clicks
/>;
```

---

## 🔧 Migration Steps

### Step 1: Update VideoCard to use new hook

```typescript
// Replace existing playback control logic with:
import { useVideoPlaybackControl } from "../../../shared/hooks/useVideoPlaybackControl";

const { isPlaying, toggle, shouldPlayThisVideo } = useVideoPlaybackControl({
  videoKey: key,
  videoRef,
  enableAutoPlay: false,
});
```

### Step 2: Remove auto-play sync logic

```typescript
// REMOVE this from VideoCard:
useEffect(() => {
  if (isPlaying && videoRef.current) {
    videoRef.current.playAsync(); // ❌ Remove auto-play
  }
}, [isPlaying]);
```

### Step 3: Update play button handler

```typescript
// Use the hook's toggle function
<MediaPlayButton
  isPlaying={isPlaying}
  onPress={toggle} // Manual control only
/>
```

---

## 🐛 Debugging Tools

### Console Logs Added:

- `🎮 Manual play triggered for: {key}` - User clicked play
- `🎮 Manual pause triggered for: {key}` - User clicked pause
- `▶️ Syncing playback: Playing {key}` - State sync playing
- `⏸️ Syncing playback: Pausing {key}` - State sync pausing

### Common Issues:

1. **Video plays on scroll**
   - Check: `isAutoPlayEnabled` should be `false`
   - Check: `handleVideoVisibilityChange` should not be called
2. **Multiple videos playing**

   - Check: `playVideoGlobally` is being used (pauses others)
   - Check: Store state is properly synchronized

3. **Video doesn't pause when another plays**
   - Check: Player registry is updated
   - Check: `pauseAllVideos` is called before play

---

## 📊 Benefits

✅ **No more unwanted auto-play**
✅ **Predictable behavior** (manual control only)
✅ **Easy to debug** (centralized logic)
✅ **Maintainable** (single source of truth)
✅ **Instagram/TikTok-like UX** (user in control)

---

## 🚀 Next Steps

1. ✅ Created modular hook
2. ⏳ Update VideoCard to use new hook
3. ⏳ Test manual play/pause behavior
4. ⏳ Verify only one video plays at a time
5. ⏳ Add optional scroll-to-pause feature
