import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  ListRenderItem,
  ViewStyle,
} from "react-native";
import { MediaItem } from "../../../../shared/types";
import { UI_CONFIG } from "../../../../shared/constants";
import { getContentKey } from "../../../../shared/utils";

interface ContentListProps {
  data: MediaItem[];
  renderItem: (item: MediaItem, index: number) => React.ReactElement;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  onScroll?: (event: any) => void;
  onScrollEndDrag?: () => void;
  onMomentumScrollEnd?: () => void;
  contentContainerStyle?: ViewStyle;
  scrollEnabled?: boolean;
  showsVerticalScrollIndicator?: boolean;
}

/**
 * Optimized FlatList wrapper for content rendering
 * Provides virtualization for better performance with large lists
 */
export const ContentList: React.FC<ContentListProps> = React.memo(
  ({
    data,
    renderItem,
    ListHeaderComponent,
    ListFooterComponent,
    refreshing = false,
    onRefresh,
    onScroll,
    onScrollEndDrag,
    onMomentumScrollEnd,
    contentContainerStyle,
    scrollEnabled = true,
    showsVerticalScrollIndicator = true,
  }) => {
    // Memoize key extractor for performance
    const keyExtractor = useCallback(
      (item: MediaItem, index: number) => {
        return getContentKey(item) || `content-${index}`;
      },
      []
    );

    // Memoize the render item function
    const renderItemMemoized = useCallback<ListRenderItem<MediaItem>>(
      ({ item, index }) => {
        return renderItem(item, index);
      },
      [renderItem]
    );

    // Optimize FlatList performance props
    const performanceProps = useMemo(
      () => ({
        // Only render 10 items initially
        initialNumToRender: 10,
        // Render 10 items per batch
        maxToRenderPerBatch: 10,
        // Window size for virtualization
        windowSize: 10,
        // Remove clipped subviews for better performance
        removeClippedSubviews: true,
        // Update cells batch size
        updateCellsBatchingPeriod: 50,
        // Get item layout for better scroll performance (if items have consistent height)
        // getItemLayout can be added if item heights are known
      }),
      []
    );

    return (
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItemMemoized}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[UI_CONFIG.COLORS.PRIMARY]}
              tintColor={UI_CONFIG.COLORS.PRIMARY}
            />
          ) : undefined
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentContainerStyle={[
          {
            paddingBottom: UI_CONFIG.SPACING.LG,
          },
          contentContainerStyle,
        ]}
        // Performance optimizations
        {...performanceProps}
      />
    );
  }
);

ContentList.displayName = "ContentList";

