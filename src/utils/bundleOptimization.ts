/**
 * Bundle Optimization and Code Splitting Utilities
 * Reduces initial bundle size and improves loading performance
 */

import { lazy, Suspense, ComponentType, ReactElement, cloneElement } from 'react';
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
    return (props: any) => (
      <Suspense 
        fallback={options.fallback || <DefaultLoadingFallback name={name} />}
      >
        <LazyComponent {...props} />
      </Suspense>
    );
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

// Global bundle optimizer instance
export const bundleOptimizer = new BundleOptimizer();

// Optimized lazy component definitions
export const LazyComponents = {
  // Heavy components that should be code-split
  DataExport: bundleOptimizer.createLazyComponent(
    () => import('@/components/DataExport'),
    'DataExport',
    {
      fallback: <DefaultLoadingFallback name="Data Export" />
    }
  ),

  SummaryReports: bundleOptimizer.createLazyComponent(
    () => import('@/components/SummaryReports'),
    'SummaryReports',
    {
      fallback: <DefaultLoadingFallback name="Summary Reports" />
    }
  ),

  SystemHealthCheck: bundleOptimizer.createLazyComponent(
    () => import('@/components/SystemHealthCheck'),
    'SystemHealthCheck',
    {
      fallback: <DefaultLoadingFallback name="System Health Check" />
    }
  ),

  OptimizedTimeEntryViewer: bundleOptimizer.createLazyComponent(
    () => import('@/components/OptimizedTimeEntryViewer'),
    'OptimizedTimeEntryViewer',
    {
      fallback: <DefaultLoadingFallback name="Time Entry Viewer" />
    }
  ),

  BackupManagement: bundleOptimizer.createLazyComponent(
    () => import('@/components/BackupManagement'),
    'BackupManagement',
    {
      fallback: <DefaultLoadingFallback name="Backup Management" />
    }
  ),

  // Rarely used components
  DeleteConfirmationDialog: bundleOptimizer.createLazyComponent(
    () => import('@/components/DeleteConfirmationDialog'),
    'DeleteConfirmationDialog',
    {
      fallback: <DefaultLoadingFallback name="Confirmation Dialog" />
    }
  )
};

// Resource preloading utilities
export const resourcePreloader = {
  // Preload critical CSS
  preloadCSS(href: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
  },

  // Preload JavaScript modules
  preloadJS(href: string): void {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = href;
    document.head.appendChild(link);
  },

  // Preload critical fonts
  preloadFont(href: string, type: string = 'woff2'): void {
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
      const vitals = { fcp: 0, lcp: 0, fid: 0, cls: 0 };
      let measurementCount = 0;

      // First Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            vitals.fcp = entry.startTime;
            measurementCount++;
            if (measurementCount === 4) resolve(vitals);
          }
        });
      }).observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitals.lcp = lastEntry.startTime;
        measurementCount++;
        if (measurementCount === 4) resolve(vitals);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          vitals.fid = entry.processingStart - entry.startTime;
          measurementCount++;
          if (measurementCount === 4) resolve(vitals);
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            vitals.cls += entry.value;
          }
        });
        measurementCount++;
        if (measurementCount === 4) resolve(vitals);
      }).observe({ entryTypes: ['layout-shift'] });

      // Timeout after 10 seconds
      setTimeout(() => resolve(vitals), 10000);
    });
  },

  // Monitor bundle loading performance
  measureBundleLoadTime(): Promise<number> {
    return new Promise((resolve) => {
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
      
      // Timeout after 5 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(0);
      }, 5000);
    });
  }
};

// Initialize intelligent preloading
if (typeof document !== 'undefined') {
  bundleOptimizer.setupIntelligentPreloading();
}

export { BundleOptimizer };