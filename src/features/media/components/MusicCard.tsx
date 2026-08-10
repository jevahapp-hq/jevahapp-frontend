import { Ionicons } from "@expo/vector-icons";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { DeleteMediaConfirmation } from "../../../../app/components/DeleteMediaConfirmation";
import { SafeImage } from "../../../../app/components/SafeImage";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
import { useAdvancedAudioPlayer } from "../../../../app/hooks/useAdvancedAudioPlayer";
import { useGlobalAudioPlayerStore, type AudioTrack } from "../../../../app/store/useGlobalAudioPlayerStore";
import {
  useContentCount,
  useUserInteraction,
} from "../../../../app/store/useInteractionStore";
import contentInteractionAPI from "../../../../app/utils/contentInteractionAPI";
import { isAdmin } from "../../../../app/utils/mediaDeleteAPI";
import AudioControlsOverlay from "../../../shared/components/AudioControlsOverlay";
import CardFooterActions from "../../../shared/components/CardFooterActions";
import ContentActionModal from "../../../shared/components/ContentActionModal";
import MediaDetailsModal from "../../../shared/components/MediaDetailsModal";
import { ModerationBadge } from "../../../shared/components/ModerationBadge";
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
      <SafeImage
        uri={(imageSource as any)?.uri}
        style={{ width: 30, height: 30, borderRadius: 999 }}
        size="small"
        showFallback={false}
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
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    isAdmin().then(setUserIsAdmin).catch(() => setUserIsAdmin(false));
  }, []);

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

  // Selective store subscriptions — never subscribe to the whole store (that
  // re-renders on every position tick and caused max-update-depth with sync effects).
  const audioId = audio._id || `music-${index}`;
  const currentTrack = useGlobalAudioPlayerStore((s) => s.currentTrack);
  const globalProgress = useGlobalAudioPlayerStore((s) => s.progress);
  const globalIsMuted = useGlobalAudioPlayerStore((s) => s.isMuted);
  const isCurrentTrack = currentTrack?.id === audioId;
  const isVirtualTrack = !!(isCurrentTrack && currentTrack?.isVirtual);

  // Local player owns the card button — don't mirror global store (it was
  // briefly false after setTrack and made the icon stick on "play").
  const showPauseIcon = playerState.isPlaying;

  // Do not sync isPlaying local→store here. Mini/full player pause updates the
  // store first; a reverse sync raced and flipped isPlaying back to true.

  // When floating player is dismissed, stop local playback + clear feed tracking.
  const wasCurrentTrackRef = useRef(isCurrentTrack);
  useEffect(() => {
    const wasCurrent = wasCurrentTrackRef.current;
    wasCurrentTrackRef.current = isCurrentTrack;
    if (!wasCurrent || isCurrentTrack) return;
    if (!playerState.isPlaying) {
      notifyParentPausedRef.current?.();
      return;
    }
    (async () => {
      try {
        await controls.pause();
        notifyParentPausedRef.current?.();
      } catch (err) {
        console.warn("MusicCard: Failed to pause after mini-player close:", err);
      }
    })();
  }, [isCurrentTrack, playerState.isPlaying, controls]);

  // Parent clears playingAudioId on scroll-away / another item — pause local player.
  // Only react to true→false so we don't race the play tap before parent re-renders.
  const wasParentPlayingRef = useRef(!!isPlaying);
  useEffect(() => {
    const wasParentPlaying = wasParentPlayingRef.current;
    wasParentPlayingRef.current = !!isPlaying;
    if (!wasParentPlaying || isPlaying || !playerState.isPlaying) return;

    (async () => {
      try {
        await controls.pause();
        const store = useGlobalAudioPlayerStore.getState();
        if (store.currentTrack?.id === audioId && store.currentTrack?.isVirtual) {
          store.setPlaying(false);
        }
      } catch (err) {
        console.warn("MusicCard: Failed to pause after leaving viewport:", err);
      }
    })();
  }, [isPlaying, playerState.isPlaying, controls, audioId]);

  const notifyParentPlaying = useCallback(() => {
    if (!onPlay) return;
    try {
      onPlay(audioUrl, audioKey);
    } catch (err) {
      console.warn("MusicCard onPlay callback failed:", err);
    }
  }, [onPlay, audioUrl, audioKey]);

  const notifyParentPaused = useCallback(() => {
    if (!onPause) return;
    try {
      onPause(audioKey);
    } catch (err) {
      console.warn("MusicCard onPause callback failed:", err);
    }
  }, [onPause, audioKey]);

  const notifyParentPausedRef = useRef(notifyParentPaused);
  useEffect(() => {
    notifyParentPausedRef.current = notifyParentPaused;
  }, [notifyParentPaused]);

  // Keep latest player controls in a ref so floating/full-player callbacks
  // never close over a stale togglePlay from the initial play tap.
  const controlsRef = useRef(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const registerVirtualControls = useCallback(() => {
    useGlobalAudioPlayerStore.getState().setVirtualTrackControls({
      togglePlayPause: async () => {
        await controlsRef.current.togglePlay();
      },
      pause: async () => {
        await controlsRef.current.pause();
      },
      play: async () => {
        await controlsRef.current.play();
      },
      seekToProgress: async (progress: number) => {
        await controlsRef.current.seekTo(progress);
      },
    });
  }, []);

  // Re-bind controls while this card owns the virtual track (FlashList recycle-safe).
  // Do not depend on `controls` identity — that object is new every status tick.
  useEffect(() => {
    if (!isVirtualTrack) return;
    registerVirtualControls();
  }, [isVirtualTrack, registerVirtualControls]);

  const handlePlayPress = useCallback(async () => {
    if (!audioUrl || !isValidUri(audioUrl)) return;
    // Prevent rapid double-taps while the player is toggling state
    if (playerState.isLoading) return;

    // ✅ Check if this track is already being controlled by FloatingAudioPlayer
    const globalAudioStore = useGlobalAudioPlayerStore.getState();
    const isCurrentTrack = globalAudioStore.currentTrack?.id === audioId;
    const hasVirtualControls = isCurrentTrack && globalAudioStore.currentTrack?.isVirtual && globalAudioStore.__virtualTrackControls;

    // ✅ If FloatingAudioPlayer is controlling this track, use its controls instead
    if (hasVirtualControls && isCurrentTrack) {
      const wasPlaying = globalAudioStore.isPlaying;
      await globalAudioStore.togglePlayPause();
      if (wasPlaying) {
        notifyParentPaused();
      } else {
        notifyParentPlaying();
      }
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

            // shouldPlayImmediately: true so mini-player doesn't flash "paused"
            // and so we don't wipe playingAudio for this same local player.
            await globalAudioStore.setTrack(track, true);
            registerVirtualControls();

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

      // Notify feed coordinator once — never start a second Sound via onPlay-on-pause.
      if (wasPlaying) {
        notifyParentPaused();
      } else {
        notifyParentPlaying();
      }
    } catch (err) {
      console.warn("MusicCard play toggle failed:", err);
    }
  }, [
    audioUrl,
    controls,
    notifyParentPlaying,
    notifyParentPaused,
    registerVirtualControls,
    audioId,
    playerState.isLoading,
    playerState.isPlaying,
    playerState.duration,
    audio,
  ]);
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

  // Sync position/progress to mini player for virtual tracks (getState — no store deps).
  useEffect(() => {
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.id !== audioId || !store.currentTrack?.isVirtual) return;
    if (playerState.duration <= 0) return;

    const positionMs = playerState.position || 0;
    const durationMs = playerState.duration || 0;
    const progress = positionMs / durationMs;

    if (Math.abs(store.position - positionMs) > 500) {
      store.setPosition(positionMs);
    }
    if (Math.abs(store.progress - progress) > 0.01) {
      store.setProgressValue(progress);
    }
    if (store.duration !== durationMs) {
      store.setDuration(durationMs);
    }
  }, [playerState.position, playerState.duration, playerState.progress, audioId]);

  // View tracking state
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const storeRef = useRef<any>(null);
  useEffect(() => {
    try {
      const {
        useInteractionStore,
      } = require("../../../../app/store/useInteractionStore");
      storeRef.current = useInteractionStore.getState();
    } catch { }
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
    } catch { }
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
        } catch { }
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
          <SafeImage
            uri={thumbnailUri}
            fallbackText="Music"
            fallbackIcon="musical-notes-outline"
            style={{ width: "100%", height: "100%", position: "absolute" }}
            size="large"
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
            progress={isVirtualTrack ? (globalProgress || 0) : (playerState.progress || 0)}
            isMuted={isVirtualTrack ? (globalIsMuted || false) : (playerState.isMuted || false)}
            onToggleMute={() => {
              if (isVirtualTrack && isCurrentTrack) {
                useGlobalAudioPlayerStore.getState().toggleMute();
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
                name={showPauseIcon ? "pause" : "play"}
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
            {audio.moderationStatus === 'under_review' && (
              <View className="mt-1 bg-orange-50 p-2 rounded-md border border-orange-100 mb-2">
                <View className="flex-row items-center mb-1">
                  <ModerationBadge status="under_review" />
                </View>
                <Text className="text-[10px] text-orange-700 leading-3">
                  This content is currently under review and is only visible to you. It will be made public once approved.
                </Text>
              </View>
            )}
            <CardFooterActions
              viewCount={viewsFromStore || audio.views || 0}
              liked={!!likedFromStore}
              likeCount={likesFromStore || audio.likes || 0}
              likeBurstKey={likeBurstKey}
              likeColor="#D22A2A"
              onLike={() => {
                // ✅ Only trigger burst animation when LIKING (not unliking)
                if (!likedFromStore) {
                  setLikeBurstKey((k) => k + 1);
                }
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
                } catch { }
                onComment && onComment(audio);
              }}
              saved={!!savedFromStore}
              saveCount={savesFromStore || audio.saves || 0}
              onSave={() => {
                onSave(audio);
              }}
              onShare={() => onShare(audio)}
              isLoading={isLoadingStats}
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
        showDelete={userIsAdmin || isOwner}
        onReport={() => setShowReportModal(true)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteMediaConfirmation
        visible={showDeleteModal}
        mediaId={audio._id || ""}
        mediaTitle={audio.title || "this media"}
        onClose={closeDeleteModal}
        onSuccess={handleDeleteConfirm}
        isAdmin={false}
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
