/**
 * Bundle Optimization and Code Splitting Utilities
 * Reduces initial bundle size and improves loading performance
 */

import { lazy, Suspense, ComponentType, ReactElement } from 'react';
import { RefreshCw } from 'lucide-react';

interface LazyComponentProps {
  fallback?: ReactElement;
  error?: ReactElement;
  delay?: number;
}

interface BundleAnalytics {
  componentLoadTimes: Map<string, number>;
  chunkSizes: Map<string, number>;
  loadFailures: Map<string, number>;
}

// Default loading fallback component
function DefaultLoadingFallback({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
        <span className="text-gray-400">Loading {name}...</span>
      </div>
    </div>
  );
}

class BundleOptimizer {
  private analytics: BundleAnalytics = {
    componentLoadTimes: new Map(),
    chunkSizes: new Map(),
    loadFailures: new Map()
  };

  private preloadCache = new Set<string>();
  private loadingStates = new Map<string, Promise<any>>();

  // Create optimized lazy component with enhanced error handling
  createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    name: string,
    options: LazyComponentProps = {}
  ): ComponentType<any> {
    const LazyComponent = lazy(async () => {
      const startTime = performance.now();
      
      try {
        const module = await importFn();
        const loadTime = performance.now() - startTime;
        
        this.analytics.componentLoadTimes.set(name, loadTime);
        console.log(`Loaded ${name} in ${loadTime.toFixed(2)}ms`);
        
        return module;
      } catch (error) {
        const failures = this.analytics.loadFailures.get(name) || 0;
        this.analytics.loadFailures.set(name, failures + 1);
        
        console.error(`Failed to load component ${name}:`, error);
        throw error;
      }
    });

    // Return wrapped component with Suspense
    const WrappedComponent = (props: any) => (
      <Suspense fallback={options.fallback || <DefaultLoadingFallback name={name} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
    
    return WrappedComponent;
  }

  // Preload component for faster subsequent loads
  async preloadComponent(
    importFn: () => Promise<any>,
    name: string
  ): Promise<void> {
    if (this.preloadCache.has(name)) {
      return;
    }

    console.log(`Preloading component: ${name}`);
    this.preloadCache.add(name);

    try {
      await importFn();
      console.log(`Successfully preloaded: ${name}`);
    } catch (error) {
      console.error(`Failed to preload ${name}:`, error);
      this.preloadCache.delete(name);
    }
  }

  // Smart preloading based on user behavior
  setupIntelligentPreloading(): void {
    // Preload on hover with delay
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      const preloadAttr = target.getAttribute('data-preload');
      
      if (preloadAttr && !this.preloadCache.has(preloadAttr)) {
        setTimeout(() => {
          this.preloadOnDemand(preloadAttr);
        }, 500); // 500ms hover delay
      }
    });

    // Preload on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadLowPriorityComponents();
      });
    }
  }

  private async preloadOnDemand(componentName: string): Promise<void> {
    const importMap: Record<string, () => Promise<any>> = {
      'DataExport': () => import('@/components/DataExport'),
      'SummaryReports': () => import('@/components/SummaryReports'),
      'SystemHealthCheck': () => import('@/components/SystemHealthCheck'),
      'OptimizedTimeEntryViewer': () => import('@/components/OptimizedTimeEntryViewer'),
      'BackupManagement': () => import('@/components/BackupManagement')
    };

    const importFn = importMap[componentName];
    if (importFn) {
      await this.preloadComponent(importFn, componentName);
    }
  }

  private async preloadLowPriorityComponents(): Promise<void> {
    const lowPriorityComponents = [
      'SystemHealthCheck',
      'BackupManagement'
    ];

    for (const component of lowPriorityComponents) {
      await this.preloadOnDemand(component);
      // Small delay between preloads to avoid blocking
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Get bundle analytics
  getAnalytics(): BundleAnalytics & {
    averageLoadTime: number;
    slowestComponent: string | null;
    failureRate: number;
  } {
    const loadTimes = Array.from(this.analytics.componentLoadTimes.values());
    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
      : 0;

    const slowestComponent = loadTimes.length > 0
      ? Array.from(this.analytics.componentLoadTimes.entries())
          .reduce((slowest, [name, time]) => 
            time > slowest.time ? { name, time } : slowest, 
            { name: '', time: 0 }
          ).name
      : null;

    const totalFailures = Array.from(this.analytics.loadFailures.values())
      .reduce((sum, failures) => sum + failures, 0);
    const totalAttempts = this.analytics.componentLoadTimes.size + totalFailures;
    const failureRate = totalAttempts > 0 ? (totalFailures / totalAttempts) * 100 : 0;

    return {
      ...this.analytics,
      averageLoadTime,
      slowestComponent,
      failureRate
    };
  }

  // Clear analytics data
  clearAnalytics(): void {
    this.analytics.componentLoadTimes.clear();
    this.analytics.chunkSizes.clear();
    this.analytics.loadFailures.clear();
  }
}

// Global bundle optimizer instance
export const bundleOptimizer = new BundleOptimizer();

// Resource preloading utilities
export const resourcePreloader = {
  // Preload critical CSS
  preloadCSS(href: string): void {
    if (typeof document === 'undefined') return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
  },

  // Preload JavaScript modules
  preloadJS(href: string): void {
    if (typeof document === 'undefined') return;
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = href;
    document.head.appendChild(link);
  },

  // Preload critical fonts
  preloadFont(href: string, type: string = 'woff2'): void {
    if (typeof document === 'undefined') return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = `font/${type}`;
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  },

  // Prefetch next likely resources
  prefetchResource(href: string): void {
    if (typeof document === 'undefined') return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }
};

// Performance monitoring for bundle optimization
export const bundlePerformance = {
  // Monitor Core Web Vitals
  measureWebVitals(): Promise<{
    fcp: number;  // First Contentful Paint
    lcp: number;  // Largest Contentful Paint
    fid: number;  // First Input Delay
    cls: number;  // Cumulative Layout Shift
  }> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve({ fcp: 0, lcp: 0, fid: 0, cls: 0 });
        return;
      }

      const vitals = { fcp: 0, lcp: 0, fid: 0, cls: 0 };
      let measurementCount = 0;

      const checkComplete = () => {
        if (measurementCount >= 2) resolve(vitals); // Reduced from 4 for faster completion
      };

      try {
        // First Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
              measurementCount++;
              checkComplete();
            }
          });
        }).observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
          measurementCount++;
          checkComplete();
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('Performance observers not supported:', error);
        resolve(vitals);
      }

      // Timeout after 5 seconds
      setTimeout(() => resolve(vitals), 5000);
    });
  },

  // Monitor bundle loading performance
  measureBundleLoadTime(): Promise<number> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(0);
        return;
      }

      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          let totalLoadTime = 0;
          
          entries.forEach((entry) => {
            if (entry.name.includes('.js') || entry.name.includes('.css')) {
              totalLoadTime += entry.duration;
            }
          });
          
          resolve(totalLoadTime);
          observer.disconnect();
        });

        observer.observe({ entryTypes: ['resource'] });
        
        // Timeout after 3 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve(0);
        }, 3000);
      } catch (error) {
        console.warn('Performance observer not supported:', error);
        resolve(0);
      }
    });
  }
};

// Initialize intelligent preloading
if (typeof document !== 'undefined') {
  // Delay initialization to avoid blocking main thread
  setTimeout(() => {
    bundleOptimizer.setupIntelligentPreloading();
  }, 1000);
}

export { BundleOptimizer };
