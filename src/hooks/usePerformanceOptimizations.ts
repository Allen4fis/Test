/**
 * Performance Optimizations Integration Hook
 * Combines all performance optimizations into a single easy-to-use hook
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { optimizeAllCaches, getAllCacheStats } from "@/utils/enhancedCaching";
import {
  clearDebouncedRequests,
  getDebouncerStats,
} from "@/utils/requestDebouncing";
import {
  initializeCSSOptimizations,
  measureCSSPerformance,
} from "@/utils/cssOptimization";
import {
  clearPerformanceData,
  getPerformanceData,
} from "@/utils/componentOptimization";

interface PerformanceMetrics {
  cacheStats: ReturnType<typeof getAllCacheStats>;
  debouncerStats: ReturnType<typeof getDebouncerStats>;
  cssStats: ReturnType<typeof measureCSSPerformance>;
  componentStats: ReturnType<typeof getPerformanceData>;
  memoryUsage: number;
  renderingStats: {
    averageFPS: number;
    frameDrops: number;
    totalFrames: number;
  };
}

interface PerformanceOptimizationConfig {
  enableCaching: boolean;
  enableDebouncing: boolean;
  enableCSSOptimization: boolean;
  enableComponentOptimization: boolean;
  enableMemoryManagement: boolean;
  autoOptimizeInterval: number; // milliseconds
  memoryThreshold: number; // MB
}

const defaultConfig: PerformanceOptimizationConfig = {
  enableCaching: true,
  enableDebouncing: true,
  enableCSSOptimization: true,
  enableComponentOptimization: true,
  enableMemoryManagement: true,
  autoOptimizeInterval: 30000, // 30 seconds
  memoryThreshold: 100, // 100MB
};

export const usePerformanceOptimizations = (
  config: Partial<PerformanceOptimizationConfig> = {},
) => {
  const finalConfig = { ...defaultConfig, ...config };
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isOptimized, setIsOptimized] = useState(false);
  const optimizationInterval = useRef<NodeJS.Timeout>();
  const frameStats = useRef({
    frames: 0,
    lastTime: performance.now(),
    fps: 0,
    drops: 0,
  });

  // Initialize performance monitoring
  useEffect(() => {
    if (finalConfig.enableComponentOptimization) {
      // Start performance monitoring
      const monitorFrames = () => {
        const now = performance.now();
        frameStats.current.frames++;

        if (now - frameStats.current.lastTime >= 1000) {
          const newFPS = frameStats.current.frames;

          // Detect frame drops (FPS significantly below 60)
          if (newFPS < 45 && frameStats.current.fps > 0) {
            frameStats.current.drops++;
          }

          frameStats.current.fps = newFPS;
          frameStats.current.frames = 0;
          frameStats.current.lastTime = now;
        }

        requestAnimationFrame(monitorFrames);
      };

      requestAnimationFrame(monitorFrames);
    }

    // Initialize CSS optimizations
    if (finalConfig.enableCSSOptimization) {
      initializeCSSOptimizations({
        enableCriticalCSS: true,
        enableAsyncCSS: true,
        preloadFonts: true,
        minifyInline: true,
      });
    }

    setIsOptimized(true);
  }, [finalConfig]);

  // Auto-optimization interval
  useEffect(() => {
    if (finalConfig.autoOptimizeInterval > 0) {
      optimizationInterval.current = setInterval(() => {
        performOptimization();
      }, finalConfig.autoOptimizeInterval);

      return () => {
        if (optimizationInterval.current) {
          clearInterval(optimizationInterval.current);
        }
      };
    }
  }, [finalConfig.autoOptimizeInterval]);

  // Get current memory usage (approximate)
  const getMemoryUsage = useCallback((): number => {
    if ("memory" in performance) {
      const memInfo = (performance as any).memory;
      return memInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  }, []);

  // Perform comprehensive optimization
  const performOptimization = useCallback(() => {
    const memoryUsage = getMemoryUsage();

    // Cache optimization
    if (finalConfig.enableCaching) {
      optimizeAllCaches();
    }

    // Memory management
    if (
      finalConfig.enableMemoryManagement &&
      memoryUsage > finalConfig.memoryThreshold
    ) {
      // Clear old performance data
      clearPerformanceData();

      // Clear debounced requests
      if (finalConfig.enableDebouncing) {
        clearDebouncedRequests();
      }

      // Force garbage collection (if available)
      if ("gc" in window && typeof (window as any).gc === "function") {
        (window as any).gc();
      }
    }

    // Update metrics
    updateMetrics();
  }, [finalConfig, getMemoryUsage]);

  // Update performance metrics
  const updateMetrics = useCallback(() => {
    const newMetrics: PerformanceMetrics = {
      cacheStats: getAllCacheStats(),
      debouncerStats: getDebouncerStats(),
      cssStats: measureCSSPerformance(),
      componentStats: getPerformanceData(),
      memoryUsage: getMemoryUsage(),
      renderingStats: {
        averageFPS: frameStats.current.fps,
        frameDrops: frameStats.current.drops,
        totalFrames: frameStats.current.frames,
      },
    };

    setMetrics(newMetrics);
  }, [getMemoryUsage]);

  // Manual optimization trigger
  const optimize = useCallback(() => {
    performOptimization();
  }, [performOptimization]);

  // Get optimization recommendations
  const getRecommendations = useCallback((): string[] => {
    if (!metrics) return [];

    const recommendations: string[] = [];

    // Cache recommendations
    if (metrics.cacheStats.calculation.hitRate < 0.8) {
      recommendations.push(
        "Consider increasing cache size or TTL for better cache hit rates",
      );
    }

    // Memory recommendations
    if (metrics.memoryUsage > finalConfig.memoryThreshold) {
      recommendations.push(
        "High memory usage detected - consider running optimization",
      );
    }

    // FPS recommendations
    if (metrics.renderingStats.averageFPS < 50) {
      recommendations.push(
        "Low FPS detected - consider reducing component complexity",
      );
    }

    // CSS recommendations
    if (metrics.cssStats.renderBlockingResources > 3) {
      recommendations.push("Too many render-blocking CSS resources detected");
    }

    return recommendations;
  }, [metrics, finalConfig.memoryThreshold]);

  // Performance score calculation (0-100)
  const getPerformanceScore = useCallback((): number => {
    if (!metrics) return 0;

    let score = 100;

    // Deduct points for poor cache performance
    const avgCacheHitRate =
      (metrics.cacheStats.calculation.hitRate +
        metrics.cacheStats.data.hitRate +
        metrics.cacheStats.view.hitRate) /
      3;

    score -= (1 - avgCacheHitRate) * 30; // Up to 30 points for cache performance

    // Deduct points for high memory usage
    const memoryPenalty = Math.max(
      0,
      ((metrics.memoryUsage - finalConfig.memoryThreshold) /
        finalConfig.memoryThreshold) *
        20,
    );
    score -= memoryPenalty; // Up to 20 points for memory usage

    // Deduct points for low FPS
    const fpsPenalty = Math.max(
      0,
      ((60 - metrics.renderingStats.averageFPS) / 60) * 25,
    );
    score -= fpsPenalty; // Up to 25 points for FPS

    // Deduct points for CSS issues
    const cssPenalty = Math.max(
      0,
      (metrics.cssStats.renderBlockingResources - 2) * 5,
    );
    score -= cssPenalty; // Up to 25 points for CSS optimization

    return Math.max(0, Math.round(score));
  }, [metrics, finalConfig.memoryThreshold]);

  return {
    metrics,
    isOptimized,
    optimize,
    updateMetrics,
    getRecommendations,
    getPerformanceScore,
    config: finalConfig,
  };
};

export default usePerformanceOptimizations;
