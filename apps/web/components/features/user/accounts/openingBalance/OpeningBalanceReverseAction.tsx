"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Undo2, Loader2 } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useReverseOpeningBalance } from "@/lib/api/hooks/useAccounts";

interface OpeningBalanceReverseActionProps {
  row: {
    id: string;
    status: string;
    reversedBy?: { id: string } | null;
    reversalOf?: { id: string } | null;
  };
}

export default function OpeningBalanceReverseAction({
  row,
}: OpeningBalanceReverseActionProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [reason, setReason] = useState("");
  const reverseOpeningBalance = useReverseOpeningBalance();
  const key = `${MODAL.OPENING_BALANCE_REVERSE}-${row.id}`;

  if (row.status !== "Finalized" || row.reversedBy) {
    return (
      <span className="text-xs text-gray-400">
        {row.status === "Reversed" ? "Reversed" : "—"}
      </span>
    );
  }

  const handleConfirm = () => {
    if (!reason.trim()) return;
    reverseOpeningBalance.mutate(
      { id: row.id, reason: reason.trim() },
      {
        onSuccess: () => {
          closeModal(key);
          setReason("");
        },
      },
    );
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="rounded-lg text-xs gap-1 text-orange-700 border-orange-200 hover:bg-orange-50"
        onClick={() => openModal(key)}
      >
        <Undo2 className="w-3.5 h-3.5" />
        Reverse
      </Button>

      <CustomModal
        title="Reverse Opening Balance"
        description="This posts an offsetting entry and cannot be undone. The original record is kept for audit history."
        open={isOpen(key)}
        onOpenChange={(open) => (open ? openModal(key) : closeModal(key))}
        module={MODULES.ACCOUNTS}
      >
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Reason for reversal
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Wrong amount entered for this account"
              className="rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              variant="outline"
              className="rounded-lg"
              type="button"
              onClick={() => closeModal(key)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
              disabled={!reason.trim() || reverseOpeningBalance.isPending}
              onClick={handleConfirm}
            >
              {reverseOpeningBalance.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Reversing...</span>
                </>
              ) : (
                <span>Confirm Reversal</span>
              )}
            </Button>
          </div>
        </div>
      </CustomModal>
    </>
  );
}
