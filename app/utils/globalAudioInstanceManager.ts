import { Audio } from "expo-av";

/**
 * Global Audio Instance Manager
 * 
 * This singleton manages all audio instances across the app to ensure:
 * - Only one audio plays at a time
 * - No duplicate playback of the same audio
 * - Proper cleanup of audio instances
 * - Pauses all videos when audio starts playing
 */
class GlobalAudioInstanceManager {
  private static instance: GlobalAudioInstanceManager;
  
  // Map of audio ID to Sound instance
  private audioInstances: Map<string, Audio.Sound> = new Map();
  
  // Currently playing audio ID
  private currentlyPlayingId: string | null = null;
  
  // Currently paused audio ID (for resume capability)
  private currentlyPausedId: string | null = null;
  
  // Listeners for playback state changes
  private listeners: Array<(playingId: string | null) => void> = [];
  
  private constructor() {
    console.log("🎵 GlobalAudioInstanceManager initialized");
  }
  
  static getInstance(): GlobalAudioInstanceManager {
    if (!GlobalAudioInstanceManager.instance) {
      GlobalAudioInstanceManager.instance = new GlobalAudioInstanceManager();
    }
    return GlobalAudioInstanceManager.instance;
  }
  
  /**
   * Subscribe to playback state changes
   */
  subscribe(listener: (playingId: string | null) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Notify all listeners of playback state changes
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.currentlyPlayingId));
  }
  
  /**
   * Stop all audio instances
   */
  async stopAllAudio(): Promise<void> {
    const stopPromises: Promise<void>[] = [];
    
    // Stop all instances and unload them
    for (const [id, sound] of this.audioInstances.entries()) {
      stopPromises.push(
        (async () => {
          try {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
              // Stop playback
              if (status.isPlaying) {
                await sound.stopAsync();
              }
              // Unload the sound to prevent multiple instances
              await sound.unloadAsync();
            }
          } catch (error) {
            console.warn(`⚠️ Error stopping audio ${id}:`, error);
            // Try to unload even if status check failed
            try {
              await sound.unloadAsync();
            } catch (unloadError) {
              // Ignore unload errors
            }
          }
        })()
      );
    }
    
    await Promise.all(stopPromises);
    
    // Clear all instances after stopping
    this.audioInstances.clear();
    this.currentlyPlayingId = null;
    this.currentlyPausedId = null;
    this.notifyListeners();
  }
  
  /**
   * Stop a specific audio instance
   */
  async stopAudio(audioId: string): Promise<void> {
    const sound = this.audioInstances.get(audioId);
    if (!sound) return;
    
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.stopAsync();
        }
        await sound.setPositionAsync(0); // Reset to beginning
        console.log(`⏸️ Stopped audio: ${audioId}`);
        
        if (this.currentlyPlayingId === audioId) {
          this.currentlyPlayingId = null;
        }
        if (this.currentlyPausedId === audioId) {
          this.currentlyPausedId = null;
        }
        this.notifyListeners();
      }
    } catch (error) {
      console.warn(`⚠️ Error stopping audio ${audioId}:`, error);
    }
  }
  
  /**
   * Play an audio instance, stopping all others first
   */
  async playAudio(
    audioId: string,
    sound: Audio.Sound,
    shouldPlay: boolean = true
  ): Promise<void> {
    console.log(`▶️ Playing audio: ${audioId}, shouldPlay: ${shouldPlay}`);
    
    // STEP 1: Pause all videos when audio starts playing
    try {
      // Import at runtime to avoid circular dependency issues
      const videoStoreModule = require("../store/useGlobalVideoStore");
      const videoStore = videoStoreModule.useGlobalVideoStore.getState();
      if (videoStore && videoStore.pauseAllVideosImperatively) {
        videoStore.pauseAllVideosImperatively();
        console.log("⏸️ Paused all videos for audio playback");
      }
    } catch (error) {
      // Silently fail if video store is not available (avoid breaking audio playback)
      console.warn("⚠️ Failed to pause videos when audio started:", error);
    }
    
    // STEP 1b: Stop any global audio-player based track so there's
    // never more than one audio system playing at once.
    try {
      const globalAudioModule = require("../store/useGlobalAudioPlayerStore");
      const globalAudioStore = globalAudioModule.useGlobalAudioPlayerStore.getState();
      if (globalAudioStore && globalAudioStore.clear) {
        await globalAudioStore.clear();
        console.log("🛑 Stopped global audio player before starting legacy audio");
      }
    } catch (error) {
      console.warn("⚠️ Failed to stop global audio player when legacy audio started:", error);
    }
    
    // STEP 2: If this audio is already playing, do nothing
    if (this.currentlyPlayingId === audioId) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          console.log(`✅ Audio ${audioId} is already playing`);
          return;
        }
      } catch (error) {
        console.warn(`⚠️ Error checking audio status:`, error);
      }
    }
    
    // STEP 3: Check if there's already an instance for this audioId and unload it
    const existingSound = this.audioInstances.get(audioId);
    if (existingSound && existingSound !== sound) {
      try {
        console.log(`🗑️ Unloading existing instance for ${audioId}`);
        const status = await existingSound.getStatusAsync();
        if (status.isLoaded) {
          await existingSound.stopAsync();
          await existingSound.unloadAsync();
        }
      } catch (error) {
        console.warn(`⚠️ Error unloading existing instance:`, error);
      }
    }
    
    // STEP 4: Stop all other audio instances first (but don't unload the one we're about to play)
    const otherInstances = Array.from(this.audioInstances.entries()).filter(
      ([id]) => id !== audioId
    );
    
    const stopPromises = otherInstances.map(async ([id, oldSound]) => {
      try {
        const status = await oldSound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await oldSound.stopAsync();
          }
          await oldSound.unloadAsync();
          console.log(`⏸️ Stopped and unloaded other audio: ${id}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error stopping other audio ${id}:`, error);
      }
    });
    
    await Promise.all(stopPromises);
    
    // Remove stopped instances from the map
    otherInstances.forEach(([id]) => {
      this.audioInstances.delete(id);
    });
    
    // STEP 5: Register this audio instance
    this.audioInstances.set(audioId, sound);
    
    // STEP 6: If shouldPlay is true, actually play it
    if (shouldPlay) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.playAsync();
          this.currentlyPlayingId = audioId;
          this.notifyListeners();
          console.log(`✅ Started playing audio: ${audioId}`);
        } else {
          console.warn(`⚠️ Sound ${audioId} is not loaded yet`);
        }
      } catch (error) {
        console.error(`❌ Error playing audio ${audioId}:`, error);
        this.currentlyPlayingId = null;
        this.notifyListeners();
      }
    } else {
      // Even if not playing, set as current (for pause/resume)
      this.currentlyPlayingId = audioId;
      this.notifyListeners();
    }
  }
  
  /**
   * Pause an audio instance
   */
  async pauseAudio(audioId: string): Promise<void> {
    const sound = this.audioInstances.get(audioId);
    if (!sound) {
      console.warn(`⚠️ Cannot pause: audio instance not found for ${audioId}`);
      return;
    }
    
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
          console.log(`⏸️ Paused audio: ${audioId}`);
          
          // Mark as paused but keep as current for resume
          this.currentlyPausedId = audioId;
          // Keep currentlyPlayingId so we know which audio was playing
          this.notifyListeners();
        } else {
          console.log(`ℹ️ Audio ${audioId} is already paused`);
          this.currentlyPausedId = audioId;
        }
      } else {
        console.warn(`⚠️ Cannot pause: audio ${audioId} is not loaded`);
      }
    } catch (error) {
      console.error(`❌ Error pausing audio ${audioId}:`, error);
      throw error;
    }
  }
  
  /**
   * Resume an audio instance, stopping all others first
   */
  async resumeAudio(audioId: string): Promise<void> {
    const sound = this.audioInstances.get(audioId);
    if (!sound) {
      console.warn(`⚠️ Audio instance not found: ${audioId}`);
      return;
    }
    
    // STEP 1: Pause all videos when audio resumes
    try {
      // Import at runtime to avoid circular dependency issues
      const videoStoreModule = require("../store/useGlobalVideoStore");
      const videoStore = videoStoreModule.useGlobalVideoStore.getState();
      if (videoStore && videoStore.pauseAllVideosImperatively) {
        videoStore.pauseAllVideosImperatively();
        console.log("⏸️ Paused all videos for audio resume");
      }
    } catch (error) {
      // Silently fail if video store is not available (avoid breaking audio playback)
      console.warn("⚠️ Failed to pause videos when audio resumed:", error);
    }
    
    // STEP 2: Stop all other audio instances first (but keep the one we're resuming)
    const otherInstances = Array.from(this.audioInstances.entries()).filter(
      ([id]) => id !== audioId
    );
    
    const stopPromises = otherInstances.map(async ([id, oldSound]) => {
      try {
        const status = await oldSound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await oldSound.stopAsync();
          }
          await oldSound.unloadAsync();
        }
      } catch (error) {
        console.warn(`⚠️ Error stopping other audio ${id}:`, error);
      }
    });
    
    await Promise.all(stopPromises);
    
    // Remove stopped instances
    otherInstances.forEach(([id]) => {
      this.audioInstances.delete(id);
    });
    
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          console.log(`✅ Audio ${audioId} is already playing`);
          this.currentlyPlayingId = audioId;
          this.currentlyPausedId = null;
        } else {
          await sound.playAsync();
          this.currentlyPlayingId = audioId;
          this.currentlyPausedId = null;
          this.notifyListeners();
          console.log(`▶️ Resumed audio: ${audioId}, paused all videos`);
        }
      } else {
        console.warn(`⚠️ Cannot resume: audio ${audioId} is not loaded`);
      }
    } catch (error) {
      console.error(`❌ Error resuming audio ${audioId}:`, error);
      throw error;
    }
  }
  
  /**
   * Register an audio instance without playing it
   */
  registerAudio(audioId: string, sound: Audio.Sound): void {
    this.audioInstances.set(audioId, sound);
    console.log(`📝 Registered audio instance: ${audioId}`);
  }
  
  /**
   * Unregister an audio instance
   */
  async unregisterAudio(audioId: string): Promise<void> {
    const sound = this.audioInstances.get(audioId);
    if (!sound) return;
    
    try {
      // Stop and unload the sound
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.stopAsync();
        }
        await sound.unloadAsync();
      }
    } catch (error) {
      console.warn(`⚠️ Error unloading audio ${audioId}:`, error);
    }
    
    this.audioInstances.delete(audioId);
    
    if (this.currentlyPlayingId === audioId) {
      this.currentlyPlayingId = null;
      this.notifyListeners();
    }
    
    console.log(`🗑️ Unregistered audio instance: ${audioId}`);
  }
  
  /**
   * Get the currently playing audio ID
   */
  getCurrentlyPlayingId(): string | null {
    return this.currentlyPlayingId;
  }
  
  /**
   * Get the currently paused audio ID
   */
  getCurrentlyPausedId(): string | null {
    return this.currentlyPausedId;
  }
  
  /**
   * Check if an audio is currently playing
   */
  isPlaying(audioId: string): boolean {
    return this.currentlyPlayingId === audioId;
  }
  
  /**
   * Check if an audio is currently paused
   */
  isPaused(audioId: string): boolean {
    return this.currentlyPausedId === audioId;
  }
  
  /**
   * Get playback state for an audio ID
   */
  async getPlaybackState(audioId: string): Promise<{
    isPlaying: boolean;
    isPaused: boolean;
    isLoaded: boolean;
  }> {
    const sound = this.audioInstances.get(audioId);
    if (!sound) {
      return { isPlaying: false, isPaused: false, isLoaded: false };
    }
    
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        return {
          isPlaying: status.isPlaying || false,
          isPaused: !status.isPlaying && this.currentlyPausedId === audioId,
          isLoaded: true,
        };
      }
    } catch (error) {
      console.warn(`⚠️ Error getting playback state for ${audioId}:`, error);
    }
    
    return { isPlaying: false, isPaused: false, isLoaded: false };
  }
  
  /**
   * Get an audio instance
   */
  getAudioInstance(audioId: string): Audio.Sound | undefined {
    return this.audioInstances.get(audioId);
  }
  
  /**
   * Clean up all audio instances
   */
  async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up all audio instances...");
    
    const cleanupPromises: Promise<void>[] = [];
    
    for (const [id, sound] of this.audioInstances.entries()) {
      cleanupPromises.push(this.unregisterAudio(id));
    }
    
    await Promise.all(cleanupPromises);
    this.audioInstances.clear();
    this.currentlyPlayingId = null;
    this.notifyListeners();
    
    console.log("✅ All audio instances cleaned up");
  }
}

export default GlobalAudioInstanceManager;

