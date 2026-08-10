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

  const soundRef = useRef<Audio.Sound | null>(null);
  const statusUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Intentional play/pause — status callbacks must not flip the icon back
  // while pauseAsync is slow or hung (common with flaky remote URLs).
  const wantPlayingRef = useRef(false);

  const onPlaybackStatusUpdateRef = useRef<
    ((status: AudioPlayerState) => void) | undefined
  >(onPlaybackStatusUpdate);
  const onErrorRef = useRef<((error: string) => void) | undefined>(onError);
  const onFinishedRef = useRef<(() => void) | undefined>(onFinished);

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
    duration: 0,
    position: 0,
    error: null,
  });

  const cleanup = useCallback(async () => {
    wantPlayingRef.current = false;
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

  const applyLoadedStatus = useCallback(
    (status: {
      isPlaying?: boolean;
      isMuted?: boolean;
      durationMillis?: number | null;
      positionMillis?: number;
      didJustFinish?: boolean;
    }) => {
      const reportedPlaying = !!status.isPlaying && wantPlayingRef.current;
      const newState: AudioPlayerState = {
        isPlaying: reportedPlaying,
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
      onPlaybackStatusUpdateRef.current?.(newState);
      if (status.didJustFinish) {
        wantPlayingRef.current = false;
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          progress: 0,
          position: 0,
        }));
        onFinishedRef.current?.();
      }
    },
    []
  );

  const handleStatusUpdate = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        applyLoadedStatus(status);
      }
    } catch (error) {
      const errorMessage = `Status update error: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
      onErrorRef.current?.(errorMessage);
    }
  }, [applyLoadedStatus]);

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
    } catch {
      // ignore
    }
  }, []);

  const loadAudio = useCallback(async () => {
    if (!audioUrl || soundRef.current) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await ensureAudioMode();
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false, isMuted: false, volume, isLooping: loop }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          applyLoadedStatus(status);
        }
      });
      setState((prev) => ({ ...prev, isLoading: false }));
      if (autoPlay) {
        wantPlayingRef.current = true;
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
    applyLoadedStatus,
  ]);

  const play = useCallback(async () => {
    try {
      if (!soundRef.current) {
        await loadAudio();
        let attempts = 0;
        while (!soundRef.current && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          attempts++;
        }
      }
      if (!soundRef.current) return;

      wantPlayingRef.current = true;
      setState((prev) => ({ ...prev, isPlaying: true, isLoading: true }));

      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        setState((prev) => ({ ...prev, isLoading: false }));
        startStatusUpdates();
        return;
      }

      try {
        const audioManagerModule = require("../utils/globalAudioInstanceManager");
        const audioManager = audioManagerModule.default.getInstance();
        audioManager.stopAllAudio().catch(() => {});
      } catch {
        // manager not available
      }

      try {
        const globalAudioStoreModule = require("../store/useGlobalAudioPlayerStore");
        const globalAudioStore = globalAudioStoreModule.useGlobalAudioPlayerStore;
        if (globalAudioStore) {
          const storeState = globalAudioStore.getState();
          if (storeState.isPlaying && storeState.soundInstance) {
            await storeState.pause();
          }
        }
      } catch {
        // no-op
      }

      useGlobalMediaStore.getState().playMediaGlobally(audioKey, "audio");
      await soundRef.current.playAsync();
      setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
      startStatusUpdates();
    } catch (error) {
      wantPlayingRef.current = false;
      const errorMessage = `Play error: ${error}`;
      console.warn(errorMessage, { audioUrl });
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        error: errorMessage,
        isLoading: false,
      }));
      onError?.(errorMessage);
    }
  }, [audioKey, loadAudio, startStatusUpdates, onError, audioUrl]);

  const pause = useCallback(async () => {
    // Optimistic UI — icon flips even if AV pause hangs on bad network.
    wantPlayingRef.current = false;
    setState((prev) => ({ ...prev, isPlaying: false }));
    stopStatusUpdates();
    useGlobalMediaStore.getState().pauseAudio(audioKey);
    if (!soundRef.current) return;
    try {
      await soundRef.current.pauseAsync();
    } catch (error) {
      const errorMessage = `Pause error: ${error}`;
      setState((prev) => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [audioKey, stopStatusUpdates, onError]);

  const togglePlay = useCallback(async () => {
    if (wantPlayingRef.current) {
      await pause();
      return;
    }
    await play();
  }, [play, pause]);

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
    wantPlayingRef.current = false;
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      progress: 0,
      position: 0,
    }));
    stopStatusUpdates();
    useGlobalMediaStore.getState().pauseAudio(audioKey);
    if (!soundRef.current) return;
    try {
      await soundRef.current.stopAsync();
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
