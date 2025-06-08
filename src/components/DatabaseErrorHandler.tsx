import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useIndexedDB } from "@/hooks/useIndexedDB";
import { AlertTriangle, RefreshCw, Database, Info } from "lucide-react";

interface DatabaseErrorHandlerProps {
  error: string;
  onRetry?: () => void;
}

export function DatabaseErrorHandler({
  error,
  onRetry,
}: DatabaseErrorHandlerProps) {
  const { resetDatabase, initializeDatabase } = useIndexedDB();
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetDatabase();
      onRetry?.();
    } catch (err) {
      console.error("Failed to reset database:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleRetry = async () => {
    try {
      await initializeDatabase();
      onRetry?.();
    } catch (err) {
      console.error("Retry failed:", err);
    }
  };

  const isSchemaError =
    error.includes("ConstraintError") || error.includes("index");

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          Database Error
        </CardTitle>
        <CardDescription className="text-red-700">
          There was an issue with the database initialization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-red-100 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800 font-mono break-all">{error}</p>
        </div>

        {isSchemaError && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Schema Conflict Detected</p>
                <p>
                  This error typically occurs when there are conflicting
                  database schemas. This can happen during development or when
                  updating the application.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleRetry}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>

          {isSchemaError && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  Reset Database
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Database</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      This will completely reset the database and remove all
                      stored data, including employees, jobs, and time entries.
                    </p>
                    <p className="font-semibold text-orange-600">
                      ⚠️ This action cannot be undone. Make sure you have a
                      backup if needed.
                    </p>
                    <p>
                      The database will be recreated with the default structure
                      and sample data.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    disabled={isResetting}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {isResetting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Reset Database
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          <p>
            <strong>Troubleshooting Tips:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Try refreshing the page</li>
            <li>Clear your browser cache and cookies</li>
            <li>Make sure no other tabs are using this application</li>
            {isSchemaError && (
              <li>
                If the error persists, reset the database to fix schema
                conflicts
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
