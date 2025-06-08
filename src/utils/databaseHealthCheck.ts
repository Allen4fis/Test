// Database health check utility

export interface DatabaseHealth {
  status: "healthy" | "error" | "initializing";
  message: string;
  canConnect: boolean;
  hasData: boolean;
  lastError?: string;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    // Try to check if IndexedDB is available
    if (!("indexedDB" in window)) {
      return {
        status: "error",
        message: "IndexedDB not supported in this browser",
        canConnect: false,
        hasData: false,
        lastError: "IndexedDB not available",
      };
    }

    // Try to open a test connection
    const testDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("TestConnection", 1);

      request.onsuccess = () => {
        const db = request.result;
        db.close();
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error);
      };

      request.onupgradeneeded = () => {
        // Just a test connection, no schema needed
      };
    });

    // Clean up test database
    await new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase("TestConnection");
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve(); // Continue even if delete fails
    });

    return {
      status: "healthy",
      message: "Database connection successful",
      canConnect: true,
      hasData: false, // We'd need to check the actual app database for this
    };
  } catch (error) {
    console.error("Database health check failed:", error);
    return {
      status: "error",
      message: "Database connection failed",
      canConnect: false,
      hasData: false,
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
}

// Development helper
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).checkDatabaseHealth = checkDatabaseHealth;
  console.log(
    "🔍 Database health check available: window.checkDatabaseHealth()",
  );
}
