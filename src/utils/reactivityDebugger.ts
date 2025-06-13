/**
 * Reactivity Debugging Utility
 *
 * This utility helps debug and monitor component re-renders and data flow
 * to identify why counts or other reactive data might not be updating.
 */

import { useRef, useEffect, useState, useCallback } from "react";

// Track component re-renders
export const useRenderTracker = (componentName: string) => {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === "development") {
      console.log(`🔄 ${componentName} rendered (${renderCount.current})`);
    }
  });

  return renderCount.current;
};

// Track when specific values change
export const useValueTracker = <T>(
  value: T,
  valueName: string,
  componentName: string = "Component",
) => {
  const prevValue = useRef<T>(value);

  useEffect(() => {
    if (prevValue.current !== value && process.env.NODE_ENV === "development") {
      console.log(`📊 ${componentName} - ${valueName} changed:`, {
        from: prevValue.current,
        to: value,
      });
    }
    prevValue.current = value;
  }, [value, valueName, componentName]);
};

// Track array length changes specifically
export const useArrayLengthTracker = <T>(
  array: T[],
  arrayName: string,
  componentName: string = "Component",
) => {
  const prevLength = useRef(array.length);

  useEffect(() => {
    const currentLength = array.length;
    if (
      prevLength.current !== currentLength &&
      process.env.NODE_ENV === "development"
    ) {
      console.log(`📏 ${componentName} - ${arrayName}.length changed:`, {
        from: prevLength.current,
        to: currentLength,
        diff: currentLength - prevLength.current,
      });
    }
    prevLength.current = currentLength;
  }, [array.length, arrayName, componentName]);

  return array.length;
};

// Track object reference changes
export const useObjectReferenceTracker = <T extends object>(
  obj: T,
  objName: string,
  componentName: string = "Component",
) => {
  const prevRef = useRef<T>(obj);

  useEffect(() => {
    if (prevRef.current !== obj && process.env.NODE_ENV === "development") {
      console.log(`🔗 ${componentName} - ${objName} reference changed`);
    }
    prevRef.current = obj;
  }, [obj, objName, componentName]);
};

// Force a component re-render (useful for debugging)
export const useForceUpdate = () => {
  const [, setTick] = useState(0);

  const forceUpdate = useCallback(() => {
    setTick((tick) => tick + 1);
    console.log("🔄 Force update triggered");
  }, []);

  return forceUpdate;
};

// Monitor memory usage for performance debugging
export const useMemoryMonitor = (componentName: string) => {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const checkMemory = () => {
        try {
          // @ts-ignore - performance.memory is not in all browsers
          if (performance.memory) {
            const memoryInfo = {
              // @ts-ignore
              used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
              // @ts-ignore
              total: Math.round(
                performance.memory.totalJSHeapSize / 1024 / 1024,
              ),
            };
            console.log(`🧠 ${componentName} memory:`, memoryInfo);
          }
        } catch (error) {
          // Memory API not available
        }
      };

      checkMemory();

      // Check memory every 30 seconds
      const interval = setInterval(checkMemory, 30000);

      return () => clearInterval(interval);
    }
  }, [componentName]);
};

// Global state change tracker
let globalStateChangeId = 0;

export const trackGlobalStateChange = (
  changeName: string,
  oldState: any,
  newState: any,
) => {
  if (process.env.NODE_ENV === "development") {
    globalStateChangeId++;
    console.log(
      `🌍 Global State Change #${globalStateChangeId}: ${changeName}`,
      {
        old: oldState,
        new: newState,
        timestamp: new Date().toISOString(),
      },
    );
  }
};

// Component props change tracker
export const usePropsTracker = <T extends Record<string, any>>(
  props: T,
  componentName: string,
) => {
  const prevProps = useRef<T>(props);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const changedProps: string[] = [];

      Object.keys(props).forEach((key) => {
        if (prevProps.current[key] !== props[key]) {
          changedProps.push(key);
        }
      });

      if (changedProps.length > 0) {
        console.log(`📝 ${componentName} props changed:`, changedProps);
      }
    }

    prevProps.current = props;
  }, [props, componentName]);
};

// Export all utilities
export default {
  useRenderTracker,
  useValueTracker,
  useArrayLengthTracker,
  useObjectReferenceTracker,
  useForceUpdate,
  useMemoryMonitor,
  trackGlobalStateChange,
  usePropsTracker,
};
