/**
 * Backup Service
 * Handles backup and restore operations in both Electron and browser environments
 */

import { storageService } from "./StorageService";
import { AppData } from "@/types";

export interface BackupInfo {
  id: string;
  name: string;
  timestamp: string;
  dataSize: number;
  recordCounts: {
    employees: number;
    jobs: number;
    timeEntries: number;
    rentalItems: number;
    rentalEntries: number;
  };
}

class BackupService {
  private static instance: BackupService;
  private isElectron: boolean;
  private backupIndexKey = "backup-index-v1";

  private constructor() {
    this.isElectron = (window as any).electronAPI !== undefined;
  }

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Create a backup of the current app data
   */
  async createBackup(appData: AppData, backupName: string): Promise<BackupInfo> {
    const timestamp = new Date().toISOString();
    const id = `backup-${Date.now()}`;

    const backupInfo: BackupInfo = {
      id,
      name: backupName,
      timestamp,
      dataSize: JSON.stringify(appData).length,
      recordCounts: {
        employees: appData.employees?.length || 0,
        jobs: appData.jobs?.length || 0,
        timeEntries: appData.timeEntries?.length || 0,
        rentalItems: appData.rentalItems?.length || 0,
        rentalEntries: appData.rentalEntries?.length || 0,
      },
    };

    if (this.isElectron) {
      // Use Electron backup APIs
      const api = (window as any).electronAPI?.backup;
      if (!api) throw new Error("Electron backup API not available");

      const data = JSON.stringify(appData);
      const result = await api.create(backupName, data);

      if (!result.success) {
        throw new Error("Failed to create backup in Electron");
      }

      // Store backup metadata in app data
      await this.updateBackupIndex(backupInfo);
    } else {
      // Use browser storage (localStorage)
      const backupsKey = "trackity-doo-backups";
      const existingBackups = JSON.parse(
        localStorage.getItem(backupsKey) || "[]",
      ) as Array<{
        id: string;
        name: string;
        timestamp: string;
        dataSize: number;
        recordCounts: any;
        data: AppData;
      }>;

      const newBackup = {
        ...backupInfo,
        data: appData,
      };

      existingBackups.push(newBackup);
      localStorage.setItem(backupsKey, JSON.stringify(existingBackups));
    }

    return backupInfo;
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    if (this.isElectron) {
      // Use Electron API
      const api = (window as any).electronAPI?.backup;
      if (!api) throw new Error("Electron backup API not available");

      try {
        const backups = await api.list();
        return backups.map((backup: any) => {
          const name = backup.name.replace(".backup", "");
          return {
            id: `backup-${backup.created}`,
            name,
            timestamp: new Date(backup.created).toISOString(),
            dataSize: backup.size,
            recordCounts: {
              employees: 0,
              jobs: 0,
              timeEntries: 0,
              rentalItems: 0,
              rentalEntries: 0,
            },
          };
        });
      } catch (error) {
        console.error("Error listing backups:", error);
        return [];
      }
    } else {
      // Use browser storage
      const backupsKey = "trackity-doo-backups";
      try {
        const backups = JSON.parse(localStorage.getItem(backupsKey) || "[]");
        return backups.map((backup: any) => ({
          id: backup.id,
          name: backup.name,
          timestamp: backup.timestamp,
          dataSize: backup.dataSize,
          recordCounts: backup.recordCounts,
        }));
      } catch (error) {
        console.error("Error listing backups:", error);
        return [];
      }
    }
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(backupId: string, allBackups: BackupInfo[]): Promise<AppData> {
    const backup = allBackups.find((b) => b.id === backupId);
    if (!backup) {
      throw new Error("Backup not found");
    }

    if (this.isElectron) {
      // Use Electron API
      const api = (window as any).electronAPI?.backup;
      if (!api) throw new Error("Electron backup API not available");

      const backupsList = await api.list();
      const electronBackup = backupsList.find((b: any) =>
        b.name.includes(backup.name),
      );

      if (!electronBackup) {
        throw new Error("Backup file not found in Electron");
      }

      const result = await api.restore(electronBackup.path);
      if (!result.success) {
        throw new Error("Failed to restore backup from Electron");
      }

      return JSON.parse(result.data);
    } else {
      // Use browser storage
      const backupsKey = "trackity-doo-backups";
      const backups = JSON.parse(localStorage.getItem(backupsKey) || "[]");
      const browserBackup = backups.find((b: any) => b.id === backupId);

      if (!browserBackup) {
        throw new Error("Backup not found in browser storage");
      }

      return browserBackup.data;
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    if (this.isElectron) {
      // Use Electron API
      const api = (window as any).electronAPI?.backup;
      if (!api) throw new Error("Electron backup API not available");

      const backupsList = await api.list();
      // Find backup by ID pattern
      const electronBackup = backupsList.find(
        (b: any) => b.created.toString() === backupId.replace("backup-", ""),
      );

      if (electronBackup) {
        await api.delete(electronBackup.path);
      }

      // Remove from backup index
      await this.removeFromBackupIndex(backupId);
    } else {
      // Use browser storage
      const backupsKey = "trackity-doo-backups";
      const backups = JSON.parse(localStorage.getItem(backupsKey) || "[]");
      const filtered = backups.filter((b: any) => b.id !== backupId);
      localStorage.setItem(backupsKey, JSON.stringify(filtered));
    }
  }

  /**
   * Update backup index (metadata tracking)
   */
  private async updateBackupIndex(backupInfo: BackupInfo): Promise<void> {
    try {
      const index = await storageService.getJSON<BackupInfo[]>(
        this.backupIndexKey,
        [],
      );
      index.push(backupInfo);
      await storageService.setJSON(this.backupIndexKey, index);
    } catch (error) {
      console.error("Error updating backup index:", error);
    }
  }

  /**
   * Remove from backup index
   */
  private async removeFromBackupIndex(backupId: string): Promise<void> {
    try {
      const index = await storageService.getJSON<BackupInfo[]>(
        this.backupIndexKey,
        [],
      );
      const filtered = index.filter((b) => b.id !== backupId);
      await storageService.setJSON(this.backupIndexKey, filtered);
    } catch (error) {
      console.error("Error removing from backup index:", error);
    }
  }

  /**
   * Get backup directory info (Electron only)
   */
  async getBackupDirectoryInfo(): Promise<{
    path?: string;
    isElectron: boolean;
  } | null> {
    if (this.isElectron) {
      const api = (window as any).electronAPI?.storage;
      if (!api) return null;

      try {
        const dataDir = await api.getDataDir();
        return {
          path: `${dataDir}/backups`,
          isElectron: true,
        };
      } catch (error) {
        console.error("Error getting backup directory:", error);
        return null;
      }
    }

    return null;
  }
}

export const backupService = BackupService.getInstance();
