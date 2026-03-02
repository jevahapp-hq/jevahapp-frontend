# Modular TikTok-Style Video Progress Bar

A modular, easy-to-debug video progress bar component designed like TikTok's progress bar with clear separation of concerns.

## Architecture

The progress bar is split into modular pieces for easy debugging and maintenance:

```
VideoProgressBar/
├── types.ts           # Type definitions
├── utils.ts           # Utility functions (formatting, calculations)
├── hooks.ts           # Custom hooks (state, gestures, haptics)
├── TikTokProgressBar.tsx  # Main component
├── VideoProgressBar.tsx   # Original component (backward compatibility)
└── index.ts           # Exports
```

## Usage

### Basic Usage

```tsx
import { TikTokProgressBar } from '@/shared/components/VideoProgressBar';

<TikTokProgressBar
  progress={0.5}              // 0-1
  currentMs={30000}          // Current position in milliseconds
  durationMs={60000}          // Total duration in milliseconds
  isMuted={false}
  onToggleMute={() => {}}
  onSeekToPercent={(percent) => {
    // Handle seek to position (0-1)
  }}
/>
```

### With Debug Mode

Enable debug logging to see what's happening:

```tsx
<TikTokProgressBar
  {...props}
  debug={true}  // Enables console logging
/>
```

### Custom Configuration

```tsx
<TikTokProgressBar
  {...props}
  config={{
    trackHeight: 4,
    trackHeightDragging: 8,
    knobSize: 20,
    knobSizeDragging: 24,
    enableHaptics: true,
    enlargeOnDrag: true,
    showFloatingLabel: true,
    verticalScrub: {
      enabled: true,
      sensitivityBase: 60,
      maxSlowdown: 5,
    },
  }}
/>
```

## Debugging

### Enable Debug Mode

Set `debug={true}` to see detailed logs:

```
[ProgressBar] Drag started { locationX: 150, barWidth: 300 }
[ProgressBar] Drag move { dx: 10, dy: 5, newProgress: 0.55 }
[ProgressBar] Seek sync check { externalProgress: 0.5, targetProgress: 0.55, ... }
[ProgressBar] Seek completed { targetProgress: 0.55, externalProgress: 0.55 }
```

### Key Debug Points

1. **Gesture Handling** - Logs when drag starts/moves/ends
2. **Seek Synchronization** - Logs when seeking and when video catches up
3. **State Updates** - Logs all state changes
4. **Progress Calculations** - Logs progress calculations and epsilon checks

### Common Issues

#### Progress bar not updating
- Check `currentMs` and `durationMs` are being updated
- Enable debug mode to see if progress calculations are correct
- Check if `onSeekToPercent` is being called

#### Seek not completing
- Check `seekSyncTicks` and `seekMsTolerance` in config
- Enable debug to see seek sync checks
- Verify video is actually seeking (check video player status)

#### Gestures not working
- Check `barWidth` is set (component needs to measure layout)
- Verify pan responder is attached to the correct view
- Check if other gestures are interfering

## TikTok-Style Features

1. **Vertical Scrub** - Dragging vertically slows down horizontal scrubbing
2. **Floating Label** - Shows time above knob while dragging
3. **Smooth Animations** - Smooth progress updates during playback
4. **Enlarge on Drag** - Knob and track enlarge when dragging
5. **Haptic Feedback** - Optional haptic feedback (if available)

## Modular Structure Benefits

1. **Easy Debugging** - Each piece is isolated and can be tested independently
2. **Clear Responsibilities** - Types, utils, hooks, and component are separate
3. **Reusable** - Hooks and utils can be used in other components
4. **Maintainable** - Changes to one part don't affect others
5. **Testable** - Each module can be unit tested

## Migration from Original VideoProgressBar

The original `VideoProgressBar` is still available for backward compatibility. To migrate:

```tsx
// Old
import { VideoProgressBar } from '@/shared/components/VideoProgressBar';

// New
import { TikTokProgressBar } from '@/shared/components/VideoProgressBar';
```

The API is similar, but `TikTokProgressBar` uses a `config` prop instead of individual props for better organization.


