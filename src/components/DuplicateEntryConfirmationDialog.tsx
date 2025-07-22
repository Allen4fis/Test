import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

interface DuplicateEntry {
  employee: string;
  job: string;
  hourType: string;
  existingHours: number;
  newHours: number;
}

interface DuplicateEntryConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  date: string;
  duplicates: DuplicateEntry[];
}

export function DuplicateEntryConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  date,
  duplicates,
}: DuplicateEntryConfirmationDialogProps) {
  const [confirmationAccepted, setConfirmationAccepted] = useState(false);

  const handleClose = () => {
    setConfirmationAccepted(false);
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
    handleClose();
  };

  const handleCancel = () => {
    onCancel();
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            ⚠️ DUPLICATE TIME ENTRIES DETECTED
          </DialogTitle>
          <DialogDescription>
            Duplicate entries found for {date}. Review the conflicts below and choose how to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-orange-800 text-lg">
                  🔍 DUPLICATE ENTRIES FOUND
                </h4>
                <p className="text-orange-700 mt-2 font-medium">
                  The following entries already exist for {date} and will create duplicates:
                </p>
                <div className="mt-3 p-3 bg-orange-100 rounded border-l-4 border-orange-400">
                  <p className="text-orange-800 font-semibold text-sm mb-2">
                    Conflicting entries:
                  </p>
                  <ul className="text-orange-800 space-y-2 text-sm">
                    {duplicates.map((dup, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="text-orange-600">•</span>
                        <span className="font-medium">{dup.employee}</span>
                        <span className="text-orange-600">→</span>
                        <span>{dup.job}</span>
                        <span className="text-orange-600">→</span>
                        <span>{dup.hourType}</span>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            Existing: {dup.existingHours}h
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            New: {dup.newHours}h
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-blue-800 text-lg">
                  📋 YOUR OPTIONS
                </h4>
                <div className="mt-3 space-y-3">
                  <div className="p-3 bg-green-100 rounded border-l-4 border-green-400">
                    <p className="text-green-800 font-medium">
                      ✅ <strong>Continue:</strong> Create duplicate entries alongside existing ones
                    </p>
                    <p className="text-green-700 text-sm mt-1">
                      Both old and new entries will exist for the same employee/job/date combination
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded border-l-4 border-red-400">
                    <p className="text-red-800 font-medium">
                      ❌ <strong>Cancel:</strong> Review existing entries first
                    </p>
                    <p className="text-red-700 text-sm mt-1">
                      Go to Time Entry Viewer to edit or delete existing entries before adding new ones
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="duplicate-warning"
                checked={confirmationAccepted}
                onChange={(e) => setConfirmationAccepted(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="duplicate-warning" className="text-sm font-medium">
                I understand this will create duplicate time entries for {date}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel (Review Existing)
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={!confirmationAccepted}
            className="bg-orange-500 hover:bg-orange-600 flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Continue with Duplicates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
