import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useTimeTracking } from "@/hooks/useTimeTracking";

const RESET_PASSWORD = "6942069";

export function DiscreetReset() {
  const { clearAllData } = useTimeTracking();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (password !== RESET_PASSWORD) {
      toast({
        title: "Access Denied",
        description: "Incorrect password.",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);

    try {
      // Clear all data
      resetData();

      // Clear any backup data
      localStorage.removeItem("trackity-doo-backups");

      toast({
        title: "System Reset Complete",
        description:
          "All data has been cleared. Application reset to base state.",
      });

      setIsOpen(false);
      setPassword("");
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "Could not reset application data.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div
          className="absolute bottom-0 left-0 w-1 h-1 opacity-0 hover:opacity-100 cursor-pointer"
          title="System Reset"
        >
          <Button
            variant="ghost"
            size="sm"
            className="w-1 h-1 p-0 invisible hover:visible"
          >
            •
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>System Reset</DialogTitle>
          <DialogDescription>
            Enter the access code to reset all application data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="Enter access code"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleReset();
                }
              }}
              autoFocus
            />
          </div>
          <div className="text-xs text-gray-500">
            ⚠️ This will permanently delete all employees, jobs, time entries,
            and rental data.
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setPassword("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            disabled={isResetting || !password}
            className="bg-red-600 hover:bg-red-700"
          >
            {isResetting ? "Resetting..." : "Reset System"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
