/**
 * Reelsviewscroll - Main Reels screen
 * Fully modularized and performance optimized.
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FlatList, StatusBar, StyleSheet, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import {
  useFullscreenBackInterceptor,
} from "../../src/features/media/video-feed";
import { suspendFeedDecoders } from "../../src/features/media/video-feed/feedDecoderGate";
import ErrorBoundary from "../components/ErrorBoundary";
import { navigateMainTab } from "../utils/navigation";
import { dismissReadingNarration } from "../../src/shared/audio/dismissReadingNarration";
import { ReelsDescriptionEditor } from "./components/ReelsDescriptionEditor";
import { ReelsErrorView } from "./components/ReelsErrorView";
import { ReelsModals } from "./components/ReelsModals";
import { ReelsVideoItem } from "./components/ReelsVideoItem";
import { markReelTouchMoved, registerReelScrollGuard } from "./reelAudible";
import SuccessCard from "../components/SuccessCard";

const ReelsView = () => {
  const o = useReelsOrchestrator();
  const flatListRef = useRef<FlatList>(null);
  const landedRef = useRef(false);
  const initialIndex = Math.max(0, o.currentIndex_state || 0);
  const cellHeightSv = useSharedValue(0);
  const countSv = useSharedValue(0);
  const lastIndexSv = useSharedValue(-1);
  const openingIndexSv = useSharedValue(0);
  const armedSv = useSharedValue(0);
  const prevOffsetSv = useSharedValue(0);
  const scrollGuardSv = useSharedValue(0);
  const openingCapturedRef = useRef(false);
  // Window height is taller than the list on Android, so sizing cells from
  // it shoved the video and title under the bottom nav, then a later layout
  // pass jumped the pager into the black gap between pages.
  const [viewport, setViewport] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const cellWidth = viewport?.width || o.responsive.screenWidth;
  const cellHeight = viewport?.height || 0;

  const onScreenLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      if (!(width > 0) || !(height > 0)) return;
      setViewport((prev) => prev ?? { width, height });
    },
    []
  );

  // Land once, after the list has its real height. Repeating this on every
  // height tweak snapped the pager off the video and left a black screen.
  useEffect(() => {
    if (!viewport || landedRef.current || o.allVideos.length === 0) return;
    const pending = o.pendingStartIndexRef?.current;
    const index = Math.min(
      Math.max(0, pending ?? o.currentIndex_state),
      o.allVideos.length - 1
    );
    landedRef.current = true;
    requestAnimationFrame(() => {
      try {
        flatListRef.current?.scrollToIndex({
          index,
          animated: false,
        });
      } catch {
        /* getItemLayout may not be ready yet */
      }
      if (o.pendingStartIndexRef) o.pendingStartIndexRef.current = null;
    });
  }, [viewport, o.allVideos.length, o.currentIndex_state, o.pendingStartIndexRef]);

  // Hardware back exits fullscreen before the root app-exit prompt.
  useFullscreenBackInterceptor(o.handlers.handleBackNavigation);

  useEffect(() => {
    dismissReadingNarration();
    // Feed cards must release their decoders before this screen creates any.
    suspendFeedDecoders();
  }, []);

  const commitVisibleIndex = o.scroll.commitVisibleIndex;
  const commitIndex = useCallback(
    (index: number) => {
      commitVisibleIndex(index);
    },
    [commitVisibleIndex]
  );

  useEffect(() => {
    cellHeightSv.value = cellHeight;
    countSv.value = o.allVideos.length;
    if (!openingCapturedRef.current && cellHeight > 0 && o.allVideos.length > 0) {
      openingCapturedRef.current = true;
      const opening = Math.min(
        Math.max(0, o.currentIndex_state || 0),
        o.allVideos.length - 1
      );
      openingIndexSv.value = opening;
      prevOffsetSv.value = opening * cellHeight;
    }
  }, [
    cellHeight,
    cellHeightSv,
    countSv,
    o.allVideos.length,
    o.currentIndex_state,
    openingIndexSv,
    prevOffsetSv,
  ]);

  useEffect(() => {
    return registerReelScrollGuard(() => {
      scrollGuardSv.value = 0;
    });
  }, [scrollGuardSv]);

  const onReelScroll = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        const height = cellHeightSv.value;
        const count = countSv.value;
        if (!(height > 0) || !(count > 0)) return;
        const offsetY = event.contentOffset.y;
        const opening = openingIndexSv.value;
        if (armedSv.value === 0) {
          const nearOpening = Math.abs(offsetY - opening * height) < height * 0.35;
          const nearZero = Math.abs(offsetY) < height * 0.35;
          // The list reports 0 before scrollToIndex lands on the opened reel.
          if (opening > 0 && nearZero && !nearOpening) return;
          armedSv.value = 1;
        }
        const page = offsetY / height;
        const index = Math.max(0, Math.min(count - 1, Math.round(page)));
        if (
          scrollGuardSv.value === 0 &&
          Math.abs(offsetY - prevOffsetSv.value) > 8
        ) {
          scrollGuardSv.value = 1;
          runOnJS(markReelTouchMoved)();
        }
        prevOffsetSv.value = offsetY;
        if (index === lastIndexSv.value) return;
        lastIndexSv.value = index;
        runOnJS(commitIndex)(index);
      },
    },
    [commitIndex]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isActive = index === o.currentIndex_state;
      return (
        <View
          collapsable={false}
          style={{
            height: cellHeight,
            width: cellWidth,
            backgroundColor: "#000",
          }}
        >
          <ReelsVideoItem
            videoData={item}
            index={index}
            isActive={isActive}
            videoRefs={o.videoRefs}
            screenHeight={cellHeight}
            screenWidth={cellWidth}
            isIOS={o.responsive.isIOS}
            currentIndex_state={o.currentIndex_state}
            videoDuration={o.videoDuration}
            videoPosition={o.videoPosition}
            isDragging={o.isDragging}
            showPauseOverlay={o.showPauseOverlay}
            userHasManuallyPaused={o.userHasManuallyPaused}
            modalKey={o.current.modalKey}
            currentVideo={o.current.currentVideo}
            video={o.current.video}
            enrichedVideoData={o.current.currentVideo}
            activeIsLiked={o.activeIsLiked}
            activeLikesCount={o.activeLikesCount}
            canUseBackendLikes={o.current.canUseBackendLikes}
            videoStats={o.videoStats}
            libraryStore={o.libraryStore}
            getSpeakerName={o.current.getSpeakerName}
            getResponsiveSize={o.responsive.getResponsiveSize}
            getResponsiveSpacing={o.responsive.getResponsiveSpacing}
            getResponsiveFontSize={o.responsive.getResponsiveFontSize}
            getTouchTargetSize={o.responsive.getTouchTargetSize}
            onToggleVideoPlay={o.toggleVideoPlay}
            onSeek={o.playback.seekToPosition}
            onToggleMute={o.playback.toggleMute}
            onLike={o.handlers.handleLike}
            onComment={o.handlers.handleComment}
            onSave={o.handlers.handleSave}
            onShare={o.handlers.handleShare}
            onViewDetails={o.handlers.handleViewDetails}
            onDownload={o.handlers.handleDownloadAction}
            onDelete={o.handlers.openDeleteModal}
            onReport={o.handlers.handleReport}
            onMenuToggle={() => o.setMenuVisible((v) => !v)}
            onMenuClose={() => o.setMenuVisible(false)}
            setIsDragging={o.setIsDragging}
            setVideoDuration={o.setVideoDuration}
            setVideoPosition={o.setVideoPosition}
            triggerHapticFeedback={o.triggerHapticFeedback}
            formatTime={o.playback.formatTime}
            globalVideoStore={o.globalVideoStore}
            source={o.params.source}
            menuVisible={o.menuVisible}
            isOwner={o.isOwner}
            checkIfDownloaded={o.checkIfDownloaded}
            currentUser={o.currentUser}
            getAvatarUrl={o.getAvatarUrl}
            canEditDescription={o.descriptionEdit.canEdit}
            onEditDescription={o.descriptionEdit.openEditor}
          />
        </View>
      );
    },
    [o, cellHeight, cellWidth]
  );

  if (o.hasError) {
    return (
      <ReelsErrorView
        errorMessage={o.errorMessage}
        onRetry={() => {
          o.setHasError(false);
          o.setErrorMessage("");
        }}
        onGoBack={o.handlers.handleBackNavigation}
      />
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.screen} onLayout={onScreenLayout}>
      {viewport && cellHeight > 0 ? (
      <Animated.FlatList
        ref={flatListRef}
        data={o.allVideos}
        extraData={`${o.currentIndex_state}:${cellHeight}:${cellWidth}:${o.activeIsLiked}:${o.activeIsSaved}`}
        renderItem={renderItem}
        keyExtractor={(item, index) => `reel-${item._id || item.id || index}`}
        pagingEnabled
        scrollEnabled={!o.isDragging}
        showsVerticalScrollIndicator={false}
        viewabilityConfigCallbackPairs={o.scroll.viewabilityConfigCallbackPairs as any}
        initialScrollIndex={
          o.allVideos.length > 0
            ? Math.min(initialIndex, o.allVideos.length - 1)
            : 0
        }
        getItemLayout={(_, index) => ({
          length: cellHeight,
          offset: cellHeight * index,
          index,
        })}
        // Keep previous + current + next cells attached. windowSize 2 only
        // overscans half a viewport, so the previous full-screen reel was
        // recycled and showed its thumbnail on the way back up.
        removeClippedSubviews={false}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEventThrottle={16}
        onScroll={onReelScroll}
        style={styles.list}
      />
      ) : (
        <View style={styles.list} />
      )}

      <ReelsModals
        currentVideo={o.current.currentVideo}
        title={o.params.title}
        isIOS={o.responsive.isIOS}
        activeTab={o.activeTab}
        showDeleteModal={o.showDeleteModal}
        showReportModal={o.showReportModal}
        showDetailsModal={o.showDetailsModal}
        onBackPress={o.handlers.handleBackNavigation}
        onTabChange={(tab) => {
          o.triggerHapticFeedback();
          if (tab === "Home") {
            o.handlers.handleBackNavigation();
            return;
          }
          o.handlers.persistFeedResumeFromReels();
          o.setActiveTab(tab);
          navigateMainTab(tab as any);
        }}
        onCloseDelete={o.closeDeleteModal}
        onDeleteSuccess={o.handleDeleteSuccessUi}
        onCloseReport={() => o.setShowReportModal(false)}
        onCloseDetails={() => o.setShowDetailsModal(false)}
        getResponsiveSpacing={o.responsive.getResponsiveSpacing}
        getResponsiveSize={o.responsive.getResponsiveSize}
        getTouchTargetSize={o.responsive.getTouchTargetSize}
      />

      <ReelsDescriptionEditor
        visible={o.descriptionEdit.isEditing}
        initialValue={String(o.current.currentVideo?.description || "")}
        isSaving={o.descriptionEdit.isSaving}
        error={o.descriptionEdit.error}
        onCancel={o.descriptionEdit.closeEditor}
        onSubmit={o.descriptionEdit.submit}
      />

      {o.showSuccessCard ? (
        <SuccessCard
          message={o.successMessage}
          onClose={() => o.setShowSuccessCard(false)}
          duration={3000}
        />
      ) : null}
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  list: {
    flex: 1,
    backgroundColor: "#000",
  },
});

export default memo(ReelsView);
