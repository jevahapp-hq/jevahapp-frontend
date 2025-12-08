# Audio Manager Consolidation Plan

## Current State

### ✅ KEEP - Core Audio Managers

1. **`app/utils/globalAudioInstanceManager.ts`** ⭐ MAIN MANAGER
   - Single source of truth for all audio instances
   - Ensures only one audio plays at a time
   - Prevents duplicate playback
   - **Status**: Active, being used by AllContentTikTok and MiniAudioPlayer

2. **`app/store/useCurrentPlayingAudioStore.tsx`**
   - Tracks currently playing audio for mini player
   - **Status**: Active, used by MiniAudioPlayer

3. **`app/utils/audioManager.ts`**
   - Manages audio session/mute state (different purpose)
   - Handles global mute, volume settings
   - **Status**: Keep - different purpose (session state, not instance management)

4. **`app/utils/audioConfig.ts`**
   - Audio session configuration utilities
   - Used by Reelsviewscroll
   - **Status**: Keep - configuration utility

### ❌ DELETE - Duplicate/Unused

1. ~~`app/utils/audioSessionManager.ts`~~ ✅ DELETED
   - Duplicate of audioConfig.ts functionality
   - Not used anywhere

### 🔄 MIGRATE - Need to Use Global Manager

These components create audio instances directly and should use `globalAudioInstanceManager`:

1. **`app/components/CopyrightFreeSongs.tsx`**
   - Creates Audio.Sound directly
   - Should use globalAudioInstanceManager

2. **`app/screens/library/AllLibrary.tsx`**
   - Creates Audio.Sound directly
   - Should use globalAudioInstanceManager

3. **`app/categories/music.tsx`**
   - Creates Audio.Sound directly
   - Should use globalAudioInstanceManager

4. **`app/categories/SermonComponent.tsx`**
   - Creates Audio.Sound directly
   - Should use globalAudioInstanceManager

5. **`app/ExploreSearch/ExploreSearch.tsx`**
   - Creates Audio.Sound directly
   - Should use globalAudioInstanceManager

6. **`app/hooks/useAdvancedAudioPlayer.ts`**
   - Creates Audio.Sound directly
   - Should use globalAudioInstanceManager

### ⚠️ KEEP FOR NOW - Specialized Use Cases

1. **`app/store/useGlobalAudioPlayerStore.tsx`**
   - Used by FloatingAudioPlayer for copyright-free songs
   - Different use case (queue-based player)
   - **Status**: Keep for now, but consider migration later

2. **`app/services/hymnAudioService.ts`**
   - Used by TraditionalHymns component
   - Specialized service for hymns
   - **Status**: Keep for now, consider migration later

## Consolidation Goals

1. ✅ Use `globalAudioInstanceManager` as the SINGLE source of truth for audio instances
2. ✅ All components should use globalAudioInstanceManager to play audio
3. ✅ Prevent duplicate audio instances
4. ✅ Ensure only one audio plays at a time across the entire app

## Migration Checklist

- [ ] Migrate CopyrightFreeSongs to use globalAudioInstanceManager
- [ ] Migrate AllLibrary to use globalAudioInstanceManager
- [ ] Migrate music.tsx to use globalAudioInstanceManager
- [ ] Migrate SermonComponent to use globalAudioInstanceManager
- [ ] Migrate ExploreSearch to use globalAudioInstanceManager
- [ ] Migrate useAdvancedAudioPlayer hook to use globalAudioInstanceManager

## Files Structure After Consolidation

```
app/
├── utils/
│   ├── globalAudioInstanceManager.ts  ⭐ MAIN - All audio instances
│   ├── audioManager.ts                ✅ KEEP - Session/mute state
│   └── audioConfig.ts                 ✅ KEEP - Configuration
├── store/
│   ├── useCurrentPlayingAudioStore.tsx ✅ KEEP - Current audio tracking
│   └── useGlobalAudioPlayerStore.tsx   ⚠️ KEEP - Copyright songs (specialized)
├── services/
│   └── hymnAudioService.ts            ⚠️ KEEP - Hymns (specialized)
└── components/
    └── MiniAudioPlayer.tsx            ✅ KEEP - Uses globalAudioInstanceManager
```







