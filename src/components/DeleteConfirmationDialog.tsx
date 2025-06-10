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
  type: "employee" | "job" | "rental-item" | "rental-entry" | "backup";
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
            <AlertCircle className="h-6 w-6 text-red-500" />
            {confirmStep === 0 &&
              `⚠️ CRITICAL WARNING: Delete ${item.type === "rental-item" ? "Rental Item" : item.type === "rental-entry" ? "Rental Entry" : item.type.charAt(0).toUpperCase() + item.type.slice(1)}`}
            {confirmStep === 1 && "🚨 SECOND WARNING: Permanent Data Loss"}
            {confirmStep === 2 &&
              "🔥 FINAL WARNING: Confirm Destructive Action"}
            {confirmStep === 3 && `🔒 Type "${content.confirmWord}" to Confirm`}
          </DialogTitle>
          <DialogDescription>
            {confirmStep === 0 && content.destructionMessage}
            {confirmStep === 1 &&
              "This action is IRREVERSIBLE and will permanently delete data from your system."}
            {confirmStep === 2 &&
              "Last chance to cancel before permanent deletion begins."}
            {confirmStep === 3 &&
              `Type '${content.confirmWord}' exactly to confirm you understand the consequences.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 0: First Warning */}
          {confirmStep === 0 && (
            <div className="space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-800 text-lg">
                      ⚠️ CRITICAL WARNING ⚠️
                    </h4>
                    <p className="text-red-700 mt-2 font-medium">
                      {content.destructionMessage}
                    </p>
                    <div className="mt-3">
                      <p className="text-red-700 font-medium mb-2">
                        Data that will be LOST FOREVER:
                      </p>
                      <ul className="text-red-700 space-y-1 text-sm">
                        {content.dataLoss.map((loss, index) => (
                          <li key={index}>• {loss}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium mb-2">
                  {content.emoji} Item Details:
                </h5>
                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Name:</strong> {item.name}
                  </p>
                  <p>
                    <strong>Type:</strong>{" "}
                    {item.type.replace("-", " ").charAt(0).toUpperCase() +
                      item.type.replace("-", " ").slice(1)}
                  </p>
                  {item.associatedData && (
                    <div className="mt-2">
                      <strong>Associated Data:</strong>
                      {item.associatedData.timeEntries && (
                        <p>• {item.associatedData.timeEntries} time entries</p>
                      )}
                      {item.associatedData.jobs && (
                        <p>• {item.associatedData.jobs} jobs</p>
                      )}
                      {item.associatedData.employees && (
                        <p>• {item.associatedData.employees} employees</p>
                      )}
                      {item.associatedData.rentalEntries && (
                        <p>
                          • {item.associatedData.rentalEntries} rental entries
                        </p>
                      )}
                      {item.associatedData.additionalInfo?.map(
                        (info, index) => <p key={index}>• {info}</p>,
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
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
                  className="h-4 w-4"
                />
                <Label htmlFor="warning1" className="text-sm font-medium">
                  I understand this will PERMANENTLY DELETE {item.name} and all
                  associated data
                </Label>
              </div>
            </div>
          )}

          {/* Step 1: Second Warning */}
          {confirmStep === 1 && (
            <div className="space-y-4">
              <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-900 text-lg">
                      🚨 SECOND WARNING - NO RECOVERY POSSIBLE 🚨
                    </h4>
                    <p className="text-red-800 mt-2 font-medium">
                      Once deleted, there is NO WAY to recover {item.name} or
                      its data.
                    </p>
                    <div className="mt-3 p-3 bg-red-200 rounded border-l-4 border-red-500">
                      <p className="text-red-900 font-semibold text-sm">
                        System consequences:
                      </p>
                      <ul className="text-red-800 mt-2 space-y-1 text-sm">
                        {content.consequences.map((consequence, index) => (
                          <li key={index}>• {consequence}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
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
                  className="h-4 w-4"
                />
                <Label htmlFor="warning2" className="text-sm font-medium">
                  I acknowledge there is NO RECOVERY possible after deletion
                </Label>
              </div>
            </div>
          )}

          {/* Step 2: Final Warning */}
          {confirmStep === 2 && (
            <div className="space-y-4">
              <div className="bg-red-200 border-2 border-red-400 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-red-700 mt-0.5 flex-shrink-0 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-red-900 text-lg">
                      🔥 FINAL WARNING - LAST CHANCE 🔥
                    </h4>
                    <p className="text-red-900 mt-2 font-bold">
                      This is your FINAL CHANCE to cancel before "{item.name}"
                      is permanently deleted.
                    </p>
                    <div className="mt-3 p-4 bg-yellow-100 border-2 border-yellow-400 rounded">
                      <p className="text-yellow-900 font-bold text-center">
                        ⚡ CLICKING NEXT WILL IMMEDIATELY START THE DELETION
                        PROCESS ⚡
                      </p>
                    </div>
                    <p className="text-red-900 mt-3 font-medium">
                      Are you absolutely certain you want to permanently delete
                      "{item.name}" and accept that this CANNOT be undone?
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
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
                  className="h-4 w-4"
                />
                <Label htmlFor="warning3" className="text-sm font-medium">
                  I am absolutely certain and accept full responsibility for
                  this destructive action
                </Label>
              </div>
            </div>
          )}

          {/* Step 3: Type Confirmation */}
          {confirmStep === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4">
                <div className="text-center">
                  <h4 className="font-bold text-gray-900 text-lg mb-3">
                    🔒 TYPE "{content.confirmWord}" TO CONFIRM
                  </h4>
                  <p className="text-gray-700 mb-4">
                    To confirm you understand the consequences, type{" "}
                    <strong>{content.confirmWord}</strong> exactly in the box
                    below:
                  </p>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={`Type ${content.confirmWord} here`}
                    className="text-center font-mono text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Must match exactly: {content.confirmWord}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel (Safe Choice)
          </Button>

          <div className="flex gap-2">
            {confirmStep > 0 && (
              <Button
                variant="ghost"
                onClick={() => setConfirmStep((prev) => prev - 1)}
              >
                Back
              </Button>
            )}

            {confirmStep < 3 ? (
              <Button
                onClick={() => setConfirmStep((prev) => prev + 1)}
                disabled={
                  (confirmStep === 0 && !warningsAccepted.warning1) ||
                  (confirmStep === 1 && !warningsAccepted.warning2) ||
                  (confirmStep === 2 && !warningsAccepted.warning3)
                }
                className="bg-orange-500 hover:bg-orange-600"
              >
                {confirmStep === 2 ? "Continue to Final Step" : "Next Warning"}
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={isDeleting || confirmText !== content.confirmWord}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    DELETING...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {content.confirmWord}
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
