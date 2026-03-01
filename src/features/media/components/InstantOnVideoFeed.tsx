/**
 * Instant-On Video Feed Component
 * 
 * Features:
 * - FlashList for 60fps view recycling
 * - Synchronous cache hydration from MMKV
 * - Thumbnail-first rendering (no black screens)
 * - Zero loading spinners
 * - Optimized for tab switching with freezeOnBlur
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ViewToken,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { FlashList, ListRenderItem, FlashListProps, FlashListRef } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useReportReady } from '../../../core/app/AppEntry';
import { getPersistedQueryData } from '../../../core/storage/queryCachePersistence';
import { MediaItem } from '../../../shared/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIDEO_ITEM_HEIGHT = SCREEN_HEIGHT * 0.75; // 75% of screen height

// Query key for video feed
const VIDEO_FEED_QUERY_KEY = ['video-feed', 'all'];

interface InstantOnVideoFeedProps {
  /** Callback when a video becomes visible */
  onVideoVisible?: (video: MediaItem, index: number) => void;
  /** Callback when video is tapped */
  onVideoTap?: (video: MediaItem, index: number) => void;
  /** Custom render for video item (optional) */
  renderItem?: ListRenderItem<MediaItem>;
  /** Additional FlashList props */
  flashListProps?: Partial<FlashListProps<MediaItem>>;
  /** Content type filter */
  contentType?: 'ALL' | 'VIDEO' | 'AUDIO';
}

/**
 * Video Item Component with Thumbnail-First Rendering
 * Shows thumbnail immediately, video loads in background
 */
interface VideoItemProps {
  item: MediaItem;
  index: number;
  isVisible: boolean;
  onTap: (item: MediaItem, index: number) => void;
}

const VideoItem: React.FC<VideoItemProps> = React.memo(({
  item,
  index,
  isVisible,
  onTap,
}) => {
  const [videoReady, setVideoReady] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  
  // Get thumbnail URL from item
  const thumbnailSource = useMemo((): ImageSourcePropType => {
    const url = item.imageUrl || item.thumbnailUrl;
    if (!url) return { uri: '' };
    if (typeof url === 'string') return { uri: url };
    return url;
  }, [item.imageUrl, item.thumbnailUrl]);
  
  // Get video URL
  const videoUrl = useMemo(() => {
    return item.fileUrl || (item as any).playbackUrl || '';
  }, [item.fileUrl]);
  
  const handleTap = useCallback(() => {
    onTap(item, index);
  }, [item, index, onTap]);
  
  return (
    <View style={styles.videoItemContainer}>
      {/* Thumbnail - Always visible first */}
      {!videoReady && (
        <View style={styles.thumbnailContainer}>
          <Image
            source={thumbnailSource}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
            onLoad={() => setThumbnailLoaded(true)}
            cachePolicy="memory-disk"
            priority={index < 3 ? 'high' : 'normal'}
          />
          
          {/* Subtle loading indicator on thumbnail */}
          {!thumbnailLoaded && (
            <View style={styles.thumbnailPlaceholder} />
          )}
        </View>
      )}
      
      {/* Video Player - Rendered but hidden until ready */}
      {isVisible && videoUrl && (
        <View style={[styles.videoPlayer, !videoReady && styles.videoPlayerHidden]}>
          {/* 
            Video player would go here - using expo-video or react-native-video
            For now, we show the thumbnail until video is ready
          */}
        </View>
      )}
      
      {/* Touch overlay for interaction */}
      <View style={styles.touchOverlay} onTouchEnd={handleTap} />
    </View>
  );
});

VideoItem.displayName = 'VideoItem';

/**
 * Instant-On Video Feed
 * Uses FlashList for optimal performance with synchronous cache hydration
 */
export const InstantOnVideoFeed: React.FC<InstantOnVideoFeedProps> = ({
  onVideoVisible,
  onVideoTap,
  renderItem: customRenderItem,
  flashListProps,
  contentType = 'ALL',
}) => {
  const { reportFlashListReady } = useReportReady();
  const queryClient = useQueryClient();
  const flashListRef = useRef<FlashListRef<MediaItem> | null>(null);
  
  // Track currently visible items
  const [visibleItemIds, setVisibleItemIds] = useState<Set<string>>(new Set());
  const visibleItemIdsRef = useRef<Set<string>>(new Set());
  
  // Get cached data synchronously for instant render
  const cachedData = useMemo(() => {
    return getPersistedQueryData<{ media: MediaItem[]; total: number }>(
      VIDEO_FEED_QUERY_KEY,
      30 // 30 minute max age
    );
  }, []);
  
  // Fetch video feed data
  const {
    data: queryData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: VIDEO_FEED_QUERY_KEY,
    queryFn: async () => {
      // Import API dynamically to avoid circular dependencies
      const { mediaApi } = await import('../../../core/api/MediaApi');
      const { transformApiResponseToMediaItem } = await import('../../../shared/utils');
      
      const response = await mediaApi.getAllContentPublic({
        page: 1,
        limit: 50,
        contentType: contentType === 'ALL' ? undefined : contentType,
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch content');
      }
      
      const media = (response.media || [])
        .map(item => transformApiResponseToMediaItem(item))
        .filter((item): item is MediaItem => item !== null && item !== undefined);
      
      return {
        media,
        total: response.total || response.pagination?.total || media.length,
      };
    },
    // Use cached data immediately if available
    initialData: cachedData || undefined,
    // Don't show loading state if we have cached data
    placeholderData: cachedData || undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
  
  const media = queryData?.media || [];
  
  // Report FlashList ready after initial render
  useEffect(() => {
    // Small delay to ensure FlashList has rendered
    const timer = setTimeout(() => {
      reportFlashListReady();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [reportFlashListReady]);
  
  // Handle viewability changes
  const onViewableItemsChanged = useCallback(({
    viewableItems,
  }: {
    viewableItems: ViewToken<MediaItem>[];
  }) => {
    const newVisibleIds = new Set(viewableItems.map(v => v.item._id || v.key));
    
    // Only update if changed
    const currentIds = visibleItemIdsRef.current;
    const hasChanged = 
      newVisibleIds.size !== currentIds.size ||
      [...newVisibleIds].some(id => !currentIds.has(id));
    
    if (hasChanged) {
      visibleItemIdsRef.current = newVisibleIds;
      setVisibleItemIds(newVisibleIds);
      
      // Notify parent of visible video
      if (viewableItems.length > 0 && onVideoVisible) {
        const firstVisible = viewableItems[0];
        onVideoVisible(firstVisible.item, firstVisible.index || 0);
      }
    }
  }, [onVideoVisible]);
  
  // Viewability config
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60, // 60% visible to count
    minimumViewTime: 200, // 200ms minimum
  }).current;
  
  // Default render item
  const defaultRenderItem: ListRenderItem<MediaItem> = useCallback(({ item, index }) => {
    const isVisible = visibleItemIds.has(item._id || String(index));
    
    return (
      <VideoItem
        item={item}
        index={index}
        isVisible={isVisible}
        onTap={onVideoTap || (() => {})}
      />
    );
  }, [visibleItemIds, onVideoTap]);
  
  // Key extractor
  const keyExtractor = useCallback((item: MediaItem, index: number) => {
    return item._id || `video-${index}`;
  }, []);
  
  // Get item layout for performance
  const getItemLayout = useCallback((data: ArrayLike<MediaItem> | null | undefined, index: number) => ({
    length: VIDEO_ITEM_HEIGHT,
    offset: VIDEO_ITEM_HEIGHT * index,
    index,
  }), []);
  
  // Render empty state (no spinner - just blank or cached content)
  const renderEmptyComponent = useCallback(() => {
    if (cachedData?.media?.length) {
      return null; // Already showing cached content
    }
    return (
      <View style={styles.emptyContainer}>
        {/* No spinner - just empty space until content loads */}
      </View>
    );
  }, [cachedData]);
  
  return (
    <View style={styles.container}>
      <FlashList
        ref={flashListRef}
        data={media}
        renderItem={customRenderItem || defaultRenderItem}
        keyExtractor={keyExtractor}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
        {...flashListProps}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoItemContainer: {
    width: SCREEN_WIDTH,
    height: VIDEO_ITEM_HEIGHT,
    backgroundColor: '#000',
  },
  thumbnailContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
  },
  videoPlayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  videoPlayerHidden: {
    opacity: 0,
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default InstantOnVideoFeed;
