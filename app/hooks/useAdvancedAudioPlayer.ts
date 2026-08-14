import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { takePreloadedSound } from "../../src/shared/utils/audioPrefetch";
import {
  resolveAudioDurationMs,
  trackDurationToMs,
} from "../store/audioPlayer/resolveAudioDurationMs";
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
  /** BE duration in seconds — used when expo-av reports durationMillis 0 */
  fallbackDurationSec?: number;
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
    fallbackDurationSec,
    onPlaybackStatusUpdate,
    onError,
    onFinished,
  } = options;

  const soundRef = useRef<Audio.Sound | null>(null);
  const statusUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackDurationMsRef = useRef(trackDurationToMs(fallbackDurationSec));

  useEffect(() => {
    fallbackDurationMsRef.current = trackDurationToMs(fallbackDurationSec);
  }, [fallbackDurationSec]);

  // Keep the latest callback props in refs so we don't have to
  // recreate our internal callbacks/effects on every render.
  const onPlaybackStatusUpdateRef = useRef<
    ((status: AudioPlayerState) => void) | undefined
  >(onPlaybackStatusUpdate);
  const onErrorRef = useRef<((error: string) => void) | undefined>(onError);
  const onFinishedRef = useRef<(() => void) | undefined>(onFinished);

  // Sync refs when callbacks change
  useEffect(() => {
    onPlaybackStatusUpdateRef.current = onPlaybackStatusUpdate;
  }, [onPlaybackStatusUpdate]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    isMuted: false,
    progress: 0,
    duration: trackDurationToMs(fallbackDurationSec),
    position: 0,
    error: null,
  });

  const cleanup = useCallback(async () => {
    if (statusUpdateIntervalRef.current) {
      clearInterval(statusUpdateIntervalRef.current);
      statusUpdateIntervalRef.current = null;
    }
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  }, []);

  const handleStatusUpdate = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        setState((prev) => {
          const duration = resolveAudioDurationMs({
            playerDurationMs: status.durationMillis,
            knownMs: prev.duration,
            trackDurationSec: fallbackDurationMsRef.current / 1000,
          });
          const position = status.positionMillis || 0;
          const newState: AudioPlayerState = {
            isPlaying: status.isPlaying || false,
            isLoading: false,
            isMuted: status.isMuted || false,
            progress: duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0,
            duration,
            position,
            error: null,
          };
          onPlaybackStatusUpdateRef.current?.(newState);
          return newState;
        });
        if (status.didJustFinish) {
          if (statusUpdateIntervalRef.current) {
            clearInterval(statusUpdateIntervalRef.current);
            statusUpdateIntervalRef.current = null;
          }
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            progress: 0,
            position: 0,
          }));
          onFinishedRef.current?.();
        }
      }
    } catch (error) {
      const errorMessage = `Status update error: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onErrorRef.current?.(errorMessage);
    }
  }, []);

  const startStatusUpdates = useCallback(() => {
    if (statusUpdateIntervalRef.current) return;
    statusUpdateIntervalRef.current = setInterval(handleStatusUpdate, 200);
  }, [handleStatusUpdate]);

  const stopStatusUpdates = useCallback(() => {
    if (statusUpdateIntervalRef.current) {
      clearInterval(statusUpdateIntervalRef.current);
      statusUpdateIntervalRef.current = null;
    }
  }, []);

  const ensureAudioMode = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const loadAudio = useCallback(async () => {
    if (!audioUrl || soundRef.current) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await ensureAudioMode();
      const preloaded = takePreloadedSound(audioUrl);
      const sound =
        preloaded ||
        (
          await Audio.Sound.createAsync(
            { uri: audioUrl },
            { shouldPlay: false, isMuted: false, volume, isLooping: loop }
          )
        ).sound;
      if (preloaded) {
        try {
          await sound.setStatusAsync({
            shouldPlay: false,
            isMuted: false,
            volume,
            isLooping: loop,
          });
        } catch {
          // keep going with preloaded defaults
        }
      }
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setState((prev) => {
            const duration = resolveAudioDurationMs({
              playerDurationMs: status.durationMillis,
              knownMs: prev.duration,
              trackDurationSec: fallbackDurationMsRef.current / 1000,
            });
            const position = status.positionMillis || 0;
            const newState: AudioPlayerState = {
              isPlaying: status.isPlaying || false,
              isLoading: false,
              isMuted: status.isMuted || false,
              progress: duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0,
              duration,
              position,
              error: null,
            };
            onPlaybackStatusUpdateRef.current?.(newState);
            return newState;
          });
          if (status.didJustFinish) {
            if (statusUpdateIntervalRef.current) {
              clearInterval(statusUpdateIntervalRef.current);
              statusUpdateIntervalRef.current = null;
            }
            setState((prev) => ({
              ...prev,
              isPlaying: false,
              progress: 0,
              position: 0,
            }));
            onFinishedRef.current?.();
          }
        }
      });
      setState((prev) => ({
        ...prev,
        isLoading: false,
        duration: resolveAudioDurationMs({
          knownMs: prev.duration,
          trackDurationSec: fallbackDurationMsRef.current / 1000,
        }),
      }));
      if (autoPlay) {
        startStatusUpdates();
        try {
          await sound.playAsync();
        } catch {}
      }
    } catch (error) {
      const errorMessage = `Failed to load audio: ${error}`;
      console.warn(errorMessage, { audioUrl });
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onErrorRef.current?.(errorMessage);
    }
  }, [
    audioUrl,
    autoPlay,
    volume,
    loop,
    startStatusUpdates,
    ensureAudioMode,
  ]);

  const play = useCallback(async () => {
    try {
      // If audio is not loaded yet, wait for it to load (should be preloaded, but handle edge case)
      if (!soundRef.current) {
        await loadAudio();
        // Wait a bit for the sound to be ready
        let attempts = 0;
        while (!soundRef.current && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }
      }
      if (!soundRef.current) return;
      
      // Check if already loaded and playing
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        return; // Already playing
      }
      
      setState((prev) => ({ ...prev, isLoading: true }));
      // Ensure any legacy/global audio instances are stopped before starting this one
      try {
        // Runtime require to avoid circular deps if the manager is not used elsewhere
        const audioManagerModule = require("../utils/globalAudioInstanceManager");
        const audioManager = audioManagerModule.default.getInstance();
        audioManager.stopAllAudio().catch(() => {
          // ignore manager errors; local playback will still work
        });
      } catch {
        // manager not available, ignore
      }
      
      // Pause global audio player (copyright-free songs) when normal song starts
      try {
        const globalAudioStoreModule = require("../store/useGlobalAudioPlayerStore");
        const globalAudioStore = globalAudioStoreModule.useGlobalAudioPlayerStore;
        if (globalAudioStore) {
          const state = globalAudioStore.getState();
          if (state.isPlaying && state.soundInstance) {
            await state.pause();
          }
        }
      } catch (error) {
        // no-op - global audio store might not be available
      }

      try {
        const videoStoreModule = require("../store/useGlobalVideoStore");
        const videoStore = videoStoreModule.useGlobalVideoStore.getState();
        videoStore.pauseAllVideosImperatively?.();
      } catch {
        // no-op
      }
      useGlobalMediaStore.getState().playAudio(audioKey);
      await soundRef.current.playAsync();
      setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
      startStatusUpdates();
    } catch (error) {
      const errorMessage = `Play error: ${error}`;
      console.warn(errorMessage, { audioUrl });
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
    }
  }, [audioKey, loadAudio, startStatusUpdates, onError]);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.pauseAsync();
      setState((prev) => ({ ...prev, isPlaying: false }));
      stopStatusUpdates();
      useGlobalMediaStore.getState().pauseAudio(audioKey);
    } catch (error) {
      const errorMessage = `Pause error: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [audioKey, stopStatusUpdates, onError]);

  const togglePlay = useCallback(async () => {
    if (state.isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [state.isPlaying, play, pause]);

  const seekTo = useCallback(
    async (position: number) => {
      if (!soundRef.current) return;
      try {
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;

        const duration = resolveAudioDurationMs({
          playerDurationMs: status.durationMillis,
          knownMs: state.duration,
          trackDurationSec: fallbackDurationMsRef.current / 1000,
        });
        if (duration <= 0) return;

        const clamped = Math.max(0, Math.min(position, 1));
        const positionMillis = clamped * duration;
        await soundRef.current.setPositionAsync(positionMillis);
        setState((prev) => ({
          ...prev,
          position: positionMillis,
          progress: clamped,
          duration,
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
      useGlobalMediaStore.getState().toggleAudioMute(audioKey);
    } catch (error) {
      const errorMessage = `Mute toggle error: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [state.isMuted, audioKey, onError]);

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
      useGlobalMediaStore.getState().pauseAudio(audioKey);
    } catch (error) {
      const errorMessage = `Stop error: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [audioKey, stopStatusUpdates, onError]);

  useEffect(() => {
    const isGloballyPlaying =
      useGlobalMediaStore.getState().playingAudio[audioKey] || false;
    if (!isGloballyPlaying && state.isPlaying) {
      pause();
    }
  }, [state.isPlaying, audioKey, pause]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Preload audio immediately when URL is available (not wait for play click)
  useEffect(() => {
    if (audioUrl && !soundRef.current) {
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
