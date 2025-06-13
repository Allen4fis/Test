import { useEffect, useRef, useState } from "react";

interface PerformanceMetrics {
  memoryUsage: number;
  loadTime: number;
  renderTime: number;
  errorCount: number;
  warningCount: number;
}

interface SystemHealth {
  status: "healthy" | "warning" | "critical";
  metrics: PerformanceMetrics;
  issues: string[];
}

export function useSystemMonitoring() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: "healthy",
    metrics: {
      memoryUsage: 0,
      loadTime: 0,
      renderTime: 0,
      errorCount: 0,
      warningCount: 0,
    },
    issues: [],
  });

  const renderStartTime = useRef<number>(0);
  const errorCount = useRef<number>(0);
  const warningCount = useRef<number>(0);

  // Monitor memory usage
  const getMemoryUsage = (): number => {
    if ("memory" in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  };

  // Monitor page load time
  const getLoadTime = (): number => {
    if ("timing" in performance) {
      const timing = performance.timing;
      return timing.loadEventEnd - timing.navigationStart;
    }
    return 0;
  };

  // Start render timing
  const startRenderTimer = () => {
    renderStartTime.current = performance.now();
  };

  // End render timing
  const endRenderTimer = (): number => {
    if (renderStartTime.current > 0) {
      const duration = performance.now() - renderStartTime.current;
      renderStartTime.current = 0;
      return duration;
    }
    return 0;
  };

  // Log error
  const logError = (error: Error | string) => {
    errorCount.current++;
    console.error("System Error:", error);

    // In production, send to error reporting service
    if (process.env.NODE_ENV === "production") {
      // Example: errorReportingService.captureException(error);
    }
  };

  // Log warning
  const logWarning = (warning: string) => {
    warningCount.current++;
    console.warn("System Warning:", warning);
  };

  // Check system health
  const checkSystemHealth = (): SystemHealth => {
    const memoryUsage = getMemoryUsage();
    const loadTime = getLoadTime();
    const renderTime = endRenderTimer();

    const metrics: PerformanceMetrics = {
      memoryUsage,
      loadTime,
      renderTime,
      errorCount: errorCount.current,
      warningCount: warningCount.current,
    };

    const issues: string[] = [];
    let status: "healthy" | "warning" | "critical" = "healthy";

    // Check for critical issues
    if (memoryUsage > 200) {
      issues.push(`High memory usage: ${memoryUsage.toFixed(1)}MB`);
      status = "critical";
    } else if (memoryUsage > 100) {
      issues.push(`Elevated memory usage: ${memoryUsage.toFixed(1)}MB`);
      status = status === "healthy" ? "warning" : status;
    }

    if (renderTime > 1000) {
      issues.push(`Slow render time: ${renderTime.toFixed(0)}ms`);
      status = "critical";
    } else if (renderTime > 500) {
      issues.push(`Elevated render time: ${renderTime.toFixed(0)}ms`);
      status = status === "healthy" ? "warning" : status;
    }

    if (errorCount.current > 5) {
      issues.push(`High error count: ${errorCount.current}`);
      status = "critical";
    } else if (errorCount.current > 0) {
      issues.push(`Errors detected: ${errorCount.current}`);
      status = status === "healthy" ? "warning" : status;
    }

    return {
      status,
      metrics,
      issues,
    };
  };

  // Monitor system health periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const health = checkSystemHealth();
      setSystemHealth(health);

      // Log health status changes
      if (health.status !== systemHealth.status) {
        console.log(`System health changed to: ${health.status}`, health);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [systemHealth.status]);

  // Monitor for unhandled errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logError(event.error || event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError(event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  // Performance observer for monitoring long tasks
  useEffect(() => {
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "longtask") {
            logWarning(`Long task detected: ${entry.duration.toFixed(0)}ms`);
          }
        }
      });

      try {
        observer.observe({ entryTypes: ["longtask"] });
      } catch (error) {
        // Browser might not support longtask
        console.warn("Long task monitoring not supported");
      }

      return () => observer.disconnect();
    }
  }, []);

  // Clear error counts
  const clearErrors = () => {
    errorCount.current = 0;
    warningCount.current = 0;
  };

  // Force health check
  const forceHealthCheck = () => {
    const health = checkSystemHealth();
    setSystemHealth(health);
    return health;
  };

  return {
    systemHealth,
    startRenderTimer,
    endRenderTimer,
    logError,
    logWarning,
    clearErrors,
    forceHealthCheck,
    getMemoryUsage,
  };
}

// Performance decorator for functions
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
): T {
  return ((...args: any[]) => {
    const start = performance.now();
    try {
      const result = fn(...args);

      // Handle promise
      if (result && typeof result.then === "function") {
        return result.finally(() => {
          const duration = performance.now() - start;
          if (duration > 100) {
            console.warn(
              `⚠️ Performance: ${name} took ${duration.toFixed(2)}ms`,
            );
          }
        });
      }

      const duration = performance.now() - start;
      if (duration > 100) {
        console.warn(`⚠️ Performance: ${name} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(
        `🚨 Error in ${name} after ${duration.toFixed(2)}ms:`,
        error,
      );
      throw error;
    }
  }) as T;
}

// React component performance monitor
export function useComponentPerformance(componentName: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    renderCount.current++;
    const renderTime = performance.now();

    return () => {
      const duration = performance.now() - renderTime;
      renderTimes.current.push(duration);

      // Keep only last 10 renders
      if (renderTimes.current.length > 10) {
        renderTimes.current.shift();
      }

      // Log slow renders
      if (duration > 16) {
        // 60fps = 16.67ms per frame
        console.warn(
          `🐌 Slow render: ${componentName} took ${duration.toFixed(2)}ms`,
        );
      }

      // Log frequent re-renders
      if (renderCount.current > 100) {
        const avgRenderTime =
          renderTimes.current.reduce((a, b) => a + b, 0) /
          renderTimes.current.length;
        console.warn(
          `🔄 Frequent re-renders: ${componentName} rendered ${renderCount.current} times, avg ${avgRenderTime.toFixed(2)}ms`,
        );
      }
    };
  });

  return {
    renderCount: renderCount.current,
    averageRenderTime:
      renderTimes.current.length > 0
        ? renderTimes.current.reduce((a, b) => a + b, 0) /
          renderTimes.current.length
        : 0,
  };
}
