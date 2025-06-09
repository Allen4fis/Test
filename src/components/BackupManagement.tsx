import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Save,
  Upload,
  Download,
  Database,
  Clock,
  FileText,
  Trash2,
  RefreshCw,
  Shield,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { AppData } from "@/types";

interface BackupMetadata {
  id: string;
  name: string;
  description?: string;
  timestamp: string;
  dataSize: number;
  recordCounts: {
    employees: number;
    jobs: number;
    timeEntries: number;
    rentalItems: number;
    rentalEntries: number;
    hourTypes: number;
    provinces: number;
  };
}

interface StoredBackup extends BackupMetadata {
  data: AppData;
}

const BACKUP_STORAGE_KEY = "trackity-doo-backups";

export function BackupManagement() {
  const timeTracking = useTimeTracking();
  const {
    employees,
    jobs,
    timeEntries,
    rentalItems,
    rentalEntries,
    hourTypes,
    provinces,
    restoreFromBackup,
  } = timeTracking;

  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupName, setBackupName] = useState("");
  const [backupDescription, setBackupDescription] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(
    null,
  );
  const [isRestoring, setIsRestoring] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Get stored backups from localStorage
  const storedBackups = useMemo(() => {
    try {
      const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (stored) {
        const backups: StoredBackup[] = JSON.parse(stored);
        return backups.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
      }
    } catch (error) {
      console.error("Error loading backups:", error);
      toast({
        title: "Error Loading Backups",
        description: "Could not load backup list. Storage may be corrupted.",
        variant: "destructive",
      });
    }
    return [];
  }, [refreshKey]); // Re-evaluate when refresh key changes

  // Current data summary
  const currentDataSummary = useMemo(() => {
    const data: AppData = {
      employees,
      jobs,
      timeEntries,
      rentalItems,
      rentalEntries,
      hourTypes,
      provinces,
    };

    const dataSize = new Blob([JSON.stringify(data)]).size;

    return {
      recordCounts: {
        employees: employees.length,
        jobs: jobs.length,
        timeEntries: timeEntries.length,
        rentalItems: rentalItems.length,
        rentalEntries: rentalEntries.length,
        hourTypes: hourTypes.length,
        provinces: provinces.length,
      },
      dataSize,
      totalRecords:
        employees.length +
        jobs.length +
        timeEntries.length +
        rentalItems.length +
        rentalEntries.length,
    };
  }, [
    employees,
    jobs,
    timeEntries,
    rentalItems,
    rentalEntries,
    hourTypes,
    provinces,
  ]);

  // Create a new backup
  const createBackup = async () => {
    if (!backupName.trim()) {
      toast({
        title: "Backup Name Required",
        description: "Please enter a name for this backup.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingBackup(true);

    try {
      const timestamp = new Date().toISOString();
      const data: AppData = {
        employees,
        jobs,
        timeEntries,
        rentalItems,
        rentalEntries,
        hourTypes,
        provinces,
      };

      const backup: StoredBackup = {
        id: `backup_${Date.now()}`,
        name: backupName.trim(),
        description: backupDescription.trim() || undefined,
        timestamp,
        dataSize: new Blob([JSON.stringify(data)]).size,
        recordCounts: currentDataSummary.recordCounts,
        data,
      };

      // Get existing backups
      const existing = storedBackups;
      const updated = [backup, ...existing];

      // Keep only the most recent 20 backups to prevent storage overflow
      const trimmed = updated.slice(0, 20);

      // Save to localStorage
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(trimmed));

      toast({
        title: "Backup Created Successfully",
        description: `"${backupName}" has been saved with ${currentDataSummary.totalRecords} records.`,
      });

      // Reset form and trigger refresh
      setBackupName("");
      setBackupDescription("");
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Backup creation failed:", error);
      toast({
        title: "Backup Failed",
        description:
          "Could not create backup. Storage may be full or unavailable.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Restore from backup
  const restoreBackup = async (backup: BackupMetadata) => {
    setIsRestoring(true);

    try {
      // Find the full backup data
      const fullBackup = storedBackups.find((b) => b.id === backup.id);
      if (!fullBackup) {
        throw new Error("Backup data not found");
      }

      // Restore all data using the time tracking methods
      // Note: We'll need to clear existing data and restore from backup
      // This is a destructive operation, so we should be careful

      // Create a confirmation that this is destructive
      const confirmed = window.confirm(
        `This will replace ALL current data with the backup "${backup.name}" from ${new Date(backup.timestamp).toLocaleString()}.\n\n` +
          "Current data will be lost. Are you sure you want to continue?",
      );

      if (!confirmed) {
        setIsRestoring(false);
        return;
      }

      toast({
        title: "Restore Initiated",
        description: `Restoring from "${backup.name}"...`,
      });

      // Restore the data using the time tracking hook
      restoreFromBackup(fullBackup.data);

      toast({
        title: "Restore Completed",
        description: `Successfully restored ${Object.values(backup.recordCounts).reduce((a, b) => a + b, 0)} records from "${backup.name}".`,
      });

      setSelectedBackup(null);
    } catch (error) {
      console.error("Restore failed:", error);
      toast({
        title: "Restore Failed",
        description: "Could not restore from backup. Data may be corrupted.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete a backup
  const deleteBackup = (backupId: string) => {
    try {
      const updated = storedBackups.filter((b) => b.id !== backupId);
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));

      toast({
        title: "Backup Deleted",
        description: "Backup has been removed from storage.",
      });
    } catch (error) {
      console.error("Delete backup failed:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete backup.",
        variant: "destructive",
      });
    }
  };

  // Export backup to file
  const exportBackup = (backup: StoredBackup) => {
    try {
      const dataStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `4front-trackity-doo-backup-${backup.name.replace(/[^a-zA-Z0-9]/g, "-")}-${backup.timestamp.split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup Exported",
        description: "Backup file has been downloaded.",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Could not export backup file.",
        variant: "destructive",
      });
    }
  };

  // Import backup from file
  const importBackupFromFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);

      try {
        const text = await file.text();
        const importedData: StoredBackup = JSON.parse(text);

        // Validate the backup structure
        if (
          !importedData.data ||
          !importedData.id ||
          !importedData.name ||
          !importedData.timestamp
        ) {
          throw new Error("Invalid backup file format");
        }

        // Add to stored backups
        const existing = storedBackups;
        const updated = [importedData, ...existing];
        const trimmed = updated.slice(0, 20);

        localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(trimmed));

        toast({
          title: "Backup Imported",
          description: `Successfully imported "${importedData.name}" from file.`,
        });
      } catch (error) {
        console.error("Import failed:", error);
        toast({
          title: "Import Failed",
          description:
            "Could not import backup file. File may be corrupted or invalid.",
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
      }
    };

    input.click();
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup & Restore Management
            <Badge variant="secondary" className="ml-2">
              {storedBackups.length} backups
            </Badge>
          </CardTitle>
          <CardDescription>
            Create and manage backups of your 4Front Trackity-doo data for
            safety and recovery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Database className="h-5 w-5" />
                <span className="font-medium">Total Records</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {currentDataSummary.totalRecords}
              </p>
              <p className="text-sm text-gray-600">Ready for backup</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Data Size</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {formatFileSize(currentDataSummary.dataSize)}
              </p>
              <p className="text-sm text-gray-600">Current data size</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-700">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Last Backup</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {storedBackups.length > 0
                  ? new Date(storedBackups[0].timestamp).toLocaleDateString()
                  : "Never"}
              </p>
              <p className="text-sm text-gray-600">Most recent backup</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Create New Backup
          </CardTitle>
          <CardDescription>
            Save a snapshot of all your current data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="backup-name">Backup Name *</Label>
              <Input
                id="backup-name"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="e.g., End of Month - December 2024"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="backup-description">Description (Optional)</Label>
              <Textarea
                id="backup-description"
                value={backupDescription}
                onChange={(e) => setBackupDescription(e.target.value)}
                placeholder="Add notes about this backup..."
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Current Data Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Data to be backed up:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <span>
                  👥 {currentDataSummary.recordCounts.employees} Employees
                </span>
                <span>💼 {currentDataSummary.recordCounts.jobs} Jobs</span>
                <span>
                  ⏰ {currentDataSummary.recordCounts.timeEntries} Time Entries
                </span>
                <span>
                  🚛 {currentDataSummary.recordCounts.rentalItems} Rental Items
                </span>
                <span>
                  📋 {currentDataSummary.recordCounts.rentalEntries} Rental
                  Entries
                </span>
                <span>
                  🕐 {currentDataSummary.recordCounts.hourTypes} Hour Types
                </span>
                <span>
                  📍 {currentDataSummary.recordCounts.provinces} Provinces
                </span>
                <span className="font-medium">
                  📊 {currentDataSummary.totalRecords} Total Records
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={createBackup}
                disabled={isCreatingBackup || !backupName.trim()}
              >
                {isCreatingBackup ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Backup
                  </>
                )}
              </Button>
              <Button
                onClick={importBackupFromFile}
                disabled={isImporting}
                variant="outline"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import from File
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Available Backups
          </CardTitle>
          <CardDescription>
            Manage and restore from your saved backups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {storedBackups.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                No backups created yet
              </p>
              <p className="text-gray-400 text-sm">
                Create your first backup above to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storedBackups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{backup.name}</p>
                          {backup.description && (
                            <p className="text-sm text-gray-500">
                              {backup.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>
                            {new Date(backup.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-gray-500">
                            {new Date(backup.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">
                            {Object.values(backup.recordCounts).reduce(
                              (a, b) => a + b,
                              0,
                            )}{" "}
                            total
                          </p>
                          <p className="text-gray-500">
                            {backup.recordCounts.timeEntries} entries,{" "}
                            {backup.recordCounts.employees} employees
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatFileSize(backup.dataSize)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedBackup(backup)}
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <AlertCircle className="h-5 w-5 text-orange-500" />
                                  Restore Backup
                                </DialogTitle>
                                <DialogDescription>
                                  This will replace ALL current data with the
                                  backup "{backup.name}".
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                                    <div>
                                      <h4 className="font-medium text-orange-800">
                                        Warning: Destructive Operation
                                      </h4>
                                      <p className="text-sm text-orange-700 mt-1">
                                        All current data will be permanently
                                        replaced. This cannot be undone.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <h5 className="font-medium">
                                      Backup Details:
                                    </h5>
                                    <ul className="text-gray-600 mt-1">
                                      <li>
                                        Created:{" "}
                                        {new Date(
                                          backup.timestamp,
                                        ).toLocaleString()}
                                      </li>
                                      <li>
                                        Records:{" "}
                                        {Object.values(
                                          backup.recordCounts,
                                        ).reduce((a, b) => a + b, 0)}
                                      </li>
                                      <li>
                                        Size: {formatFileSize(backup.dataSize)}
                                      </li>
                                    </ul>
                                  </div>
                                  <div>
                                    <h5 className="font-medium">
                                      Will Replace:
                                    </h5>
                                    <ul className="text-gray-600 mt-1">
                                      <li>All time entries</li>
                                      <li>All employees & jobs</li>
                                      <li>All rental data</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogTrigger asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogTrigger>
                                <Button
                                  onClick={() => restoreBackup(backup)}
                                  disabled={isRestoring}
                                  className="bg-orange-500 hover:bg-orange-600"
                                >
                                  {isRestoring ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Restoring...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Restore Backup
                                    </>
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              exportBackup(
                                storedBackups.find((b) => b.id === backup.id)!,
                              )
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Backup
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the backup "
                                  {backup.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBackup(backup.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Storage Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Backup Storage:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Backups are stored locally in your browser</li>
                <li>• Maximum 20 backups kept (oldest auto-deleted)</li>
                <li>• Export backups to files for long-term storage</li>
                <li>• Clearing browser data will remove backups</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Best Practices:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Create backups before major changes</li>
                <li>• Export important backups to files</li>
                <li>• Use descriptive names and descriptions</li>
                <li>• Test restore process occasionally</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
