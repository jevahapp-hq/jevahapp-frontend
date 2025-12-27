import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import GlobalAudioInstanceManager from "../utils/globalAudioInstanceManager";

// ⚠️ DEPRECATED: This store is being replaced by useMediaPlaybackStore.tsx
// Please use the unified store for new components.
// This store will be removed once all components are migrated.

// Professional video player registry - stores refs to all active video players
type VideoPlayerRef = {
  pause: () => Promise<void>;
  play?: () => void | Promise<void>; // Optional play method for imperative control
  showOverlay: () => void;
  key: string;
};

const videoPlayerRegistry = new Map<string, VideoPlayerRef>();

interface VideoPlayerState {
  // Global video state - only one video can play at a time
  currentlyPlayingVideo: string | null;
  playingVideos: Record<string, boolean>;
  showOverlay: Record<string, boolean>;
  mutedVideos: Record<string, boolean>;
  progresses: Record<string, number>;
  hasCompleted: Record<string, boolean>;

  // Auto-play state
  isAutoPlayEnabled: boolean;
  currentlyVisibleVideo: string | null;

  // Actions
  playVideo: (videoKey: string) => void;
  pauseVideo: (videoKey: string) => void;
  toggleVideo: (videoKey: string) => void;
  pauseAllVideos: () => void;
  cleanupAllVideos: () => void;
  toggleVideoMute: (videoKey: string) => void;
  setVideoProgress: (videoKey: string, progress: number) => void;
  setVideoCompleted: (videoKey: string, completed: boolean) => void;
  setOverlayVisible: (videoKey: string, visible: boolean) => void;

  // Video player registry - professional imperative control
  registerVideoPlayer: (key: string, player: VideoPlayerRef) => void;
  unregisterVideoPlayer: (key: string) => void;
  pauseAllVideosImperatively: () => void;

  // Global play function - pauses all others and plays selected video
  playVideoGlobally: (videoKey: string) => void;

  // Auto-play functions
  enableAutoPlay: () => void;
  disableAutoPlay: () => void;
  handleVideoVisibilityChange: (visibleVideoKey: string | null) => void;
}

export const useGlobalVideoStore = create<VideoPlayerState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentlyPlayingVideo: null,
    playingVideos: {},
    showOverlay: {},
    mutedVideos: {},
    progresses: {},
    hasCompleted: {},

    // Auto-play initial state (DISABLED by default - manual play only, Instagram/TikTok style)
    isAutoPlayEnabled: false,
    currentlyVisibleVideo: null,

    // Individual video actions
    playVideo: (videoKey: string) => {
      // Stop all audio when video starts
      const audioManager = GlobalAudioInstanceManager.getInstance();
      audioManager.stopAllAudio().catch((err) => {
        console.warn("⚠️ Failed to stop all audio when video started:", err);
      });

      // Stop global audio player store (like CopyrightFreeSongs does)
      try {
        const globalAudioModule = require("./useGlobalAudioPlayerStore");
        const globalAudioStore = globalAudioModule.useGlobalAudioPlayerStore.getState();
        if (globalAudioStore && globalAudioStore.clear) {
          globalAudioStore.clear().catch((err) => {
            console.warn("⚠️ Failed to stop global audio player when video started:", err);
          });
        }
      } catch (error) {
        console.warn("⚠️ Failed to access global audio player store:", error);
      }

      set((state) => ({
        currentlyPlayingVideo: videoKey,
        playingVideos: { ...state.playingVideos, [videoKey]: true },
        showOverlay: { ...state.showOverlay, [videoKey]: false },
      }));
    },

    pauseVideo: (videoKey: string) => {
      // Imperatively pause the video player directly (no state waiting)
      const player = videoPlayerRegistry.get(videoKey);
      if (player) {
        player
          .pause()
          .catch((err) => console.warn(`Failed to pause ${videoKey}:`, err));
        player.showOverlay();
      }

      // Update state to reflect the change
      set((state) => ({
        currentlyPlayingVideo:
          state.currentlyPlayingVideo === videoKey
            ? null
            : state.currentlyPlayingVideo,
        playingVideos: { ...state.playingVideos, [videoKey]: false },
        showOverlay: { ...state.showOverlay, [videoKey]: true },
      }));
    },

    pauseAllVideos: () => {
      // Imperatively pause all video players directly (no state waiting)
      videoPlayerRegistry.forEach((player, key) => {
        player
          .pause()
          .catch((err) => console.warn(`Failed to pause ${key}:`, err));
        player.showOverlay();
      });

      // Update state to reflect the change
      set((state) => {
        const newPlayingVideos: Record<string, boolean> = {};
        const newShowOverlay: Record<string, boolean> = {};

        Object.keys(state.playingVideos).forEach((key) => {
          newPlayingVideos[key] = false;
          newShowOverlay[key] = true;
        });

        return {
          currentlyPlayingVideo: null,
          playingVideos: newPlayingVideos,
          showOverlay: newShowOverlay,
        };
      });
    },

    // Thread-safe cleanup function
    cleanupAllVideos: () => {
      set(() => ({
        currentlyPlayingVideo: null,
        playingVideos: {},
        showOverlay: {},
        mutedVideos: {},
        progresses: {},
        hasCompleted: {},
        currentlyVisibleVideo: null,
      }));
    },

    toggleVideoMute: (videoKey: string) => {
      set((state) => ({
        mutedVideos: {
          ...state.mutedVideos,
          [videoKey]: !state.mutedVideos[videoKey],
        },
      }));
    },

    setVideoProgress: (videoKey: string, progress: number) => {
      set((state) => ({
        progresses: { ...state.progresses, [videoKey]: progress },
      }));
    },

    setVideoCompleted: (videoKey: string, completed: boolean) => {
      set((state) => ({
        hasCompleted: { ...state.hasCompleted, [videoKey]: completed },
      }));
    },

    setOverlayVisible: (videoKey: string, visible: boolean) => {
      set((state) => ({
        showOverlay: { ...state.showOverlay, [videoKey]: visible },
      }));
    },

    // Video player registry management
    registerVideoPlayer: (key: string, player: VideoPlayerRef) => {
      videoPlayerRegistry.set(key, player);
    },

    unregisterVideoPlayer: (key: string) => {
      videoPlayerRegistry.delete(key);
    },

    // Imperatively pause all videos (for use by audio manager)
    pauseAllVideosImperatively: () => {
      videoPlayerRegistry.forEach((player) => {
        player.pause().catch((err) => console.warn("Failed to pause video:", err));
        player.showOverlay();
      });
      
      // Also update state
      set((state) => {
        const newPlayingVideos: Record<string, boolean> = {};
        const newShowOverlay: Record<string, boolean> = {};

        Object.keys(state.playingVideos).forEach((key) => {
          newPlayingVideos[key] = false;
          newShowOverlay[key] = true;
        });

        return {
          currentlyPlayingVideo: null,
          playingVideos: newPlayingVideos,
          showOverlay: newShowOverlay,
        };
      });
    },

    // ✅ Global play function - PROFESSIONAL IMPERATIVE CONTROL (like Instagram/TikTok)
    playVideoGlobally: (videoKey: string) => {
      // STEP 1: Stop ALL audio when video starts playing
      const audioManager = GlobalAudioInstanceManager.getInstance();
      audioManager.stopAllAudio().catch((err) => {
        console.warn("⚠️ Failed to stop all audio when video started:", err);
      });

      // STEP 1b: Stop global audio player store (like CopyrightFreeSongs does)
      try {
        const globalAudioModule = require("./useGlobalAudioPlayerStore");
        const globalAudioStore = globalAudioModule.useGlobalAudioPlayerStore.getState();
        if (globalAudioStore && globalAudioStore.clear) {
          globalAudioStore.clear().catch((err) => {
            console.warn("⚠️ Failed to stop global audio player when video started:", err);
          });
          console.log("🛑 Stopped global audio player for video playback");
        }
      } catch (error) {
        console.warn("⚠️ Failed to access global audio player store:", error);
      }

      // STEP 2: Update state FIRST for immediate UI feedback
      set((state) => {
        const newPlayingVideos: Record<string, boolean> = {};
        const newShowOverlay: Record<string, boolean> = {};

        // Pause all other videos in state
        Object.keys(state.playingVideos).forEach((key) => {
          newPlayingVideos[key] = false;
          newShowOverlay[key] = true;
        });

        // Set target video to playing
        newPlayingVideos[videoKey] = true;
        newShowOverlay[videoKey] = false;

        return {
          currentlyPlayingVideo: videoKey,
          playingVideos: newPlayingVideos,
          showOverlay: newShowOverlay,
        };
      });

      // STEP 3: Imperatively pause ALL other videos FIRST (await to ensure they're paused)
      // This prevents race conditions where new video starts before old one stops
      const pausePromises: Promise<void>[] = [];
      videoPlayerRegistry.forEach((player, key) => {
        if (key !== videoKey) {
          pausePromises.push(
            player.pause().catch((err) => {
              console.warn(`Failed to pause ${key}:`, err);
            })
          );
          player.showOverlay();
        }
      });

      // STEP 4: Wait for all pauses to complete, then play target video
      // This ensures only one video plays at a time
      Promise.all(pausePromises).then(() => {
        const targetPlayer = videoPlayerRegistry.get(videoKey);
        if (targetPlayer && targetPlayer.play) {
          try {
            // Play immediately after all pauses complete
            const playResult = targetPlayer.play();
            if (playResult instanceof Promise) {
              playResult.catch((err) => {
                console.warn(`Failed to imperatively play ${videoKey}:`, err);
              });
            }
          } catch (err) {
            console.warn(`Failed to imperatively play ${videoKey}:`, err);
          }
        } else if (!targetPlayer) {
          // Player not registered yet - retry after a short delay
          // This handles cases where component just mounted and player is still initializing
          setTimeout(() => {
            const retryPlayer = videoPlayerRegistry.get(videoKey);
            if (retryPlayer && retryPlayer.play) {
              try {
                const playResult = retryPlayer.play();
                if (playResult instanceof Promise) {
                  playResult.catch((err) => {
                    console.warn(`Failed to play ${videoKey} on retry:`, err);
                  });
                }
              } catch (err) {
                console.warn(`Failed to play ${videoKey} on retry:`, err);
              }
            } else {
              // State already updated, useEffect will sync when player registers
              console.warn(`⚠️ Video player not registered for key: ${videoKey} after retry. State updated, player will sync when ready.`);
            }
          }, 100); // Retry after 100ms
        }
      });
    },

    // ✅ Toggle function - for cases where toggle behavior is needed
    toggleVideo: (videoKey: string) => {
      set((state) => {
        const isCurrentlyPlaying = state.playingVideos[videoKey] ?? false;

        if (isCurrentlyPlaying) {
          // If video is already playing, pause it
          return {
            currentlyPlayingVideo: null,
            playingVideos: { ...state.playingVideos, [videoKey]: false },
            showOverlay: { ...state.showOverlay, [videoKey]: true },
          };
        } else {
          // If video is paused, play it - stop all audio first
          // Stop all audio when video starts
          const audioManager = GlobalAudioInstanceManager.getInstance();
          audioManager.stopAllAudio().catch((err) => {
            console.warn("⚠️ Failed to stop all audio when video started:", err);
          });

          // Stop global audio player store (like CopyrightFreeSongs does)
          try {
            const globalAudioModule = require("./useGlobalAudioPlayerStore");
            const globalAudioStore = globalAudioModule.useGlobalAudioPlayerStore.getState();
            if (globalAudioStore && globalAudioStore.clear) {
              globalAudioStore.clear().catch((err) => {
                console.warn("⚠️ Failed to stop global audio player when video started:", err);
              });
            }
          } catch (error) {
            console.warn("⚠️ Failed to access global audio player store:", error);
          }
          
          // Use the same logic as playVideoGlobally
          const newPlayingVideos: Record<string, boolean> = {};
          const newShowOverlay: Record<string, boolean> = {};

          // Pause all other videos
          Object.keys(state.playingVideos).forEach((key) => {
            newPlayingVideos[key] = false;
            newShowOverlay[key] = true;
          });

          // Play the selected video
          newPlayingVideos[videoKey] = true;
          newShowOverlay[videoKey] = false;

          return {
            currentlyPlayingVideo: videoKey,
            playingVideos: newPlayingVideos,
            showOverlay: newShowOverlay,
          };
        }
      });
    },

    // Auto-play functions
    enableAutoPlay: () => {
      set({ isAutoPlayEnabled: true });
      console.log("📱 Auto-play enabled");
    },

    disableAutoPlay: () => {
      set((state) => ({
        isAutoPlayEnabled: false,
        currentlyVisibleVideo: null,
        currentlyPlayingVideo: null,
        playingVideos: {},
        showOverlay: Object.keys(state.playingVideos).reduce(
          (acc, key) => ({
            ...acc,
            [key]: true,
          }),
          {}
        ),
      }));
      console.log("📱 Auto-play disabled, all videos paused");
    },

    handleVideoVisibilityChange: (visibleVideoKey: string | null) => {
      set((state) => {
        if (!state.isAutoPlayEnabled) {
          return state;
        }

        // If no video is visible or same video is still visible, no change needed
        if (visibleVideoKey === state.currentlyVisibleVideo) {
          return state;
        }

        console.log(
          `📱 Video visibility changed: ${state.currentlyVisibleVideo} → ${visibleVideoKey}`
        );

        if (!visibleVideoKey) {
          // No video is visible, pause all
          const newPlayingVideos: Record<string, boolean> = {};
          const newShowOverlay: Record<string, boolean> = {};

          Object.keys(state.playingVideos).forEach((key) => {
            newPlayingVideos[key] = false;
            newShowOverlay[key] = true;
          });

          return {
            ...state,
            currentlyPlayingVideo: null,
            currentlyVisibleVideo: null,
            playingVideos: newPlayingVideos,
            showOverlay: newShowOverlay,
          };
        } else {
          // A new video is visible, pause all others and play this one
          // Stop all audio when video auto-plays
          const audioManager = GlobalAudioInstanceManager.getInstance();
          audioManager.stopAllAudio().catch((err) => {
            console.warn("⚠️ Failed to stop all audio when video auto-played:", err);
          });

          // Stop global audio player store (like CopyrightFreeSongs does)
          try {
            const globalAudioModule = require("./useGlobalAudioPlayerStore");
            const globalAudioStore = globalAudioModule.useGlobalAudioPlayerStore.getState();
            if (globalAudioStore && globalAudioStore.clear) {
              globalAudioStore.clear().catch((err) => {
                console.warn("⚠️ Failed to stop global audio player when video auto-played:", err);
              });
            }
          } catch (error) {
            console.warn("⚠️ Failed to access global audio player store:", error);
          }
          
          // Also pause all audio via global media store (for normal songs using useAdvancedAudioPlayer)
          try {
            const globalMediaModule = require("./useGlobalMediaStore");
            const globalMediaStore = globalMediaModule.useGlobalMediaStore;
            if (globalMediaStore) {
              const state = globalMediaStore.getState();
              // Pause all audio that's currently playing
              Object.keys(state.playingAudio || {}).forEach((audioKey) => {
                if (state.playingAudio[audioKey]) {
                  state.pauseAudio(audioKey);
                }
              });
            }
          } catch (error) {
            // no-op - global media store might not be available
          }

          const newPlayingVideos: Record<string, boolean> = {};
          const newShowOverlay: Record<string, boolean> = {};

          // Pause all other videos
          Object.keys(state.playingVideos).forEach((key) => {
            newPlayingVideos[key] = false;
            newShowOverlay[key] = true;
          });

          // Play the visible video
          newPlayingVideos[visibleVideoKey] = true;
          newShowOverlay[visibleVideoKey] = false;

          console.log(`📱 Auto-playing visible video: ${visibleVideoKey}, stopped all audio`);

          return {
            ...state,
            currentlyPlayingVideo: visibleVideoKey,
            currentlyVisibleVideo: visibleVideoKey,
            playingVideos: newPlayingVideos,
            showOverlay: newShowOverlay,
          };
        }
      });
    },
  }))
);

// Default export for route compatibility
export default function UseGlobalVideoStore() {
  return null;
}
