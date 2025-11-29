import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ⚠️ DEPRECATED: This store is being replaced by useMediaPlaybackStore.tsx
// Please use the unified store for new components.
// This store will be removed once all components are migrated.

interface GlobalMediaState {
  // Currently playing media (video or audio)
  currentlyPlayingMedia: string | null;
  currentlyPlayingType: "video" | "audio" | null;

  // Video state
  playingVideos: Record<string, boolean>;
  showOverlay: Record<string, boolean>;
  mutedVideos: Record<string, boolean>;
  progresses: Record<string, number>;
  hasCompleted: Record<string, boolean>;

  // Audio state
  playingAudio: Record<string, boolean>;
  audioProgress: Record<string, number>;
  audioDuration: Record<string, number>;
  audioMuted: Record<string, boolean>;

  // Actions
  playVideo: (videoKey: string) => void;
  pauseVideo: (videoKey: string) => void;
  pauseAllVideos: () => void;
  toggleVideoMute: (videoKey: string) => void;
  setVideoProgress: (videoKey: string, progress: number) => void;
  setVideoCompleted: (videoKey: string, completed: boolean) => void;
  setOverlayVisible: (videoKey: string, visible: boolean) => void;

  // Audio actions
  playAudio: (audioKey: string) => void;
  pauseAudio: (audioKey: string) => void;
  pauseAllAudio: () => void;
  setAudioProgress: (audioKey: string, progress: number) => void;
  setAudioDuration: (audioKey: string, duration: number) => void;
  toggleAudioMute: (audioKey: string) => void;

  // Global media control - ensures only one media plays at a time
  playMediaGlobally: (mediaKey: string, type: "video" | "audio") => void;
  pauseAllMedia: () => void;

  // Auto-play control
  isAutoPlayEnabled: boolean;
  enableAutoPlay: () => void;
  disableAutoPlay: () => void;
}

export const useGlobalMediaStore = create<GlobalMediaState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentlyPlayingMedia: null,
    currentlyPlayingType: null,

    // Video state
    playingVideos: {},
    showOverlay: {},
    mutedVideos: {},
    progresses: {},
    hasCompleted: {},

    // Audio state
    playingAudio: {},
    audioProgress: {},
    audioDuration: {},
    audioMuted: {},

    // Auto-play disabled by default
    isAutoPlayEnabled: false,

    // Video actions
    playVideo: (videoKey: string) => {
      set((state) => ({
        currentlyPlayingMedia: videoKey,
        currentlyPlayingType: "video",
        playingVideos: { ...state.playingVideos, [videoKey]: true },
        showOverlay: { ...state.showOverlay, [videoKey]: false },
      }));
    },

    pauseVideo: (videoKey: string) => {
      set((state) => ({
        currentlyPlayingMedia:
          state.currentlyPlayingMedia === videoKey
            ? null
            : state.currentlyPlayingMedia,
        currentlyPlayingType:
          state.currentlyPlayingMedia === videoKey
            ? null
            : state.currentlyPlayingType,
        playingVideos: { ...state.playingVideos, [videoKey]: false },
        showOverlay: { ...state.showOverlay, [videoKey]: true },
      }));
    },

    pauseAllVideos: () => {
      set((state) => {
        const newPlayingVideos: Record<string, boolean> = {};
        const newShowOverlay: Record<string, boolean> = {};

        Object.keys(state.playingVideos).forEach((key) => {
          newPlayingVideos[key] = false;
          newShowOverlay[key] = true;
        });

        return {
          currentlyPlayingMedia:
            state.currentlyPlayingType === "video"
              ? null
              : state.currentlyPlayingMedia,
          currentlyPlayingType:
            state.currentlyPlayingType === "video"
              ? null
              : state.currentlyPlayingType,
          playingVideos: newPlayingVideos,
          showOverlay: newShowOverlay,
        };
      });
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

    // Audio actions
    playAudio: (audioKey: string) => {
      set((state) => ({
        currentlyPlayingMedia: audioKey,
        currentlyPlayingType: "audio",
        playingAudio: { ...state.playingAudio, [audioKey]: true },
      }));
    },

    pauseAudio: (audioKey: string) => {
      set((state) => ({
        currentlyPlayingMedia:
          state.currentlyPlayingMedia === audioKey
            ? null
            : state.currentlyPlayingMedia,
        currentlyPlayingType:
          state.currentlyPlayingMedia === audioKey
            ? null
            : state.currentlyPlayingType,
        playingAudio: { ...state.playingAudio, [audioKey]: false },
      }));
    },

    pauseAllAudio: () => {
      set((state) => {
        const newPlayingAudio: Record<string, boolean> = {};

        Object.keys(state.playingAudio).forEach((key) => {
          newPlayingAudio[key] = false;
        });

        return {
          currentlyPlayingMedia:
            state.currentlyPlayingType === "audio"
              ? null
              : state.currentlyPlayingMedia,
          currentlyPlayingType:
            state.currentlyPlayingType === "audio"
              ? null
              : state.currentlyPlayingType,
          playingAudio: newPlayingAudio,
        };
      });
    },

    setAudioProgress: (audioKey: string, progress: number) => {
      set((state) => ({
        audioProgress: { ...state.audioProgress, [audioKey]: progress },
      }));
    },

    setAudioDuration: (audioKey: string, duration: number) => {
      set((state) => ({
        audioDuration: { ...state.audioDuration, [audioKey]: duration },
      }));
    },

    toggleAudioMute: (audioKey: string) => {
      set((state) => ({
        audioMuted: {
          ...state.audioMuted,
          [audioKey]: !state.audioMuted[audioKey],
        },
      }));
    },

    // Global media control - ensures only one media plays at a time
    playMediaGlobally: (mediaKey: string, type: "video" | "audio") => {
      // Use runtime require to avoid circular dependencies
      if (type === "video") {
        // Stop all audio when video starts
        try {
          const audioManagerModule = require("../utils/globalAudioInstanceManager");
          const audioManager = audioManagerModule.default.getInstance();
          audioManager.stopAllAudio().catch((err) => {
            console.warn("⚠️ Failed to stop all audio when video started:", err);
          });
        } catch (error) {
          console.warn("⚠️ Failed to access audio manager:", error);
        }
        
        // Use the video store's global play function which handles everything
        try {
          const videoStoreModule = require("./useGlobalVideoStore");
          const videoStore = videoStoreModule.useGlobalVideoStore.getState();
          if (videoStore && videoStore.playVideoGlobally) {
            videoStore.playVideoGlobally(mediaKey);
            return; // Early return, video store handles state
          }
        } catch (error) {
          console.warn("⚠️ Failed to access video store:", error);
        }
      } else {
        // Pause all videos when audio starts
        try {
          const videoStoreModule = require("./useGlobalVideoStore");
          const videoStore = videoStoreModule.useGlobalVideoStore.getState();
          if (videoStore && videoStore.pauseAllVideosImperatively) {
            videoStore.pauseAllVideosImperatively();
          }
        } catch (error) {
          console.warn("⚠️ Failed to pause videos when audio started:", error);
        }
      }
      
      // Fallback to state-only update if stores are not available
      set((state) => {
        const isCurrentlyPlaying =
          type === "video"
            ? state.playingVideos[mediaKey] ?? false
            : state.playingAudio[mediaKey] ?? false;

        if (isCurrentlyPlaying) {
          // If media is already playing, pause it
          if (type === "video") {
            return {
              currentlyPlayingMedia: null,
              currentlyPlayingType: null,
              playingVideos: { ...state.playingVideos, [mediaKey]: false },
              showOverlay: { ...state.showOverlay, [mediaKey]: true },
            };
          } else {
            return {
              currentlyPlayingMedia: null,
              currentlyPlayingType: null,
              playingAudio: { ...state.playingAudio, [mediaKey]: false },
            };
          }
        } else {
          // Pause all other media and play this one
          const newPlayingVideos: Record<string, boolean> = {};
          const newShowOverlay: Record<string, boolean> = {};
          const newPlayingAudio: Record<string, boolean> = {};

          // Pause all videos
          Object.keys(state.playingVideos).forEach((key) => {
            newPlayingVideos[key] = false;
            newShowOverlay[key] = true;
          });

          // Pause all audio
          Object.keys(state.playingAudio).forEach((key) => {
            newPlayingAudio[key] = false;
          });

          // Play the selected media
          if (type === "video") {
            newPlayingVideos[mediaKey] = true;
            newShowOverlay[mediaKey] = false;
          } else {
            newPlayingAudio[mediaKey] = true;
          }

          console.log(
            `🌍 Global media control: Playing ${type} ${mediaKey}, paused all others`
          );

          return {
            currentlyPlayingMedia: mediaKey,
            currentlyPlayingType: type,
            playingVideos: newPlayingVideos,
            showOverlay: newShowOverlay,
            playingAudio: newPlayingAudio,
          };
        }
      });
    },

    pauseAllMedia: () => {
      set((state) => {
        const newPlayingVideos: Record<string, boolean> = {};
        const newShowOverlay: Record<string, boolean> = {};
        const newPlayingAudio: Record<string, boolean> = {};

        // Pause all videos
        Object.keys(state.playingVideos).forEach((key) => {
          newPlayingVideos[key] = false;
          newShowOverlay[key] = true;
        });

        // Pause all audio
        Object.keys(state.playingAudio).forEach((key) => {
          newPlayingAudio[key] = false;
        });

        return {
          currentlyPlayingMedia: null,
          currentlyPlayingType: null,
          playingVideos: newPlayingVideos,
          showOverlay: newShowOverlay,
          playingAudio: newPlayingAudio,
        };
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
        currentlyPlayingMedia: null,
        currentlyPlayingType: null,
        playingVideos: {},
        playingAudio: {},
        showOverlay: Object.keys(state.playingVideos).reduce(
          (acc, key) => ({
            ...acc,
            [key]: true,
          }),
          {}
        ),
      }));
      console.log("📱 Auto-play disabled, all media paused");
    },
  }))
);

// Default export for route compatibility
export default function UseGlobalMediaStore() {
  return null;
}
