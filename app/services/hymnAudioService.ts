import { Audio } from "expo-av";

export interface HymnAudio {
  id: string;
  title: string;
  audioUrl: string;
  duration: number;
}

class HymnAudioService {
  private sound: Audio.Sound | null = null;
  private currentHymnId: string | null = null;
  private isPlaying: boolean = false;

  /**
   * Play a hymn audio file
   */
  async playHymn(hymn: HymnAudio): Promise<void> {
    try {
      // Stop current audio if playing
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Load and play new hymn
      const { sound } = await Audio.Sound.createAsync(
        { uri: hymn.audioUrl },
        { shouldPlay: true }
      );

      this.sound = sound;
      this.currentHymnId = hymn.id;
      this.isPlaying = true;

      // Set up playback status update
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.isPlaying = false;
          this.currentHymnId = null;
        }
      });
    } catch (error) {
      console.error("Error playing hymn:", error);
      throw new Error("Failed to play hymn audio");
    }
  }

  /**
   * Pause current hymn
   */
  async pauseHymn(): Promise<void> {
    if (this.sound && this.isPlaying) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
    }
  }

  /**
   * Resume current hymn
   */
  async resumeHymn(): Promise<void> {
    if (this.sound && !this.isPlaying) {
      await this.sound.playAsync();
      this.isPlaying = true;
    }
  }

  /**
   * Stop current hymn
   */
  async stopHymn(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
      this.currentHymnId = null;
      this.isPlaying = false;
    }
  }

  /**
   * Toggle play/pause
   */
  async togglePlayPause(hymn: HymnAudio): Promise<void> {
    if (this.currentHymnId === hymn.id) {
      if (this.isPlaying) {
        await this.pauseHymn();
      } else {
        await this.resumeHymn();
      }
    } else {
      await this.playHymn(hymn);
    }
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): { isPlaying: boolean; currentHymnId: string | null } {
    return {
      isPlaying: this.isPlaying,
      currentHymnId: this.currentHymnId,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
    this.currentHymnId = null;
    this.isPlaying = false;
  }
}

export default new HymnAudioService();
