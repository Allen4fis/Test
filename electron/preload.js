const { contextBridge, ipcRenderer } = require("electron");

// Expose storage APIs to renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Storage operations
  storage: {
    get: (key) => ipcRenderer.invoke("storage:get", key),
    set: (key, value) => ipcRenderer.invoke("storage:set", key, value),
    delete: (key) => ipcRenderer.invoke("storage:delete", key),
    clear: () => ipcRenderer.invoke("storage:clear"),
    getAllKeys: () => ipcRenderer.invoke("storage:getAllKeys"),
    getDataDir: () => ipcRenderer.invoke("storage:getDataDir"),
  },

  // Backup and restore operations
  backup: {
    create: (backupName, data) =>
      ipcRenderer.invoke("backup:create", backupName, data),
    restore: (backupPath) => ipcRenderer.invoke("backup:restore", backupPath),
    list: () => ipcRenderer.invoke("backup:list"),
    delete: (backupPath) => ipcRenderer.invoke("backup:delete", backupPath),
  },
});
