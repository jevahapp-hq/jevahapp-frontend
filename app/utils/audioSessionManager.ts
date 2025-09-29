import { Audio } from "expo-av";
import { Platform } from "react-native";

/**
 * Advanced Audio Session Manager
 * Handles audio session configuration for optimal playback experience
 */
export class AudioSessionManager {
  private static instance: AudioSessionManager;
  private isConfigured = false;
  private currentMode: "video" | "audio" | "mixed" | null = null;

  private constructor() {}

  static getInstance(): AudioSessionManager {
    if (!AudioSessionManager.instance) {
      AudioSessionManager.instance = new AudioSessionManager();
    }
    return AudioSessionManager.instance;
  }

  /**
   * Configure audio session for video playback
   */
  async configureForVideo(): Promise<boolean> {
    try {
      console.log("🎬 Configuring audio session for video playback...");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: Platform.OS === "ios",
        shouldDuckAndroid: Platform.OS === "android",
        playThroughEarpieceAndroid: false,
      });

      this.isConfigured = true;
      this.currentMode = "video";
      console.log("✅ Audio session configured for video playback");
      return true;
    } catch (error) {
      console.error("❌ Failed to configure audio session for video:", error);
      return false;
    }
  }

  /**
   * Configure audio session for music/audio playback
   */
  async configureForAudio(): Promise<boolean> {
    try {
      console.log("🎵 Configuring audio session for audio playback...");

      // Use minimal configuration to avoid compatibility issues
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: Platform.OS === "ios",
        shouldDuckAndroid: Platform.OS === "android",
        playThroughEarpieceAndroid: false,
      });

      this.isConfigured = true;
      this.currentMode = "audio";
      console.log("✅ Audio session configured for audio playback");
      return true;
    } catch (error) {
      console.error("❌ Failed to configure audio session for audio:", error);
      return false;
    }
  }

  /**
   * Configure audio session for mixed content (videos with audio)
   */
  async configureForMixed(): Promise<boolean> {
    try {
      console.log("🎭 Configuring audio session for mixed content...");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: Platform.OS === "ios",
        shouldDuckAndroid: Platform.OS === "android",
        playThroughEarpieceAndroid: false,
      });

      this.isConfigured = true;
      this.currentMode = "mixed";
      console.log("✅ Audio session configured for mixed content");
      return true;
    } catch (error) {
      console.error(
        "❌ Failed to configure audio session for mixed content:",
        error
      );
      return false;
    }
  }

  /**
   * Reset audio session to default state
   */
  async reset(): Promise<boolean> {
    try {
      console.log("🔄 Resetting audio session...");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      this.isConfigured = false;
      this.currentMode = null;
      console.log("✅ Audio session reset");
      return true;
    } catch (error) {
      console.error("❌ Failed to reset audio session:", error);
      return false;
    }
  }

  /**
   * Get current configuration status
   */
  getStatus(): { isConfigured: boolean; currentMode: string | null } {
    return {
      isConfigured: this.isConfigured,
      currentMode: this.currentMode,
    };
  }

  /**
   * Auto-configure based on content type
   */
  async autoConfigure(
    contentType: "video" | "audio" | "mixed"
  ): Promise<boolean> {
    switch (contentType) {
      case "video":
        return await this.configureForVideo();
      case "audio":
        return await this.configureForAudio();
      case "mixed":
        return await this.configureForMixed();
      default:
        console.warn(
          "⚠️ Unknown content type for audio configuration:",
          contentType
        );
        return false;
    }
  }
}

// Export singleton instance
export const audioSessionManager = AudioSessionManager.getInstance();

// Convenience functions
export const configureAudioForVideo = () =>
  audioSessionManager.configureForVideo();
export const configureAudioForMusic = () =>
  audioSessionManager.configureForAudio();
export const configureAudioForMixed = () =>
  audioSessionManager.configureForMixed();
export const resetAudioSession = () => audioSessionManager.reset();
export const getAudioSessionStatus = () => audioSessionManager.getStatus();
