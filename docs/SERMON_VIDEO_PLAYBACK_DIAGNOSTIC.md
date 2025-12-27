# Sermon Video Playback Diagnostic

**Date**: 2024-12-20  
**Status**: 🔴 **INVESTIGATING** - Videos in Sermon Tab Not Playing

---

## 🎯 Problem Statement

Videos in the **Sermon tab** do not play when users press the play button. The play request is sent, but the video never actually starts playing.

---

## 📊 Current Behavior (What's Happening)

### When User Clicks Play on Sermon Video:

1. **✅ Play Button Click Detected**
   - `handleVideoTap()` function is called
   - Log: `🎮 Sermon video tap - key: {modalKey}, video: {title}`

2. **✅ State Update Triggered**
   - `globalVideoStore.playVideoGlobally(key)` is called
   - Global video store state is updated
   - `playingVideos[modalKey]` is set to `true`

3. **❌ Video Does NOT Play**
   - No video playback occurs
   - Video remains paused/stopped
   - No audio output
   - Video UI may show playing state, but video doesn't actually play

### Current Implementation Flow:

```
User clicks Play Button
  ↓
handleVideoTap(modalKey, video, index)
  ↓
globalVideoStore.playVideoGlobally(modalKey)
  ↓
State updated: playingVideos[modalKey] = true
  ↓
playVideoGlobally() looks for registered player
  ↓
[PROBLEM: Player registration or play() call may be failing]
  ↓
useEffect sync effect runs (depends on playingVideos state)
  ↓
[PROBLEM: Video may not be loaded or playAsync() may be failing silently]
```

---

## ✅ Expected Behavior (What Should Happen)

### When User Clicks Play on Sermon Video:

1. **Play Button Click Detected**
   - `handleVideoTap()` function is called
   - Log confirms video tap

2. **State Update Triggered**
   - `globalVideoStore.playVideoGlobally(key)` is called
   - Global video store state is updated

3. **Video Player Registration Check**
   - Video player should be registered with `modalKey`
   - Registered player should have a `play()` function

4. **Registered Player's play() Function Called**
   - `playVideoGlobally()` finds the registered player
   - Calls `player.play()` function
   - Player's `play()` function checks if video is loaded
   - If loaded: calls `videoRef.playAsync()` immediately
   - If not loaded: waits for video to load, then calls `playAsync()`

5. **Video Starts Playing**
   - Video playback begins
   - Audio is audible
   - Video UI shows playing state correctly
   - Progress bar updates
   - Overlay hides (if shown)

### Expected Implementation Flow:

```
User clicks Play Button
  ↓
handleVideoTap(modalKey, video, index)
  ↓
globalVideoStore.playVideoGlobally(modalKey)
  ↓
State updated: playingVideos[modalKey] = true
  ↓
playVideoGlobally() finds registered player for modalKey
  ↓
player.play() function called
  ↓
Video ref status checked
  ↓
If loaded → videoRef.playAsync() called immediately
If not loaded → wait for load, then videoRef.playAsync()
  ↓
Video starts playing ✅
  ↓
useEffect sync effect confirms playback (redundant but safe)
```

---

## 🔍 Key Differences Between Working (ALL Tab) vs Broken (Sermon Tab)

### ALL Tab (VideoCard Component) - ✅ WORKS

1. **Uses `useVideoPlaybackControl` Hook**
   - This hook handles player registration automatically
   - Uses `expo-video` VideoPlayer (different from expo-av Video)
   - Registration happens via `useEffect` in the hook

2. **Uses Unified Media Store**
   - Calls `playMedia(key, "video")` which goes through `globalMediaStore`
   - `globalMediaStore.playMediaGlobally()` then calls `videoStore.playVideoGlobally()`

3. **Player Registration**
   - Registered via `useVideoPlaybackControl` hook
   - Player ref is `expo-video` VideoPlayer instance
   - Play function: `player.play()` (expo-video method)

### Sermon Tab (SermonComponent) - ❌ BROKEN

1. **Manual Player Registration**
   - Player registration happens in Video component's `ref` callback
   - Uses `expo-av` Video component (different from expo-video)
   - Registration happens when Video component mounts

2. **Direct Global Video Store Call**
   - Calls `globalVideoStore.playVideoGlobally(modalKey)` directly
   - No unified media store intermediary

3. **Player Registration**
   - Registered in Video component's ref callback
   - Player ref is `expo-av` Video ref
   - Play function: Custom async function that calls `videoRef.playAsync()`

---

## 🐛 Potential Issues (Root Causes)

### Issue #1: Player Not Registered When playVideoGlobally is Called

**Symptom**: 
- `playVideoGlobally()` can't find the player in the registry
- Log: `⚠️ Video player not registered for key: {modalKey}`

**Possible Causes**:
- Video component hasn't mounted yet when play button is clicked
- Video ref callback hasn't executed yet
- Modal key mismatch (different key used for registration vs playback)

**Evidence Needed**:
- Check logs: `📹 Registering sermon video player for key: ...`
- Check logs: `📋 Video player registry keys: ...`
- Verify modal key consistency

### Issue #2: Player Registered but play() Function Fails

**Symptom**:
- Player is found in registry
- `play()` function is called but video doesn't play
- No error logs (silent failure)

**Possible Causes**:
- Video not loaded when `play()` is called
- `playAsync()` call fails silently
- Video URL is invalid or inaccessible
- Video source hasn't loaded

**Evidence Needed**:
- Check logs: `▶️ Registered play function called for sermon video: ...`
- Check logs: `📊 Sermon video ... status: {isLoaded: false}`
- Check video URL logs: `🎬 Sermon video URL for ...`

### Issue #3: Video URL Issues

**Symptom**:
- Video loads but doesn't play
- Error logs about video loading failures
- Fallback URL (BigBuckBunny) is used

**Possible Causes**:
- Invalid video URL format
- Signed URL expired
- URL needs conversion (signed to public)
- Video file doesn't exist or is corrupted

**Evidence Needed**:
- Check logs: `🎬 Sermon video URL for ...`
- Check for URL validation warnings
- Check if `getBestVideoUrl()` is working correctly

### Issue #4: useEffect Sync Not Triggering

**Symptom**:
- State is updated but useEffect doesn't run
- Video refs don't sync with state

**Possible Causes**:
- Zustand selector not triggering re-render
- `playingVideos` object reference not changing
- useEffect dependency issue

**Evidence Needed**:
- Check logs: `🔄 Sermon video sync effect triggered, playingVideos: ...`
- Verify Zustand store subscription is working

### Issue #5: Modal Key Mismatch

**Symptom**:
- Player registered with one key, play called with different key
- Player exists in registry but not found when looking up

**Possible Causes**:
- Key generation inconsistency
- Different keys used for registration vs playback
- Section ID or index changes

**Evidence Needed**:
- Compare registration key vs playback key in logs
- Verify `modalKey` generation is consistent

---

## 📝 Diagnostic Steps to Identify Root Cause

### Step 1: Verify Player Registration

**Action**: Click play on a sermon video and check console logs

**Expected Logs**:
```
📹 Registering sermon video player for key: recent-0
✅ Sermon video player registered successfully for key: recent-0
```

**If Missing**: Player registration is not happening → Issue #1

---

### Step 2: Verify playVideoGlobally Finds Player

**Action**: Check logs when playVideoGlobally is called

**Expected Logs**:
```
🎬 playVideoGlobally: Attempting to play video key: recent-0
📋 Video player registry keys: ["recent-0", "explore-0", ...]
🔍 Target player found: true, has play function: true
▶️ Calling registered play() function for video: recent-0
```

**If "Target player found: false"**: Player not in registry → Issue #1 or #5

**If "has play function: false"**: Player registered incorrectly → Registration bug

---

### Step 3: Verify play() Function Executes

**Action**: Check if registered play function is called

**Expected Logs**:
```
▶️ Registered play function called for sermon video: recent-0
📊 Sermon video recent-0 status: {isLoaded: true, isPlaying: false}
✅ Sermon video recent-0 is loaded, calling playAsync
🎉 Sermon video recent-0 playAsync result: {...}
```

**If "not loaded yet"**: Video hasn't loaded → Issue #2

**If error in playAsync**: Video playback failing → Issue #2 or #3

---

### Step 4: Verify Video URL

**Action**: Check video URL logs

**Expected Logs**:
```
🎬 Sermon video URL for {title}: {
  original: "https://...",
  processed: "https://..."
}
```

**If URL is fallback (BigBuckBunny)**: Video URL invalid → Issue #3

**If URL processing fails**: URL conversion issue → Issue #3

---

### Step 5: Verify useEffect Sync

**Action**: Check if sync effect runs

**Expected Logs**:
```
🔄 Sermon video sync effect triggered, playingVideos: {...}
🎬 Sermon video recent-0 - shouldBePlaying: true, isLoaded: true, isPlaying: true
```

**If effect doesn't trigger**: Zustand subscription issue → Issue #4

**If effect triggers but video not playing**: playAsync failing in effect → Issue #2

---

## 🔧 Fixes Applied So Far

1. **Added URL Handling** ✅
   - Now using `getBestVideoUrl()` and `getVideoUrlFromMedia()` like VideoCard
   - Properly handles signed URLs and URL conversion

2. **Added useEffect Sync** ✅
   - Added useEffect to sync video playback with global store state
   - Imperatively calls `playAsync()` when state changes

3. **Added Direct playAsync Call** ✅
   - Added direct `playAsync()` call in `handleVideoTap()` as backup
   - Ensures video plays even if registered player fails

4. **Added Comprehensive Logging** ✅
   - Added detailed logs throughout the playback flow
   - Logs player registration, play calls, video status, errors

5. **Removed Navigation** ✅
   - Removed outer TouchableOpacity that was navigating to reels
   - Videos now play in place instead of navigating away

---

## 🎯 Next Steps

1. **Run Diagnostic Steps Above**
   - Identify which issue is occurring
   - Check console logs for evidence

2. **Based on Issue Found**:
   - **Issue #1 (Not Registered)**: Ensure Video component mounts before play is called
   - **Issue #2 (play() Fails)**: Fix play function logic or wait for video load
   - **Issue #3 (URL Issues)**: Fix URL handling or verify video URLs from backend
   - **Issue #4 (useEffect Not Triggering)**: Fix Zustand subscription
   - **Issue #5 (Key Mismatch)**: Ensure consistent key generation

3. **Potential Solutions**:
   - Use `useVideoPlaybackControl` hook (like VideoCard does)
   - Ensure video is loaded before allowing play
   - Add retry logic for play attempts
   - Fix video URL handling if URLs are invalid
   - Ensure modal key consistency throughout component

---

## 📋 Test Cases

### Test Case 1: Play Sermon Video (First Time)
- **Action**: Navigate to Sermon tab, click play on first video
- **Expected**: Video starts playing immediately
- **Actual**: ❌ Video doesn't play

### Test Case 2: Play Sermon Video (After Scroll)
- **Action**: Scroll down, click play on video further down
- **Expected**: Video starts playing immediately
- **Actual**: ❓ Not tested yet

### Test Case 3: Multiple Sermon Videos
- **Action**: Click play on one video, then click play on another
- **Expected**: First video pauses, second video plays
- **Actual**: ❓ Not tested yet

### Test Case 4: Compare with ALL Tab
- **Action**: Play same video in ALL tab vs Sermon tab
- **Expected**: Both should work identically
- **Actual**: ✅ ALL tab works, ❌ Sermon tab doesn't

---

## 🔗 Related Files

- `app/categories/SermonComponent.tsx` - Sermon tab component
- `app/store/useGlobalVideoStore.tsx` - Global video store with playVideoGlobally
- `src/features/media/components/VideoCard.tsx` - Working video card (ALL tab)
- `src/shared/utils/videoUrlManager.ts` - URL handling utilities
- `src/shared/hooks/useVideoPlaybackControl.ts` - Video playback control hook (not used in SermonComponent)

---

## 📝 Notes

- SermonComponent uses `expo-av` Video component
- VideoCard (ALL tab) uses `expo-video` VideoPlayer
- Different video libraries may have different behaviors
- Modal keys are generated as: `${sectionId}-${index}` (e.g., "recent-0", "explore-1")
- Content keys are generated as: `${contentType}-${_id || fileUrl || index}`

---

**Last Updated**: 2024-12-20  
**Status**: 🔴 Investigating - Waiting for diagnostic logs

