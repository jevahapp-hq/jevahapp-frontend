# Unified Media System Documentation

## Overview

The Unified Media System provides a single, consistent interface for playing audio from all content types in your app. Whether it's audio files, videos, or ebooks, users can now use the same intuitive controls to play media content.

## Key Features

### 🎵 **Universal Audio Playback**

- **Audio Files**: Direct audio playback with full controls
- **Video Files**: Extract and play audio track from videos (listen without watching)
- **Ebooks**: Placeholder for future text-to-speech integration
- **Sermons**: Automatically detect if sermon is audio or video and play accordingly

### 🎛️ **Consistent Controls**

- **Play/Pause**: Universal play button that works for all content types
- **Progress Bar**: Visual progress with seek functionality
- **Volume Control**: Mute/unmute for all media types
- **Time Display**: Current position and total duration
- **Content Type Indicator**: Shows what type of content is playing

### 🔄 **Smart Content Detection**

- **Automatic Type Detection**: Analyzes file extensions and content type
- **Fallback Handling**: Graceful handling of unknown content types
- **Error Recovery**: Clear error messages for unsupported content

## Implementation

### UnifiedMediaControls Component

```typescript
<UnifiedMediaControls
  content={{
    _id: "content-id",
    title: "Content Title",
    contentType: "video", // or "audio", "ebook", "sermon"
    fileUrl: "https://example.com/media.mp4",
    thumbnailUrl: "https://example.com/thumb.jpg",
    duration: 300000, // milliseconds
  }}
  onPlaybackStatusUpdate={(status) => {
    // Handle status updates
  }}
  onError={(error) => {
    // Handle errors
  }}
  onFinished={() => {
    // Handle completion
  }}
/>
```

### Content Type Handling

#### 1. **Audio Content** (`contentType: "audio"` or `"music"`)

- Direct audio playback using Expo AV
- Full progress tracking and seeking
- Volume control and mute functionality

#### 2. **Video Content** (`contentType: "video"`)

- Extracts audio track from video files
- Plays audio without displaying video
- Perfect for listening to sermons, lectures, or music videos
- Same controls as audio content

#### 3. **Ebook Content** (`contentType: "ebook"` or `"book"`)

- Currently shows "Audio playback not available" message
- Ready for future text-to-speech integration
- Maintains consistent UI with other content types

#### 4. **Sermon Content** (`contentType: "sermon"`)

- Automatically detects if sermon is audio or video
- Uses file extension to determine playback method
- Falls back to audio if detection fails

## Integration Examples

### ContentCard Integration

```typescript
// Replace old audio-only controls
<UnifiedMediaControls
  content={{
    _id: content._id,
    title: content.title,
    contentType: content.contentType,
    fileUrl: mappedContent.mediaUrl,
    thumbnailUrl: mappedContent.thumbnailUrl,
    duration: content.duration,
  }}
  onPlaybackStatusUpdate={(status) => {
    setIsPlaying(status.isPlaying);
    setAudioProgress(status.progress);
    setAudioDuration(status.duration);
  }}
  onError={(error) => {
    console.error("Media playback error:", error);
  }}
  onFinished={() => {
    setIsPlaying(false);
    setAudioProgress(0);
  }}
/>
```

### AllContentTikTok Integration

```typescript
// Works for all content types in TikTok-style feed
<UnifiedMediaControls
  content={{
    _id: audio._id,
    title: audio.title || "Unknown Title",
    contentType: audio.contentType || "audio",
    fileUrl: audio.fileUrl || "",
    thumbnailUrl:
      typeof audio.imageUrl === "string" ? audio.imageUrl : undefined,
    duration: 0,
  }}
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
    console.error("Media playback error:", error);
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

## User Experience

### 🎯 **Consistent Interface**

- Same play button design across all content types
- Identical progress bar and controls
- Uniform loading states and error handling
- Consistent visual feedback

### 📱 **Instagram-like Design**

- Modern, sleek interface
- Smooth animations and transitions
- Touch-friendly controls
- Professional appearance

### 🔄 **Smart Behavior**

- Only one media plays at a time globally
- Automatic pause when switching content
- Proper state management across components
- Memory-efficient resource cleanup

## Content Type Indicators

The system shows different icons based on content type:

- **🎵 Musical Notes**: Audio/Music content
- **📹 Video Camera**: Video content (playing audio)
- **📖 Book**: Ebook content
- **🎤 Microphone**: Sermon content

## Error Handling

### Common Scenarios

1. **Unsupported File Format**

   - Shows clear error message
   - Graceful fallback behavior
   - User-friendly error display

2. **Network Issues**

   - Automatic retry with exponential backoff
   - Clear error messages
   - Recovery suggestions

3. **Permission Errors**
   - Clear permission request messages
   - Fallback options when possible

## Future Enhancements

### 📚 **Ebook Text-to-Speech**

- Integration with device TTS engines
- Customizable voice and speed
- Bookmark and resume functionality
- Progress tracking for long texts

### 🎬 **Enhanced Video Support**

- Option to play video with audio
- Picture-in-picture support
- Background audio from videos
- Video thumbnail preview

### 🎛️ **Advanced Controls**

- Playback speed control
- Equalizer settings
- Crossfade between tracks
- Queue management

### 📊 **Analytics Integration**

- Playback tracking
- User engagement metrics
- Content popularity analysis
- Performance monitoring

## Migration Guide

### From Old System

1. **Replace Audio-Only Controls**:

   ```typescript
   // Old: Only worked for audio
   <CompactAudioControls audioUrl={audioUrl} audioKey={key} />

   // New: Works for all content types
   <UnifiedMediaControls content={contentObject} />
   ```

2. **Update Content Objects**:

   ```typescript
   // Ensure content object has all required fields
   const content = {
     _id: item._id,
     title: item.title || "Unknown Title",
     contentType: item.contentType || "audio",
     fileUrl: item.fileUrl || "",
     thumbnailUrl: item.thumbnailUrl,
     duration: item.duration || 0,
   };
   ```

3. **Handle Status Updates**:
   ```typescript
   // Update your state management to handle unified status
   onPlaybackStatusUpdate={(status) => {
     // status.isPlaying, status.progress, status.duration, etc.
   }}
   ```

## Testing

### Manual Testing Checklist

- [ ] Audio files play correctly
- [ ] Video files play audio track
- [ ] Ebooks show appropriate message
- [ ] Sermons auto-detect audio/video
- [ ] Only one media plays at a time
- [ ] Progress bar updates smoothly
- [ ] Seeking works correctly
- [ ] Volume control functions
- [ ] Error states display properly
- [ ] Loading states show correctly

### Automated Testing

```typescript
describe("UnifiedMediaControls", () => {
  it("should play audio content", async () => {
    // Test audio playback
  });

  it("should extract audio from video content", async () => {
    // Test video audio extraction
  });

  it("should show appropriate message for ebook content", async () => {
    // Test ebook handling
  });

  it("should auto-detect sermon content type", async () => {
    // Test sermon detection
  });
});
```

## Performance Considerations

1. **Memory Management**: Automatic cleanup of audio resources
2. **Efficient Updates**: Throttled status updates
3. **Lazy Loading**: Resources loaded only when needed
4. **Background Handling**: Proper background audio management

## Conclusion

The Unified Media System provides a seamless, Instagram-like experience for playing audio from all content types. Users can now enjoy consistent controls whether they're listening to music, audio from videos, or future text-to-speech from ebooks. The system is designed to be extensible and maintainable, making it easy to add new features and content types in the future.
