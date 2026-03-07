/**
 * InstantVideoPlayer - Video player optimized for 'Instant-On' experience
 * 
 * Key features:
 * - No thumbnails or posters - video plays immediately
 * - onReadyForDisplay callback for first video to trigger splash hide
 * - Optimized for instant visibility without loading states
 */
import { useVideoPlayer, VideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, View } from 'react-native';
import type { MediaItem } from '../../../shared/types';
import { useInstantOn } from '../context/InstantOnContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InstantVideoPlayerProps {
  /** Video data */
  video: MediaItem;
  /** Unique key for the video */
  videoKey: string;
  /** Index in the feed */
  index: number;
  /** Whether this video is currently visible */
  isVisible: boolean;
  /** Whether this video should be actively playing */
  isActive: boolean;
  /** Video URL */
  videoUrl: string;
  /** Whether video is muted */
  isMuted?: boolean;
  /** Volume level (0-1) */
  volume?: number;
  /** Callback when video is tapped */
  onTap?: (key: string, video: MediaItem, index: number) => void;
  /** Callback when play/pause is toggled */
  onTogglePlay?: (key: string) => void;
}

export const InstantVideoPlayer: React.FC<InstantVideoPlayerProps> = ({
  video,
  videoKey,
  index,
  isVisible,
  isActive,
  videoUrl,
  isMuted = false,
  volume = 1.0,
  onTap,
  onTogglePlay,
}) => {
  const { isFirstVideo, markFirstVideoReady, registerFirstVideo } = useInstantOn();
  const [isReady, setIsReady] = useState(false);
  const [hasTriggeredReady, setHasTriggeredReady] = useState(false);
  const playerRef = useRef<VideoPlayer | null>(null);

  // Register as first video on mount
  useEffect(() => {
    if (index === 0) {
      registerFirstVideo(videoKey);
    }
  }, [index, videoKey, registerFirstVideo]);

  // Create video player
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
    p.volume = volume;
    p.timeUpdateEventInterval = 0.5;
    playerRef.current = p;
  });

  // Sync mute/volume state
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
      player.volume = volume;
    }
  }, [player, isMuted, volume]);

  // Handle play/pause based on visibility and active state
  useEffect(() => {
    if (!player) return;

    if (isVisible && isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, isVisible, isActive]);

  // Monitor player state for ready detection
  useEffect(() => {
    if (!player || hasTriggeredReady) return;

    const checkReadyState = () => {
      // Player is ready when it has duration and is loaded
      if (player.duration > 0 && !Number.isNaN(player.duration)) {
        setIsReady(true);
        
        // If this is the first video, trigger splash hide
        if (isFirstVideo(videoKey) && !hasTriggeredReady) {
          setHasTriggeredReady(true);
          // Small delay to ensure frame is rendered
          requestAnimationFrame(() => {
            markFirstVideoReady();
          });
        }
      }
    };

    // Check immediately
    checkReadyState();

    // Set up interval to check until ready
    const interval = setInterval(() => {
      checkReadyState();
      if (player.duration > 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player, isFirstVideo, videoKey, markFirstVideoReady, hasTriggeredReady]);

  const handleTap = useCallback(() => {
    onTap?.(videoKey, video, index);
    onTogglePlay?.(videoKey);
  }, [onTap, onTogglePlay, videoKey, video, index]);

  // Don't render if no URL
  if (!videoUrl) return null;

  return (
    <View 
      style={{ 
        width: SCREEN_WIDTH, 
        height: SCREEN_HEIGHT,
        backgroundColor: 'black',
      }}
    >
      <VideoView
        player={player}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
        }}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
};

export default InstantVideoPlayer;
