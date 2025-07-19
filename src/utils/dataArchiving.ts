import { AppData, TimeEntry, RentalEntry } from "@/types";

export interface ArchiveMetadata {
  archiveId: string;
  createdAt: string;
  dateRange: {
    start: string;
    end: string;
  };
  entryCount: number;
  originalSize: number;
  compressedSize: number;
  description: string;
}

export interface ArchiveData {
  metadata: ArchiveMetadata;
  timeEntries: TimeEntry[];
  rentalEntries: RentalEntry[];
}

export interface ArchivingResult {
  success: boolean;
  archivedCount: number;
  archiveId: string;
  remainingCount: number;
  storageSaved: number;
  error?: string;
}

export class DataArchiver {
  private readonly ARCHIVE_PREFIX = "timeTrackingApp-archive-";
  private readonly MAX_ARCHIVE_SIZE = 5 * 1024 * 1024; // 5MB per archive
  private readonly COMPRESSION_RATIO = 0.7; // Estimated compression ratio

  /**
   * Archive entries older than the specified cutoff date
   */
  async archiveOldEntries(
    appData: AppData,
    cutoffDate: string,
    description?: string,
  ): Promise<ArchivingResult> {
    try {
      // Find entries to archive
      const entriesToArchive = appData.timeEntries.filter(
        (entry) => entry.date < cutoffDate,
      );
      const rentalEntriesToArchive = appData.rentalEntries.filter(
        (entry) => entry.startDate < cutoffDate,
      );

      if (
        entriesToArchive.length === 0 &&
        rentalEntriesToArchive.length === 0
      ) {
        return {
          success: false,
          archivedCount: 0,
          archiveId: "",
          remainingCount: appData.timeEntries.length,
          storageSaved: 0,
          error: "No entries found to archive",
        };
      }

      // Calculate original size
      const originalData = {
        timeEntries: entriesToArchive,
        rentalEntries: rentalEntriesToArchive,
      };
      const originalSize = new Blob([JSON.stringify(originalData)]).size;

      // Split into chunks if necessary
      const archives = this.splitIntoArchives(
        entriesToArchive,
        rentalEntriesToArchive,
        cutoffDate,
        description,
      );

      let totalSaved = 0;
      const archiveIds: string[] = [];

      // Save each archive
      for (const archive of archives) {
        const archiveId = await this.saveArchive(archive);
        archiveIds.push(archiveId);
        totalSaved += archive.metadata.originalSize;
      }

      // Update metadata index
      await this.updateArchiveIndex(archives);

      return {
        success: true,
        archivedCount: entriesToArchive.length + rentalEntriesToArchive.length,
        archiveId: archiveIds.join(", "),
        remainingCount:
          appData.timeEntries.length +
          appData.rentalEntries.length -
          (entriesToArchive.length + rentalEntriesToArchive.length),
        storageSaved: totalSaved,
      };
    } catch (error) {
      return {
        success: false,
        archivedCount: 0,
        archiveId: "",
        remainingCount: appData.timeEntries.length,
        storageSaved: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Retrieve archived data by date range
   */
  async getArchivedData(
    startDate: string,
    endDate: string,
  ): Promise<ArchiveData[]> {
    const archives = await this.listArchives();
    const relevantArchives: ArchiveData[] = [];

    for (const metadata of archives) {
      // Check if archive overlaps with requested date range
      if (
        metadata.dateRange.start <= endDate &&
        metadata.dateRange.end >= startDate
      ) {
        try {
          const archiveData = await this.loadArchive(metadata.archiveId);
          if (archiveData) {
            relevantArchives.push(archiveData);
          }
        } catch (error) {
          console.warn(`Failed to load archive ${metadata.archiveId}:`, error);
        }
      }
    }

    return relevantArchives;
  }

  /**
   * List all available archives
   */
  async listArchives(): Promise<ArchiveMetadata[]> {
    try {
      const indexData = localStorage.getItem(`${this.ARCHIVE_PREFIX}index`);
      if (!indexData) return [];

      const index = JSON.parse(indexData);
      return Array.isArray(index) ? index : [];
    } catch (error) {
      console.error("Failed to load archive index:", error);
      return [];
    }
  }

  /**
   * Delete an archive
   */
  async deleteArchive(archiveId: string): Promise<boolean> {
    try {
      // Remove from storage
      localStorage.removeItem(`${this.ARCHIVE_PREFIX}${archiveId}`);

      // Update index
      const archives = await this.listArchives();
      const updatedArchives = archives.filter(
        (archive) => archive.archiveId !== archiveId,
      );
      localStorage.setItem(
        `${this.ARCHIVE_PREFIX}index`,
        JSON.stringify(updatedArchives),
      );

      return true;
    } catch (error) {
      console.error(`Failed to delete archive ${archiveId}:`, error);
      return false;
    }
  }

  /**
   * Get storage usage for archives
   */
  getArchiveStorageUsage(): {
    totalSize: number;
    archiveCount: number;
    oldestArchive: string | null;
    newestArchive: string | null;
  } {
    let totalSize = 0;
    let archiveCount = 0;
    let oldestDate: string | null = null;
    let newestDate: string | null = null;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        key.startsWith(this.ARCHIVE_PREFIX) &&
        key !== `${this.ARCHIVE_PREFIX}index`
      ) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += new Blob([value]).size;
            archiveCount++;

            // Extract date from archive to find oldest/newest
            const archiveData = JSON.parse(value);
            const archiveDate = archiveData.metadata?.createdAt;
            if (archiveDate) {
              if (!oldestDate || archiveDate < oldestDate) {
                oldestDate = archiveDate;
              }
              if (!newestDate || archiveDate > newestDate) {
                newestDate = archiveDate;
              }
            }
          }
        } catch (error) {
          // Skip invalid archives
        }
      }
    }

    return {
      totalSize,
      archiveCount,
      oldestArchive: oldestDate,
      newestArchive: newestDate,
    };
  }

  /**
   * Compress and optimize archived data
   */
  async optimizeArchives(): Promise<{
    optimizedCount: number;
    spaceSaved: number;
  }> {
    const archives = await this.listArchives();
    let optimizedCount = 0;
    let spaceSaved = 0;

    for (const metadata of archives) {
      try {
        const archiveData = await this.loadArchive(metadata.archiveId);
        if (!archiveData) continue;

        const originalSize = new Blob([JSON.stringify(archiveData)]).size;

        // Re-compress with better optimization
        const optimizedData = this.optimizeArchiveData(archiveData);
        const optimizedSize = new Blob([JSON.stringify(optimizedData)]).size;

        if (optimizedSize < originalSize) {
          await this.saveArchive(optimizedData);
          optimizedCount++;
          spaceSaved += originalSize - optimizedSize;
        }
      } catch (error) {
        console.warn(
          `Failed to optimize archive ${metadata.archiveId}:`,
          error,
        );
      }
    }

    return { optimizedCount, spaceSaved };
  }

  private splitIntoArchives(
    timeEntries: TimeEntry[],
    rentalEntries: RentalEntry[],
    cutoffDate: string,
    description?: string,
  ): ArchiveData[] {
    const archives: ArchiveData[] = [];

    // Sort entries by date
    const sortedTimeEntries = [...timeEntries].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const sortedRentalEntries = [...rentalEntries].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );

    let currentArchive: ArchiveData | null = null;
    let currentSize = 0;

    const addToArchive = (timeEntry?: TimeEntry, rentalEntry?: RentalEntry) => {
      if (!currentArchive) {
        const archiveId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        currentArchive = {
          metadata: {
            archiveId,
            createdAt: new Date().toISOString(),
            dateRange: {
              start: timeEntry?.date || rentalEntry?.startDate || "",
              end: timeEntry?.date || rentalEntry?.startDate || "",
            },
            entryCount: 0,
            originalSize: 0,
            compressedSize: 0,
            description:
              description ||
              `Archive created on ${new Date().toLocaleDateString()}`,
          },
          timeEntries: [],
          rentalEntries: [],
        };
        currentSize = 0;
      }

      if (timeEntry) {
        currentArchive.timeEntries.push(timeEntry);
        currentArchive.metadata.entryCount++;
        currentArchive.metadata.dateRange.end = timeEntry.date;
      }

      if (rentalEntry) {
        currentArchive.rentalEntries.push(rentalEntry);
        currentArchive.metadata.entryCount++;
        currentArchive.metadata.dateRange.end = rentalEntry.startDate;
      }

      // Estimate size
      const entrySize = new Blob([JSON.stringify(timeEntry || rentalEntry)])
        .size;
      currentSize += entrySize;

      // If archive is getting too large, finalize it
      if (currentSize > this.MAX_ARCHIVE_SIZE) {
        this.finalizeArchive(currentArchive);
        archives.push(currentArchive);
        currentArchive = null;
      }
    };

    // Process all entries
    let timeIndex = 0;
    let rentalIndex = 0;

    while (
      timeIndex < sortedTimeEntries.length ||
      rentalIndex < sortedRentalEntries.length
    ) {
      const nextTimeEntry = sortedTimeEntries[timeIndex];
      const nextRentalEntry = sortedRentalEntries[rentalIndex];

      if (
        nextTimeEntry &&
        (!nextRentalEntry || nextTimeEntry.date <= nextRentalEntry.startDate)
      ) {
        addToArchive(nextTimeEntry);
        timeIndex++;
      } else if (nextRentalEntry) {
        addToArchive(undefined, nextRentalEntry);
        rentalIndex++;
      }
    }

    // Finalize the last archive
    if (currentArchive && currentArchive.metadata.entryCount > 0) {
      this.finalizeArchive(currentArchive);
      archives.push(currentArchive);
    }

    return archives;
  }

  private finalizeArchive(archive: ArchiveData): void {
    const originalData = JSON.stringify(archive);
    archive.metadata.originalSize = new Blob([originalData]).size;

    // Simulate compression
    archive.metadata.compressedSize = Math.floor(
      archive.metadata.originalSize * this.COMPRESSION_RATIO,
    );
  }

  private async saveArchive(archive: ArchiveData): Promise<string> {
    const archiveId = archive.metadata.archiveId;
    const key = `${this.ARCHIVE_PREFIX}${archiveId}`;

    try {
      localStorage.setItem(key, JSON.stringify(archive));
      return archiveId;
    } catch (error) {
      throw new Error(`Failed to save archive: ${error}`);
    }
  }

  private async loadArchive(archiveId: string): Promise<ArchiveData | null> {
    try {
      const key = `${this.ARCHIVE_PREFIX}${archiveId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Failed to load archive ${archiveId}:`, error);
      return null;
    }
  }

  private async updateArchiveIndex(archives: ArchiveData[]): Promise<void> {
    try {
      const existingArchives = await this.listArchives();
      const newMetadata = archives.map((archive) => archive.metadata);
      const updatedIndex = [...existingArchives, ...newMetadata];

      localStorage.setItem(
        `${this.ARCHIVE_PREFIX}index`,
        JSON.stringify(updatedIndex),
      );
    } catch (error) {
      console.error("Failed to update archive index:", error);
    }
  }

  private optimizeArchiveData(archive: ArchiveData): ArchiveData {
    // Remove unnecessary fields and optimize data structure
    const optimizedTimeEntries = archive.timeEntries.map((entry) => ({
      id: entry.id,
      employeeId: entry.employeeId,
      jobId: entry.jobId,
      hourTypeId: entry.hourTypeId,
      provinceId: entry.provinceId,
      date: entry.date,
      hours: entry.hours,
      ...(entry.loaCount && { loaCount: entry.loaCount }),
      ...(entry.billableWageUsed && {
        billableWageUsed: entry.billableWageUsed,
      }),
      ...(entry.costWageUsed && { costWageUsed: entry.costWageUsed }),
      ...(entry.title && { title: entry.title }),
      ...(entry.description && { description: entry.description }),
      createdAt: entry.createdAt,
    }));

    const optimizedRentalEntries = archive.rentalEntries.map((entry) => ({
      id: entry.id,
      rentalItemId: entry.rentalItemId,
      jobId: entry.jobId,
      employeeId: entry.employeeId,
      startDate: entry.startDate,
      endDate: entry.endDate,
      quantity: entry.quantity,
      billingUnit: entry.billingUnit,
      rateUsed: entry.rateUsed,
      ...(entry.dspRate && { dspRate: entry.dspRate }),
      ...(entry.description && { description: entry.description }),
      createdAt: entry.createdAt,
    }));

    return {
      ...archive,
      timeEntries: optimizedTimeEntries,
      rentalEntries: optimizedRentalEntries,
    };
  }
}

// Singleton instance
export const dataArchiver = new DataArchiver();

// Utility functions
export function calculateArchivingBenefits(
  timeEntries: TimeEntry[],
  cutoffDate: string,
): {
  entriesToArchive: number;
  estimatedSpaceSaved: number;
  performanceImprovement: number;
} {
  const entriesToArchive = timeEntries.filter(
    (entry) => entry.date < cutoffDate,
  );

  const currentDataSize = new Blob([JSON.stringify(timeEntries)]).size;
  const remainingDataSize = new Blob([
    JSON.stringify(timeEntries.filter((entry) => entry.date >= cutoffDate)),
  ]).size;

  const estimatedSpaceSaved = currentDataSize - remainingDataSize;

  // Estimate performance improvement (rough calculation)
  const performanceImprovement = Math.min(
    (entriesToArchive.length / timeEntries.length) * 100,
    50,
  ); // Cap at 50% improvement

  return {
    entriesToArchive: entriesToArchive.length,
    estimatedSpaceSaved,
    performanceImprovement,
  };
}

export function getRecommendedArchiveDate(): string {
  const now = new Date();
  // Recommend archiving data older than 2 years
  const recommendedDate = new Date(
    now.getFullYear() - 2,
    now.getMonth(),
    now.getDate(),
  );
  return recommendedDate.toISOString().split("T")[0];
}

export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
