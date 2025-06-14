import { useEffect, useRef } from "react";
import { AppData } from "@/types";

/**
 * Global autosave hook that maintains a persistent 10-minute timer
 * Timer does not reset when data changes or tabs are switched
 */
export function useGlobalAutosave(appData: AppData) {
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>("");
  const appDataRef = useRef<AppData>(appData);

  // Keep appData reference current
  useEffect(() => {
    appDataRef.current = appData;
  }, [appData]);

  // Setup autosave timer once when hook first mounts
  useEffect(() => {
    const AUTOSAVE_INTERVAL = 10 * 60 * 1000; // 10 minutes
    const AUTOSAVE_KEY = "timeTrackingApp-autosave";
    const MAX_AUTOSAVES = 3;

    // Generate a data hash for change detection
    const generateDataHash = (data: AppData): string => {
      return JSON.stringify({
        employeesCount: data.employees.length,
        jobsCount: data.jobs.length,
        timeEntriesCount: data.timeEntries.length,
        rentalItemsCount: data.rentalItems.length,
        rentalEntriesCount: data.rentalEntries.length,
        lastModified:
          data.timeEntries[0]?.createdAt || data.employees[0]?.createdAt || "",
      });
    };

    // Autosave function that uses current appData
    const performAutosave = () => {
      try {
        const currentData = appDataRef.current;
        const currentHash = generateDataHash(currentData);

        // Only save if data has changed
        if (currentHash === lastSaveRef.current) {
          // No changes detected, skipping autosave
          return;
        }

        const autosave = {
          timestamp: new Date().toISOString(),
          data: currentData,
          hash: currentHash,
        };

        // Get existing autosaves
        const existingAutosaves = JSON.parse(
          localStorage.getItem(AUTOSAVE_KEY) || "[]",
        );

        // Add new autosave and keep only the last MAX_AUTOSAVES
        const updatedAutosaves = [autosave, ...existingAutosaves].slice(
          0,
          MAX_AUTOSAVES,
        );

        // Save to localStorage
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(updatedAutosaves));
        lastSaveRef.current = currentHash;

        // Global autosave completed successfully
          `💾 Total autosaves: ${updatedAutosaves.length}/${MAX_AUTOSAVES}`,
        );
      } catch (error) {
        // Global autosave failed - error handling in place
      }
    };

    // Set initial hash
    lastSaveRef.current = generateDataHash(appData);

    // Setup persistent autosave timer
    // Global autosave initialized successfully

    autosaveTimerRef.current = setInterval(performAutosave, AUTOSAVE_INTERVAL);

    // Cleanup function - only runs when component unmounts completely
    return () => {
      if (autosaveTimerRef.current) {
        // Autosave timer cleared
        clearInterval(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this only runs once

  // Manual save function
  const triggerManualSave = () => {
    const AUTOSAVE_KEY = "timeTrackingApp-autosave";
    const MAX_AUTOSAVES = 3;

    try {
      if (!appDataRef.current) {
        throw new Error("No app data available for manual save");
      }

      const generateDataHash = (data: AppData): string => {
        return JSON.stringify({
          employeesCount: data.employees.length,
          jobsCount: data.jobs.length,
          timeEntriesCount: data.timeEntries.length,
          rentalItemsCount: data.rentalItems.length,
          rentalEntriesCount: data.rentalEntries.length,
          lastModified:
            data.timeEntries[0]?.createdAt ||
            data.employees[0]?.createdAt ||
            "",
        });
      };

      const currentData = appDataRef.current;
      const currentHash = generateDataHash(currentData);

      const autosave = {
        timestamp: new Date().toISOString(),
        data: currentData,
        hash: currentHash,
        manual: true, // Flag to indicate manual save
      };

      // Get existing autosaves
      const existingAutosaves = JSON.parse(
        localStorage.getItem(AUTOSAVE_KEY) || "[]",
      );

      // Add new autosave and keep only the last MAX_AUTOSAVES
      const updatedAutosaves = [autosave, ...existingAutosaves].slice(
        0,
        MAX_AUTOSAVES,
      );

      // Save to localStorage
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(updatedAutosaves));
      lastSaveRef.current = currentHash;

      // Manual save completed successfully
      return { success: true, timestamp: autosave.timestamp };
    } catch (error) {
      // Manual save failed - error handling in place
      return { success: false, error: error.message };
    }
  };

  // Function to get autosave info
  const getAutosaveInfo = () => {
    try {
      const autosaves = JSON.parse(
        localStorage.getItem("timeTrackingApp-autosave") || "[]",
      );

      return {
        isEnabled: !!autosaveTimerRef.current,
        lastSaveTime: autosaves.length > 0 ? autosaves[0].timestamp : null,
        autosaveCount: autosaves.length,
        autosaves: autosaves.map((save: any) => ({
          timestamp: save.timestamp,
          hash: save.hash,
          manual: save.manual || false,
          dataStats: {
            employees: save.data?.employees?.length || 0,
            jobs: save.data?.jobs?.length || 0,
            timeEntries: save.data?.timeEntries?.length || 0,
          },
        })),
      };
    } catch (error) {
      return {
        isEnabled: false,
        lastSaveTime: null,
        autosaveCount: 0,
        autosaves: [],
        error: error.message,
      };
    }
  };

  return {
    triggerManualSave,
    getAutosaveInfo,
  };
}