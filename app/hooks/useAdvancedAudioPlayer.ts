import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGlobalMediaStore } from "../store/useGlobalMediaStore";

export interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  isMuted: boolean;
  progress: number;
  duration: number;
  position: number;
  error: string | null;
}

export interface AudioPlayerControls {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  toggleMute: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  stop: () => Promise<void>;
}

export interface UseAdvancedAudioPlayerOptions {
  audioKey: string;
  autoPlay?: boolean;
  loop?: boolean;
  volume?: number;
  onPlaybackStatusUpdate?: (status: AudioPlayerState) => void;
  onError?: (error: string) => void;
  onFinished?: () => void;
}

export const useAdvancedAudioPlayer = (
  audioUrl: string | null,
  options: UseAdvancedAudioPlayerOptions
): [AudioPlayerState, AudioPlayerControls] => {
  const {
    audioKey,
    autoPlay = false,
    loop = false,
    volume = 1.0,
    onPlaybackStatusUpdate,
    onError,
    onFinished,
  } = options;

  const globalMediaStore = useGlobalMediaStore();
  const soundRef = useRef<Audio.Sound | null>(null);
  const statusUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    isMuted: false,
    progress: 0,
    duration: 0,
    position: 0,
    error: null,
  });

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (statusUpdateIntervalRef.current) {
      clearInterval(statusUpdateIntervalRef.current);
      statusUpdateIntervalRef.current = null;
    }

    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.warn("Error unloading sound:", error);
      }
      soundRef.current = null;
    }
  }, []);

  // Status update handler
  const handleStatusUpdate = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      const status = await soundRef.current.getStatusAsync();

      if (status.isLoaded) {
        const newState: AudioPlayerState = {
          isPlaying: status.isPlaying || false,
          isLoading: false,
          isMuted: status.isMuted || false,
          progress: status.durationMillis
            ? (status.positionMillis || 0) / status.durationMillis
            : 0,
          duration: status.durationMillis || 0,
          position: status.positionMillis || 0,
          error: null,
        };

        setState(newState);
        onPlaybackStatusUpdate?.(newState);

        // Handle completion
        if (status.didJustFinish) {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            progress: 0,
            position: 0,
          }));
          onFinished?.();
        }
      }
    } catch (error) {
      const errorMessage = `Status update error: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
    }
  }, [onPlaybackStatusUpdate, onError, onFinished]);

  // Start status updates
  const startStatusUpdates = useCallback(() => {
    if (statusUpdateIntervalRef.current) return;

    statusUpdateIntervalRef.current = setInterval(handleStatusUpdate, 100);
  }, [handleStatusUpdate]);

  // Stop status updates
  const stopStatusUpdates = useCallback(() => {
    if (statusUpdateIntervalRef.current) {
      clearInterval(statusUpdateIntervalRef.current);
      statusUpdateIntervalRef.current = null;
    }
  }, []);

  // Load audio
  const loadAudio = useCallback(async () => {
    if (!audioUrl || soundRef.current) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        {
          shouldPlay: autoPlay,
          isMuted: false,
          volume: volume,
          isLooping: loop,
        }
      );

      soundRef.current = sound;

      // Set up status update listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          const newState: AudioPlayerState = {
            isPlaying: status.isPlaying || false,
            isLoading: false,
            isMuted: status.isMuted || false,
            progress: status.durationMillis
              ? (status.positionMillis || 0) / status.durationMillis
              : 0,
            duration: status.durationMillis || 0,
            position: status.positionMillis || 0,
            error: null,
          };

          setState(newState);
          onPlaybackStatusUpdate?.(newState);

          if (status.didJustFinish) {
            setState((prev) => ({
              ...prev,
              isPlaying: false,
              progress: 0,
              position: 0,
            }));
            onFinished?.();
          }
        }
      });

      setState((prev) => ({ ...prev, isLoading: false }));

      if (autoPlay) {
        startStatusUpdates();
      }
    } catch (error) {
      const errorMessage = `Failed to load audio: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
    }
  }, [
    audioUrl,
    autoPlay,
    volume,
    loop,
    onPlaybackStatusUpdate,
    onError,
    onFinished,
    startStatusUpdates,
  ]);

  // Controls
  const play = useCallback(async () => {
    if (!soundRef.current) {
      await loadAudio();
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Pause all other media globally
      globalMediaStore.playMediaGlobally(audioKey, "audio");

      await soundRef.current.playAsync();
      setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
      startStatusUpdates();
    } catch (error) {
      const errorMessage = `Play error: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
    }
  }, [audioKey, globalMediaStore, loadAudio, startStatusUpdates, onError]);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.pauseAsync();
      setState((prev) => ({ ...prev, isPlaying: false }));
      stopStatusUpdates();
      globalMediaStore.pauseAudio(audioKey);
    } catch (error) {
      const errorMessage = `Pause error: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [audioKey, globalMediaStore, stopStatusUpdates, onError]);

  const togglePlay = useCallback(async () => {
    if (state.isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [state.isPlaying, play, pause]);

  const seekTo = useCallback(
    async (position: number) => {
      if (!soundRef.current || state.duration === 0) return;

      try {
        const positionMillis = position * state.duration;
        await soundRef.current.setPositionAsync(positionMillis);
        setState((prev) => ({
          ...prev,
          position: positionMillis,
          progress: position,
        }));
      } catch (error) {
        const errorMessage = `Seek error: ${error}`;
        setState((prev) => ({ ...prev, error: errorMessage }));
        onError?.(errorMessage);
      }
    },
    [state.duration, onError]
  );

  const toggleMute = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      const newMutedState = !state.isMuted;
      await soundRef.current.setIsMutedAsync(newMutedState);
      setState((prev) => ({ ...prev, isMuted: newMutedState }));
      globalMediaStore.toggleAudioMute(audioKey);
    } catch (error) {
      const errorMessage = `Mute toggle error: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [state.isMuted, audioKey, globalMediaStore, onError]);

  const setVolume = useCallback(
    async (newVolume: number) => {
      if (!soundRef.current) return;

      try {
        await soundRef.current.setVolumeAsync(newVolume);
      } catch (error) {
        const errorMessage = `Volume set error: ${error}`;
        setState((prev) => ({ ...prev, error: errorMessage }));
        onError?.(errorMessage);
      }
    },
    [onError]
  );

  const stop = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.stopAsync();
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        progress: 0,
        position: 0,
      }));
      stopStatusUpdates();
      globalMediaStore.pauseAudio(audioKey);
    } catch (error) {
      const errorMessage = `Stop error: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [audioKey, globalMediaStore, stopStatusUpdates, onError]);

  // Sync with global store
  useEffect(() => {
    const isGloballyPlaying = globalMediaStore.playingAudio[audioKey] || false;

    if (isGloballyPlaying !== state.isPlaying && soundRef.current) {
      if (isGloballyPlaying) {
        startStatusUpdates();
      } else {
        stopStatusUpdates();
      }
    }
  }, [
    globalMediaStore.playingAudio,
    audioKey,
    state.isPlaying,
    startStatusUpdates,
    stopStatusUpdates,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Load audio when URL changes
  useEffect(() => {
    if (audioUrl) {
      loadAudio();
    }
  }, [audioUrl, loadAudio]);

  const controls: AudioPlayerControls = {
    play,
    pause,
    togglePlay,
    seekTo,
    toggleMute,
    setVolume,
    stop,
  };

  return [state, controls];
};
