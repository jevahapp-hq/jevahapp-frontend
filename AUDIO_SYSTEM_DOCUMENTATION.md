# Advanced Audio System Documentation

## Overview

The new advanced audio system provides Instagram-like audio controls with proper state management, visual feedback, and seamless integration across the app. This system replaces the previous fragmented audio implementation with a unified, robust solution.

## Key Features

### 🎵 High-End Audio Controls

- **Instagram-like Design**: Modern, sleek UI with smooth animations
- **Real-time Progress**: Accurate progress tracking with visual feedback
- **Seamless Seeking**: Touch and drag progress bar for precise seeking
- **Volume Control**: Mute/unmute functionality with visual indicators
- **Loading States**: Proper loading indicators and error handling

### 🔄 Advanced State Management

- **Global Media Store Integration**: Ensures only one media plays at a time
- **Proper State Synchronization**: All components stay in sync
- **Memory Management**: Automatic cleanup of audio resources
- **Error Recovery**: Graceful error handling and recovery

### 🎛️ Audio Session Management

- **Platform Optimization**: iOS and Android specific configurations
- **Background Playback**: Proper background audio handling
- **Interruption Handling**: Seamless handling of phone calls, notifications
- **Audio Focus**: Proper audio focus management

## Components

### 1. `useAdvancedAudioPlayer` Hook

A comprehensive React hook that manages audio playback state and controls.

```typescript
const [audioState, audioControls] = useAdvancedAudioPlayer(audioUrl, {
  audioKey: "unique-key",
  autoPlay: false,
  loop: false,
  volume: 1.0,
  onPlaybackStatusUpdate: (status) => {
    /* handle status updates */
  },
  onError: (error) => {
    /* handle errors */
  },
  onFinished: () => {
    /* handle completion */
  },
});
```

**Features:**

- Automatic audio session configuration
- Real-time status updates
- Memory-efficient resource management
- Error handling and recovery
- Global media store integration

### 2. `AdvancedAudioControls` Component

Full-featured audio control component with track information display.

```typescript
<AdvancedAudioControls
  audioUrl="https://example.com/audio.mp3"
  audioKey="unique-key"
  title="Track Title"
  artist="Artist Name"
  thumbnail="https://example.com/thumb.jpg"
  onPlaybackStatusUpdate={(status) => {
    /* handle updates */
  }}
  onError={(error) => {
    /* handle errors */
  }}
  onFinished={() => {
    /* handle completion */
  }}
/>
```

**Features:**

- Track information display
- Full progress bar with seeking
- Time display (current/total)
- Volume control
- Loading states
- Error display

### 3. `CompactAudioControls` Component

Lightweight audio controls for cards and smaller spaces.

```typescript
<CompactAudioControls
  audioUrl="https://example.com/audio.mp3"
  audioKey="unique-key"
  onPlaybackStatusUpdate={(status) => {
    /* handle updates */
  }}
  onError={(error) => {
    /* handle errors */
  }}
  onFinished={() => {
    /* handle completion */
  }}
/>
```

**Features:**

- Compact design for cards
- Essential controls only
- Touch-friendly interface
- Progress bar with seeking
- Volume control

### 4. `AudioSessionManager` Utility

Singleton class for managing audio sessions across the app.

```typescript
import { audioSessionManager } from "../utils/audioSessionManager";

// Configure for different content types
await audioSessionManager.configureForVideo();
await audioSessionManager.configureForAudio();
await audioSessionManager.configureForMixed();

// Auto-configure based on content
await audioSessionManager.autoConfigure("audio");

// Reset to default
await audioSessionManager.reset();
```

## Integration Examples

### ContentCard Integration

```typescript
// Replace old audio controls with new system
<CompactAudioControls
  audioUrl={mappedContent.mediaUrl}
  audioKey={modalKey}
  onPlaybackStatusUpdate={(status) => {
    setIsPlaying(status.isPlaying);
    setAudioProgress(status.progress);
    setAudioDuration(status.duration);
  }}
  onError={(error) => {
    console.error("Audio playback error:", error);
  }}
  onFinished={() => {
    setIsPlaying(false);
    setAudioProgress(0);
  }}
/>
```

### AllContentTikTok Integration

```typescript
// Replace old audio controls with new system
<CompactAudioControls
  audioUrl={audio.fileUrl}
  audioKey={modalKey}
  onPlaybackStatusUpdate={(status) => {
    setAudioProgressMap((prev) => ({
      ...prev,
      [modalKey]: status.progress,
    }));
    setAudioDurationMap((prev) => ({
      ...prev,
      [modalKey]: status.duration,
    }));
    if (status.isPlaying) {
      setPlayingAudioId(modalKey);
    } else if (playingAudioId === modalKey) {
      setPlayingAudioId(null);
    }
  }}
  onError={(error) => {
    console.error("Audio playback error:", error);
  }}
  onFinished={() => {
    setPlayingAudioId(null);
    setAudioProgressMap((prev) => ({
      ...prev,
      [modalKey]: 0,
    }));
  }}
/>
```

## State Management

### AudioPlayerState Interface

```typescript
interface AudioPlayerState {
  isPlaying: boolean; // Current playback state
  isLoading: boolean; // Loading state
  isMuted: boolean; // Mute state
  progress: number; // Progress (0-1)
  duration: number; // Total duration in milliseconds
  position: number; // Current position in milliseconds
  error: string | null; // Error message if any
}
```

### AudioPlayerControls Interface

```typescript
interface AudioPlayerControls {
  play: () => Promise<void>; // Start playback
  pause: () => Promise<void>; // Pause playback
  togglePlay: () => Promise<void>; // Toggle play/pause
  seekTo: (position: number) => Promise<void>; // Seek to position (0-1)
  toggleMute: () => Promise<void>; // Toggle mute
  setVolume: (volume: number) => Promise<void>; // Set volume (0-1)
  stop: () => Promise<void>; // Stop playback
}
```

## Error Handling

The system includes comprehensive error handling:

1. **Network Errors**: Automatic retry with exponential backoff
2. **Audio Format Errors**: Graceful fallback with user notification
3. **Permission Errors**: Clear error messages and recovery suggestions
4. **Resource Errors**: Automatic cleanup and state reset

## Performance Optimizations

1. **Memory Management**: Automatic cleanup of unused audio resources
2. **Efficient Updates**: Throttled status updates to prevent excessive re-renders
3. **Lazy Loading**: Audio resources loaded only when needed
4. **Background Handling**: Proper background audio session management

## Migration Guide

### From Old System

1. **Remove Old State Variables**:

   ```typescript
   // Remove these
   const [sound, setSound] = useState<Audio.Sound | null>(null);
   const [isAudioLoading, setIsAudioLoading] = useState(false);
   const [isMuted, setIsMuted] = useState(false);
   ```

2. **Remove Old Functions**:

   ```typescript
   // Remove these
   const playAudio = async () => {
     /* old implementation */
   };
   const panResponder = PanResponder.create({
     /* old implementation */
   });
   ```

3. **Replace Controls**:
   ```typescript
   // Replace old controls with new components
   <CompactAudioControls
     audioUrl={audioUrl}
     audioKey={uniqueKey}
     onPlaybackStatusUpdate={handleStatusUpdate}
     onError={handleError}
     onFinished={handleFinished}
   />
   ```

## Testing

### Manual Testing Checklist

- [ ] Play button shows correct state (play/pause/loading)
- [ ] Progress bar updates smoothly during playback
- [ ] Seeking works correctly by dragging progress bar
- [ ] Volume control toggles mute state
- [ ] Only one audio plays at a time globally
- [ ] Audio continues in background (if configured)
- [ ] Error states display properly
- [ ] Loading states show during audio loading
- [ ] Memory cleanup works on component unmount

### Automated Testing

```typescript
// Example test structure
describe("AdvancedAudioControls", () => {
  it("should play audio when play button is pressed", async () => {
    // Test implementation
  });

  it("should pause audio when pause button is pressed", async () => {
    // Test implementation
  });

  it("should seek to correct position when progress bar is dragged", async () => {
    // Test implementation
  });
});
```

## Troubleshooting

### Common Issues

1. **Audio Not Playing**:

   - Check audio URL validity
   - Verify audio session configuration
   - Check for permission errors

2. **State Not Updating**:

   - Ensure proper callback functions are provided
   - Check global media store integration
   - Verify component re-rendering

3. **Memory Leaks**:
   - Ensure proper cleanup in useEffect
   - Check for unused audio resources
   - Verify component unmounting

### Debug Tools

```typescript
// Enable debug logging
console.log("Audio State:", audioState);
console.log("Audio Session Status:", audioSessionManager.getStatus());
console.log("Global Media Store:", globalMediaStore.getState());
```

## Future Enhancements

1. **Equalizer**: Add audio equalizer controls
2. **Playback Speed**: Variable playback speed control
3. **Crossfade**: Smooth transitions between tracks
4. **Visualizer**: Audio waveform visualization
5. **Offline Support**: Cached audio playback
6. **Analytics**: Playback analytics and metrics

## Conclusion

The new advanced audio system provides a robust, Instagram-like audio experience with proper state management, visual feedback, and seamless integration. It replaces the previous fragmented implementation with a unified, maintainable solution that scales across the entire application.
