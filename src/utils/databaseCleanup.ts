// Database cleanup utilities for manual troubleshooting

export async function clearIndexedDB(): Promise<boolean> {
  try {
    // Clear the specific database
    if ("indexedDB" in window) {
      const deleteResult = await new Promise<boolean>((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase("TimeTrackingDB");

        deleteRequest.onsuccess = () => {
          console.log("✅ IndexedDB cleared successfully");
          resolve(true);
        };

        deleteRequest.onerror = (event) => {
          console.error("❌ Failed to clear IndexedDB:", event);
          resolve(false);
        };

        deleteRequest.onblocked = () => {
          console.warn("⚠️ IndexedDB deletion blocked - close other tabs");
          resolve(false);
        };
      });

      return deleteResult;
    }

    return false;
  } catch (error) {
    console.error("Error clearing IndexedDB:", error);
    return false;
  }
}

export function clearLocalStorage(): boolean {
  try {
    localStorage.removeItem("timeTrackingApp");
    console.log("✅ localStorage cleared successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to clear localStorage:", error);
    return false;
  }
}

export async function clearAllStorages(): Promise<{
  indexedDB: boolean;
  localStorage: boolean;
}> {
  const results = {
    indexedDB: await clearIndexedDB(),
    localStorage: clearLocalStorage(),
  };

  if (results.indexedDB && results.localStorage) {
    console.log("🎉 All storages cleared successfully");
  }

  return results;
}

// Add to window for manual debugging
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).clearTimeTrackingDB = clearIndexedDB;
  (window as any).clearTimeTrackingLS = clearLocalStorage;
  (window as any).clearAllTimeTrackingData = clearAllStorages;

  console.log("🔧 Debug utilities available:");
  console.log("  - window.clearTimeTrackingDB() - Clear IndexedDB");
  console.log("  - window.clearTimeTrackingLS() - Clear localStorage");
  console.log("  - window.clearAllTimeTrackingData() - Clear everything");
}
