import { useEffect, useState } from "react";
import AudioManager from "../utils/audioManager";

interface AudioSessionState {
  isMuted: boolean;
  volume: number;
  lastMuteState: boolean;
  globalMuteEnabled: boolean;
}

export const useAudioManager = () => {
  const [audioState, setAudioState] = useState<AudioSessionState>(() =>
    AudioManager.getInstance().getState()
  );

  useEffect(() => {
    const audioManager = AudioManager.getInstance();

    // Subscribe to audio state changes
    const unsubscribe = audioManager.subscribe((state) => {
      setAudioState(state);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const toggleMute = async () => {
    const audioManager = AudioManager.getInstance();
    await audioManager.toggleMute();
  };

  const setMute = async (muted: boolean) => {
    const audioManager = AudioManager.getInstance();
    await audioManager.setMute(muted);
  };

  const setVolume = async (volume: number) => {
    const audioManager = AudioManager.getInstance();
    await audioManager.setVolume(volume);
  };

  const setGlobalMute = async (enabled: boolean) => {
    const audioManager = AudioManager.getInstance();
    await audioManager.setGlobalMute(enabled);
  };

  const isMuted = () => {
    const audioManager = AudioManager.getInstance();
    return audioManager.isMuted();
  };

  const getVolume = () => {
    const audioManager = AudioManager.getInstance();
    return audioManager.getVolume();
  };

  const restoreLastMuteState = async () => {
    const audioManager = AudioManager.getInstance();
    await audioManager.restoreLastMuteState();
  };

  const reset = async () => {
    const audioManager = AudioManager.getInstance();
    await audioManager.reset();
  };

  return {
    audioState,
    toggleMute,
    setMute,
    setVolume,
    setGlobalMute,
    isMuted,
    getVolume,
    restoreLastMuteState,
    reset,
  };
};
