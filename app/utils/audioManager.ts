import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AudioMode } from "expo-av";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";

interface AudioSessionState {
  isMuted: boolean;
  volume: number;
  lastMuteState: boolean;
  globalMuteEnabled: boolean;
}

class AudioManager {
  private static instance: AudioManager;
  private audioSession: AudioSessionState = {
    isMuted: false,
    volume: 1.0,
    lastMuteState: false,
    globalMuteEnabled: false,
  };
  private listeners: Array<(state: AudioSessionState) => void> = [];
  private audioMode: AudioMode | null = null;

  private constructor() {
    this.initializeAudioSession();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private async initializeAudioSession() {
    try {
      // Load persisted mute state
      const savedMuteState = await AsyncStorage.getItem("audioMuteState");
      if (savedMuteState) {
        const parsed = JSON.parse(savedMuteState);
        this.audioSession.isMuted = parsed.isMuted || false;
        this.audioSession.globalMuteEnabled = parsed.globalMuteEnabled || false;
        this.audioSession.volume = parsed.volume || 1.0;
      }

      // Configure audio session for video playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      console.log("🎵 AudioManager initialized with state:", this.audioSession);
    } catch (error) {
      console.error("❌ Failed to initialize AudioManager:", error);
    }
  }

  // Subscribe to audio state changes
  subscribe(listener: (state: AudioSessionState) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of state changes
  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.audioSession));
  }

  // Toggle mute state
  async toggleMute(): Promise<boolean> {
    try {
      this.audioSession.isMuted = !this.audioSession.isMuted;
      this.audioSession.lastMuteState = this.audioSession.isMuted;

      // Update audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: !this.audioSession.isMuted,
        shouldDuckAndroid: !this.audioSession.isMuted,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      // Persist state
      await this.persistState();

      // Notify listeners
      this.notifyListeners();

      console.log(
        `🔇 Mute ${this.audioSession.isMuted ? "enabled" : "disabled"}`
      );
      return this.audioSession.isMuted;
    } catch (error) {
      console.error("❌ Failed to toggle mute:", error);
      return this.audioSession.isMuted;
    }
  }

  // Set mute state
  async setMute(muted: boolean): Promise<void> {
    if (this.audioSession.isMuted === muted) return;

    try {
      this.audioSession.isMuted = muted;
      this.audioSession.lastMuteState = muted;

      // Update audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: !muted,
        shouldDuckAndroid: !muted,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      // Persist state
      await this.persistState();

      // Notify listeners
      this.notifyListeners();

      console.log(`🔇 Mute ${muted ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("❌ Failed to set mute:", error);
    }
  }

  // Set volume
  async setVolume(volume: number): Promise<void> {
    try {
      this.audioSession.volume = Math.max(0, Math.min(1, volume));

      // Persist state
      await this.persistState();

      // Notify listeners
      this.notifyListeners();

      console.log(`🔊 Volume set to: ${this.audioSession.volume}`);
    } catch (error) {
      console.error("❌ Failed to set volume:", error);
    }
  }

  // Enable/disable global mute (affects all videos)
  async setGlobalMute(enabled: boolean): Promise<void> {
    try {
      this.audioSession.globalMuteEnabled = enabled;

      // Persist state
      await this.persistState();

      // Notify listeners
      this.notifyListeners();

      console.log(`🌍 Global mute ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("❌ Failed to set global mute:", error);
    }
  }

  // Get current state
  getState(): AudioSessionState {
    return { ...this.audioSession };
  }

  // Check if audio is muted
  isMuted(): boolean {
    return this.audioSession.isMuted || this.audioSession.globalMuteEnabled;
  }

  // Get current volume
  getVolume(): number {
    return this.audioSession.volume;
  }

  // Persist state to storage
  private async persistState(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "audioMuteState",
        JSON.stringify({
          isMuted: this.audioSession.isMuted,
          globalMuteEnabled: this.audioSession.globalMuteEnabled,
          volume: this.audioSession.volume,
          lastMuteState: this.audioSession.lastMuteState,
        })
      );
    } catch (error) {
      console.error("❌ Failed to persist audio state:", error);
    }
  }

  // Restore last mute state (useful for app resume)
  async restoreLastMuteState(): Promise<void> {
    try {
      await this.setMute(this.audioSession.lastMuteState);
    } catch (error) {
      console.error("❌ Failed to restore last mute state:", error);
    }
  }

  // Reset to default state
  async reset(): Promise<void> {
    try {
      this.audioSession = {
        isMuted: false,
        volume: 1.0,
        lastMuteState: false,
        globalMuteEnabled: false,
      };

      await this.persistState();
      this.notifyListeners();

      console.log("🔄 AudioManager reset to default state");
    } catch (error) {
      console.error("❌ Failed to reset AudioManager:", error);
    }
  }
}

export default AudioManager;
