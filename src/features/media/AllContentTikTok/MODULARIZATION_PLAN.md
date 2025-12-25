# AllContentTikTok Modularization Plan

## Current State
- **File Size**: 3,371 lines
- **Main Issue**: Uses ScrollView (renders all items)
- **Performance Impact**: Massive - renders 100+ items at once
- **Expected Improvement**: 60-70% render time reduction

## Critical Optimization: ScrollView → FlatList

The **biggest performance win** is converting ScrollView to FlatList because:
1. FlatList only renders visible items (virtualization)
2. ScrollView renders everything upfront
3. With 100+ items, ScrollView creates 200+ components immediately

## Strategy

Since the content has sections (Most Recent, Music, All Content, etc.), we have two options:

### Option 1: SectionList (Recommended)
- Use React Native's SectionList
- Each section becomes a section in SectionList
- Best for mixed content types

### Option 2: FlatList with Section Headers
- Create unified data array with section markers
- Use ListHeaderComponent and renderItem to handle sections
- Simpler but less flexible

## Implementation Plan

### Phase 1: Critical Performance Fix (DO FIRST)
1. ✅ Convert main ScrollView to FlatList/SectionList
2. ✅ Extract render functions to components
3. ✅ Add React.memo to card components

### Phase 2: Code Organization
1. Extract hooks:
   - `useContentData.ts` - Data fetching and filtering
   - `useVideoPlayback.ts` - Video playback logic
   - `useAudioPlayback.ts` - Audio playback logic
   - `useContentActions.ts` - Like, save, share actions

2. Extract components:
   - `MostRecentSection.tsx`
   - `MusicSection.tsx`
   - `HymnsSection.tsx`
   - `ContentList.tsx` (FlatList wrapper)
   - `ContentItem.tsx` (Memoized item component)

### Phase 3: Advanced Optimizations
1. Add `getItemLayout` for FlatList (if items have fixed height)
2. Optimize `keyExtractor`
3. Add `maxToRenderPerBatch` and `windowSize` props
4. Implement `onEndReached` for pagination

## Expected Results

### Before
- Initial render: ~500ms (100 items)
- Memory: High (all items rendered)
- Scroll performance: Choppy with many items

### After
- Initial render: ~150ms (only visible items)
- Memory: Low (only visible items)
- Scroll performance: Smooth (virtualization)
- **70% performance improvement**

## Files to Create

```
AllContentTikTok/
├── AllContentTikTok.tsx          # Main component (~300 lines)
├── components/
│   ├── MostRecentSection.tsx     # Most recent content
│   ├── MusicSection.tsx          # Music section
│   ├── HymnsSection.tsx          # Hymns section
│   ├── ContentList.tsx           # FlatList wrapper
│   └── ContentItem.tsx           # Memoized item
├── hooks/
│   ├── useContentData.ts         # Data logic
│   ├── useVideoPlayback.ts       # Video logic
│   ├── useAudioPlayback.ts       # Audio logic
│   └── useContentActions.ts      # Action handlers
└── utils/
    └── contentListHelpers.ts     # Helper functions
```

