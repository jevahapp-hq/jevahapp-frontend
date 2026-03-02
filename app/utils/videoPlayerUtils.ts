import { Video } from "expo-av";
import { InteractionManager } from "react-native";

/**
 * Thread-safe utility functions for video player operations
 * These functions ensure video player methods are called on the main thread
 */

export class VideoPlayerUtils {
  /**
   * Safely call a video player method on the main thread
   */
  static async safeVideoOperation<T>(
    videoRef: React.RefObject<Video | null>,
    operation: (video: Video) => Promise<T> | T,
    fallbackValue?: T
  ): Promise<T | undefined> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(async () => {
        try {
          if (videoRef.current) {
            const result = await operation(videoRef.current);
            resolve(result);
          } else {
            console.warn("Video ref is null, cannot perform operation");
            resolve(fallbackValue);
          }
        } catch (error) {
          console.warn("Video operation failed:", error);
          resolve(fallbackValue);
        }
      });
    });
  }

  /**
   * Safely set video position
   */
  static async setPosition(
    videoRef: React.RefObject<Video | null>,
    positionMillis: number
  ): Promise<void> {
    return this.safeVideoOperation(
      videoRef,
      (video) => video.setPositionAsync(positionMillis),
      undefined
    );
  }

  /**
   * Safely play video
   */
  static async play(videoRef: React.RefObject<Video | null>): Promise<void> {
    return this.safeVideoOperation(
      videoRef,
      (video) => video.playAsync(),
      undefined
    );
  }

  /**
   * Safely pause video
   */
  static async pause(videoRef: React.RefObject<Video | null>): Promise<void> {
    return this.safeVideoOperation(
      videoRef,
      (video) => video.pauseAsync(),
      undefined
    );
  }

  /**
   * Safely stop video
   */
  static async stop(videoRef: React.RefObject<Video | null>): Promise<void> {
    return this.safeVideoOperation(
      videoRef,
      (video) => video.stopAsync(),
      undefined
    );
  }

  /**
   * Safely set video volume
   */
  static async setVolume(
    videoRef: React.RefObject<Video | null>,
    volume: number
  ): Promise<void> {
    return this.safeVideoOperation(
      videoRef,
      (video) => video.setVolumeAsync(volume),
      undefined
    );
  }

  /**
   * Safely set video mute state
   */
  static async setMuted(
    videoRef: React.RefObject<Video | null>,
    muted: boolean
  ): Promise<void> {
    return this.safeVideoOperation(
      videoRef,
      (video) => video.setIsMutedAsync(muted),
      undefined
    );
  }

  /**
   * Safely get video status
   */
  static async getStatus(videoRef: React.RefObject<Video | null>) {
    return this.safeVideoOperation(
      videoRef,
      (video) => video.getStatusAsync(),
      null
    );
  }

  /**
   * Safely unload video
   */
  static async unload(videoRef: React.RefObject<Video | null>): Promise<void> {
    return this.safeVideoOperation(
      videoRef,
      (video) => video.unloadAsync(),
      undefined
    );
  }

  /**
   * Safely reset video to beginning
   */
  static async reset(videoRef: React.RefObject<Video | null>): Promise<void> {
    return this.setPosition(videoRef, 0);
  }

  /**
   * Check if video ref is valid and mounted
   */
  static isVideoRefValid(videoRef: React.RefObject<Video | null>): boolean {
    return videoRef.current !== null && videoRef.current !== undefined;
  }
}

/**
 * Hook for thread-safe video operations
 */
export const useThreadSafeVideo = (videoRef: React.RefObject<Video | null>) => {
  return {
    setPosition: (positionMillis: number) =>
      VideoPlayerUtils.setPosition(videoRef, positionMillis),
    play: () => VideoPlayerUtils.play(videoRef),
    pause: () => VideoPlayerUtils.pause(videoRef),
    stop: () => VideoPlayerUtils.stop(videoRef),
    setVolume: (volume: number) => VideoPlayerUtils.setVolume(videoRef, volume),
    setMuted: (muted: boolean) => VideoPlayerUtils.setMuted(videoRef, muted),
    getStatus: () => VideoPlayerUtils.getStatus(videoRef),
    unload: () => VideoPlayerUtils.unload(videoRef),
    reset: () => VideoPlayerUtils.reset(videoRef),
    isValid: () => VideoPlayerUtils.isVideoRefValid(videoRef),
  };
};
