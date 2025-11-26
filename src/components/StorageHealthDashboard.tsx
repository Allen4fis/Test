import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, HardDrive, Trash2, Download } from "lucide-react";
import {
  getStorageStats,
  getStorageBreakdown,
  formatBytes,
  isStorageCritical,
  isStorageWarning,
  getCleanupSuggestions,
  clearOldAutosaves,
} from "@/utils/storageMonitor";
import { toast } from "@/hooks/use-toast";

/**
 * StorageHealthDashboard - Displays real-time storage usage and management options
 */
export function StorageHealthDashboard() {
  const [stats, setStats] = useState(getStorageStats());
  const [breakdown, setBreakdown] = useState(getStorageBreakdown());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState(false);

  // Refresh stats every minute
  useEffect(() => {
    const updateStats = () => {
      setStats(getStorageStats());
      setBreakdown(getStorageBreakdown());
      setSuggestions(getCleanupSuggestions());
    };

    updateStats();
    const interval = setInterval(updateStats, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleClearAutosaves = async () => {
    setIsClearing(true);
    try {
      const freed = clearOldAutosaves();

      if (freed > 0) {
        toast({
          title: "✅ Autosaves Cleared",
          description: `Freed ${formatBytes(freed)} of storage space.`,
        });

        // Refresh stats
        setStats(getStorageStats());
        setBreakdown(getStorageBreakdown());
        setSuggestions(getCleanupSuggestions());
      } else {
        toast({
          title: "ℹ️ No Old Autosaves",
          description:
            "Only the 3 most recent autosaves are kept. Nothing to clear.",
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to clear autosaves.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const getStatusColor = () => {
    if (stats.status === "critical") return "text-red-500";
    if (stats.status === "warning") return "text-orange-500";
    return "text-green-500";
  };

  const getStatusBg = () => {
    if (stats.status === "critical") return "bg-red-50 border-red-200";
    if (stats.status === "warning") return "bg-orange-50 border-orange-200";
    return "bg-green-50 border-green-200";
  };

  const getStatusIcon = () => {
    if (stats.status === "critical") return "🔴";
    if (stats.status === "warning") return "🟡";
    return "🟢";
  };

  return (
    <Card className="modern-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Health Monitor
            </CardTitle>
            <CardDescription>
              Monitor your browser's local storage usage
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`text-lg px-3 py-1 font-bold ${getStatusColor()}`}
          >
            {getStatusIcon()} {stats.percentUsed.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Storage Gauge */}
        <div className={`border rounded-lg p-4 ${getStatusBg()}`}>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium">Storage Usage</span>
            <span className="text-sm font-mono">
              {formatBytes(stats.used)} / {formatBytes(stats.quota)}
            </span>
          </div>

          <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                stats.status === "critical"
                  ? "bg-red-500"
                  : stats.status === "warning"
                    ? "bg-orange-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${Math.min(stats.percentUsed, 100)}%` }}
            />
          </div>

          <p className="text-xs text-gray-600 mt-2">
            {formatBytes(stats.available)} available
            {stats.available > 0
              ? ""
              : " - QUOTA EXCEEDED"}
          </p>
        </div>

        {/* Storage Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Storage Breakdown</h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Main Data</span>
                <span className="text-xs font-mono text-gray-900">
                  {formatBytes(breakdown.mainData)}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${Math.min((breakdown.mainData / stats.quota) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Autosaves</span>
                <span className="text-xs font-mono text-gray-900">
                  {formatBytes(breakdown.autosaves)}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${Math.min((breakdown.autosaves / stats.quota) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Backups</span>
                <span className="text-xs font-mono text-gray-900">
                  {formatBytes(breakdown.backups)}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${Math.min((breakdown.backups / stats.quota) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Other</span>
                <span className="text-xs font-mono text-gray-900">
                  {formatBytes(breakdown.other)}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-500"
                  style={{
                    width: `${Math.min((breakdown.other / stats.quota) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status Alert */}
        {(isStorageCritical() || isStorageWarning()) && (
          <div
            className={`border rounded-lg p-4 ${
              isStorageCritical()
                ? "bg-red-50 border-red-200"
                : "bg-orange-50 border-orange-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  isStorageCritical()
                    ? "text-red-600"
                    : "text-orange-600"
                }`}
              />
              <div>
                <h4
                  className={`font-medium mb-1 ${
                    isStorageCritical()
                      ? "text-red-900"
                      : "text-orange-900"
                  }`}
                >
                  {isStorageCritical()
                    ? "⚠️ Critical Storage Level"
                    : "⚠️ Storage Warning"}
                </h4>
                <ul
                  className={`text-sm space-y-1 ${
                    isStorageCritical()
                      ? "text-red-700"
                      : "text-orange-700"
                  }`}
                >
                  {suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleClearAutosaves}
            disabled={isClearing}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isClearing ? "Clearing..." : "Clear Old Autosaves"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            title="Export backups to file for safe storage"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Backups
          </Button>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
          <p className="font-medium mb-1">💡 Storage Tips:</p>
          <ul className="space-y-1 text-xs">
            <li>• Regularly export backups to files for safe long-term storage</li>
            <li>• Old autosaves are automatically cleaned when quota is full</li>
            <li>• Backups are never auto-deleted - you must export them to files</li>
            <li>• Your data is always safe with automatic 10-minute autosaves</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
