/**
 * Reelsviewscroll - Main Reels screen
 * Fully modularized and performance optimized.
 */
import { memo, useCallback, useEffect, useRef } from "react";
import { StatusBar, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import ErrorBoundary from "../components/ErrorBoundary";
import { navigateMainTab } from "../utils/navigation";
import { ReelsErrorView } from "./components/ReelsErrorView";
import { ReelsModals } from "./components/ReelsModals";
import { ReelsVideoItem } from "./components/ReelsVideoItem";
import { useReelsOrchestrator } from "./hooks/useReelsOrchestrator";

const ReelsView = () => {
  const o = useReelsOrchestrator();
  const flatListRef = useRef<FlatList>(null);

  // Sync scroll position when list loads or index changes externally
  useEffect(() => {
    if (flatListRef.current && o.allVideos.length > 0) {
      const index = o.reelsStore.currentIndex || 0;
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: false,
        });
      });
    }
  }, [o.allVideos.length]);

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isActive = index === o.currentIndex_state;
      return (
        <View
          style={{
            height: o.responsive.screenHeight,
            width: "100%",
            backgroundColor: "#000000",
          }}
        >
          <ReelsVideoItem
            videoData={item}
            index={index}
            isActive={isActive}
            videoRefs={o.videoRefs}
            screenHeight={o.responsive.screenHeight}
            screenWidth={o.responsive.screenWidth}
            isIOS={o.responsive.isIOS}
            currentIndex_state={o.currentIndex_state}
            playingVideos={o.playingVideos}
            mutedVideos={o.mutedVideos}
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
            mediaStore={o.mediaStore}
            source={o.params.source}
            menuVisible={o.menuVisible}
            isOwner={o.isOwner}
            checkIfDownloaded={o.checkIfDownloaded}
            currentUser={o.currentUser}
            getAvatarUrl={o.getAvatarUrl}
          />
        </View>
      );
    },
    [o]
  );

  if (o.hasError) {
    return (
      <ReelsErrorView
        errorMessage={o.errorMessage}
        onRetry={() => {
          o.setHasError(false);
          o.setErrorMessage("");
        }}
        onGoBack={() => o.router.back()}
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
      <FlatList
        ref={flatListRef}
        data={o.allVideos}
        renderItem={renderItem}
        keyExtractor={(item, index) => `reel-${item._id || item.id || index}`}
        pagingEnabled
        scrollEnabled={!o.isDragging}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={o.scroll.onViewableItemsChanged}
        viewabilityConfig={o.scroll.viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: o.responsive.screenHeight,
          offset: o.responsive.screenHeight * index,
          index,
        })}
        removeClippedSubviews={true}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        decelerationRate="fast"
        snapToInterval={o.responsive.screenHeight}
        snapToAlignment="start"
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
          o.setActiveTab(tab);
          o.triggerHapticFeedback();
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
    </ErrorBoundary>
  );
};

export default memo(ReelsView);
