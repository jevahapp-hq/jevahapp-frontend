import { useCallback, useRef } from 'react';

interface UseInstantButtonOptions {
  preventRapidClicks?: boolean;
  rapidClickThreshold?: number; // milliseconds
  onError?: (error: any) => void;
}

export const useInstantButton = (
  onPress: () => void | Promise<void>,
  options: UseInstantButtonOptions = {}
) => {
  const {
    preventRapidClicks = true,
    rapidClickThreshold = 100,
    onError
  } = options;

  const lastClickTime = useRef<number>(0);
  const isProcessing = useRef<boolean>(false);

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

    try {
      const result = onPress();
      
      if (result instanceof Promise) {
        // Handle async operations
        result
          .catch(error => {
            console.error('Button press error:', error);
            onError?.(error);
          })
          .finally(() => {
            isProcessing.current = false;
          });
      } else {
        // Handle sync operations
        isProcessing.current = false;
      }
    } catch (error) {
      console.error('Button press error:', error);
      onError?.(error);
      isProcessing.current = false;
    }
  }, [onPress, preventRapidClicks, rapidClickThreshold, onError]);

  return handlePress;
};
