/**
 * CSS Optimization Utilities
 * Provides critical CSS extraction and loading optimizations
 */

interface CSSOptimizationConfig {
  enableCriticalCSS: boolean;
  enableAsyncCSS: boolean;
  preloadFonts: boolean;
  minifyInline: boolean;
}

const defaultConfig: CSSOptimizationConfig = {
  enableCriticalCSS: true,
  enableAsyncCSS: true,
  preloadFonts: true,
  minifyInline: true,
};

/**
 * Critical CSS styles for immediate rendering
 */
const criticalCSS = `
  /* Critical path CSS - Above the fold styles */
  .modern-gradient {
    background: linear-gradient(135deg, hsl(220, 20%, 8%) 0%, hsl(220, 15%, 12%) 50%, hsl(220, 18%, 10%) 100%);
  }
  
  .modern-card {
    background: linear-gradient(135deg, hsl(220, 20%, 10%) 0%, hsl(220, 15%, 14%) 100%);
    border: 1px solid hsl(220, 15%, 25%);
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }
  
  .orange-gradient {
    background: linear-gradient(135deg, hsl(24, 100%, 50%) 0%, hsl(24, 100%, 60%) 100%);
  }
  
  .text-gradient {
    background: linear-gradient(135deg, hsl(24, 100%, 60%) 0%, hsl(24, 100%, 70%) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  /* Essential layout styles */
  .min-h-screen { min-height: 100vh; }
  .flex { display: flex; }
  .grid { display: grid; }
  .hidden { display: none; }
  .block { display: block; }
  .relative { position: relative; }
  .absolute { position: absolute; }
  .fixed { position: fixed; }
  .sticky { position: sticky; }
  
  /* Critical spacing */
  .p-4 { padding: 1rem; }
  .p-6 { padding: 1.5rem; }
  .px-4 { padding-left: 1rem; padding-right: 1rem; }
  .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
  .m-0 { margin: 0; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  
  /* Critical text styles */
  .text-white { color: rgb(255, 255, 255); }
  .text-gray-300 { color: rgb(209, 213, 219); }
  .text-orange-300 { color: rgb(253, 186, 116); }
  .font-bold { font-weight: 700; }
  .text-sm { font-size: 0.875rem; }
  .text-lg { font-size: 1.125rem; }
  .text-xl { font-size: 1.25rem; }
  .text-2xl { font-size: 1.5rem; }
`;

/**
 * Inject critical CSS into document head
 */
export const injectCriticalCSS = (config: Partial<CSSOptimizationConfig> = {}): void => {
  const finalConfig = { ...defaultConfig, ...config };
  
  if (!finalConfig.enableCriticalCSS) return;

  // Check if critical CSS is already injected
  if (document.getElementById('critical-css')) return;

  const style = document.createElement('style');
  style.id = 'critical-css';
  style.type = 'text/css';
  
  // Minify if enabled
  const css = finalConfig.minifyInline 
    ? criticalCSS.replace(/\s+/g, ' ').replace(/\/\*.*?\*\//g, '').trim()
    : criticalCSS;
    
  style.textContent = css;
  
  // Insert at the beginning of head for highest priority
  document.head.insertBefore(style, document.head.firstChild);
};

/**
 * Preload critical fonts
 */
export const preloadFonts = (fontUrls: string[] = []): void => {
  const defaultFonts = [
    // Add your font URLs here if you have custom fonts
  ];
  
  const allFonts = [...defaultFonts, ...fontUrls];
  
  allFonts.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

/**
 * Load CSS asynchronously to avoid render blocking
 */
export const loadAsyncCSS = (href: string, media: string = 'all'): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print'; // Start with print to avoid blocking
    link.onload = () => {
      link.media = media; // Switch to actual media
      resolve();
    };
    link.onerror = reject;
    
    document.head.appendChild(link);
  });
};

/**
 * Optimize CSS delivery by prioritizing critical styles
 */
export const optimizeCSSDelivery = (config: Partial<CSSOptimizationConfig> = {}): void => {
  const finalConfig = { ...defaultConfig, ...config };
  
  // Inject critical CSS immediately
  if (finalConfig.enableCriticalCSS) {
    injectCriticalCSS(finalConfig);
  }
  
  // Preload fonts
  if (finalConfig.preloadFonts) {
    preloadFonts();
  }
  
  // Load non-critical CSS asynchronously
  if (finalConfig.enableAsyncCSS) {
    // Wait for critical rendering, then load full styles
    setTimeout(() => {
      const stylesheets = document.querySelectorAll('link[rel="stylesheet"]:not([data-async])');
      stylesheets.forEach(stylesheet => {
        const link = stylesheet as HTMLLinkElement;
        if (link.href && !link.href.includes('critical')) {
          link.setAttribute('data-async', 'true');
          link.media = 'print';
          link.onload = () => {
            link.media = 'all';
          };
        }
      });
    }, 100);
  }
};

/**
 * Remove unused CSS classes from the page (basic implementation)
 */
export const removeUnusedCSS = (preserveClasses: string[] = []): void => {
  const usedClasses = new Set<string>();
  const preserveSet = new Set(preserveClasses);
  
  // Find all elements with classes
  document.querySelectorAll('*[class]').forEach(element => {
    const classes = element.className.split(' ');
    classes.forEach(cls => {
      if (cls.trim()) {
        usedClasses.add(cls.trim());
      }
    });
  });
  
  // Get all stylesheets
  Array.from(document.styleSheets).forEach(sheet => {
    if (sheet.href && sheet.href.includes(window.location.origin)) {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules);
        rules.forEach(rule => {
          if (rule.type === CSSRule.STYLE_RULE) {
            const styleRule = rule as CSSStyleRule;
            const selector = styleRule.selectorText;
            
            // Check if selector contains unused classes
            const hasUnusedClass = selector.split(/[,\s]+/).some(part => {
              const className = part.replace(/^\./, '');
              return className && 
                     !usedClasses.has(className) && 
                     !preserveSet.has(className) &&
                     !className.includes(':') && // Preserve pseudo-classes
                     !className.includes('['); // Preserve attribute selectors
            });
            
            if (hasUnusedClass) {
              // Mark rule for potential removal (in development only)
              if (process.env.NODE_ENV === 'development') {
                console.log('Potentially unused CSS rule:', selector);
              }
            }
          }
        });
      } catch (e) {
        // Cross-origin stylesheet, skip
      }
    }
  });
};

/**
 * Measure CSS performance metrics
 */
export const measureCSSPerformance = (): {
  stylesheetCount: number;
  totalCSSSize: number;
  criticalPathCSS: boolean;
  renderBlockingResources: number;
} => {
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style');
  const criticalCSSExists = !!document.getElementById('critical-css');
  
  let totalSize = 0;
  let renderBlocking = 0;
  
  stylesheets.forEach(sheet => {
    if (sheet instanceof HTMLLinkElement) {
      // Estimate size (can't get actual size due to CORS)
      totalSize += 10000; // Rough estimate
      if (!sheet.media || sheet.media === 'all') {
        renderBlocking++;
      }
    } else if (sheet instanceof HTMLStyleElement) {
      totalSize += sheet.textContent?.length || 0;
    }
  });
  
  return {
    stylesheetCount: stylesheets.length,
    totalCSSSize: totalSize,
    criticalPathCSS: criticalCSSExists,
    renderBlockingResources: renderBlocking,
  };
};

/**
 * Initialize CSS optimizations on page load
 */
export const initializeCSSOptimizations = (config: Partial<CSSOptimizationConfig> = {}): void => {
  // Run immediately for critical CSS
  optimizeCSSDelivery(config);
  
  // Run additional optimizations after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (config.enableAsyncCSS !== false) {
          removeUnusedCSS(['animate-', 'transition-', 'duration-', 'ease-']);
        }
      }, 1000);
    });
  }
};

export default {
  injectCriticalCSS,
  preloadFonts,
  loadAsyncCSS,
  optimizeCSSDelivery,
  removeUnusedCSS,
  measureCSSPerformance,
  initializeCSSOptimizations,
};
