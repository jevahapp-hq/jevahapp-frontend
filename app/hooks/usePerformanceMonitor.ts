import { useCallback, useEffect, useMemo, useRef } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  totalRenderTime: number;
  buttonClicks: number;
  averageButtonResponseTime: number;
  slowRenders: number;
  slowButtons: number;
}

interface UsePerformanceMonitorOptions {
  componentName: string;
  trackRenders?: boolean;
  trackButtonClicks?: boolean;
  slowRenderThreshold?: number; // milliseconds
  slowButtonThreshold?: number; // milliseconds
  logToConsole?: boolean;
  enableOptimizations?: boolean;
}

export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions) => {
  const {
    componentName,
    trackRenders = true,
    trackButtonClicks = true,
    slowRenderThreshold = 16, // 60fps = 16ms per frame
    slowButtonThreshold = 100, // 100ms for button response
    logToConsole = __DEV__,
    enableOptimizations = true,
  } = options;

  const metrics = useRef<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    totalRenderTime: 0,
    buttonClicks: 0,
    averageButtonResponseTime: 0,
    slowRenders: 0,
    slowButtons: 0,
  });

  const renderStartTime = useRef<number>(0);
  const buttonClickTimes = useRef<number[]>([]);

  // Track render performance
  useEffect(() => {
    if (!trackRenders) return;

    const startTime = performance.now();
    renderStartTime.current = startTime;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      metrics.current.renderCount++;
      metrics.current.lastRenderTime = renderTime;
      metrics.current.totalRenderTime += renderTime;
      metrics.current.averageRenderTime = metrics.current.totalRenderTime / metrics.current.renderCount;

      if (renderTime > slowRenderThreshold) {
        metrics.current.slowRenders++;
        if (logToConsole) {
          console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
      }

      if (logToConsole && metrics.current.renderCount % 10 === 0) {
        console.log(`📊 ${componentName} render stats:`, {
          count: metrics.current.renderCount,
          avgTime: metrics.current.averageRenderTime.toFixed(2) + 'ms',
          slowRenders: metrics.current.slowRenders,
        });
      }
    };
  });

  // Track button click performance
  const trackButtonClick = useCallback((buttonName: string, responseTime: number) => {
    if (!trackButtonClicks) return;

    metrics.current.buttonClicks++;
    buttonClickTimes.current.push(responseTime);
    metrics.current.averageButtonResponseTime = 
      buttonClickTimes.current.reduce((a, b) => a + b, 0) / buttonClickTimes.current.length;

    if (responseTime > slowButtonThreshold) {
      metrics.current.slowButtons++;
      if (logToConsole) {
        console.warn(`🐌 Slow button response in ${componentName}/${buttonName}: ${responseTime.toFixed(2)}ms`);
      }
    }

    // Keep only last 100 button clicks
    if (buttonClickTimes.current.length > 100) {
      buttonClickTimes.current.shift();
    }
  }, [trackButtonClicks, slowButtonThreshold, logToConsole, componentName]);

  // Create optimized button handler
  const createOptimizedButton = useCallback((
    onPress: () => void | Promise<void>,
    buttonName: string = 'button'
  ) => {
    return () => {
      const startTime = performance.now();
      
      try {
        const result = onPress();
        
        if (result instanceof Promise) {
          result.finally(() => {
            const endTime = performance.now();
            trackButtonClick(buttonName, endTime - startTime);
          });
        } else {
          const endTime = performance.now();
          trackButtonClick(buttonName, endTime - startTime);
        }
      } catch (error) {
        const endTime = performance.now();
        trackButtonClick(buttonName, endTime - startTime);
        throw error;
      }
    };
  }, [trackButtonClick]);

  // Performance optimization suggestions
  const optimizationSuggestions = useMemo(() => {
    const suggestions: string[] = [];

    if (metrics.current.averageRenderTime > slowRenderThreshold) {
      suggestions.push('Consider using React.memo to prevent unnecessary re-renders');
      suggestions.push('Use useMemo for expensive calculations');
      suggestions.push('Use useCallback for event handlers');
    }

    if (metrics.current.slowRenders > 5) {
      suggestions.push('Component is rendering slowly frequently - consider optimization');
    }

    if (metrics.current.averageButtonResponseTime > slowButtonThreshold) {
      suggestions.push('Button responses are slow - check for heavy operations in button handlers');
      suggestions.push('Consider using InteractionManager.runAfterInteractions for heavy tasks');
    }

    if (metrics.current.slowButtons > 3) {
      suggestions.push('Multiple slow button responses detected - optimize button handlers');
    }

    return suggestions;
  }, [
    metrics.current.averageRenderTime,
    metrics.current.slowRenders,
    metrics.current.averageButtonResponseTime,
    metrics.current.slowButtons,
    slowRenderThreshold,
    slowButtonThreshold,
  ]);

  // Get current metrics
  const getMetrics = useCallback(() => {
    return { ...metrics.current };
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metrics.current = {
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      totalRenderTime: 0,
      buttonClicks: 0,
      averageButtonResponseTime: 0,
      slowRenders: 0,
      slowButtons: 0,
    };
    buttonClickTimes.current = [];
  }, []);

  // Performance report
  const getPerformanceReport = useCallback(() => {
    const currentMetrics = getMetrics();
    
    return {
      componentName,
      metrics: currentMetrics,
      suggestions: optimizationSuggestions,
      isOptimized: optimizationSuggestions.length === 0,
      performanceScore: calculatePerformanceScore(currentMetrics),
    };
  }, [componentName, getMetrics, optimizationSuggestions]);

  // Calculate performance score (0-100)
  const calculatePerformanceScore = useCallback((currentMetrics: PerformanceMetrics) => {
    let score = 100;

    // Deduct points for slow renders
    if (currentMetrics.averageRenderTime > slowRenderThreshold) {
      score -= Math.min(30, (currentMetrics.averageRenderTime - slowRenderThreshold) / 2);
    }

    // Deduct points for slow button responses
    if (currentMetrics.averageButtonResponseTime > slowButtonThreshold) {
      score -= Math.min(30, (currentMetrics.averageButtonResponseTime - slowButtonThreshold) / 2);
    }

    // Deduct points for frequent slow operations
    if (currentMetrics.slowRenders > 5) {
      score -= Math.min(20, currentMetrics.slowRenders * 2);
    }

    if (currentMetrics.slowButtons > 3) {
      score -= Math.min(20, currentMetrics.slowButtons * 2);
    }

    return Math.max(0, Math.round(score));
  }, [slowRenderThreshold, slowButtonThreshold]);

  return {
    // Metrics
    metrics: getMetrics(),
    performanceReport: getPerformanceReport(),
    
    // Actions
    trackButtonClick,
    createOptimizedButton,
    resetMetrics,
    
    // Optimization
    optimizationSuggestions,
    performanceScore: calculatePerformanceScore(getMetrics()),
    
    // Utilities
    isOptimized: optimizationSuggestions.length === 0,
  };
};

// Hook for tracking specific operations
export const useOperationTracker = (operationName: string) => {
  const startTime = useRef<number>(0);
  const operationTimes = useRef<number[]>([]);

  const startOperation = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endOperation = useCallback(() => {
    const endTime = performance.now();
    const duration = endTime - startTime.current;
    operationTimes.current.push(duration);

    // Keep only last 50 operations
    if (operationTimes.current.length > 50) {
      operationTimes.current.shift();
    }

    if (__DEV__ && duration > 100) {
      console.warn(`🐌 Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }, [operationName]);

  const getAverageTime = useCallback(() => {
    if (operationTimes.current.length === 0) return 0;
    return operationTimes.current.reduce((a, b) => a + b, 0) / operationTimes.current.length;
  }, []);

  return {
    startOperation,
    endOperation,
    getAverageTime,
    operationCount: operationTimes.current.length,
  };
};
