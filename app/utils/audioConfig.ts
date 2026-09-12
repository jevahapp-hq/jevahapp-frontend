import { setAudioModeAsync, type AudioMode } from "expo-audio";
import { Platform } from "react-native";

function mode(partial: Partial<AudioMode>): Partial<AudioMode> {
  return {
    allowsRecording: false,
    shouldRouteThroughEarpiece: false,
    ...partial,
  };
}

/**
 * Centralized audio configuration utility
 * Prevents audio session initialization errors by using correct constants
 */
export const audioConfig = {
  /**
   * Configure audio session for video playback
   */
  async configureForVideoPlayback() {
    try {
      console.log("🔊 Configuring audio session for video playback...");

      await setAudioModeAsync(
        mode({
          shouldPlayInBackground: false,
          playsInSilentMode: Platform.OS === "ios",
          interruptionMode: "doNotMix",
        })
      );

      console.log("✅ Audio session configured successfully for video playback");
      return true;
    } catch (error) {
      console.error("❌ Failed to configure audio session for video playback:", error);
      return false;
    }
  },

  /**
   * Configure audio session for music playback
   */
  async configureForMusicPlayback() {
    try {
      console.log("🎵 Configuring audio session for music playback...");

      await setAudioModeAsync(
        mode({
          shouldPlayInBackground: true,
          playsInSilentMode: Platform.OS === "ios",
          interruptionMode: "doNotMix",
        })
      );

      console.log("✅ Audio session configured successfully for music playback");
      return true;
    } catch (error) {
      console.error("❌ Failed to configure audio session for music playback:", error);
      return false;
    }
  },

  /**
   * Configure audio session for general use
   */
  async configureForGeneralUse() {
    try {
      console.log("🔊 Configuring audio session for general use...");

      await setAudioModeAsync(
        mode({
          shouldPlayInBackground: false,
          playsInSilentMode: Platform.OS === "ios",
          interruptionMode: "doNotMix",
        })
      );

      console.log("✅ Audio session configured successfully for general use");
      return true;
    } catch (error) {
      console.error("❌ Failed to configure audio session for general use:", error);
      return false;
    }
  },

  /**
   * Reset audio session to default
   */
  async resetAudioSession() {
    try {
      console.log("🔄 Resetting audio session...");

      await setAudioModeAsync(
        mode({
          shouldPlayInBackground: false,
          playsInSilentMode: false,
          interruptionMode: "mixWithOthers",
        })
      );

      console.log("✅ Audio session reset successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to reset audio session:", error);
      return false;
    }
  },

  /**
   * Get audio session status
   */
  async getAudioSessionStatus() {
    return null;
  },
};

export const AUDIO_INTERRUPTION_MODES = {
  MIX_WITH_OTHERS: "mixWithOthers",
  DO_NOT_MIX: "doNotMix",
  DUCK_OTHERS: "duckOthers",
} as const;

export const getPlatformAudioConfig = () => {
  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";

  return {
    isIOS,
    isAndroid,
    playsInSilentMode: isIOS,
    interruptionMode: AUDIO_INTERRUPTION_MODES.DO_NOT_MIX,
  };
};
