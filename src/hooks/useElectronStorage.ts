import { useEffect, useRef, useState } from "react";
import { storageService } from "@/services/StorageService";

/**
 * useElectronStorage
 * A hook that provides persistent storage working in both Electron and browser environments
 * Automatically detects the environment and uses the appropriate backend
 */
export function useElectronStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const loadedRef = useRef(false);

  // Load data from storage on mount
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const value = await storageService.getJSON<T>(key, initialValue);
        if (!cancelled) {
          setStoredValue(value);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error(`Error loading storage key "${key}":`, error);
        if (!cancelled) {
          setStoredValue(initialValue);
          setIsLoaded(true);
        }
      }
    };

    if (!loadedRef.current) {
      loadedRef.current = true;
      loadData();
    }

    return () => {
      cancelled = true;
    };
  }, [key, initialValue]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      // Save to storage asynchronously
      storageService.setJSON(key, valueToStore).catch((error) => {
        console.error(`Error saving storage key "${key}":`, error);
      });
    } catch (err) {
      console.error(`Error preparing value for key "${key}":`, err);
    }
  };

  return [storedValue, setValue];
}

/**
 * useElectronStorageJSON
 * Type-safe hook for JSON serialization
 */
export function useElectronStorageJSON<T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  },
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const loadedRef = useRef(false);

  const serialize = options?.serialize || ((value) => JSON.stringify(value));
  const deserialize = options?.deserialize || ((value) => JSON.parse(value));

  // Load data from storage on mount
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const rawValue = await storageService.get(key);
        if (rawValue && !cancelled) {
          try {
            const value = deserialize(rawValue);
            setStoredValue(value);
          } catch (parseError) {
            console.error(`Error parsing storage key "${key}":`, parseError);
            setStoredValue(initialValue);
          }
        } else if (!cancelled) {
          setStoredValue(initialValue);
        }
        if (!cancelled) setIsLoaded(true);
      } catch (error) {
        console.error(`Error loading storage key "${key}":`, error);
        if (!cancelled) {
          setStoredValue(initialValue);
          setIsLoaded(true);
        }
      }
    };

    if (!loadedRef.current) {
      loadedRef.current = true;
      loadData();
    }

    return () => {
      cancelled = true;
    };
  }, [key, initialValue, deserialize]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      // Save to storage asynchronously
      const serialized = serialize(valueToStore);
      storageService.set(key, serialized).catch((error) => {
        console.error(`Error saving storage key "${key}":`, error);
      });
    } catch (err) {
      console.error(`Error preparing value for key "${key}":`, err);
    }
  };

  return [storedValue, setValue];
}
