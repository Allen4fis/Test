/**
 * React Component Optimization Utilities
 * Provides higher-order components and hooks for maximum React performance
 */

import { 
  memo, 
  useMemo, 
  useCallback, 
  useRef, 
  useEffect, 
  useState,
  ReactNode,
  ComponentType,
  ReactElement,
} from 'react';

interface OptimizationOptions {
  shouldUpdate?: (prevProps: any, nextProps: any) => boolean;
  deepEqual?: boolean;
  displayName?: string;
}

/**
 * Enhanced memo with deep comparison options
 */
export const optimizedMemo = <P extends object>(
  Component: ComponentType<P>,
  options: OptimizationOptions = {}
): ComponentType<P> => {
  const areEqual = options.shouldUpdate || ((prevProps, nextProps) => {
    if (!options.deepEqual) {
      return Object.keys(prevProps).length === Object.keys(nextProps).length &&
        Object.keys(prevProps).every(key => prevProps[key] === nextProps[key]);
    }
    
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  });

  const MemoizedComponent = memo(Component, (prevProps, nextProps) => areEqual(prevProps, nextProps));
  
  if (options.displayName) {
    MemoizedComponent.displayName = options.displayName;
  }

  return MemoizedComponent;
};

/**
 * Hook for optimized callbacks with dependency tracking
 */
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const callbackRef = useRef(callback);
  const depsRef = useRef(deps);

  // Update callback ref if dependencies changed
  useEffect(() => {
    if (deps.some((dep, index) => dep !== depsRef.current[index])) {
      callbackRef.current = callback;
      depsRef.current = deps;
    }
  }, deps);

  return useCallback(callbackRef.current, []) as T;
};

/**
 * Hook for optimized memoization with size limits
 */
export const useOptimizedMemo = <T>(
  factory: () => T,
  deps: React.DependencyList,
  maxCacheSize: number = 10
): T => {
  const cache = useRef<Map<string, T>>(new Map());
  const keyRef = useRef<string>('');

  const key = useMemo(() => JSON.stringify(deps), deps);

  return useMemo(() => {
    // Check if we have cached result
    if (cache.current.has(key)) {
      keyRef.current = key;
      return cache.current.get(key)!;
    }

    // Compute new result
    const result = factory();

    // Manage cache size
    if (cache.current.size >= maxCacheSize) {
      const firstKey = cache.current.keys().next().value;
      cache.current.delete(firstKey);
    }

    cache.current.set(key, result);
    keyRef.current = key;
    return result;
  }, [key]);
};

/**
 * Hook for debounced values with performance tracking
 */
export const useOptimizedDebounce = <T>(
  value: T,
  delay: number
): { debouncedValue: T; isDebouncing: boolean; updateCount: number } => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setIsDebouncing(true);
    setUpdateCount(prev => prev + 1);

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return { debouncedValue, isDebouncing, updateCount };
};

/**
 * Hook for virtualized list rendering
 */
export const useVirtualizedList = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    
    return {
      start: Math.max(0, start - overscan),
      end,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      style: {
        position: 'absolute' as const,
        top: (visibleRange.start + index) * itemHeight,
        height: itemHeight,
        width: '100%',
      },
    }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  return {
    visibleItems,
    totalHeight,
    setScrollTop,
    stats: {
      total: items.length,
      visible: visibleRange.end - visibleRange.start,
      startIndex: visibleRange.start,
      endIndex: visibleRange.end,
    },
  };
};

/**
 * Higher-order component for performance monitoring
 */
export const withPerformanceMonitoring = <P extends object>(
  Component: ComponentType<P>,
  componentName?: string
) => {
  return memo((props: P) => {
    const renderStart = useRef<number>(0);
    const renderCount = useRef<number>(0);
    const [renderStats, setRenderStats] = useState({
      count: 0,
      averageTime: 0,
      lastRenderTime: 0,
    });

    renderStart.current = performance.now();
    renderCount.current += 1;

    useEffect(() => {
      const renderTime = performance.now() - renderStart.current;
      
      setRenderStats(prev => ({
        count: renderCount.current,
        averageTime: (prev.averageTime * (prev.count - 1) + renderTime) / prev.count,
        lastRenderTime: renderTime,
      }));

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected in ${componentName || Component.name}: ${renderTime.toFixed(2)}ms`);
      }
    });

    return <Component {...props} />;
  });
};

/**
 * Hook for optimized event handlers
 */
export const useOptimizedHandlers = <T extends Record<string, (...args: any[]) => any>>(
  handlers: T
): T => {
  const handlersRef = useRef<T>(handlers);
  
  // Update ref if handlers change (shallow comparison)
  useEffect(() => {
    const hasChanged = Object.keys(handlers).some(
      key => handlers[key] !== handlersRef.current[key]
    );
    
    if (hasChanged) {
      handlersRef.current = handlers;
    }
  }, [handlers]);

  return useMemo(() => {
    const optimizedHandlers = {} as T;
    
    Object.keys(handlersRef.current).forEach(key => {
      optimizedHandlers[key] = useCallback(
        (...args: any[]) => handlersRef.current[key](...args),
        []
      );
    });

    return optimizedHandlers;
  }, []);
};

/**
 * Component for lazy loading with intersection observer
 */
interface LazyComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
}

export const LazyComponent = memo(({
  children,
  fallback = <div>Loading...</div>,
  rootMargin = '50px',
  threshold = 0.1,
  className,
}: LazyComponentProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isIntersecting) {
          setIsIntersecting(true);
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold, isIntersecting]);

  return (
    <div ref={elementRef} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
});

LazyComponent.displayName = 'LazyComponent';

/**
 * Performance monitoring context and hook
 */
interface PerformanceData {
  renderCount: number;
  averageRenderTime: number;
  slowRenders: number;
  totalTime: number;
}

const performanceData = new Map<string, PerformanceData>();

export const getPerformanceData = () => Object.fromEntries(performanceData);

export const clearPerformanceData = () => performanceData.clear();