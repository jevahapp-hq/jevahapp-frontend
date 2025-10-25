import React, { useCallback, useMemo, useRef, forwardRef } from 'react';
import { ScrollView, ScrollViewProps, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useThrottle } from '../hooks/usePerformanceOptimization';

interface OptimizedScrollViewProps extends ScrollViewProps {
  throttleMs?: number;
  onScrollOptimized?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  enableVirtualization?: boolean;
  itemHeight?: number;
  totalItems?: number;
}

export const OptimizedScrollView = forwardRef<ScrollView, OptimizedScrollViewProps>(
  ({ 
    throttleMs = 16, // 60fps
    onScrollOptimized,
    onScroll,
    enableVirtualization = false,
    itemHeight = 100,
    totalItems = 0,
    children,
    ...props 
  }, ref) => {
    const scrollOffset = useRef(0);

    // Throttled scroll handler for better performance
    const throttledScrollHandler = useThrottle(
      useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollOffset.current = event.nativeEvent.contentOffset.y;
        onScrollOptimized?.(event);
      }, [onScrollOptimized]),
      throttleMs
    );

    // Combined scroll handler
    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScroll?.(event);
      throttledScrollHandler(event);
    }, [onScroll, throttledScrollHandler]);

    // Virtual scrolling calculations
    const virtualScrollProps = useMemo(() => {
      if (!enableVirtualization) return {};

      const visibleStart = Math.floor(scrollOffset.current / itemHeight);
      const visibleEnd = Math.min(
        visibleStart + Math.ceil(400 / itemHeight) + 2, // Assuming 400px viewport
        totalItems
      );

      return {
        contentContainerStyle: {
          height: totalItems * itemHeight,
          ...props.contentContainerStyle
        },
        children: React.Children.map(children, (child, index) => {
          if (index >= visibleStart && index < visibleEnd) {
            return React.cloneElement(child as React.ReactElement, {
              style: [
                (child as React.ReactElement).props.style,
                {
                  position: 'absolute',
                  top: index * itemHeight,
                  height: itemHeight
                }
              ]
            });
          }
          return null;
        })
      };
    }, [enableVirtualization, itemHeight, totalItems, children, props.contentContainerStyle]);

    return (
      <ScrollView
        ref={ref}
        onScroll={handleScroll}
        scrollEventThrottle={throttleMs}
        removeClippedSubviews={true} // Remove off-screen views
        maxToRenderPerBatch={10} // Render 10 items at a time
        updateCellsBatchingPeriod={50} // Update every 50ms
        initialNumToRender={10} // Initial render count
        windowSize={10} // Viewport size multiplier
        {...props}
        {...virtualScrollProps}
      />
    );
  }
);

OptimizedScrollView.displayName = 'OptimizedScrollView';

export default OptimizedScrollView;
