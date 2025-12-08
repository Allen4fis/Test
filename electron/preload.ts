import { contextBridge, ipcRenderer } from "electron";

// Expose storage APIs to renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Storage operations
  storage: {
    get: (key: string) => ipcRenderer.invoke("storage:get", key),
    set: (key: string, value: string) => ipcRenderer.invoke("storage:set", key, value),
    delete: (key: string) => ipcRenderer.invoke("storage:delete", key),
    clear: () => ipcRenderer.invoke("storage:clear"),
    getAllKeys: () => ipcRenderer.invoke("storage:getAllKeys"),
    getDataDir: () => ipcRenderer.invoke("storage:getDataDir"),
  },

  // Backup and restore operations
  backup: {
    create: (backupName: string, data: string) =>
      ipcRenderer.invoke("backup:create", backupName, data),
    restore: (backupPath: string) => ipcRenderer.invoke("backup:restore", backupPath),
    list: () => ipcRenderer.invoke("backup:list"),
    delete: (backupPath: string) => ipcRenderer.invoke("backup:delete", backupPath),
  },
});

// Type definition for window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      storage: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<void>;
        delete: (key: string) => Promise<void>;
        clear: () => Promise<void>;
        getAllKeys: () => Promise<string[]>;
        getDataDir: () => Promise<string>;
      };
      backup: {
        create: (
          backupName: string,
          data: string,
        ) => Promise<{ success: boolean; path: string; fileName: string }>;
        restore: (backupPath: string) => Promise<{ success: boolean; data: string }>;
        list: () => Promise<
          Array<{
            name: string;
            path: string;
            size: number;
            created: number;
          }>
        >;
        delete: (backupPath: string) => Promise<{ success: boolean }>;
      };
    };
  }
}
