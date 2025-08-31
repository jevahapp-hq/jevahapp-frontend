import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef } from 'react';
import { InteractionManager } from 'react-native';

interface UseFastButtonOptions {
  preventRapidClicks?: boolean;
  rapidClickThreshold?: number;
  hapticFeedback?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  runAfterInteractions?: boolean;
  onError?: (error: any) => void;
  onSuccess?: () => void;
}

interface UseFastButtonReturn {
  handlePress: () => void;
  isProcessing: boolean;
  lastClickTime: number;
}

export const useFastButton = (
  onPress: () => void | Promise<void>,
  options: UseFastButtonOptions = {}
): UseFastButtonReturn => {
  const {
    preventRapidClicks = true,
    rapidClickThreshold = 100,
    hapticFeedback = true,
    hapticType = 'light',
    runAfterInteractions = false,
    onError,
    onSuccess,
  } = options;

  const lastClickTime = useRef<number>(0);
  const isProcessing = useRef<boolean>(false);
  const abortController = useRef<AbortController | null>(null);

  // Memoized haptic feedback function
  const triggerHaptic = useCallback(async () => {
    if (!hapticFeedback) return;

    try {
      switch (hapticType) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (error) {
      // Haptic feedback failed, continue with action
    }
  }, [hapticFeedback, hapticType]);

  // Memoized press handler for maximum performance
  const handlePress = useCallback(() => {
    const now = Date.now();

    // Prevent rapid successive clicks
    if (preventRapidClicks && now - lastClickTime.current < rapidClickThreshold) {
      return;
    }

    // Prevent multiple simultaneous executions
    if (isProcessing.current) {
      return;
    }

    lastClickTime.current = now;
    isProcessing.current = true;

    // Cancel any previous operation
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    const executePress = async () => {
      try {
        // Trigger haptic feedback immediately
        await triggerHaptic();

        // Execute the onPress function
        const result = onPress();
        
        if (result instanceof Promise) {
          // Handle async operations
          await result;
        }

        // Call success callback
        onSuccess?.();
      } catch (error) {
        // Only handle error if not aborted
        if (error.name !== 'AbortError') {
          console.error('Button press error:', error);
          onError?.(error);
        }
      } finally {
        isProcessing.current = false;
        abortController.current = null;
      }
    };

    if (runAfterInteractions) {
      // Run after UI interactions are complete for better performance
      InteractionManager.runAfterInteractions(executePress);
    } else {
      // Execute immediately for fastest response
      executePress();
    }
  }, [
    onPress,
    preventRapidClicks,
    rapidClickThreshold,
    triggerHaptic,
    runAfterInteractions,
    onError,
    onSuccess,
  ]);

  // Memoized return value to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    handlePress,
    isProcessing: isProcessing.current,
    lastClickTime: lastClickTime.current,
  }), [handlePress]);

  return returnValue;
};

// Specialized hooks for common button types
export const usePrimaryButton = (
  onPress: () => void | Promise<void>,
  options: Omit<UseFastButtonOptions, 'hapticType'> = {}
) => {
  return useFastButton(onPress, {
    ...options,
    hapticType: 'medium',
  });
};

export const useSecondaryButton = (
  onPress: () => void | Promise<void>,
  options: Omit<UseFastButtonOptions, 'hapticType'> = {}
) => {
  return useFastButton(onPress, {
    ...options,
    hapticType: 'light',
  });
};

export const useSuccessButton = (
  onPress: () => void | Promise<void>,
  options: Omit<UseFastButtonOptions, 'hapticType'> = {}
) => {
  return useFastButton(onPress, {
    ...options,
    hapticType: 'success',
  });
};

export const useDangerButton = (
  onPress: () => void | Promise<void>,
  options: Omit<UseFastButtonOptions, 'hapticType'> = {}
) => {
  return useFastButton(onPress, {
    ...options,
    hapticType: 'warning',
  });
};
