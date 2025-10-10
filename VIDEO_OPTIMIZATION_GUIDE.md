# Video Optimization Guide

## Problem Overview

Videos were "cracking" (stuttering/buffering) during playback due to:

### Backend Issues (Render Free Tier)

- Slow server response times
- Cold starts (can take 30+ seconds)
- Limited bandwidth
- No CDN for video delivery

### Frontend Issues (Now Fixed!)

- No progressive buffer configuration
- Missing retry logic for failed loads
- No network-aware quality adjustment
- No preloading strategy
- Missing error recovery mechanisms

## Solution Implemented

We've created a comprehensive video optimization system that works well even with slow backends.

### 1. Video Optimization Utility (`app/utils/videoOptimization.ts`)

This utility provides:

#### Network Detection

- Automatically detects network quality (WiFi, 4G, 3G, etc.)
- Adjusts buffer settings based on connection speed
- Caches network status to avoid repeated checks

#### Smart Buffering

- **Excellent network (WiFi)**: 10s buffer ahead
- **Good network (4G)**: 15s buffer ahead
- **Fair network (3G)**: 20s buffer ahead
- **Poor network (2G)**: 30s buffer ahead (maximum)

#### Retry Logic

- Automatically retries failed video loads
- Exponential backoff: 1.5s → 3s → 6s → 12s
- More retries on slower networks (up to 5 attempts)

#### Preloading

- Preloads next videos based on network quality
- Caches preloaded videos for 5 minutes
- Reduces perceived loading time

#### Performance Monitoring

- Tracks load times, buffer times, errors
- Records success rates per video
- Helps identify problematic videos

### 2. Optimized Video Hook (`app/hooks/useOptimizedVideo.ts`)

Easy-to-use React hook that provides:

- Automatic buffering configuration
- Built-in retry logic
- Loading and error states
- Buffering progress tracking
- Network-aware optimization

## How to Use in Your Components

### Basic Usage

```typescript
import { useOptimizedVideo } from "../hooks/useOptimizedVideo";

function MyVideoComponent({ video }) {
  const { videoRef, isLoading, isBuffering, hasError, videoProps, retry } =
    useOptimizedVideo({
      videoUrl: video.fileUrl,
      shouldPlay: isPlaying,
      isMuted: false,
      onLoad: () => console.log("Video loaded!"),
      onError: (error) => console.error("Video error:", error),
      onBuffering: (buffering) => {
        if (buffering) console.log("Buffering...");
      },
    });

  return (
    <Video
      ref={videoRef}
      source={{ uri: video.fileUrl }}
      {...videoProps}
      // Your additional props...
    />
  );
}
```

### UI States to Display

```typescript
// Loading State
{
  isLoading && (
    <View className="absolute inset-0 justify-center items-center">
      <ActivityIndicator color="#FEA74E" />
    </View>
  );
}

// Buffering State
{
  isBuffering && (
    <View className="absolute inset-0 justify-center items-center">
      <ActivityIndicator color="#FEA74E" />
      <Text className="text-white mt-2">Buffering...</Text>
    </View>
  );
}

// Error State with Retry
{
  hasError && (
    <View className="absolute inset-0 justify-center items-center">
      <Text className="text-white mb-2">Failed to load video</Text>
      <TouchableOpacity onPress={retry}>
        <Text className="text-[#FEA74E]">Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Updated Components

### ✅ MiniVideoCard

- Now uses `useOptimizedVideo` hook
- Shows buffering indicator
- Has retry button on error
- Adaptive buffering based on network

### 🔄 To Update

Apply the same pattern to these components:

1. **UpdatedVideoCard** (`app/components/UpdatedVideoCard.tsx`)
2. **SimpleVideoCard** (`app/components/SimpleVideoCard.tsx`)
3. **VideoCard** (`src/features/media/components/VideoCard.tsx`)
4. **Reelsviewscroll** (`app/reels/Reelsviewscroll.tsx`)

## Manual Optimization (Without Hook)

If you can't use the hook, manually apply optimizations:

```typescript
import { getOptimizedVideoProps } from "../utils/videoOptimization";

// In your component
const [videoProps, setVideoProps] = useState(null);

useEffect(() => {
  async function loadVideoProps() {
    const props = await getOptimizedVideoProps({
      isMuted: false,
      isReels: false,
    });
    setVideoProps(props);
  }
  loadVideoProps();
}, []);

// In your Video component
<Video
  {...videoProps}
  // Your other props
/>;
```

## Key Configuration Values

### Buffering (iOS)

```typescript
preferredForwardBufferDuration: 15; // Seconds to buffer ahead
```

### Update Interval

```typescript
progressUpdateIntervalMillis: 250; // How often to update progress
// Use 100ms for excellent networks
// Use 1000ms for poor networks
```

### Retry Configuration

```typescript
maxRetries: 3; // Number of retry attempts
retryDelay: 1500; // Initial delay between retries (ms)
```

## Performance Tips

### 1. Don't Load All Videos at Once

```typescript
// Bad: Loads all videos immediately
{
  videos.map((video) => <Video source={{ uri: video.url }} />);
}

// Good: Only load visible videos
{
  videos.map((video, index) => (
    <Video source={{ uri: video.url }} shouldPlay={visibleIndex === index} />
  ));
}
```

### 2. Use Muted for Previews

```typescript
// Mini cards, thumbnails should always be muted
<Video isMuted={true} volume={0.0} />
```

### 3. Unload Videos When Not Visible

```typescript
useEffect(() => {
  return () => {
    videoRef.current?.unloadAsync();
  };
}, []);
```

### 4. Show Buffering Indicators

Users are more patient when they see a loading indicator:

```typescript
{
  isBuffering && <ActivityIndicator />;
}
```

## Network Quality Detection

The system automatically detects network quality:

```typescript
import { detectNetworkQuality } from "../utils/videoOptimization";

const networkQuality = await detectNetworkQuality();
// Returns: { type: 'excellent' | 'good' | 'fair' | 'poor' | 'offline' }
```

## Testing

### Test on Different Networks

1. **WiFi**: Should load quickly with minimal buffering
2. **4G**: Should load reasonably fast with some buffering
3. **3G**: Should buffer more but remain playable
4. **Airplane Mode**: Should show offline state

### Test Error Recovery

1. Turn off WiFi mid-video
2. Video should show buffering indicator
3. Turn WiFi back on
4. Video should resume automatically

### Test Retry Logic

1. Use invalid video URL
2. Should show error after attempts
3. Click retry button
4. Should retry loading

## Advanced: Custom Configuration

```typescript
import { NETWORK_CONFIGS } from "../utils/videoOptimization";

// Override default config for specific use case
const customConfig = {
  ...NETWORK_CONFIGS.good,
  preferredForwardBufferDuration: 20, // More aggressive buffering
  maxRetries: 5, // More retry attempts
};

const { videoRef, videoProps } = useOptimizedVideo({
  videoUrl: video.url,
  forceConfig: customConfig, // Use custom config
});
```

## Monitoring Performance

```typescript
import { getAveragePerformance } from "../utils/videoOptimization";

// Get performance metrics
const metrics = getAveragePerformance();
console.log("Average load time:", metrics.loadTime);
console.log("Average buffer time:", metrics.bufferTime);
console.log("Success rate:", metrics.successRate);
console.log("Errors:", metrics.playbackErrors);
```

## Common Issues & Solutions

### Issue: Videos still buffering frequently

**Solution**: Network is likely very slow. The system automatically increases buffer duration on slow networks, but free Render backends can be extremely slow during cold starts.

### Issue: Videos fail to load

**Solution**: Check retry button appears and works. The system will retry up to 5 times on poor networks.

### Issue: First video load is very slow

**Solution**: This is likely Render's cold start (30+ seconds). Subsequent videos will load faster. Consider upgrading Render plan or using a CDN.

### Issue: Multiple videos playing at once

**Solution**: Use global video store to ensure only one video plays:

```typescript
globalVideoStore.playVideoGlobally(videoKey); // Pauses all others
```

## Backend Improvements (Future)

To further improve performance, consider:

1. **Upgrade Render Plan**: Paid plans have faster response times
2. **Add CDN**: CloudFlare, AWS CloudFront for video delivery
3. **Implement HLS Streaming**: Adaptive bitrate streaming
4. **Video Transcoding**: Generate multiple quality versions
5. **Enable Compression**: gzip/brotli compression on responses

## Summary

The video optimization system provides:

- ✅ Network-aware buffering
- ✅ Automatic retry logic
- ✅ Loading and buffering states
- ✅ Error recovery
- ✅ Performance monitoring
- ✅ Easy-to-use hook
- ✅ Works great even with slow backends!

Videos should now play smoothly even on Render's free tier, with appropriate loading indicators and automatic recovery from issues.
