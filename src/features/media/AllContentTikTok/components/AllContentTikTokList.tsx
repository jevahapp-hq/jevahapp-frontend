import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";
import { getLiteListWindow } from "../../../../shared/lite/liteProfile";
import type { ContentType, MediaItem } from "../../../../shared/types";
import { LiveComingSoonCard } from "./LiveComingSoonCard";

const FeedList = FlashList as any;

export type FeedRow =
  | { kind: "section"; id: string; title: string }
  | { kind: "media"; id: string; item: MediaItem; mediaIndex: number }
  | { kind: "livePromo"; id: "live-promo" }
  | { kind: "spacer"; id: string; height: number };

type Props = {
  activeTab: ContentType | "ALL";
  rest: MediaItem[];
  mostRecentItem: MediaItem | null;
  firstFour: MediaItem[];
  filteredMediaListLength: number;
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

function buildFeedRows(params: {
  mostRecentItem: MediaItem | null;
  firstFour: MediaItem[];
  rest: MediaItem[];
  activeTab: ContentType | "ALL";
  filteredMediaListLength: number;
  getContentKey: (item: MediaItem) => string;
}): FeedRow[] {
  const {
    mostRecentItem,
    firstFour,
    rest,
    activeTab,
    filteredMediaListLength,
    getContentKey,
  } = params;
  const rows: FeedRow[] = [];
  let mediaIndex = 0;

  if (mostRecentItem) {
    rows.push({
      kind: "section",
      id: "section-most-recent",
      title: "Most Recent",
    });
    rows.push({
      kind: "media",
      id: `media-${getContentKey(mostRecentItem)}`,
      item: mostRecentItem,
      mediaIndex: mediaIndex++,
    });
  }

  const forYouTitle =
    activeTab === "ALL"
      ? `For You (${filteredMediaListLength})`
      : `${activeTab} · For You (${filteredMediaListLength})`;

  rows.push({
    kind: "section",
    id: "section-for-you",
    title: forYouTitle,
  });

  for (const item of firstFour) {
    rows.push({
      kind: "media",
      id: `media-${getContentKey(item)}`,
      item,
      mediaIndex: mediaIndex++,
    });
  }

  if (activeTab === "ALL" || activeTab === "live") {
    rows.push({ kind: "livePromo", id: "live-promo" });
  }

  rows.push({
    kind: "spacer",
    id: "spacer-after-promo",
    height: UI_CONFIG.SPACING.XXL,
  });

  for (const item of rest) {
    rows.push({
      kind: "media",
      id: `media-${getContentKey(item)}`,
      item,
      mediaIndex: mediaIndex++,
    });
  }

  return rows;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
        fontWeight: "600",
        color: UI_CONFIG.COLORS.TEXT_PRIMARY,
        paddingHorizontal: UI_CONFIG.SPACING.MD,
        marginTop: UI_CONFIG.SPACING.LG,
        marginBottom: UI_CONFIG.SPACING.MD,
      }}
    >
      {title}
    </Text>
  );
}

export function AllContentTikTokList({
  activeTab,
  rest,
  mostRecentItem,
  firstFour,
  filteredMediaListLength,
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
  const feedRows = useMemo(
    () =>
      buildFeedRows({
        mostRecentItem,
        firstFour,
        rest,
        activeTab,
        filteredMediaListLength,
        getContentKey,
      }),
    [
      mostRecentItem,
      firstFour,
      rest,
      activeTab,
      filteredMediaListLength,
      getContentKey,
    ]
  );

  const renderListItem = useCallback(
    ({ item: row }: { item: FeedRow }) => {
      if (row.kind === "section") {
        return <SectionHeader title={row.title} />;
      }
      if (row.kind === "livePromo") {
        return <LiveComingSoonCard />;
      }
      if (row.kind === "spacer") {
        return <View style={{ height: row.height }} />;
      }
      return renderContentByType(row.item, row.mediaIndex);
    },
    [renderContentByType]
  );

  const keyExtractor = useCallback((row: FeedRow) => row.id, []);

  const getItemType = useCallback((row: FeedRow) => row.kind, []);

  const listFooterComponent = useMemo(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={{ paddingVertical: 24, alignItems: "center" }}>
        <ActivityIndicator color={UI_CONFIG.COLORS.PRIMARY} />
      </View>
    );
  }, [isFetchingNextPage]);

  const listWindow = getLiteListWindow();

  return (
    <View style={{ flex: 1 }} ref={setListHostRef} collapsable={false}>
      <FeedList
        data={feedRows}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
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
        estimatedItemSize={listWindow.estimatedItemSize}
        keyboardShouldPersistTaps="handled"
        drawDistance={listWindow.drawDistance}
      />
    </View>
  );
}
