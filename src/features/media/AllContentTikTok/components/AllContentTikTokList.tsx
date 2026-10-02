import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Platform, RefreshControl, useWindowDimensions, View } from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";
import { detectMediaType, isAudioSermon } from "../../../../shared/utils/mediaTypeDetection";
import { getFeedVideoRowSize, posterUriFromMedia } from "../../video-feed";
import {
  scrollSpeedIsFast,
  setFeedScrollingFast,
} from "../utils/feedScrollPace";
import type { FeedRow } from "../types";
import type { MediaItem } from "../../../../shared/types";
import { FeedSectionTitle } from "./FeedSectionTitle";
import { LiveComingSoonCard } from "./LiveComingSoonCard";

const FeedList = FlashList as any;

type Props = {
  listRef?: React.Ref<any>;
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
  listRef,
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
  const { width: viewportWidth } = useWindowDimensions();
  const rowSize = estimatedItemSize || getFeedVideoRowSize({ viewportWidth });
  /**
   * One row is ~550px. A 520px iOS window unmounts the next card during a
   * flick, so the category paints white until the cell catches up.
   */
  const iosBuffer = Math.round(rowSize * 3.5);
  const scrollYRef = useRef(0);
  const scrollTRef = useRef(0);
  const posterPrefetchAtRef = useRef(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settleFeedScroll = useCallback(() => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      setFeedScrollingFast(false);
    }, 140);
  }, []);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      setFeedScrollingFast(false);
    };
  }, []);

  const prefetchPostersAround = useCallback(
    (offsetY: number) => {
      const now = Date.now();
      if (now - posterPrefetchAtRef.current < 180) return;
      posterPrefetchAtRef.current = now;
      const start = Math.max(0, Math.floor(offsetY / rowSize) - 1);
      const urls: string[] = [];
      for (let i = start; i < start + 8 && i < listData.length; i++) {
        const row = listData[i];
        if (!row || row.rowType !== "media") continue;
        const uri = posterUriFromMedia(row.item);
        if (uri) urls.push(uri);
      }
      if (urls.length) void Image.prefetch(urls, "memory-disk");
    },
    [listData, rowSize]
  );

  const onFeedScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = event.nativeEvent.contentOffset.y;
      const now = Date.now();
      const dt = now - scrollTRef.current;
      const dy = y - scrollYRef.current;
      scrollYRef.current = y;
      scrollTRef.current = now;
      if (scrollSpeedIsFast(dy, dt)) {
        if (settleTimerRef.current) {
          clearTimeout(settleTimerRef.current);
          settleTimerRef.current = null;
        }
        setFeedScrollingFast(true);
      }
      prefetchPostersAround(y);
    },
    [prefetchPostersAround]
  );
  const getItemType = useCallback((row: FeedRow) => {
    if (row.rowType !== "media") return row.rowType;
    if (isAudioSermon(row.item)) return "media-audio";
    const mediaType = detectMediaType(row.item);
    if (mediaType === "ebook") return "media-ebook";
    if (mediaType === "audio") return "media-audio";
    return "media-video";
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
        // Videos always pin to the measured row. Music/ebooks also need the
        // extra when the under-review banner is showing, or FlashList clips it.
        layout.size = getFeedVideoRowSize({
          moderationStatus: (row.item as MediaItem)?.moderationStatus,
          viewportWidth,
        });
      }
    },
    [viewportWidth]
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
      viewportWidth,
    }),
    [
      currentlyVisibleVideo,
      mountedPlayerSig,
      currentlyPlayingVideo,
      isFeedActive,
      authorStoreVersion,
      viewportWidth,
    ]
  );

  return (
    <FeedList
      ref={listRef}
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
      onScroll={onFeedScroll}
      onScrollEndDrag={settleFeedScroll}
      onMomentumScrollEnd={settleFeedScroll}
      estimatedItemSize={rowSize}
      keyboardShouldPersistTaps="handled"
      onEndReached={onEndReached}
      onEndReachedThreshold={0.75}
      removeClippedSubviews={Platform.OS === "android" && liteActive}
      overscan={
        !isFeedActive ? 120 : Platform.OS === "ios" ? iosBuffer : liteActive ? 280 : 800
      }
      drawDistance={
        !isFeedActive
          ? 200
          : Platform.OS === "ios"
            ? iosBuffer
            : liteActive
              ? drawDistance
              : 1600
      }
    />
  );
}
