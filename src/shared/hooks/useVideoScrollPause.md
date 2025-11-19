# Video Scroll Pause Hook

This hook ensures videos automatically pause when scrolled out of view, providing TikTok/Instagram-like behavior.

## Problem

When users scroll away from a playing video, it should automatically pause to:
- Save battery
- Reduce data usage
- Improve performance
- Provide better UX

## Solution

The `useVideoScrollPause` hook automatically pauses videos when they're scrolled out of view.

## Usage

### Basic Usage

```tsx
import { useVideoScrollPause } from '@/shared/hooks/useVideoScrollPause';

function VideoCard({ videoKey, isPlaying, onPause }) {
  const { onLayout, onScroll } = useVideoScrollPause({
    videoKey,
    isPlaying,
    onPause,
  });

  return (
    <View onLayout={onLayout}>
      <Video ... />
    </View>
  );
}

function VideoList() {
  const scrollHandler = useVideoScrollPause({...}).onScroll;
  
  return (
    <ScrollView onScroll={scrollHandler}>
      {videos.map(video => <VideoCard key={video.id} {...video} />)}
    </ScrollView>
  );
}
```

### With Custom Threshold

```tsx
const { onLayout, onScroll } = useVideoScrollPause({
  videoKey: 'video-123',
  isPlaying: true,
  onPause: () => pauseVideo('video-123'),
  visibilityThreshold: 0.3, // Pause when less than 30% visible
});
```

## Integration Examples

### FlatList/ScrollView

```tsx
function VideoFeed() {
  const [playingVideos, setPlayingVideos] = useState({});
  
  const pauseVideo = (key) => {
    setPlayingVideos(prev => ({ ...prev, [key]: false }));
  };

  // For each video card
  const videoCard = (video) => {
    const { onLayout } = useVideoScrollPause({
      videoKey: video.id,
      isPlaying: playingVideos[video.id],
      onPause: () => pauseVideo(video.id),
    });

    return <View onLayout={onLayout}>...</View>;
  };

  // For the scroll container
  const handleScroll = (event) => {
    // Combine with other scroll handlers if needed
    videos.forEach(video => {
      const { onScroll } = useVideoScrollPause({
        videoKey: video.id,
        isPlaying: playingVideos[video.id],
        onPause: () => pauseVideo(video.id),
      });
      onScroll(event);
    });
  };

  return (
    <FlatList
      onScroll={handleScroll}
      scrollEventThrottle={16}
      renderItem={({ item }) => videoCard(item)}
    />
  );
}
```

### Using Utility Functions (For Complex Cases)

```tsx
import { createScrollPauseHandler, createLayoutTracker } from '@/shared/utils/scrollVideoPause';

function VideoFeed() {
  const layouts = useRef(new Map());
  const [playingVideos, setPlayingVideos] = useState({});

  const handleLayout = createLayoutTracker(layouts.current);
  const handleScroll = createScrollPauseHandler(
    layouts.current,
    (key) => playingVideos[key],
    (key) => setPlayingVideos(prev => ({ ...prev, [key]: false }))
  );

  return (
    <ScrollView onScroll={handleScroll}>
      {videos.map(video => (
        <View
          key={video.id}
          onLayout={(e) => handleLayout(e, video.id, 'video')}
        >
          <Video ... />
        </View>
      ))}
    </ScrollView>
  );
}
```

## Configuration

- `visibilityThreshold` (default: 0.2): Pause when video is less than this percentage visible (0-1)
- `enabled` (default: true): Enable/disable scroll pause functionality

## Notes

- The hook requires both `onLayout` (on video container) and `onScroll` (on scroll container)
- For best performance, use `scrollEventThrottle={16}` on ScrollView/FlatList
- The hook automatically detects screen height if not provided
- Videos pause when:
  - Less than threshold visible (default 20%)
  - Completely above viewport
  - Completely below viewport


