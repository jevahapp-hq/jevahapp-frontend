/**
 * InstantVideoFeed - Optimized FlashList video feed with no thumbnails
 * 
 * Key features:
 * - Uses @shopify/flash-list for optimal virtualization
 * - No thumbnails - videos render immediately
 * - Synchronous data hydration from MMKV
 * - Optimized for instant-on experience
 */
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, View, ViewToken } from 'react-native';
import type { MediaItem } from '../../../shared/types';
import { getContentKey } from '../../../shared/utils';
import { useInstantOn } from '../context/InstantOnContext';
import { useInstantOnStorage } from '../hooks/useInstantOnStorage';
import { InstantVideoPlayer } from './InstantVideoPlayer';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InstantVideoFeedProps {
  /** Function to fetch videos from API */
  fetchVideos: () => Promise<MediaItem[]>;
  /** Query key for react-query */
  queryKey: string[];
  /** Callback when video is tapped */
  onVideoTap?: (key: string, video: MediaItem, index: number) => void;
  /** Callback when play/pause is toggled */
  onTogglePlay?: (key: string) => void;
  /** Callback when mute is toggled */
  onToggleMute?: (key: string) => void;
  /** Whether to enable auto-play */
  autoPlay?: boolean;
  /** Initial mute state */
  initialMute?: boolean;
  /** Header component */
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  /** Empty component */
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  /** Callback when end is reached */
  onEndReached?: () => void;
  /** Callback on refresh */
  onRefresh?: () => void;
  /** Whether refreshing */
  refreshing?: boolean;
}

interface VideoItemProps {
  video: MediaItem;
  index: number;
  isVisible: boolean;
  isActive: boolean;
  videoUrl: string;
  onTap?: (key: string, video: MediaItem, index: number) => void;
  onTogglePlay?: (key: string) => void;
}

const VideoItem = memo(({ 
  video, 
  index, 
  isVisible, 
  isActive, 
  videoUrl,
  onTap, 
  onTogglePlay 
}: VideoItemProps) => {
  const videoKey = getContentKey(video);

  return (
    <View style={{ height: SCREEN_HEIGHT }}>
      <InstantVideoPlayer
        video={video}
        videoKey={videoKey}
        index={index}
        isVisible={isVisible}
        isActive={isActive}
        videoUrl={videoUrl}
        onTap={onTap}
        onTogglePlay={onTogglePlay}
      />
    </View>
  );
}, (prev, next) => {
  // Custom comparison for performance
  return (
    prev.isVisible === next.isVisible &&
    prev.isActive === next.isActive &&
    prev.videoUrl === next.videoUrl &&
    prev.index === next.index
  );
});

VideoItem.displayName = 'VideoItem';

export const InstantVideoFeed: React.FC<InstantVideoFeedProps> = ({
  fetchVideos,
  queryKey,
  onVideoTap,
  onTogglePlay,
  onToggleMute,
  autoPlay = true,
  initialMute = true,
  ListHeaderComponent,
  ListEmptyComponent,
  onEndReached,
  onRefresh,
  refreshing = false,
}) => {
  const { isDataHydrated, markDataHydrated } = useInstantOn();
  const [currentlyVisibleIndex, setCurrentlyVisibleIndex] = useState<number>(0);
  const [activeVideoKey, setActiveVideoKey] = useState<string | null>(null);
  const [mutedVideos, setMutedVideos] = useState<Record<string, boolean>>({});
  const listRef = useRef<any>(null);

  // Get videos with synchronous hydration
  const { videos, isLoading, isHydrated } = useInstantOnStorage({
    queryKey,
    fetchFn: fetchVideos,
    enabled: true,
  });

  // Mark data as hydrated when ready
  useEffect(() => {
    if (isHydrated && !isDataHydrated) {
      markDataHydrated();
    }
  }, [isHydrated, isDataHydrated, markDataHydrated]);

  // Set first video as active when data is available
  useEffect(() => {
    if (videos.length > 0 && !activeVideoKey) {
      const firstKey = getContentKey(videos[0]);
      setActiveVideoKey(firstKey);
    }
  }, [videos, activeVideoKey]);

  // Handle viewability changes
  const onViewableItemsChanged = useCallback(({ 
    viewableItems 
  }: { 
    viewableItems: ViewToken[] 
  }) => {
    if (viewableItems.length > 0) {
      const firstVisible = viewableItems[0];
      const index = firstVisible.index ?? 0;
      setCurrentlyVisibleIndex(index);
      
      if (firstVisible.item) {
        const key = getContentKey(firstVisible.item as MediaItem);
        setActiveVideoKey(key);
      }
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 200,
  }).current;

  // Get video URL from media item
  const getVideoUrl = useCallback((video: MediaItem): string => {
    // Handle different URL formats
    const url = video.fileUrl || (video as any).videoUrl || (video as any).url || '';
    return url;
  }, []);

  // Render item for FlashList
  const renderItem: ListRenderItem<MediaItem> = useCallback(({ item, index }) => {
    const videoKey = getContentKey(item);
    const isVisible = index === currentlyVisibleIndex;
    const isActive = autoPlay && videoKey === activeVideoKey;
    const videoUrl = getVideoUrl(item);

    return (
      <VideoItem
        video={item}
        index={index}
        isVisible={isVisible}
        isActive={isActive}
        videoUrl={videoUrl}
        onTap={onVideoTap}
        onTogglePlay={onTogglePlay}
      />
    );
  }, [currentlyVisibleIndex, activeVideoKey, autoPlay, getVideoUrl, onVideoTap, onTogglePlay]);

  // Key extractor
  const keyExtractor = useCallback((item: MediaItem) => {
    return getContentKey(item);
  }, []);

  // Get item layout for performance
  const getItemLayout = useCallback((data: ArrayLike<MediaItem> | null | undefined, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  }), []);

  // Toggle mute for a video
  const handleToggleMute = useCallback((key: string) => {
    setMutedVideos(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    onToggleMute?.(key);
  }, [onToggleMute]);

  // Estimated item size for FlashList
  const estimatedItemSize = SCREEN_HEIGHT;

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <FlashList
        ref={listRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        horizontal={false}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        onRefresh={onRefresh}
        refreshing={refreshing}
        // Performance optimizations
        removeClippedSubviews={true}
        // Maintain visible content position
        maintainVisibleContentPosition={{
          autoscrollToTopThreshold: 0,
        }}
        // Snap to items for TikTok-like feel
        snapToOffsets={videos.map((_, i) => i * SCREEN_HEIGHT)}
        decelerationRate="fast"
        scrollEventThrottle={16}
      />
    </View>
  );
};

export default InstantVideoFeed;
