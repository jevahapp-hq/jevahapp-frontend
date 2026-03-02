# ContentCardFooter Component Usage Guide

**Location:** `app/components/ContentCardFooter.tsx`

## Overview

The `ContentCardFooter` component is a modular footer component that can be used across different card types:
- ✅ **ContentCard** (app/components/ContentCard.tsx)
- ✅ **VideoCard** (src/features/media/components/VideoCard.tsx)
- ✅ **MusicCard** (src/features/media/components/MusicCard.tsx)
- ✅ **EbookCard** (src/features/media/components/EbookCard.tsx)

## Features

- **Flexible Avatar Support**: Uses simple Image or enhanced AvatarWithInitialFallback
- **Author Info Display**: Shows avatar, name, and time ago
- **Live Stream Support**: Optional live indicator with animation
- **Stats Display**: Inline stats or custom children (CardFooterActions)
- **Customizable Menu**: Default ellipsis or custom menu button (ThreeDotsMenuButton)

---

## Usage Patterns

### Pattern 1: ContentCard (Inline Stats)

```typescript
import ContentCardFooter from "../components/ContentCardFooter";

<ContentCardFooter
  content={content}
  contentStats={contentStats}
  viewCount={mappedContent.viewCount}
  shareCount={mappedContent.shareCount}
  isLive={isLive}
  viewerCount={viewerCount}
  livePulseAnimation={livePulseAnimation}
  onShare={handleShare}
  onMenuPress={() => setModalVisible(!modalVisible)}
  getTimeAgo={getTimeAgo}
  // Default: showInlineStats={true}, useEnhancedAvatar={false}
/>
```

### Pattern 2: VideoCard/MusicCard/EbookCard (With CardFooterActions)

```typescript
import ContentCardFooter from "../../../../app/components/ContentCardFooter";
import CardFooterActions from "../../../shared/components/CardFooterActions";
import ThreeDotsMenuButton from "../../../shared/components/ThreeDotsMenuButton/ThreeDotsMenuButton";

<ContentCardFooter
  content={video} // or audio, ebook
  getTimeAgo={getTimeAgo}
  onMenuPress={() => {
    openModal();
    if (onModalToggle) {
      onModalToggle(modalKey);
    }
  }}
  useEnhancedAvatar={true}
  showInlineStats={false}
  containerClassName="flex-row items-center justify-between mt-2 px-2"
  menuButton={
    <View style={{ zIndex: 1001 }}>
      <ThreeDotsMenuButton onPress={...} />
    </View>
  }
>
  <CardFooterActions
    viewCount={viewCount}
    liked={!!userLikeState}
    likeCount={likeCount}
    likeBurstKey={likeBurstKey}
    onLike={handleLike}
    commentCount={commentCount}
    onComment={handleComment}
    saved={!!userSaveState}
    saveCount={saveCount}
    onSave={handleSave}
    onShare={handleShare}
    contentType="media"
    contentId={contentId}
    useEnhancedComponents={false}
    isLoading={isLoadingStats}
  />
</ContentCardFooter>
```

---

## Props Interface

```typescript
interface ContentCardFooterProps {
  content: any; // Content item with author info
  contentStats?: Record<string, any>; // Stats lookup
  viewCount?: number; // View count (if not using contentStats)
  shareCount?: number; // Share count (if not using contentStats)
  isLive?: boolean; // Show live indicator
  viewerCount?: number; // Live viewer count
  livePulseAnimation?: Animated.Value; // Animation for live indicator
  onShare: () => void; // Share handler
  onMenuPress: () => void; // Menu handler
  getTimeAgo: (createdAt: string) => string; // Time formatter function
  
  // Optional props
  useEnhancedAvatar?: boolean; // Use AvatarWithInitialFallback (default: false)
  menuButton?: React.ReactNode; // Custom menu button (default: ellipsis icon)
  showInlineStats?: boolean; // Show inline stats (default: true)
  containerClassName?: string; // Custom container className
  children?: React.ReactNode; // Custom content (e.g., CardFooterActions)
}
```

---

## Benefits

1. **Unified Footer Logic**: Single source of truth for footer structure
2. **Consistent UI**: Same author info display across all card types
3. **Flexible**: Supports different patterns (inline stats vs CardFooterActions)
4. **Maintainable**: Changes to footer logic in one place
5. **Reusable**: Easy to use in new card components

---

## Migration Notes

### For VideoCard/MusicCard/EbookCard

**Before:**
```typescript
<View className="flex-row items-center justify-between mt-2 px-2">
  <View className="flex flex-row items-center">
    <View className="w-10 h-10 rounded-full bg-gray-200...">
      <AvatarWithInitialFallback ... />
    </View>
    <View className="ml-3">
      <View className="flex-row items-center">
        <Text>{getUserDisplayNameFromContent(video)}</Text>
        <View className="flex flex-row mt-1 ml-2">
          <Ionicons name="time-outline" ... />
          <Text>{getTimeAgo(video.createdAt)}</Text>
        </View>
      </View>
      <CardFooterActions ... />
    </View>
  </View>
  <ThreeDotsMenuButton ... />
</View>
```

**After:**
```typescript
<ContentCardFooter
  content={video}
  getTimeAgo={getTimeAgo}
  onMenuPress={openModal}
  useEnhancedAvatar={true}
  showInlineStats={false}
  containerClassName="flex-row items-center justify-between mt-2 px-2"
  menuButton={<ThreeDotsMenuButton onPress={openModal} />}
>
  <CardFooterActions ... />
</ContentCardFooter>
```

---

## Exported Utilities

The component also exports a `getTimeAgo` utility function:

```typescript
import { getTimeAgo } from "../components/ContentCardFooter";

const timeAgo = getTimeAgo(content.createdAt); // "5MIN AGO", "2HRS AGO", etc.
```

This can be used in other components if needed.

