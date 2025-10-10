# Video Optimization - Implementation Example for Reels

## Quick Implementation Guide for Reelsviewscroll.tsx

Here's how to apply the video optimizations to your Reels component:

### Step 1: Import the Hook

```typescript
// Add at the top of Reelsviewscroll.tsx
import { useOptimizedVideo } from "../hooks/useOptimizedVideo";
import videoOptimization from "../utils/videoOptimization";
```

### Step 2: Update Video Rendering

Find the section where you render the Video component (around line 838):

#### Before:

```typescript
<Video
  ref={(ref) => {
    if (ref && isActive) videoRefs.current[videoKey] = ref;
  }}
  source={{ uri: videoUrl || "" }}
  style={{
    width: "100%",
    height: "100%",
    position: "absolute",
  }}
  resizeMode={ResizeMode.COVER}
  isMuted={mutedVideos[videoKey] ?? false}
  volume={mutedVideos[videoKey] ? 0.0 : videoVolume}
  shouldPlay={isActive && (playingVideos[videoKey] ?? false)}
  useNativeControls={false}
  isLooping={true}
  onError={async (error) => {
    // Error handling...
  }}
  onPlaybackStatusUpdate={(status) => {
    // Status handling...
  }}
/>
```

#### After (with optimizations):

```typescript
// First, get optimized props outside the Video component
const [optimizedVideoProps, setOptimizedVideoProps] = useState(null);

useEffect(() => {
  async function loadOptimizedProps() {
    const props = await videoOptimization.getOptimizedVideoProps({
      isReels: true,
      isMuted: mutedVideos[videoKey] ?? false,
    });
    setOptimizedVideoProps(props);
  }
  loadOptimizedProps();
}, [mutedVideos[videoKey]]);

// Then in your Video component:
<Video
  ref={(ref) => {
    if (ref && isActive) videoRefs.current[videoKey] = ref;
  }}
  source={{ uri: videoUrl || "" }}
  style={{
    width: "100%",
    height: "100%",
    position: "absolute",
  }}
  resizeMode={ResizeMode.COVER}
  isMuted={mutedVideos[videoKey] ?? false}
  volume={mutedVideos[videoKey] ? 0.0 : videoVolume}
  shouldPlay={isActive && (playingVideos[videoKey] ?? false)}
  useNativeControls={false}
  isLooping={true}
  {...optimizedVideoProps} // Apply optimized props
  onError={async (error) => {
    console.error(
      `❌ Video loading error in reels for ${videoData.title}:`,
      error
    );

    // Retry logic with optimization
    const success = await videoOptimization.retryVideoLoad(
      videoUrl,
      async (url) => {
        await videoRefs.current[videoKey]?.loadAsync(
          { uri: url },
          { shouldPlay: isActive }
        );
      },
      {
        onRetry: (attempt) => {
          console.log(`🔄 Retrying video (attempt ${attempt})...`);
        },
        onFailure: () => {
          setErrorMessage("Failed to load video after multiple attempts");
          setHasError(true);
        },
      }
    );
  }}
  onPlaybackStatusUpdate={(status) => {
    if (!isActive || !status.isLoaded) return;

    // Get buffer status
    const bufferStatus = videoOptimization.getBufferStatus(status);

    if (bufferStatus.isBuffering) {
      console.log(
        `⏳ Video buffering: ${bufferStatus.bufferProgress.toFixed(1)}%`
      );
    }

    // Rest of your status handling code...
    if (status.durationMillis && videoDuration === 0) {
      setVideoDuration(status.durationMillis);
    }

    if (!isDragging && status.positionMillis) {
      setVideoPosition(status.positionMillis);
    }

    const pct = status.durationMillis
      ? (status.positionMillis / status.durationMillis) * 100
      : 0;
    globalVideoStore.setVideoProgress(videoKey, pct);

    if (status.didJustFinish) {
      const ref = videoRefs.current[videoKey];
      ref?.setPositionAsync(0);
      globalVideoStore.pauseVideo(videoKey);
    }
  }}
/>;
```

### Step 3: Add Buffering Indicator

Add a buffering indicator in your video render (after the Skeleton overlay):

```typescript
{
  /* Buffering Indicator */
}
{
  isActive && isBuffering && (
    <View
      className="absolute inset-0 justify-center items-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
      pointerEvents="none"
    >
      <ActivityIndicator size="large" color="#FEA74E" />
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 14,
          marginTop: 12,
          fontFamily: "Rubik",
        }}
      >
        Buffering video...
      </Text>
    </View>
  );
}
```

### Step 4: Track Buffer State

Add state for tracking buffering:

```typescript
// Add to state declarations at top of component
const [isBuffering, setIsBuffering] = useState<boolean>(false);
const [bufferProgress, setBufferProgress] = useState<number>(0);
```

Update the playback status handler to set buffering state:

```typescript
onPlaybackStatusUpdate={(status) => {
  if (!isActive || !status.isLoaded) return;

  // Check buffering
  const bufferStatus = videoOptimization.getBufferStatus(status);
  setIsBuffering(bufferStatus.isBuffering);
  setBufferProgress(bufferStatus.bufferProgress);

  // ... rest of your code
}}
```

## Alternative: Use the Hook Directly

For new components or major refactors, you can use the hook directly:

```typescript
// Inside your renderVideoItem function
function VideoItem({ videoData, isActive, videoKey }) {
  const { videoRef, isLoading, isBuffering, hasError, videoProps, retry } =
    useOptimizedVideo({
      videoUrl: videoData.fileUrl,
      shouldPlay: isActive && (playingVideos[videoKey] ?? false),
      isMuted: mutedVideos[videoKey] ?? false,
      isReels: true,
      onLoad: () => {
        console.log(`✅ Reel loaded: ${videoData.title}`);
      },
      onError: (error) => {
        console.error(`❌ Reel error: ${videoData.title}`, error);
      },
      onBuffering: (buffering) => {
        console.log(`⏳ Reel buffering: ${buffering}`);
      },
    });

  return (
    <Video
      ref={videoRef}
      source={{ uri: videoData.fileUrl }}
      {...videoProps}
      // Your custom props
    />
  );
}
```

## Testing Your Changes

### 1. Test on WiFi

- Videos should load quickly
- Minimal buffering
- Smooth playback

### 2. Test on Cellular

- Enable Network Link Conditioner (iOS) or Chrome DevTools network throttling
- Test 4G: Should buffer slightly but play smoothly
- Test 3G: More buffering but should still work
- Test 2G: Heavy buffering with clear indicators

### 3. Test Error Recovery

- Use invalid video URL
- Should retry automatically
- Error message should appear after max retries
- Retry button should work

### 4. Test Cold Start (Render)

- Clear app cache
- First video may take 30+ seconds (Render cold start)
- Should show loading indicator
- Subsequent videos should load faster

## Performance Monitoring

Add this to see how videos are performing:

```typescript
// In your component's useEffect
useEffect(() => {
  const metrics = videoOptimization.getAveragePerformance();
  console.log("📊 Video Performance:", {
    avgLoadTime: metrics.loadTime,
    avgBufferTime: metrics.bufferTime,
    successRate: `${metrics.successRate.toFixed(1)}%`,
    errors: metrics.playbackErrors,
  });
}, []);
```

## Key Benefits

✅ **Adaptive Buffering**: Automatically adjusts based on network speed
✅ **Retry Logic**: Automatically retries failed loads (up to 5 times)
✅ **Better UX**: Loading and buffering indicators keep users informed
✅ **Error Recovery**: Clear error messages with retry option
✅ **Performance Tracking**: Monitor how videos are performing
✅ **Network Awareness**: Detects and adapts to connection quality

## Expected Results

### Before Optimization:

- ❌ Videos stutter and "crack" during playback
- ❌ No feedback when loading/buffering
- ❌ Failed loads show no error or retry option
- ❌ Same settings for all network speeds

### After Optimization:

- ✅ Smooth playback even on slow connections
- ✅ Clear loading/buffering indicators
- ✅ Automatic retry on failure
- ✅ Adaptive settings based on network speed
- ✅ Better overall user experience

## Notes

1. **Render Free Tier**: The free tier has inherent slowness (cold starts). These optimizations help, but upgrading Render or adding a CDN will provide the best experience.

2. **First Load**: First video load may still be slow due to Render cold start (30+ seconds). This is a backend limitation.

3. **Buffer Duration**: Videos buffer 15-30 seconds ahead based on network speed. This uses more bandwidth but provides smoother playback.

4. **Retry Attempts**: System retries up to 5 times with exponential backoff. Each retry adds 1.5s, 3s, 6s, etc.

## Next Steps

1. Apply these changes to Reelsviewscroll.tsx
2. Apply to other video components (UpdatedVideoCard, SimpleVideoCard, etc.)
3. Test on different network speeds
4. Monitor performance metrics
5. Consider backend improvements (CDN, paid hosting)
