import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

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
      console.log('🔊 Configuring audio session for video playback...');
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: Platform.OS === 'ios',
        shouldDuckAndroid: Platform.OS === 'android',
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
      
      console.log('✅ Audio session configured successfully for video playback');
      return true;
    } catch (error) {
      console.error('❌ Failed to configure audio session for video playback:', error);
      return false;
    }
  },

  /**
   * Configure audio session for music playback
   */
  async configureForMusicPlayback() {
    try {
      console.log('🎵 Configuring audio session for music playback...');
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true, // Keep playing in background
        playsInSilentModeIOS: Platform.OS === 'ios',
        shouldDuckAndroid: Platform.OS === 'android',
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
      
      console.log('✅ Audio session configured successfully for music playback');
      return true;
    } catch (error) {
      console.error('❌ Failed to configure audio session for music playback:', error);
      return false;
    }
  },

  /**
   * Configure audio session for general use
   */
  async configureForGeneralUse() {
    try {
      console.log('🔊 Configuring audio session for general use...');
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: Platform.OS === 'ios',
        shouldDuckAndroid: Platform.OS === 'android',
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
      
      console.log('✅ Audio session configured successfully for general use');
      return true;
    } catch (error) {
      console.error('❌ Failed to configure audio session for general use:', error);
      return false;
    }
  },

  /**
   * Reset audio session to default
   */
  async resetAudioSession() {
    try {
      console.log('🔄 Resetting audio session...');
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });
      
      console.log('✅ Audio session reset successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to reset audio session:', error);
      return false;
    }
  },

  /**
   * Get audio session status
   */
  async getAudioSessionStatus() {
    try {
      // Note: getStatusAsync doesn't exist in expo-av, removing this call
      // const status = await Audio.getStatusAsync();
      return null;
      console.log('📊 Audio session status:', status);
      return status;
    } catch (error) {
      console.error('❌ Failed to get audio session status:', error);
      return null;
    }
  }
};

// Audio interruption mode constants (numeric values for compatibility)
export const AUDIO_INTERRUPTION_MODES = {
  MIX_WITH_OTHERS: 0,
  DO_NOT_MIX: 1,
  DUCK_OTHERS: 2,
} as const;

// Platform-specific audio configuration
export const getPlatformAudioConfig = () => {
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  
  return {
    isIOS,
    isAndroid,
    playsInSilentModeIOS: isIOS,
    shouldDuckAndroid: isAndroid,
    interruptionModeIOS: AUDIO_INTERRUPTION_MODES.DO_NOT_MIX,
    interruptionModeAndroid: AUDIO_INTERRUPTION_MODES.DO_NOT_MIX,
  };
};
