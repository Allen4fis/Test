import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, Trash2, RefreshCw } from "lucide-react";

interface DeleteItem {
  id: string;
  name: string;
  type:
    | "employee"
    | "job"
    | "rental-item"
    | "rental-entry"
    | "backup"
    | "import"
    | "time-entry";
  associatedData?: {
    timeEntries?: number;
    jobs?: number;
    employees?: number;
    rentalEntries?: number;
    backupSize?: string;
    recordCounts?: string[];
    additionalInfo?: string[];
  };
}

interface DeleteConfirmationDialogProps {
  item: DeleteItem;
  trigger: React.ReactNode;
  onConfirm: (id: string) => void | Promise<void>;
  isDeleting?: boolean;
}

export function DeleteConfirmationDialog({
  item,
  trigger,
  onConfirm,
  isDeleting = false,
}: DeleteConfirmationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0);
  const [confirmText, setConfirmText] = useState("");
  const [warningsAccepted, setWarningsAccepted] = useState({
    warning1: false,
    warning2: false,
    warning3: false,
  });

  // Reset state when dialog opens/closes
  const resetConfirmation = () => {
    setConfirmStep(0);
    setConfirmText("");
    setWarningsAccepted({
      warning1: false,
      warning2: false,
      warning3: false,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetConfirmation();
    }
  };

  const handleConfirm = async () => {
    try {
      await onConfirm(item.id);
      setIsOpen(false);
      resetConfirmation();
    } catch (error) {
      console.error("Delete operation failed:", error);
    }
  };

  // Type-specific content
  const getTypeSpecificContent = () => {
    switch (item.type) {
      case "employee":
        return {
          destructionMessage:
            "This will PERMANENTLY DELETE this employee and ALL associated data",
          dataLoss: [
            `All time entries for ${item.name}`,
            "All wage history for this employee",
            "All job associations for this employee",
            "Employee performance data",
          ],
          consequences: [
            "Time tracking reports will lose this employee's data",
            "Historical wage calculations will be affected",
            "Job cost analysis may become incomplete",
            "Payroll records will be permanently lost",
          ],
          confirmWord: "DELETE EMPLOYEE",
          emoji: "👤",
        };
      case "job":
        return {
          destructionMessage:
            "This will PERMANENTLY DELETE this job and ALL associated data",
          dataLoss: [
            `All time entries for job ${item.name}`,
            "All rental entries for this job",
            "All invoicing information for this job",
            "Job cost and profit data",
          ],
          consequences: [
            "Financial reports will lose this job's data",
            "Client billing history will be permanently lost",
            "Project profitability analysis will be incomplete",
            "Equipment rental tracking will be affected",
          ],
          confirmWord: "DELETE JOB",
          emoji: "💼",
        };
      case "rental-item":
        return {
          destructionMessage:
            "This will PERMANENTLY DELETE this rental item and ALL associated data",
          dataLoss: [
            `All rental entries using ${item.name}`,
            "All rental cost calculations",
            "Equipment usage history",
            "Rental rate history",
          ],
          consequences: [
            "Rental reports will lose this item's data",
            "Equipment billing history will be permanently lost",
            "Job cost calculations may become incomplete",
            "Inventory tracking will be affected",
          ],
          confirmWord: "DELETE RENTAL",
          emoji: "🚛",
        };
      case "rental-entry":
        return {
          destructionMessage: "This will PERMANENTLY DELETE this rental entry",
          dataLoss: [
            `Rental usage record for ${item.name}`,
            "Billing information for this rental period",
            "Job cost allocation for this rental",
          ],
          consequences: [
            "Job cost reports will lose this rental data",
            "Client billing may be affected",
            "Equipment usage tracking will have gaps",
          ],
          confirmWord: "DELETE ENTRY",
          emoji: "📋",
        };
      case "backup":
        return {
          destructionMessage:
            "This will PERMANENTLY DELETE this backup and ALL stored data",
          dataLoss: [
            `Complete backup snapshot "${item.name}"`,
            "All historical data contained in this backup",
            ...(item.associatedData?.recordCounts || []),
            "Ability to restore from this backup point",
          ],
          consequences: [
            "This backup recovery point will be permanently lost",
            "You cannot undo this backup deletion",
            "If you need this data later, you'll have to recreate it manually",
            "Other backups are NOT affected by this deletion",
          ],
          confirmWord: "DELETE BACKUP",
          emoji: "💾",
        };
      case "import":
        return {
          destructionMessage:
            "This will IMPORT backup data and may OVERWRITE existing information",
          dataLoss: [
            `Importing backup file "${item.name}"`,
            "This will add the backup to your stored backups list",
            ...(item.associatedData?.recordCounts || []),
            "Backup will be available for future restore operations",
          ],
          consequences: [
            "The imported backup will be added to your backup storage",
            "You can restore from this backup at any time after import",
            "Import does NOT immediately change your current data",
            "Imported backup will count toward your storage limit",
          ],
          confirmWord: "IMPORT BACKUP",
          emoji: "📂",
        };
      case "time-entry":
        return {
          destructionMessage:
            "This will PERMANENTLY DELETE this time entry and ALL associated data",
          dataLoss: [
            `Time entry for ${item.name}`,
            "Hours worked and Live Out Allowance count data",
            "Billable and cost calculations for this entry",
            "Employee time tracking record",
            ...(item.associatedData?.additionalInfo || []),
          ],
          consequences: [
            "Employee time reports will lose this entry",
            "Job cost calculations will be affected",
            "Payroll and billing records will be incomplete",
            "Time tracking history will have gaps",
            "This cannot be recovered once deleted",
          ],
          confirmWord: "DELETE TIME ENTRY",
          emoji: "⏰",
        };
    }
  };

  const content = getTypeSpecificContent();

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={() => resetConfirmation()}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className={`h-8 w-8 ${confirmStep === 0 ? 'text-red-600 animate-pulse' : 'text-red-700 animate-bounce'}`} />
            {confirmStep === 0 &&
              `🚨���⚠️ EXTREME DANGER - PERMANENT DESTRUCTION WARNING ⚠️🔥🚨`}
            {confirmStep === 1 && `🔒💀 TYPE TO CONFIRM TOTAL ANNIHILATION 💀🔒`}
          </DialogTitle>
          <DialogDescription className="text-lg font-bold">
            {confirmStep === 0 && `🔴 CRITICAL SYSTEM WARNING: ${content.destructionMessage.toUpperCase()}`}
            {confirmStep === 1 &&
              `⚡ FINAL STEP: Type '${content.confirmWord}' to execute PERMANENT DELETION ⚡`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 0: Triple Confirmation with 3 checkboxes */}
          {confirmStep === 0 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 border-4 border-red-400 rounded-lg p-6 shadow-2xl animate-pulse">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-10 w-10 text-yellow-300 mt-0.5 flex-shrink-0 animate-spin" />
                  <div>
                    <h4 className="font-black text-yellow-100 text-2xl mb-3 uppercase tracking-wide">
                      🚨🔥💀 EXTREME DANGER ZONE 💀🔥🚨
                    </h4>
                    <div className="bg-yellow-300 text-red-900 p-4 rounded-lg font-black text-lg border-4 border-yellow-400 mb-4">
                      <p className="text-center uppercase">
                        ⚡ PERMANENT DESTRUCTION IMMINENT ⚡
                      </p>
                      <p className="text-center text-xl mt-2">
                        {content.destructionMessage.toUpperCase()}
                      </p>
                    </div>
                    <div className="bg-red-800 border-4 border-yellow-400 rounded-lg p-4">
                      <p className="text-yellow-200 font-bold text-lg mb-3 text-center uppercase">
                        🔥 DATA ANNIHILATION LIST 🔥
                      </p>
                      <ul className="text-yellow-100 space-y-2 font-bold">
                        {content.dataLoss.map((loss, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="text-2xl">💥</span>
                            <span className="uppercase">{loss}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-600 to-red-600 border-4 border-orange-400 rounded-lg p-4 shadow-xl">
                <h5 className="font-black text-white text-xl mb-3 text-center uppercase">
                  {content.emoji} TARGET FOR DESTRUCTION
                </h5>
                <div className="bg-black text-orange-300 p-4 rounded border-4 border-orange-400 font-bold text-lg">
                  <p className="text-center">
                    <span className="text-red-400">🎯 NAME:</span> <span className="text-white font-black text-xl">{item.name.toUpperCase()}</span>
                  </p>
                  <p className="text-center mt-2">
                    <span className="text-red-400">🎯 TYPE:</span>{" "}
                    <span className="text-white font-black text-xl">{item.type.replace("-", " ").toUpperCase()}</span>
                  </p>
                  {item.associatedData && (
                    <div className="mt-4 text-center">
                      <p className="text-red-400 font-black mb-2">💀 COLLATERAL DAMAGE:</p>
                      {item.associatedData.timeEntries && (
                        <p className="text-yellow-300">💥 {item.associatedData.timeEntries} TIME ENTRIES WILL BE OBLITERATED</p>
                      )}
                      {item.associatedData.jobs && (
                        <p className="text-yellow-300">💥 {item.associatedData.jobs} JOBS WILL BE OBLITERATED</p>
                      )}
                      {item.associatedData.employees && (
                        <p className="text-yellow-300">💥 {item.associatedData.employees} EMPLOYEES WILL BE OBLITERATED</p>
                      )}
                      {item.associatedData.rentalEntries && (
                        <p className="text-yellow-300">
                          💥 {item.associatedData.rentalEntries} RENTAL ENTRIES WILL BE OBLITERATED
                        </p>
                      )}
                      {item.associatedData.additionalInfo?.map(
                        (info, index) => <p key={index} className="text-yellow-300">💥 {info.toUpperCase()}</p>,
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-black border-4 border-red-500 rounded-lg p-6 space-y-4">
                <h4 className="text-red-400 font-black text-xl text-center uppercase mb-4">
                  🔥 ACKNOWLEDGE TOTAL DESTRUCTION 🔥
                </h4>

                <div className="flex items-center space-x-3 bg-red-900 p-4 rounded border-2 border-red-400">
                  <input
                    type="checkbox"
                    id="warning1"
                    checked={warningsAccepted.warning1}
                    onChange={(e) =>
                      setWarningsAccepted((prev) => ({
                        ...prev,
                        warning1: e.target.checked,
                      }))
                    }
                    className="h-6 w-6 accent-red-500"
                  />
                  <Label htmlFor="warning1" className="text-yellow-200 font-bold text-lg cursor-pointer">
                    ✅ I ACKNOWLEDGE THIS WILL PERMANENTLY DELETE "{item.name.toUpperCase()}" AND ALL ASSOCIATED DATA FOREVER
                  </Label>
                </div>

                <div className="flex items-center space-x-3 bg-red-900 p-4 rounded border-2 border-red-400">
                  <input
                    type="checkbox"
                    id="warning2"
                    checked={warningsAccepted.warning2}
                    onChange={(e) =>
                      setWarningsAccepted((prev) => ({
                        ...prev,
                        warning2: e.target.checked,
                      }))
                    }
                    className="h-6 w-6 accent-red-500"
                  />
                  <Label htmlFor="warning2" className="text-yellow-200 font-bold text-lg cursor-pointer">
                    ✅ I UNDERSTAND THERE IS ABSOLUTELY NO WAY TO RECOVER THIS DATA ONCE DELETED
                  </Label>
                </div>

                <div className="flex items-center space-x-3 bg-red-900 p-4 rounded border-2 border-red-400">
                  <input
                    type="checkbox"
                    id="warning3"
                    checked={warningsAccepted.warning3}
                    onChange={(e) =>
                      setWarningsAccepted((prev) => ({
                        ...prev,
                        warning3: e.target.checked,
                      }))
                    }
                    className="h-6 w-6 accent-red-500"
                  />
                  <Label htmlFor="warning3" className="text-yellow-200 font-bold text-lg cursor-pointer">
                    ✅ I ACCEPT FULL RESPONSIBILITY FOR THIS DESTRUCTIVE ACTION AND ALL CONSEQUENCES
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Type Confirmation with Maximum Scary Design */}
          {confirmStep === 1 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-black via-red-900 to-black border-4 border-red-400 rounded-lg p-6 shadow-2xl">
                <div className="text-center">
                  <div className="bg-red-600 border-4 border-yellow-400 rounded-lg p-4 mb-6 animate-pulse">
                    <h4 className="font-black text-yellow-200 text-3xl mb-3 uppercase tracking-widest">
                      🔒💀 FINAL EXECUTION COMMAND 💀🔒
                    </h4>
                    <p className="text-yellow-100 font-bold text-xl mb-4 animate-bounce">
                      TYPE THE DESTRUCTION CODE TO PROCEED WITH TOTAL ANNIHILATION
                    </p>
                  </div>

                  <div className="bg-yellow-300 border-4 border-red-500 rounded-lg p-6 mb-6">
                    <p className="text-red-900 font-black text-2xl mb-2 uppercase">
                      ⚡ DESTRUCTION COMMAND ⚡
                    </p>
                    <p className="text-black font-black text-4xl bg-red-600 text-yellow-200 p-3 rounded border-4 border-black">
                      {content.confirmWord}
                    </p>
                  </div>

                  <div className="bg-red-800 border-4 border-yellow-400 rounded-lg p-4 mb-6">
                    <p className="text-yellow-200 font-bold text-lg mb-4">
                      TYPE EXACTLY: <span className="text-white font-black text-2xl bg-black px-3 py-1 rounded">{content.confirmWord}</span>
                    </p>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={`TYPE: ${content.confirmWord}`}
                      className="text-center font-mono text-2xl font-black bg-black text-red-400 border-4 border-red-500 h-16 placeholder-red-600"
                      autoFocus
                    />
                  </div>

                  <div className="bg-gradient-to-r from-red-600 to-orange-600 border-4 border-yellow-400 rounded-lg p-4">
                    <p className="text-yellow-100 font-bold text-lg">
                      🔥 MATCH EXACTLY OR DESTRUCTION WILL BE ABORTED 🔥
                    </p>
                    <p className="text-white font-black text-xl mt-2">
                      REQUIRED: <span className="bg-black px-3 py-1 rounded text-red-400">{content.confirmWord}</span>
                    </p>
                    <p className="text-yellow-200 font-bold mt-2">
                      ENTERED: <span className="bg-black px-3 py-1 rounded text-red-400">{confirmText || "NOTHING ENTERED"}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between bg-black border-t-4 border-red-500 p-6">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-6 py-3 border-4 border-green-400"
          >
            🛡️ ABORT MISSION (SAFE)
          </Button>

          <div className="flex gap-4">
            {confirmStep > 0 && (
              <Button
                variant="ghost"
                onClick={() => setConfirmStep((prev) => prev - 1)}
                className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold text-lg px-6 py-3 border-4 border-yellow-400"
              >
                ⬅️ GO BACK
              </Button>
            )}

            {confirmStep < 1 ? (
              <Button
                onClick={() => setConfirmStep((prev) => prev + 1)}
                disabled={
                  !warningsAccepted.warning1 ||
                  !warningsAccepted.warning2 ||
                  !warningsAccepted.warning3
                }
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-black text-lg px-8 py-3 border-4 border-yellow-400 animate-pulse disabled:opacity-50 disabled:animate-none"
              >
                🔥 PROCEED TO DESTRUCTION COMMAND 🔥
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={isDeleting || confirmText !== content.confirmWord}
                className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-yellow-200 font-black text-xl px-8 py-4 border-4 border-red-400 animate-bounce disabled:opacity-50 disabled:animate-none"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-6 w-6 mr-3 animate-spin" />
                    💀 EXECUTING DESTRUCTION... 💀
                  </>
                ) : (
                  <>
                    <Trash2 className="h-6 w-6 mr-3" />
                    💥 {content.confirmWord} 💥
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
