import { useEffect, useRef, useCallback } from 'react';
import { PERFORMANCE_METRICS } from '../config/performance';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkLatency: number;
  imageLoadTime: number;
  videoLoadTime: number;
}

export const usePerformanceMonitoring = () => {
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    networkLatency: 0,
    imageLoadTime: 0,
    videoLoadTime: 0
  });

  const startTimeRef = useRef<number>(0);

  // Start performance measurement
  const startMeasurement = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  // End performance measurement
  const endMeasurement = useCallback((type: keyof PerformanceMetrics) => {
    const endTime = performance.now();
    const duration = endTime - startTimeRef.current;
    
    metricsRef.current[type] = duration;
    
    // Log performance warnings
    if (type === 'renderTime' && duration > PERFORMANCE_METRICS.RENDER_TIME_THRESHOLD) {
      console.warn(`⚠️ Slow render detected: ${duration.toFixed(2)}ms`);
    }
    
    if (type === 'imageLoadTime' && duration > PERFORMANCE_METRICS.IMAGE_LOAD_THRESHOLD) {
      console.warn(`⚠️ Slow image load: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }, []);

  // Measure render time
  const measureRender = useCallback((componentName: string) => {
    startMeasurement();
    
    return () => {
      const renderTime = endMeasurement('renderTime');
      if (renderTime > PERFORMANCE_METRICS.RENDER_TIME_THRESHOLD) {
        console.warn(`⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  }, [startMeasurement, endMeasurement]);

  // Measure network request
  const measureNetwork = useCallback(async <T>(request: () => Promise<T>, requestName: string): Promise<T> => {
    startMeasurement();
    
    try {
      const result = await request();
      const latency = endMeasurement('networkLatency');
      
      if (latency > PERFORMANCE_METRICS.NETWORK_SLOW_THRESHOLD) {
        console.warn(`⚠️ Slow network request ${requestName}: ${latency.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      endMeasurement('networkLatency');
      throw error;
    }
  }, [startMeasurement, endMeasurement]);

  // Measure image load
  const measureImageLoad = useCallback((imageUrl: string) => {
    startMeasurement();
    
    return () => {
      const loadTime = endMeasurement('imageLoadTime');
      if (loadTime > PERFORMANCE_METRICS.IMAGE_LOAD_THRESHOLD) {
        console.warn(`⚠️ Slow image load for ${imageUrl}: ${loadTime.toFixed(2)}ms`);
      }
    };
  }, [startMeasurement, endMeasurement]);

  // Get current metrics
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderTime: 0,
      memoryUsage: 0,
      networkLatency: 0,
      imageLoadTime: 0,
      videoLoadTime: 0
    };
  }, []);

  // Monitor memory usage
  useEffect(() => {
    const checkMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        metricsRef.current.memoryUsage = memoryUsage;
        
        if (memoryUsage > PERFORMANCE_METRICS.MEMORY_WARNING_THRESHOLD) {
          console.warn(`⚠️ High memory usage: ${(memoryUsage * 100).toFixed(2)}%`);
        }
      }
    };

    const interval = setInterval(checkMemoryUsage, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return {
    measureRender,
    measureNetwork,
    measureImageLoad,
    getMetrics,
    resetMetrics,
    startMeasurement,
    endMeasurement
  };
};
