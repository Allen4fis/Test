import { useEffect, useRef, useState } from "react";
import Dexie, { Table } from "dexie";
import { storageService } from "@/services/StorageService";

// Lightweight IndexedDB KV store for large values that exceed localStorage quota
class LocalStorageFallbackDB extends Dexie {
  kv!: Table<{ key: string; value: string }, string>;
  constructor() {
    super("LocalStorageFallbackDB");
    this.version(1).stores({ kv: "key" });
  }
}

const idb = new LocalStorageFallbackDB();

// Detect if running in Electron
const isElectron = (window as any).electronAPI !== undefined;

type Marker = { __storedInIDB: true };
const isMarker = (val: unknown): val is Marker =>
  !!val && typeof val === "object" && (val as any).__storedInIDB === true;

async function idbSet(key: string, value: string) {
  await idb.open();
  await idb.table("kv").put({ key, value });
}

async function idbGet(key: string): Promise<string | null> {
  await idb.open();
  const row = await idb.table("kv").get(key);
  return row?.value ?? null;
}

async function idbDelete(key: string) {
  await idb.open();
  await idb.table("kv").delete(key);
}

function tryFreeLocalStorageSpace() {
  try {
    // Remove known large optional keys to free up space
    // Note: Never automatically delete backups - user should explicitly manage them
    const optionalKeys = [
      "timeTrackingApp-autosave",
      // "trackity-doo-backups" is intentionally NOT included here
      // Backups are critical recovery points and should never be auto-deleted
    ];
    for (const k of optionalKeys) {
      if (localStorage.getItem(k)) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    // Best-effort cleanup
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const loadedRef = useRef(false);
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      if (isMarker(parsed)) {
        // We'll load async from IDB in an effect; return initial for now
        return initialValue;
      }
      return parsed as T;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Load actual value (from IDB in browser or file system in Electron)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isElectron) {
          const value = await storageService.getJSON<T>(key, null);
          if (!cancelled && value !== null) {
            setStoredValue(value);
          }
        } else {
          const item = localStorage.getItem(key);
          if (!item) return;
          const parsed = JSON.parse(item);
          if (isMarker(parsed)) {
            const idbVal = await idbGet(key);
            if (!cancelled && idbVal != null) {
              const json = JSON.parse(idbVal) as T;
              setStoredValue(json);
            }
          }
        }
      } catch (e) {
        // Ignore, keep initial
      } finally {
        loadedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (isElectron) {
        // In Electron, use the file-system storage service
        storageService.setJSON(key, valueToStore).catch((error) => {
          console.error(`Failed persisting value for key "${key}":`, error);
        });
      } else {
        // In browser, use localStorage with IndexedDB fallback
        try {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error: any) {
          if (
            error &&
            (error.name === "QuotaExceededError" ||
              error.name === "NS_ERROR_DOM_QUOTA_REACHED")
          ) {
            // Try freeing space and retry once
            tryFreeLocalStorageSpace();
            try {
              localStorage.setItem(key, JSON.stringify(valueToStore));
              return;
            } catch (e2: any) {
              if (
                e2 &&
                (e2.name === "QuotaExceededError" ||
                  e2.name === "NS_ERROR_DOM_QUOTA_REACHED")
              ) {
                // Persist to IndexedDB and store a small marker in localStorage
                (async () => {
                  try {
                    await idbSet(key, JSON.stringify(valueToStore));
                    localStorage.setItem(key, JSON.stringify({ __storedInIDB: true }));
                  } catch (persistErr) {
                    console.error(
                      `Failed persisting large value for key "${key}" to IndexedDB:`,
                      persistErr,
                    );
                  }
                })();
              } else {
                console.error(`Error setting localStorage key "${key}":`, e2);
              }
            }
          } else {
            console.error(`Error setting localStorage key "${key}":`, error);
          }
        }
      }
    } catch (err) {
      console.error(`Error preparing value for key "${key}":`, err);
    }
  };

  // Cleanup IDB entry when value becomes small enough again and stored plainly
  useEffect(() => {
    (async () => {
      try {
        const marker = localStorage.getItem(key);
        if (marker) {
          const parsed = JSON.parse(marker);
          if (!isMarker(parsed)) {
            await idbDelete(key);
          }
        }
      } catch {}
    })();
  }, [key, storedValue]);

  return [storedValue, setValue];
}
