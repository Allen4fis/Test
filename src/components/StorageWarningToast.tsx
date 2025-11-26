import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  getStorageStats,
  getCleanupSuggestions,
  formatBytes,
  isStorageWarning,
  isStorageCritical,
} from "@/utils/storageMonitor";
import { AlertCircle, Zap } from "lucide-react";

/**
 * StorageWarningToast - Monitors storage usage and shows warnings
 * Prevents silent data loss from quota exceeded errors
 */
export function StorageWarningToast() {
  const [lastWarningTime, setLastWarningTime] = useState<number>(0);
  const [hasShownCritical, setHasShownCritical] = useState(false);

  useEffect(() => {
    // Check storage every 30 seconds
    const interval = setInterval(() => {
      const stats = getStorageStats();
      const now = Date.now();

      // Only show warnings once per 5 minutes to avoid spam
      const timeSinceLastWarning = now - lastWarningTime;
      const shouldShowWarning = timeSinceLastWarning > 5 * 60 * 1000; // 5 minutes

      if (stats.status === "critical") {
        if (!hasShownCritical || shouldShowWarning) {
          const suggestions = getCleanupSuggestions();
          toast({
            title: "🔴 CRITICAL: Storage Quota Critical",
            description: (
              <div className="space-y-2">
                <p className="font-medium text-red-700">
                  Storage is {stats.percentUsed.toFixed(1)}% full
                </p>
                <p className="text-sm text-red-600">
                  {formatBytes(stats.available)} available of{" "}
                  {formatBytes(stats.quota)}
                </p>
                <div className="text-xs text-red-600 space-y-1">
                  {suggestions.map((suggestion, i) => (
                    <p key={i}>{suggestion}</p>
                  ))}
                </div>
                <p className="text-xs font-semibold text-red-700 mt-2">
                  Action Required: Clear old autosaves or export backups to files immediately.
                </p>
              </div>
            ),
            variant: "destructive",
            duration: 10000, // Show for 10 seconds
          });
          setHasShownCritical(true);
          setLastWarningTime(now);
        }
      } else if (stats.status === "warning") {
        if (shouldShowWarning) {
          const suggestions = getCleanupSuggestions();
          toast({
            title: "⚠️ Storage Warning",
            description: (
              <div className="space-y-2">
                <p className="font-medium">
                  Storage is {stats.percentUsed.toFixed(1)}% full
                </p>
                <p className="text-sm">
                  {formatBytes(stats.available)} available of{" "}
                  {formatBytes(stats.quota)}
                </p>
                <div className="text-xs space-y-1">
                  {suggestions.slice(0, 2).map((suggestion, i) => (
                    <p key={i}>{suggestion}</p>
                  ))}
                </div>
              </div>
            ),
            duration: 8000, // Show for 8 seconds
          });
          setLastWarningTime(now);
        }
      } else if (stats.status === "healthy") {
        setHasShownCritical(false);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [lastWarningTime, hasShownCritical]);

  // This component doesn't render anything - it just monitors and shows toasts
  return null;
}
