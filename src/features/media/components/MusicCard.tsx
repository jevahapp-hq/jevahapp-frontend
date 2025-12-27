import { Ionicons } from "@expo/vector-icons";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
    Image,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { DeleteMediaConfirmation } from "../../../../app/components/DeleteMediaConfirmation";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
import { useAdvancedAudioPlayer } from "../../../../app/hooks/useAdvancedAudioPlayer";
import {
    useContentCount,
    useUserInteraction,
} from "../../../../app/store/useInteractionStore";
import { useGlobalAudioPlayerStore, type AudioTrack } from "../../../../app/store/useGlobalAudioPlayerStore";
import contentInteractionAPI from "../../../../app/utils/contentInteractionAPI";
import AudioControlsOverlay from "../../../shared/components/AudioControlsOverlay";
import CardFooterActions from "../../../shared/components/CardFooterActions";
import ContentActionModal from "../../../shared/components/ContentActionModal";
import MediaDetailsModal from "../../../shared/components/MediaDetailsModal";
import ReportMediaModal from "../../../shared/components/ReportMediaModal";
import { AudioCardSkeleton } from "../../../shared/components/Skeleton";
import ThreeDotsMenuButton from "../../../shared/components/ThreeDotsMenuButton/ThreeDotsMenuButton";
import { useMediaDeletion } from "../../../shared/hooks";
import { useContentActionModal } from "../../../shared/hooks/useContentActionModal";
import { useHydrateContentStats } from "../../../shared/hooks/useHydrateContentStats";
import { useLoadingStats } from "../../../shared/hooks/useLoadingStats";
import { MusicCardProps } from "../../../shared/types";
import {
    getTimeAgo,
    getUserAvatarFromContent,
    getUserDisplayNameFromContent,
    isValidUri,
} from "../../../shared/utils";

const ORANGE = "#FF8A00";

export const MusicCard: React.FC<MusicCardProps> = ({
  audio,
  index,
  onLike,
  onComment,
  onSave,
  onShare,
  onDownload,
  onDelete,
  onPlay,
  isPlaying = false,
  progress = 0,
  onLayout,
  onPause,
}) => {
  const AvatarWithInitialFallback = ({
    imageSource,
    name,
  }: {
    imageSource: any;
    name: string;
  }) => {
    const [errored, setErrored] = useState(false);
    const initial = (name || "?").trim().charAt(0).toUpperCase();
    return !errored ? (
      <Image
        source={imageSource}
        style={{ width: 30, height: 30, borderRadius: 999 }}
        resizeMode="cover"
        onError={() => setErrored(true)}
      />
    ) : (
      <Text className="text-[14px] font-semibold text-[#344054]">
        {initial}
      </Text>
    );
  };
  const [showOverlay, setShowOverlay] = useState(true);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [attemptedPlay, setAttemptedPlay] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { showCommentModal } = useCommentModal();
  const { isModalVisible, openModal, closeModal } = useContentActionModal();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Delete media functionality - using reusable hook
  const {
    isOwner,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
  } = useMediaDeletion({
    mediaItem: audio,
    isModalVisible,
    onDeleteSuccess: (deletedAudio) => {
      closeModal();
      if (onDelete) {
        onDelete(deletedAudio);
      }
    },
  });

  // Handle delete button press
  const handleDeletePress = useCallback(() => {
    openDeleteModal();
  }, [openDeleteModal]);

  // Handle delete confirmation - DeleteMediaConfirmation handles deletion, this just updates UI
  const handleDeleteConfirm = useCallback(async () => {
    closeDeleteModal();
    closeModal();
    if (onDelete) {
      onDelete(audio);
    }
  }, [audio, closeDeleteModal, closeModal, onDelete]);

  const modalKey = `music-${audio._id || index}`;
  const contentId = audio._id || `music-${index}`;
  const audioKey = `music-${audio._id || index}`;
  const isSermon = audio.contentType === "sermon";

  const audioUrl = typeof audio.fileUrl === "string" ? audio.fileUrl : "";
  const [playerState, controls] = useAdvancedAudioPlayer(
    isValidUri(audioUrl) ? audioUrl : null,
    {
      audioKey,
      autoPlay: false,
      loop: false,
    }
  );

  // ✅ Get global audio store state to check if this track is being controlled
  const globalAudioStore = useGlobalAudioPlayerStore();
  const audioId = audio._id || `music-${index}`;
  const isCurrentTrack = globalAudioStore.currentTrack?.id === audioId;
  const isVirtualTrack = isCurrentTrack && globalAudioStore.currentTrack?.isVirtual;
  
  // ✅ Use global store playing state as source of truth when it's a virtual track
  // This ensures MusicCard and FloatingAudioPlayer stay in sync
  const isPlayingFromGlobal = isVirtualTrack ? globalAudioStore.isPlaying : playerState.isPlaying;
  
  // ✅ Sync virtual track playing state with global audio player store
  // This ensures FloatingAudioPlayer shows correct play/pause icon
  useEffect(() => {
    // Only sync if this is the current track in the global store
    if (isVirtualTrack) {
      // Update global store state to match actual player state
      if (globalAudioStore.isPlaying !== playerState.isPlaying) {
        globalAudioStore.setPlaying(playerState.isPlaying);
      }
    }
  }, [playerState.isPlaying, audio._id, index, isVirtualTrack, globalAudioStore]);

  const handlePlayPress = useCallback(async () => {
    if (!audioUrl || !isValidUri(audioUrl)) return;
    // Prevent rapid double-taps while the player is toggling state
    if (playerState.isLoading) return;

    // ✅ Check if this track is already being controlled by FloatingAudioPlayer
    const globalAudioStore = useGlobalAudioPlayerStore.getState();
    const audioId = audio._id || `music-${index}`;
    const isCurrentTrack = globalAudioStore.currentTrack?.id === audioId;
    const hasVirtualControls = isCurrentTrack && globalAudioStore.currentTrack?.isVirtual && globalAudioStore.__virtualTrackControls;
    
    // ✅ If FloatingAudioPlayer is controlling this track, use its controls instead
    if (hasVirtualControls && isCurrentTrack) {
      // Use the virtual track controls (FloatingAudioPlayer's controls)
      await globalAudioStore.togglePlayPause();
      return;
    }

    setAttemptedPlay(true);
    try {
      const wasPlaying = playerState.isPlaying;
      await controls.togglePlay();
      
      // Wait a bit for the state to update, then check if it's playing
      setTimeout(async () => {
        try {
          const globalAudioStore = useGlobalAudioPlayerStore.getState();
          const thumbnailSource = audio?.imageUrl || audio?.thumbnailUrl;
          const thumbnailUri = typeof thumbnailSource === "string"
            ? thumbnailSource
            : (thumbnailSource as any)?.uri;
          
          if (!wasPlaying) {
            // We're starting to play - set it in the global audio player store
            // so the floating player can show it
            const track: AudioTrack = {
              id: audioId,
              title: audio.title || "Unknown Title",
              artist: getUserDisplayNameFromContent(audio) || "Unknown Artist",
              audioUrl: audioUrl,
              thumbnailUrl: thumbnailUri || "",
              duration: (playerState.duration || 0) / 1000, // Convert from ms to seconds
              category: audio.category?.[0] || audio.contentType || "music",
              description: audio.description || "",
              isVirtual: true, // Mark as virtual - this track is played by useAdvancedAudioPlayer, not the global player
            };
            
            // Set track in global store (this will pause copyright-free songs if playing)
            // Don't pass shouldPlayImmediately since this is virtual - the local player handles playback
            await globalAudioStore.setTrack(track, false);
            // Update playing state to match local player
            globalAudioStore.setPlaying(true);
            // Register controls so FloatingAudioPlayer can control this track
            globalAudioStore.setVirtualTrackControls({
              togglePlayPause: async () => {
                await controls.togglePlay();
              },
              pause: async () => {
                await controls.pause();
              },
              play: async () => {
                await controls.play();
              },
              seekToProgress: async (progress: number) => {
                await controls.seekTo(progress);
              },
            });
            
            // ✅ Also sync position and duration to global store
            if (playerState.duration > 0) {
              globalAudioStore.setDuration(playerState.duration);
              globalAudioStore.setPosition(playerState.position || 0);
              globalAudioStore.setProgressValue(playerState.progress || 0);
            }
          } else {
            // We're pausing - update global store state to match
            if (globalAudioStore.currentTrack?.id === audioId) {
              // Update playing state to false immediately
              globalAudioStore.setPlaying(false);
              // Don't clear virtual track controls - keep them so user can resume
              // Only clear when track changes or component unmounts
            }
          }
        } catch (err) {
          console.warn("MusicCard: Failed to sync with global audio player:", err);
        }
      }, 100);
      
      // Optionally notify parent (e.g. to drive a global mini-player)
      if (onPlay) {
        try {
          onPlay(audioUrl, audio._id || `music-${index}`);
        } catch (err) {
          console.warn("MusicCard onPlay callback failed:", err);
        }
      }
    } catch (err) {
      console.warn("MusicCard play toggle failed:", err);
    }
  }, [audioUrl, controls, onPlay, audio._id, index, playerState.isLoading, playerState.isPlaying, playerState.duration, audio]);

  const handleOverlayToggle = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  const seekBySeconds = useCallback(
    async (deltaSec: number) => {
      const dur = playerState.duration || 0;
      if (dur === 0) return;
      const nextMs = Math.max(
        0,
        Math.min((playerState.position || 0) + deltaSec * 1000, dur)
      );
      await controls.seekTo(nextMs / dur);
    },
    [playerState.duration, playerState.position, controls]
  );

  const thumbnailSource = audio?.imageUrl || audio?.thumbnailUrl;
  const thumbnailUri =
    typeof thumbnailSource === "string"
      ? thumbnailSource
      : (thumbnailSource as any)?.uri;

  const formattedProgress = Math.round((playerState.progress || 0) * 100);

  // Sync playback state to global audio player store for virtual tracks
  useEffect(() => {
    const audioId = audio._id || `music-${index}`;
    const globalAudioStore = useGlobalAudioPlayerStore.getState();
    
    // Only sync if this is the current track in the global store and it's virtual
    if (globalAudioStore.currentTrack?.id === audioId && globalAudioStore.currentTrack?.isVirtual) {
      // Sync playing state
      if (globalAudioStore.isPlaying !== playerState.isPlaying) {
        globalAudioStore.setPlaying(playerState.isPlaying);
      }
      
      // Sync position and progress
      if (playerState.duration > 0) {
        const positionMs = playerState.position || 0;
        const durationMs = playerState.duration || 0;
        const progress = positionMs / durationMs;
        
        if (Math.abs(globalAudioStore.position - positionMs) > 500) { // Only update if difference is > 500ms
          globalAudioStore.setPosition(positionMs);
        }
        if (Math.abs(globalAudioStore.progress - progress) > 0.01) { // Only update if difference is > 1%
          globalAudioStore.setProgressValue(progress);
        }
        
        if (globalAudioStore.duration !== durationMs) {
          globalAudioStore.setDuration(durationMs);
        }
      }
    }
  }, [playerState.isPlaying, playerState.position, playerState.duration, playerState.progress, audio._id, index]);

  // View tracking state
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const storeRef = useRef<any>(null);
  useEffect(() => {
    try {
      const {
        useInteractionStore,
      } = require("../../../../app/store/useInteractionStore");
      storeRef.current = useInteractionStore.getState();
    } catch {}
  }, []);

  // Derive current view and comment counts from store if available
  const contentIdForViews = String(audio._id || "");
  const viewsFromStore = contentIdForViews
    ? useContentCount(contentIdForViews, "views")
    : 0;
  const savesFromStore = contentIdForViews
    ? useContentCount(contentIdForViews, "saves")
    : 0;
  const likesFromStore = contentIdForViews
    ? useContentCount(contentIdForViews, "likes")
    : 0;
  const savedFromStore = contentIdForViews
    ? useUserInteraction(contentIdForViews, "saved")
    : false;
  const likedFromStore = contentIdForViews
    ? useUserInteraction(contentIdForViews, "liked")
    : false;
  useHydrateContentStats(contentId, audio.contentType || "media");
  const isLoadingStats = useLoadingStats(contentId);

  // Ensure saved state is hydrated when card mounts (persists highlight after tab switch)
  useEffect(() => {
    try {
      const {
        loadContentStats,
      } = require("../../../../app/store/useInteractionStore");
      const loadFn = loadContentStats as any as (
        id: string,
        type?: string
      ) => Promise<void>;
      if (contentId) {
        loadFn(contentId, audio.contentType || "media");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);
  const commentsFromStore = contentIdForViews
    ? useContentCount(contentIdForViews, "comments")
    : 0;

  // Record a qualified view when playback crosses 3s or 25%, or on completion
  useEffect(() => {
    const contentId = String(audio._id || "");
    if (!contentId || hasTrackedView) return;
    const isPlaying = playerState.isPlaying;
    const positionMs = playerState.position || 0;
    const progress = playerState.progress || 0;
    const durationMs = playerState.duration || 0;

    const qualifies = isPlaying && (positionMs >= 3000 || progress >= 0.25);
    const finished = durationMs > 0 && progress >= 0.999;

    if (qualifies || finished) {
      (async () => {
        try {
          const result = await contentInteractionAPI.recordView(
            contentId,
            "media",
            {
              durationMs: finished ? durationMs : positionMs,
              progressPct: Math.round((progress || 0) * 100),
              isComplete: finished,
            }
          );
          setHasTrackedView(true);
          if (result?.totalViews != null && storeRef.current?.mutateStats) {
            storeRef.current.mutateStats(contentId, () => ({
              views: Number(result.totalViews) || 0,
            }));
          }
        } catch {}
      })();
    }
  }, [
    audio._id,
    playerState.isPlaying,
    playerState.position,
    playerState.progress,
    playerState.duration,
    hasTrackedView,
  ]);

  const onSeekRelative = useCallback(
    async (deltaSec: number) => {
      await seekBySeconds(deltaSec);
    },
    [seekBySeconds]
  );

  const onSeekToPercent = useCallback(
    async (pct: number) => {
      await controls.seekTo(Math.max(0, Math.min(pct, 1)));
    },
    [controls]
  );

  return (
    <View
      className="flex flex-col mb-16"
      style={{ marginBottom: 64 }} // Extra spacing for better detection
      onLayout={
        onLayout
          ? (event) =>
              onLayout(
                event,
                `music-${audio._id || index}`,
                "music",
                audio.fileUrl
              )
          : undefined
      }
    >
      <TouchableWithoutFeedback onPress={handleOverlayToggle}>
        <View className="w-full h-[400px] overflow-hidden relative">
          <Image
            source={
              thumbnailUri
                ? { uri: thumbnailUri }
                : {
                    uri: "https://via.placeholder.com/400x400/cccccc/ffffff?text=Music",
                  }
            }
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode="cover"
          />

          {/* Skeleton overlay during initial audio load after play */}
          {attemptedPlay && !playerState.duration && (
            <View className="absolute inset-0" pointerEvents="none">
              <AudioCardSkeleton dark={true} />
            </View>
          )}

          <View className="absolute top-4 left-4" pointerEvents="box-none">
            <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons
                name={isSermon ? "person" : "musical-notes"}
                size={16}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Title Overlay - positioned directly above progress bar */}
          <View
            className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md"
            pointerEvents="box-none"
          >
            <Text
              className="text-white font-semibold text-sm"
              numberOfLines={2}
              style={{
                textShadowColor: "rgba(0, 0, 0, 0.8)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {audio.title}
            </Text>
          </View>

          {/* Bottom Controls Styled (modular overlay) */}
          <AudioControlsOverlay
            progress={isVirtualTrack ? (globalAudioStore.progress || 0) : (playerState.progress || 0)}
            isMuted={isVirtualTrack ? (globalAudioStore.isMuted || false) : (playerState.isMuted || false)}
            onToggleMute={() => {
              if (isVirtualTrack && isCurrentTrack) {
                globalAudioStore.toggleMute();
              } else {
                controls.toggleMute();
              }
            }}
            onSeekRelative={onSeekRelative}
            onSeekToPercent={onSeekToPercent}
          />

          {/* Play/Pause button overlayed near controls with spacing from bar */}
          <View className="absolute bottom-4 left-3" pointerEvents="box-none">
            <TouchableOpacity
              onPress={handlePlayPress}
              className="mr-3"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginRight: 12 }}
            >
              <Ionicons
                name={isPlayingFromGlobal ? "pause" : "play"}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Footer with User Info and compact left-aligned stats/actions */}
      <View className="flex-row items-center justify-between mt-2 px-2">
        <View className="flex flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1">
            {/* Avatar with initial fallback */}
            <AvatarWithInitialFallback
              imageSource={getUserAvatarFromContent(audio) as any}
              name={getUserDisplayNameFromContent(audio)}
            />
          </View>
          <View className="ml-3">
            <View className="flex-row items-center">
              <Text className="text-sm font-semibold text-gray-800">
                {getUserDisplayNameFromContent(audio)}
              </Text>
              <View className="flex flex-row mt-1 ml-2">
                <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 ml-1">
                  {getTimeAgo(audio.createdAt)}
                </Text>
              </View>
            </View>
            <CardFooterActions
              viewCount={viewsFromStore || audio.views || 0}
              liked={!!likedFromStore}
              likeCount={likesFromStore || audio.likes || 0}
              likeBurstKey={likeBurstKey}
              likeColor="#D22A2A"
              onLike={() => {
                setLikeBurstKey((k) => k + 1);
                onLike(audio);
              }}
              commentCount={commentsFromStore || audio.comments || 0}
              onComment={() => {
                try {
                  console.log("🗨️ Comment icon pressed (music)", {
                    contentId: contentIdForViews,
                    title: audio.title,
                  });
                  // Open modal with empty array - backend will load comments immediately
                  showCommentModal([], String(contentId));
                } catch {}
                onComment && onComment(audio);
              }}
              saved={!!savedFromStore}
              saveCount={savesFromStore || audio.saves || 0}
              onSave={() => {
                onSave(audio);
              }}
              onShare={() => onShare(audio)}
              isLoading={isLoadingStats}
              contentType={audio.contentType || "media"}
              contentId={contentId}
              contentType="media"
              contentId={contentId}
              useEnhancedComponents={false}
            />
          </View>
        </View>
        <ThreeDotsMenuButton onPress={openModal} />
      </View>

      <ContentActionModal
        isVisible={isModalVisible}
        onClose={closeModal}
        onViewDetails={() => {
          closeModal();
          setShowDetailsModal(true);
        }}
        onSaveToLibrary={() => onSave(audio)}
        onDownload={() => onDownload(audio)}
        isSaved={!!audio.saves}
        isDownloaded={false}
        contentTitle={audio.title}
        mediaId={audio._id}
        uploadedBy={audio.uploadedBy || audio.author?._id || audio.authorInfo?._id}
        mediaItem={audio}
        onDelete={handleDeletePress}
        showDelete={isOwner}
        onReport={() => setShowReportModal(true)}
      />
      
      {/* Delete Confirmation Modal */}
      <DeleteMediaConfirmation
        visible={showDeleteModal}
        mediaId={audio._id || ""}
        mediaTitle={audio.title || "this media"}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={handleDeleteConfirm}
      />

      {/* Report Modal */}
      <ReportMediaModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        mediaId={audio._id || ""}
        mediaTitle={audio.title}
      />

      {/* Media Details Slider */}
      <MediaDetailsModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        mediaItem={audio}
      />
    </View>
  );
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor((ms || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default memo(MusicCard);
