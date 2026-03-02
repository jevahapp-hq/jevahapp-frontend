/**
 * Modular TikTok-style Video Progress Bar
 * 
 * This component is designed for easy debugging and maintenance:
 * - Clear separation of concerns (types, utils, hooks, component)
 * - Comprehensive debug logging
 * - TikTok-style vertical scrub behavior
 * - Smooth animations and responsive gestures
 * 
 * Usage:
 * <TikTokProgressBar
 *   progress={0.5}
 *   currentMs={30000}
 *   durationMs={60000}
 *   isMuted={false}
 *   onToggleMute={() => {}}
 *   onSeekToPercent={(percent) => {}}
 *   debug={true} // Enable debug logging
 * />
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProgressBarProps, ProgressBarConfig } from './types';
import {
  DEFAULT_CONFIG,
  useProgressBarState,
  useSeekSync,
  useProgressBarGestures,
  useHaptics,
} from './hooks';
import { formatTime, calculateProgress, clamp } from './utils';

export const TikTokProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  currentMs,
  durationMs,
  isMuted,
  onToggleMute,
  onSeekToPercent,
  showControls = true,
  config: configOverride,
  debug = false,
}) => {
  // Merge default config with overrides
  const config: ProgressBarConfig = { ...DEFAULT_CONFIG, ...configOverride };
  
  // State management
  const { state, updateState } = useProgressBarState(config, debug);
  const { isDragging, isSeeking, dragProgress, targetProgress, stableTicks, barWidth } = state;
  
  // Animation
  const animatedValue = useRef(new Animated.Value(progress)).current;
  const lastUpdateTimeRef = useRef(0);
  
  // Haptics
  const { trigger: triggerHaptic } = useHaptics(config.enableHaptics);
  
  // Calculate effective progress
  const externalProgress = calculateProgress(currentMs, durationMs);
  const currentProgress = isDragging
    ? dragProgress
    : isSeeking && targetProgress !== null
    ? targetProgress
    : externalProgress;
  
  // Handle seek completion
  const handleSeekComplete = () => {
    updateState({
      isSeeking: false,
      targetProgress: null,
      stableTicks: 0,
    });
    animatedValue.setValue(externalProgress);
  };
  
  // Seek synchronization
  useSeekSync(
    currentMs,
    durationMs,
    isSeeking,
    targetProgress,
    stableTicks,
    config,
    handleSeekComplete,
    (ticks) => updateState({ stableTicks: ticks }),
    debug
  );
  
  // Handle progress bar press (tap to seek)
  const handlePress = (event: any) => {
    if (barWidth <= 0) return;
    
    const { locationX } = event.nativeEvent;
    const percent = clamp(locationX / barWidth, 0, 1);
    
    updateState({
      dragProgress: percent,
      isSeeking: true,
      targetProgress: percent,
      stableTicks: 0,
    });
    animatedValue.setValue(percent);
    onSeekToPercent(percent);
    
    if (config.enableHaptics) {
      triggerHaptic('light');
    }
  };
  
  // Handle drag start
  const handleDragStart = () => {
    updateState({
      isDragging: true,
      isSeeking: false,
      targetProgress: null,
      stableTicks: 0,
    });
    
    if (config.enableHaptics) {
      triggerHaptic('light');
    }
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    const finalProgress = dragProgress;
    updateState({
      isDragging: false,
      isSeeking: true,
      targetProgress: finalProgress,
      stableTicks: 0,
    });
    onSeekToPercent(finalProgress);
    
    if (config.enableHaptics) {
      triggerHaptic('medium');
    }
  };
  
  // Gesture handlers
  const panHandlers = useProgressBarGestures(
    barWidth,
    currentProgress,
    config,
    (percent) => {
      updateState({
        dragProgress: percent,
        isSeeking: true,
        targetProgress: percent,
        stableTicks: 0,
      });
      animatedValue.setValue(percent);
      onSeekToPercent(percent);
    },
    handleDragStart,
    handleDragEnd,
    (newProgress) => updateState({ dragProgress: newProgress }),
    (isDragging) => updateState({ isDragging }),
    debug
  );
  
  // Animate progress bar
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    if (!isDragging && !isSeeking) {
      // Smooth animation during playback
      if (timeSinceLastUpdate > 50) {
        Animated.timing(animatedValue, {
          toValue: currentProgress,
          duration: Math.min(100, timeSinceLastUpdate),
          useNativeDriver: false,
        }).start();
        lastUpdateTimeRef.current = now;
      }
    } else {
      // Immediate update during drag/seek
      animatedValue.setValue(currentProgress);
      lastUpdateTimeRef.current = now;
    }
  }, [currentProgress, animatedValue, isDragging, isSeeking]);
  
  // Update bar width on layout
  const handleLayout = (e: any) => {
    const width = e.nativeEvent.layout.width;
    if (width && Math.abs(width - barWidth) > 0.5) {
      updateState({ barWidth: width });
    }
  };
  
  // Calculate visual dimensions
  const progressBarHeight = config.enlargeOnDrag && isDragging
    ? config.trackHeightDragging
    : config.trackHeight;
  
  const knobRadius = config.enlargeOnDrag && isDragging
    ? config.knobSizeDragging / 2
    : config.knobSize / 2;
  
  const circleTop = 8 + progressBarHeight / 2 - knobRadius;
  const labelTop = Math.max(0, circleTop - 24);
  
  if (!showControls) return null;
  
  return (
    <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
      {/* Progress Bar Container */}
      <View className="flex-1 flex-row items-center">
        {/* Current Time Label */}
        {config.showTimeLabels && (
          <Text className="text-white text-xs font-rubik mr-2 min-w-[35px]">
            {formatTime(currentProgress * durationMs)}
          </Text>
        )}
        
        {/* Progress Bar Track */}
        <View
          className="flex-1 relative"
          style={{ height: progressBarHeight + 16 }}
          onLayout={handleLayout}
          onStartShouldSetResponder={() => true}
          {...panHandlers}
        >
          {/* Background Track */}
          <View
            className="absolute rounded-full"
            style={{
              height: progressBarHeight,
              width: '100%',
              top: 8,
              backgroundColor: config.trackColor,
            }}
          />
          
          {/* Progress Fill */}
          <Animated.View
            className="absolute rounded-full"
            style={{
              height: progressBarHeight,
              width: barWidth > 0
                ? Animated.multiply(animatedValue, barWidth)
                : 0,
              top: 8,
              backgroundColor: config.progressColor,
            }}
          />
          
          {/* Floating Time Label (TikTok-style) */}
          {config.showFloatingLabel && (isDragging || isSeeking) && (
            <Animated.View
              className="absolute bg-black/70 px-2 py-1 rounded"
              style={{
                top: labelTop,
                left: barWidth > 0
                  ? Animated.subtract(
                      Animated.multiply(animatedValue, barWidth),
                      20
                    )
                  : 0,
              }}
            >
              <Text className="text-white text-[10px] font-rubik">
                {formatTime(currentProgress * durationMs)}
              </Text>
            </Animated.View>
          )}
          
          {/* Draggable Knob */}
          <Animated.View
            className="absolute rounded-full"
            style={{
              width: knobRadius * 2,
              height: knobRadius * 2,
              top: circleTop,
              left: barWidth > 0
                ? Animated.subtract(
                    Animated.multiply(animatedValue, barWidth),
                    knobRadius
                  )
                : 0,
              backgroundColor: config.knobColor,
              transform: [
                {
                  scale: config.enlargeOnDrag && isDragging ? 1.1 : 1,
                },
              ],
              shadowColor: config.knobColor,
              shadowOffset: {
                width: 0,
                height: config.enlargeOnDrag && isDragging ? 3 : 2,
              },
              shadowOpacity: config.enlargeOnDrag && isDragging ? 0.5 : 0.35,
              shadowRadius: config.enlargeOnDrag && isDragging ? 7 : 5,
              elevation: config.enlargeOnDrag && isDragging ? 7 : 5,
              zIndex: 10,
            }}
          />
        </View>
        
        {/* Duration Label */}
        {config.showTimeLabels && (
          <Text className="text-white text-xs font-rubik ml-2 min-w-[35px]">
            {formatTime(durationMs)}
          </Text>
        )}
      </View>
      
      {/* Mute Button */}
      <TouchableOpacity
        onPress={onToggleMute}
        className="bg-black/50 p-2 rounded-full"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={16}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );
};

export default TikTokProgressBar;

