import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  View,
} from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";
import type { ContentType, MediaItem } from "../../../../shared/types";
import { ContentFeedHeader } from "./ContentFeedHeader";

const FeedList = FlashList as any;

type Props = {
  activeTab: ContentType | "ALL";
  rest: MediaItem[];
  mostRecentItem: MediaItem | null;
  firstFour: MediaItem[];
  filteredMediaListLength: number;
  currentlyVisibleVideo: string | null;
  getContentKey: (item: MediaItem) => string;
  renderContentByType: (
    item: MediaItem,
    index: number,
    ignored?: boolean
  ) => React.ReactElement | null;
  refreshing: boolean;
  onRefresh: () => void;
  onScroll: (...args: any[]) => void;
  onScrollEnd: (...args: any[]) => void;
  setListHostRef: (node: View | null) => void;
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
  /** Lock scroll while comment sheet is open (IG/TikTok) */
  scrollEnabled?: boolean;
};

export function AllContentTikTokList({
  activeTab,
  rest,
  mostRecentItem,
  firstFour,
  filteredMediaListLength,
  currentlyVisibleVideo,
  getContentKey,
  renderContentByType,
  refreshing,
  onRefresh,
  onScroll,
  onScrollEnd,
  setListHostRef,
  onEndReached,
  isFetchingNextPage,
  scrollEnabled = true,
}: Props) {
  const listHeaderComponent = useMemo(
    () => (
      <ContentFeedHeader
        mostRecentItem={mostRecentItem}
        contentType={activeTab}
        filteredMediaListLength={filteredMediaListLength}
        firstFour={firstFour}
        currentlyVisibleVideo={currentlyVisibleVideo}
        getContentKey={getContentKey}
        renderContentByType={renderContentByType}
      />
    ),
    [
      mostRecentItem,
      activeTab,
      filteredMediaListLength,
      firstFour,
      currentlyVisibleVideo,
      getContentKey,
      renderContentByType,
    ]
  );

  const renderListItem = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => {
      return renderContentByType(item, index + firstFour.length + 1);
    },
    [renderContentByType, firstFour.length]
  );

  const keyExtractor = useCallback(
    (item: MediaItem) => getContentKey(item),
    [getContentKey]
  );

  const listFooterComponent = useMemo(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={{ paddingVertical: 24, alignItems: "center" }}>
        <ActivityIndicator color={UI_CONFIG.COLORS.PRIMARY} />
      </View>
    );
  }, [isFetchingNextPage]);

  return (
    <View style={{ flex: 1 }} ref={setListHostRef} collapsable={false}>
      <FeedList
        data={rest}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeaderComponent}
        ListFooterComponent={listFooterComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[UI_CONFIG.COLORS.PRIMARY]}
            tintColor={UI_CONFIG.COLORS.PRIMARY}
          />
        }
        showsVerticalScrollIndicator={true}
        scrollEnabled={scrollEnabled}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEnd}
        onMomentumScrollEnd={onScrollEnd}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        scrollEventThrottle={16}
        estimatedItemSize={500}
        keyboardShouldPersistTaps="handled"
        overscan={500}
      />
    </View>
  );
}
