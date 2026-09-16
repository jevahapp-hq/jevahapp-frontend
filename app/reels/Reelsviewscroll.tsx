/**
 * Reelsviewscroll - Main Reels screen
 * Fully modularized and performance optimized.
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FlatList, StatusBar, StyleSheet, View } from "react-native";
import ErrorBoundary from "../components/ErrorBoundary";
import { navigateMainTab } from "../utils/navigation";
import { useFullscreenBackInterceptor } from "../../src/features/media/video-feed";
import { ReelsDescriptionEditor } from "./components/ReelsDescriptionEditor";
import { ReelsErrorView } from "./components/ReelsErrorView";
import { ReelsModals } from "./components/ReelsModals";
import { ReelsVideoItem } from "./components/ReelsVideoItem";
import { useReelsOrchestrator } from "./hooks/useReelsOrchestrator";
import SuccessCard from "../components/SuccessCard";

const ReelsView = () => {
  const o = useReelsOrchestrator();
  const flatListRef = useRef<FlatList>(null);
  const initialIndex = Math.max(0, o.currentIndex_state || 0);
  const [viewport, setViewport] = useState({
    width: o.responsive.screenWidth,
    height: o.responsive.screenHeight,
  });
  const cellWidth = viewport.width || o.responsive.screenWidth;
  const cellHeight = viewport.height || o.responsive.screenHeight;

  const onListLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      if (!(width > 0) || !(height > 0)) return;
      setViewport((prev) =>
        Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
          ? prev
          : { width, height }
      );
    },
    []
  );

  // Land on the opened video once the list/layout is ready. Do not depend on
  // currentIndex — swipe updates would fight the pager.
  useEffect(() => {
    if (!flatListRef.current || o.allVideos.length === 0) return;
    const pending = o.pendingStartIndexRef?.current;
    const index = Math.min(
      Math.max(0, pending ?? o.currentIndex_state),
      o.allVideos.length - 1
    );
    requestAnimationFrame(() => {
      try {
        flatListRef.current?.scrollToIndex({
          index,
          animated: false,
        });
      } catch {
        /* getItemLayout may not be ready yet */
      }
    });
    const unlock = setTimeout(() => {
      if (o.pendingStartIndexRef) o.pendingStartIndexRef.current = null;
    }, 1000);
    return () => clearTimeout(unlock);
  }, [o.allVideos.length, cellHeight]);

  // Hardware back exits fullscreen before the root app-exit prompt.
  useFullscreenBackInterceptor(o.handlers.handleBackNavigation);

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
      <View style={styles.screen}>
      <FlatList
        ref={flatListRef}
        data={o.allVideos}
        extraData={`${o.currentIndex_state}:${cellHeight}:${cellWidth}:${o.activeIsLiked}:${o.activeIsSaved}`}
        renderItem={renderItem}
        keyExtractor={(item, index) => `reel-${item._id || item.id || index}`}
        pagingEnabled
        scrollEnabled={!o.isDragging}
        showsVerticalScrollIndicator={false}
        onLayout={onListLayout}
        onViewableItemsChanged={o.scroll.onViewableItemsChanged}
        viewabilityConfig={o.scroll.viewabilityConfig}
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
        snapToInterval={cellHeight}
        snapToAlignment="start"
        style={styles.list}
      />

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
