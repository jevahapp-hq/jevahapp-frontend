import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useMemo } from "react";
import { RefreshControl, View } from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";
import { detectMediaType, isAudioSermon } from "../../../../shared/utils";
import { getFeedVideoRowSize } from "../../video-feed";
import type { FeedRow } from "../types";
import type { MediaItem } from "../../../../shared/types";
import { FeedSectionTitle } from "./FeedSectionTitle";
import { LiveComingSoonCard } from "./LiveComingSoonCard";

const FeedList = FlashList as any;

type Props = {
  listData: FeedRow[];
  mountedVideoKeys: Set<string>;
  currentlyVisibleVideo: string | null;
  currentlyPlayingVideo: string | null;
  isFeedActive: boolean;
  authorStoreVersion: number;
  commentsOpen: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  estimatedItemSize: number;
  liteActive: boolean;
  drawDistance: number;
  onEndReached: () => void;
  viewabilityConfigCallbackPairs: any;
  extraData?: unknown;
  renderContentByType: (
    item: MediaItem,
    index: number,
    shouldRenderPlayer?: boolean
  ) => React.ReactElement | null;
};

export function AllContentTikTokList({
  listData,
  mountedVideoKeys,
  currentlyVisibleVideo,
  currentlyPlayingVideo,
  isFeedActive,
  authorStoreVersion,
  commentsOpen,
  refreshing,
  onRefresh,
  estimatedItemSize,
  liteActive,
  drawDistance,
  onEndReached,
  viewabilityConfigCallbackPairs,
  renderContentByType,
}: Props) {
  const getItemType = useCallback((row: FeedRow) => {
    if (row.rowType !== "media") return row.rowType;
    if (isAudioSermon(row.item)) return "media-audio";
    const mediaType = detectMediaType(row.item);
    return mediaType === "video" ? "media-video" : "media-audio";
  }, []);

  const overrideItemLayout = useCallback(
    (layout: { size?: number }, row: FeedRow) => {
      if (row.rowType === "spacer") {
        layout.size = row.height;
        return;
      }
      if (row.rowType === "section-title") {
        layout.size = 48;
        return;
      }
      if (row.rowType === "coming-soon") {
        layout.size = 320;
        return;
      }
      if (row.rowType === "media") {
        if (!isAudioSermon(row.item) && detectMediaType(row.item) === "video") {
          layout.size = getFeedVideoRowSize({
            moderationStatus: (row.item as MediaItem)?.moderationStatus,
          });
        }
      }
    },
    []
  );

  const renderRow = useCallback(
    ({ item: row }: { item: FeedRow }) => {
      switch (row.rowType) {
        case "section-title":
          return <FeedSectionTitle title={row.title} />;
        case "coming-soon":
          return <LiveComingSoonCard />;
        case "spacer":
          return <View style={{ height: row.height }} />;
        case "media": {
          const shouldRenderPlayer =
            mountedVideoKeys.has(row.key) || currentlyVisibleVideo === row.key;
          return renderContentByType(
            row.item,
            row.renderIndex,
            shouldRenderPlayer
          );
        }
        default:
          return null;
      }
    },
    [renderContentByType, mountedVideoKeys, currentlyVisibleVideo]
  );

  const keyExtractor = useCallback((row: FeedRow) => row.key, []);

  const mountedPlayerSig = useMemo(
    () => Array.from(mountedVideoKeys).sort().join("|"),
    [mountedVideoKeys]
  );
  const feedExtraData = useMemo(
    () => ({
      visible: currentlyVisibleVideo,
      primed: mountedPlayerSig,
      playing: currentlyPlayingVideo,
      active: isFeedActive,
      authors: authorStoreVersion,
    }),
    [
      currentlyVisibleVideo,
      mountedPlayerSig,
      currentlyPlayingVideo,
      isFeedActive,
      authorStoreVersion,
    ]
  );

  return (
    <FeedList
      data={listData}
      renderItem={renderRow}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      overrideItemLayout={overrideItemLayout}
      extraData={feedExtraData}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[UI_CONFIG.COLORS.PRIMARY]}
          tintColor={UI_CONFIG.COLORS.PRIMARY}
        />
      }
      showsVerticalScrollIndicator={true}
      scrollEnabled={!commentsOpen}
      viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
      scrollEventThrottle={16}
      estimatedItemSize={estimatedItemSize || getFeedVideoRowSize()}
      keyboardShouldPersistTaps="handled"
      onEndReached={onEndReached}
      onEndReachedThreshold={0.75}
      removeClippedSubviews={liteActive}
      overscan={liteActive ? 280 : 800}
      drawDistance={liteActive ? drawDistance : 1600}
    />
  );
}
