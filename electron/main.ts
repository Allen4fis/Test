const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const isDev = require("electron-is-dev");

let mainWindow: BrowserWindow | null = null;
const dataDir = path.join(app.getPath("appData"), "TimeTracker");

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.ts"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
  });

  const startUrl = isDev
    ? "http://localhost:8080"
    : `file://${path.join(__dirname, "../dist/index.html")}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for Storage
ipcMain.handle("storage:get", async (_event, key: string) => {
  try {
    const filePath = path.join(dataDir, `${Buffer.from(key).toString("base64")}.json`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
    return null;
  } catch (error) {
    console.error(`Error reading storage key "${key}":`, error);
    return null;
  }
});

ipcMain.handle("storage:set", async (_event, key: string, value: string) => {
  try {
    const filePath = path.join(dataDir, `${Buffer.from(key).toString("base64")}.json`);
    fs.writeFileSync(filePath, value, "utf-8");
    return true;
  } catch (error) {
    console.error(`Error setting storage key "${key}":`, error);
    throw error;
  }
});

ipcMain.handle("storage:delete", async (_event, key: string) => {
  try {
    const filePath = path.join(dataDir, `${Buffer.from(key).toString("base64")}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting storage key "${key}":`, error);
    throw error;
  }
});

ipcMain.handle("storage:clear", async () => {
  try {
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          fs.unlinkSync(path.join(dataDir, file));
        }
      }
    }
    return true;
  } catch (error) {
    console.error("Error clearing storage:", error);
    throw error;
  }
});

ipcMain.handle("storage:getAllKeys", async () => {
  try {
    if (!fs.existsSync(dataDir)) {
      return [];
    }

    const files = fs.readdirSync(dataDir);
    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const encoded = file.replace(".json", "");
        try {
          return Buffer.from(encoded, "base64").toString();
        } catch {
          return null;
        }
      })
      .filter((key): key is string => key !== null);
  } catch (error) {
    console.error("Error getting storage keys:", error);
    return [];
  }
});

ipcMain.handle("storage:getDataDir", async () => {
  return dataDir;
});

// Backup and restore handlers
ipcMain.handle("backup:create", async (_event, backupName: string, data: string) => {
  try {
    const backupDir = path.join(dataDir, "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${backupName}_${timestamp}.backup`;
    const filePath = path.join(backupDir, fileName);

    fs.writeFileSync(filePath, data, "utf-8");
    return { success: true, path: filePath, fileName };
  } catch (error) {
    console.error("Error creating backup:", error);
    throw error;
  }
});

ipcMain.handle("backup:restore", async (_event, backupPath: string) => {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup file not found");
    }

    const data = fs.readFileSync(backupPath, "utf-8");
    return { success: true, data };
  } catch (error) {
    console.error("Error restoring backup:", error);
    throw error;
  }
});

ipcMain.handle("backup:list", async () => {
  try {
    const backupDir = path.join(dataDir, "backups");
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir);
    return files
      .filter((file) => file.endsWith(".backup"))
      .map((file) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtimeMs,
        };
      })
      .sort((a, b) => b.created - a.created);
  } catch (error) {
    console.error("Error listing backups:", error);
    return [];
  }
});

ipcMain.handle("backup:delete", async (_event, backupPath: string) => {
  try {
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    return { success: true };
  } catch (error) {
    console.error("Error deleting backup:", error);
    throw error;
  }
});
