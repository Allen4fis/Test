/**
 * Storage Service
 * Abstraction layer that works with both browser (localStorage/IndexedDB) and Electron (file system)
 * Automatically detects environment and uses appropriate storage backend
 */

export interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

// Browser-based backend using localStorage + IndexedDB fallback
class BrowserStorageBackend implements StorageBackend {
  private idbName = "LocalStorageFallbackDB";
  private idbVersion = 1;
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.idbName, this.idbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("kv")) {
          db.createObjectStore("kv", { keyPath: "key" });
        }
      };
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (parsed && typeof parsed === "object" && parsed.__storedInIDB === true) {
        const db = await this.getDB();
        return new Promise((resolve) => {
          const transaction = db.transaction(["kv"], "readonly");
          const store = transaction.objectStore("kv");
          const request = store.get(key);

          request.onsuccess = () => {
            resolve(request.result?.value ?? null);
          };
          request.onerror = () => {
            resolve(null);
          };
        });
      }

      return item;
    } catch (error) {
      console.error(`Error reading storage key "${key}":`, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (error: any) {
        if (
          error &&
          (error.name === "QuotaExceededError" ||
            error.name === "NS_ERROR_DOM_QUOTA_REACHED")
        ) {
          const db = await this.getDB();
          await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(["kv"], "readwrite");
            const store = transaction.objectStore("kv");
            const request = store.put({ key, value });

            request.onsuccess = () => {
              localStorage.setItem(key, JSON.stringify({ __storedInIDB: true }));
              resolve();
            };
            request.onerror = () => reject(request.error);
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(`Error setting storage key "${key}":`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
      const db = await this.getDB();
      await new Promise<void>((resolve) => {
        const transaction = db.transaction(["kv"], "readwrite");
        const store = transaction.objectStore("kv");
        store.delete(key);
        transaction.oncomplete = () => resolve();
      });
    } catch (error) {
      console.error(`Error deleting storage key "${key}":`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
      const db = await this.getDB();
      await new Promise<void>((resolve) => {
        const transaction = db.transaction(["kv"], "readwrite");
        const store = transaction.objectStore("kv");
        store.clear();
        transaction.oncomplete = () => resolve();
      });
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error("Error getting storage keys:", error);
      return [];
    }
  }
}

// Electron-based backend using file system
class ElectronStorageBackend implements StorageBackend {
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  private getFilePath(key: string): string {
    const encoded = Buffer.from(key).toString("base64").replace(/\//g, "_");
    return `${this.dataDir}/${encoded}.json`;
  }

  async get(key: string): Promise<string | null> {
    try {
      const window = (globalThis as any).__TAURI_WINDOW__;
      if (!window) return null;

      const fs = window.fs;
      const path = this.getFilePath(key);

      try {
        const content = await fs.readTextFile(path);
        return content;
      } catch {
        return null;
      }
    } catch (error) {
      console.error(`Error reading storage key "${key}":`, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const window = (globalThis as any).__TAURI_WINDOW__;
      if (!window) throw new Error("Tauri not available");

      const fs = window.fs;
      const path = this.getFilePath(key);

      await fs.writeTextFile(path, value);
    } catch (error) {
      console.error(`Error setting storage key "${key}":`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const window = (globalThis as any).__TAURI_WINDOW__;
      if (!window) return;

      const fs = window.fs;
      const path = this.getFilePath(key);

      try {
        await fs.removeFile(path);
      } catch {
        // File doesn't exist, ignore
      }
    } catch (error) {
      console.error(`Error deleting storage key "${key}":`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const window = (globalThis as any).__TAURI_WINDOW__;
      if (!window) return;

      const fs = window.fs;
      const keys = await this.getAllKeys();

      for (const key of keys) {
        const path = this.getFilePath(key);
        try {
          await fs.removeFile(path);
        } catch {
          // Ignore individual file errors
        }
      }
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const window = (globalThis as any).__TAURI_WINDOW__;
      if (!window) return [];

      const fs = window.fs;
      const entries = await fs.readDir(this.dataDir);

      return entries
        .filter((entry: any) => entry.name?.endsWith(".json"))
        .map((entry: any) => {
          const encoded = entry.name.replace(".json", "").replace(/_/g, "/");
          return Buffer.from(encoded, "base64").toString();
        })
        .catch(() => []);
    } catch (error) {
      console.error("Error getting storage keys:", error);
      return [];
    }
  }
}

class StorageService {
  private static instance: StorageService;
  private backend: StorageBackend;
  private isElectron: boolean;

  private constructor() {
    this.isElectron = (globalThis as any).__TAURI_WINDOW__ !== undefined;

    if (this.isElectron) {
      const appDataDir = (globalThis as any).__TAURI_WINDOW__.appDataDir || "./data";
      this.backend = new ElectronStorageBackend(appDataDir);
    } else {
      this.backend = new BrowserStorageBackend();
    }
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  get isRunningInElectron(): boolean {
    return this.isElectron;
  }

  async get(key: string): Promise<string | null> {
    return this.backend.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    return this.backend.set(key, value);
  }

  async delete(key: string): Promise<void> {
    return this.backend.delete(key);
  }

  async clear(): Promise<void> {
    return this.backend.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return this.backend.getAllKeys();
  }

  async getJSON<T>(key: string, defaultValue: T): Promise<T> {
    const value = await this.get(key);
    if (!value) return defaultValue;

    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }

  async setJSON<T>(key: string, value: T): Promise<void> {
    return this.set(key, JSON.stringify(value));
  }
}

export const storageService = StorageService.getInstance();
