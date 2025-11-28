import { Audio } from "expo-av";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: any; // Can be require() or URL string
  thumbnailUrl: any;
  duration: number;
  category?: string;
  description?: string;
}

interface GlobalAudioPlayerState {
  // Current track
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  isMuted: boolean;
  
  // Playback state
  position: number; // in milliseconds
  duration: number; // in milliseconds
  progress: number; // 0-1
  
  // Audio instance
  soundInstance: Audio.Sound | null;
  
  // Queue (for future playlist support)
  queue: AudioTrack[];
  currentIndex: number;
  
  // Actions
  setTrack: (track: AudioTrack) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seek: (position: number) => Promise<void>; // position in milliseconds
  seekToProgress: (progress: number) => Promise<void>; // progress 0-1
  setMuted: (muted: boolean) => Promise<void>;
  toggleMute: () => Promise<void>;
  stop: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  clear: () => Promise<void>;
  
  // Internal state setters
  setPlaying: (playing: boolean) => void;
  setLoading: (loading: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setProgressValue: (progress: number) => void;
}

export const useGlobalAudioPlayerStore = create<GlobalAudioPlayerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTrack: null,
      isPlaying: false,
      isLoading: false,
      isMuted: false,
      position: 0,
      duration: 0,
      progress: 0,
      soundInstance: null,
      queue: [],
      currentIndex: -1,

      setTrack: async (track: AudioTrack) => {
        const { stop, soundInstance } = get();
        
        // Stop current track if playing
        if (soundInstance) {
          try {
            await soundInstance.unloadAsync();
          } catch (error) {
            console.warn("Error unloading previous audio:", error);
          }
        }

        set({
          currentTrack: track,
          isPlaying: false,
          isLoading: true,
          position: 0,
          progress: 0,
          soundInstance: null,
        });

        try {
          // Configure audio mode for background playback
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true, // Enable background playback
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });

          // Create new audio instance
          const { sound } = await Audio.Sound.createAsync(
            track.audioUrl,
            {
              shouldPlay: false,
              isMuted: get().isMuted,
            },
            (status) => {
              if (status.isLoaded) {
                const newPosition = status.positionMillis || 0;
                const newDuration = status.durationMillis || 0;
                const newProgress = newDuration > 0 ? newPosition / newDuration : 0;

                set({
                  position: newPosition,
                  duration: newDuration,
                  progress: newProgress,
                  isPlaying: status.isPlaying,
                });

                // Handle playback completion
                if (status.didJustFinish) {
                  get().next();
                }
              }
            }
          );

          set({
            soundInstance: sound,
            isLoading: false,
            duration: track.duration * 1000, // Convert to milliseconds
          });
        } catch (error) {
          console.error("Error loading audio track:", error);
          set({
            isLoading: false,
            currentTrack: null,
            soundInstance: null,
          });
        }
      },

      play: async () => {
        const { soundInstance } = get();
        if (soundInstance) {
          try {
            await soundInstance.playAsync();
            set({ isPlaying: true });
          } catch (error) {
            console.error("Error playing audio:", error);
          }
        }
      },

      pause: async () => {
        const { soundInstance } = get();
        if (soundInstance) {
          try {
            await soundInstance.pauseAsync();
            set({ isPlaying: false });
          } catch (error) {
            console.error("Error pausing audio:", error);
          }
        }
      },

      togglePlayPause: async () => {
        const { isPlaying, play, pause } = get();
        if (isPlaying) {
          await pause();
        } else {
          await play();
        }
      },

      seek: async (position: number) => {
        const { soundInstance, duration } = get();
        if (soundInstance && duration > 0) {
          const clampedPosition = Math.max(0, Math.min(position, duration));
          try {
            await soundInstance.setPositionAsync(clampedPosition);
            const progress = duration > 0 ? clampedPosition / duration : 0;
            set({ position: clampedPosition, progress });
          } catch (error) {
            console.error("Error seeking audio:", error);
          }
        }
      },

      seekToProgress: async (progress: number) => {
        const { duration, seek } = get();
        if (duration > 0) {
          const position = progress * duration;
          await seek(position);
        }
      },

      setMuted: async (muted: boolean) => {
        const { soundInstance } = get();
        if (soundInstance) {
          try {
            await soundInstance.setIsMutedAsync(muted);
            set({ isMuted: muted });
          } catch (error) {
            console.error("Error setting mute:", error);
          }
        } else {
          set({ isMuted: muted });
        }
      },

      toggleMute: async () => {
        const { isMuted, setMuted } = get();
        await setMuted(!isMuted);
      },

      stop: async () => {
        const { soundInstance, pause, clear } = get();
        if (soundInstance) {
          try {
            await pause();
            await soundInstance.setPositionAsync(0);
          } catch (error) {
            console.error("Error stopping audio:", error);
          }
        }
        set({ position: 0, progress: 0 });
      },

      next: async () => {
        const { queue, currentIndex, setTrack } = get();
        if (queue.length > 0 && currentIndex < queue.length - 1) {
          const nextIndex = currentIndex + 1;
          const nextTrack = queue[nextIndex];
          set({ currentIndex: nextIndex });
          await setTrack(nextTrack);
          await get().play();
        } else {
          // End of queue - just stop
          await get().stop();
        }
      },

      previous: async () => {
        const { queue, currentIndex, setTrack } = get();
        if (queue.length > 0 && currentIndex > 0) {
          const prevIndex = currentIndex - 1;
          const prevTrack = queue[prevIndex];
          set({ currentIndex: prevIndex });
          await setTrack(prevTrack);
          await get().play();
        } else {
          // Beginning of queue - restart current track
          await get().seek(0);
        }
      },

      clear: async () => {
        const { soundInstance, stop } = get();
        await stop();
        if (soundInstance) {
          try {
            await soundInstance.unloadAsync();
          } catch (error) {
            console.warn("Error unloading audio:", error);
          }
        }
        set({
          currentTrack: null,
          soundInstance: null,
          queue: [],
          currentIndex: -1,
          position: 0,
          duration: 0,
          progress: 0,
        });
      },

      // Internal setters
      setPlaying: (playing: boolean) => set({ isPlaying: playing }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setPosition: (position: number) => {
        const { duration } = get();
        const progress = duration > 0 ? position / duration : 0;
        set({ position, progress });
      },
      setDuration: (duration: number) => set({ duration }),
      setProgressValue: (progress: number) => {
        const { duration } = get();
        const position = duration * progress;
        set({ progress, position });
      },
    }),
    {
      name: "@jevahapp_global_audio_player",
      partialize: (state) => ({
        // Only persist minimal state - don't persist soundInstance
        currentTrack: state.currentTrack,
        isMuted: state.isMuted,
        queue: state.queue,
        currentIndex: state.currentIndex,
      }),
    }
  )
);

