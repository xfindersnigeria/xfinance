"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit3, Star, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import {
  useDeleteCurrency,
  useSetPrimaryCurrency,
  useToggleCurrency,
} from "@/lib/api/hooks/useSettings";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import CurrencyForm from "./CurrencyForm";
import { GroupCurrencyRow } from "./CurrencyColumn";

export default function CurrencyActions({ row }: { row: GroupCurrencyRow }) {
  const { isOpen, openModal, closeModal } = useModal();
  const toggleCurrency = useToggleCurrency();
  const setPrimary = useSetPrimaryCurrency();
  const deleteCurrency = useDeleteCurrency();

  const editKey = `${MODAL.CURRENCY_EDIT}-${row.id}`;
  const deleteKey = `${MODAL.CURRENCY_DELETE}-${row.id}`;

  return (
    <>
      <div className="flex items-center gap-1">
        <Switch
          checked={row.isActive}
          disabled={row.isPrimary || toggleCurrency.isPending}
          onCheckedChange={(val) =>
            toggleCurrency.mutate({ id: row.id, isActive: val })
          }
        />
        {!row.isPrimary && (
          <Button
            variant="ghost"
            size="icon"
            title="Set as primary"
            className="hover:bg-indigo-50"
            onClick={() => setPrimary.mutate(row.id)}
            disabled={setPrimary.isPending}
          >
            <Star className="w-4 h-4 text-indigo-400" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-100"
          onClick={() => openModal(editKey)}
        >
          <Edit3 className="w-4 h-4 text-gray-500" />
        </Button>
        {!row.isPrimary && (
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-red-50"
            onClick={() => openModal(deleteKey)}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
        )}
      </div>

      <CustomModal
        title="Edit Currency"
        open={isOpen(editKey)}
        onOpenChange={(open) => (open ? openModal(editKey) : closeModal(editKey))}
        module={MODULES.SETTINGS}
      >
        <CurrencyForm currency={row} onSuccess={() => closeModal(editKey)} />
      </CustomModal>

      <CustomModal
        title="Remove Currency"
        open={isOpen(deleteKey)}
        onOpenChange={(open) => (open ? openModal(deleteKey) : closeModal(deleteKey))}
        module={MODULES.SETTINGS}
      >
        <ConfirmationForm
          title={`Remove ${row.code} (${row.name}) from this group?`}
          onResult={(confirmed) => {
            if (confirmed) deleteCurrency.mutate(row.id);
            closeModal(deleteKey);
          }}
          loading={deleteCurrency.isPending}
        />
      </CustomModal>
    </>
  );
}
