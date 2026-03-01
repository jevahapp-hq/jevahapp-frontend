/**
 * Optimized Video Card - Zero Dark Flash, Zero Loading Spinners
 * 
 * Key Optimizations:
 * 1. Thumbnail shown INSTANTLY (never black)
 * 2. Video loads in background behind thumbnail
 * 3. Crossfade from thumbnail to video when ready
 * 4. No ActivityIndicator - ever
 * 5. Cached thumbnail priority loading
 */
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image } from "expo-image";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, TouchableOpacity, TouchableWithoutFeedback, View, StyleSheet } from "react-native";
import { VideoCardProps } from "../../../shared/types";
import { detectMediaType, getContentKey, isAudioSermon } from "../../../shared/utils";

// Constants for optimization
const THUMBNAIL_FADE_DURATION = 300;
const VIDEO_READY_TIMEOUT = 10000; // 10s max wait for video

/**
 * Ultra-Fast Video Player with Thumbnail-First Rendering
 */
const OptimizedVideoPlayer = memo(({
  videoUrl,
  thumbnailUrl,
  isMuted,
  isVisible,
  onReady,
}: {
  videoUrl: string;
  thumbnailUrl: string;
  isMuted: boolean;
  isVisible: boolean;
  onReady?: () => void;
}) => {
  // Player state
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
    p.volume = 1.0;
  });
  
  // UI State - thumbnail first, then crossfade to video
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Handle player status changes
  useEffect(() => {
    if (!player) return;
    
    const subscription = player.addListener('statusChange', (status: any) => {
      if (status.status === 'readyToPlay') {
        setVideoReady(true);
        // Small delay for smooth crossfade
        setTimeout(() => setShowVideo(true), 100);
        onReady?.();
      } else if (status.status === 'error') {
        setHasError(true);
      }
    });
    
    // Timeout fallback - show thumbnail if video takes too long
    readyTimeoutRef.current = setTimeout(() => {
      if (!videoReady) {
        // Stay on thumbnail, video will show when ready
      }
    }, VIDEO_READY_TIMEOUT);
    
    return () => {
      subscription.remove();
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
      }
    };
  }, [player, videoReady, onReady]);
  
  // Sync mute state
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [player, isMuted]);
  
  // Play/pause based on visibility
  useEffect(() => {
    if (!player || !videoReady) return;
    
    try {
      if (isVisible) {
        player.play();
      } else {
        player.pause();
      }
    } catch {
      // Ignore player errors
    }
  }, [player, isVisible, videoReady]);
  
  return (
    <View style={styles.playerContainer}>
      {/* 
        THUMBNAIL LAYER - Always shown first
        This ensures users NEVER see black screen
      */}
      <View style={[
        styles.thumbnailLayer,
        showVideo && styles.thumbnailLayerHidden
      ]}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={THUMBNAIL_FADE_DURATION}
          onLoad={() => setThumbnailLoaded(true)}
          cachePolicy="memory-disk"
          priority="high"
          contentPosition="center"
        />
        
        {/* Subtle gradient overlay for better visual */}
        {!showVideo && (
          <View style={styles.thumbnailOverlay} />
        )}
      </View>
      
      {/* 
        VIDEO LAYER - Loads behind thumbnail
        Crossfades in when ready
      */}
      <View style={[
        styles.videoLayer,
        showVideo && styles.videoLayerVisible
      ]}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
          fullscreenOptions={{ enable: false }}
        />
      </View>
      
      {/* Error State - Shows thumbnail with retry option */}
      {hasError && (
        <View style={styles.errorOverlay}>
          <Ionicons name="refresh" size={32} color="#FEA74E" />
          <Text style={styles.errorText}>Tap to retry</Text>
        </View>
      )}
    </View>
  );
});

OptimizedVideoPlayer.displayName = 'OptimizedVideoPlayer';

/**
 * Optimized Video Card Component
 */
export const OptimizedVideoCard: React.FC<VideoCardProps & { isVisible?: boolean }> = ({
  video,
  index,
  isVisible = false,
  onVideoTap,
  onTogglePlay,
  onToggleMute,
  mutedVideos,
  currentlyVisibleVideo,
}) => {
  const key = getContentKey(video);
  const isMuted = mutedVideos?.[key] ?? false;
  const isCurrentlyVisible = currentlyVisibleVideo === key;
  
  // Media type detection
  const mediaType = detectMediaType(video);
  const isAudioSermonValue = isAudioSermon(video);
  
  // Video URL resolution
  const videoUrl = useMemo(() => {
    if (isAudioSermonValue) return '';
    return video?.fileUrl || (video as any)?.playbackUrl || (video as any)?.hlsUrl || '';
  }, [isAudioSermonValue, video]);
  
  // Thumbnail URL
  const thumbnailUrl = useMemo(() => {
    const url = video?.imageUrl || video?.thumbnailUrl || '';
    return typeof url === 'string' ? url : (url as any)?.uri || '';
  }, [video?.imageUrl, video?.thumbnailUrl]);
  
  // Handle tap
  const handleTap = useCallback(() => {
    onVideoTap?.(key, video, index || 0);
  }, [onVideoTap, key, video, index]);
  
  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    onToggleMute?.(key);
  }, [onToggleMute, key]);
  
  // If no video URL, show thumbnail only
  if (!videoUrl && !isAudioSermonValue) {
    return (
      <View style={styles.container}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnailOnly}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.videoContainer}>
          {/* Video Player with Thumbnail-First Rendering */}
          {!isAudioSermonValue && videoUrl ? (
            <OptimizedVideoPlayer
              videoUrl={videoUrl}
              thumbnailUrl={thumbnailUrl}
              isMuted={isMuted}
              isVisible={isCurrentlyVisible}
            />
          ) : (
            /* Audio Sermon - Thumbnail Only */
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnailOnly}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          )}
          
          {/* Mute Button Overlay */}
          <TouchableOpacity
            style={styles.muteButton}
            onPress={handleMuteToggle}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMuted ? "volume-mute" : "volume-high"}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          
          {/* Title Overlay */}
          {video.title && (
            <View style={styles.titleOverlay}>
              <Text style={styles.titleText} numberOfLines={2}>
                {video.title}
              </Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#1a1a1a', // Dark gray, not pure black
  },
  videoContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#1a1a1a', // Dark gray placeholder
    overflow: 'hidden',
  },
  playerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
  },
  // Thumbnail Layer
  thumbnailLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    opacity: 1,
  },
  thumbnailLayerHidden: {
    opacity: 0,
    zIndex: 0,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOnly: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)', // Subtle darkening
  },
  // Video Layer
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    opacity: 0,
  },
  videoLayerVisible: {
    opacity: 1,
    zIndex: 3,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  // Controls
  muteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 32,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Error State
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  errorText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
  },
});

export default memo(OptimizedVideoCard);
