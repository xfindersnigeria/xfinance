"use client";
import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useCurrencies } from "@/lib/api/hooks/useSettings";
import { currencyColumns } from "./CurrencyColumn";
import CurrencyForm from "./CurrencyForm";

export default function CurrencySettings() {
  const { isOpen, openModal, closeModal } = useModal();
  const { data: response, isLoading } = useCurrencies();
  const currencies = (response as any)?.data ?? [];

  return (
    <>
      <CustomTable
        tableTitle="Currencies"
        searchPlaceholder="Search currencies..."
        columns={currencyColumns}
        data={currencies}
        pageSize={20}
        loading={isLoading}
        display={{ searchComponent: false }}
        headerActions={
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={() => openModal(MODAL.CURRENCY_CREATE)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Currency
          </Button>
        }
      />

      <CustomModal
        title="Add Currency"
        open={isOpen(MODAL.CURRENCY_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.CURRENCY_CREATE) : closeModal(MODAL.CURRENCY_CREATE)
        }
        module={MODULES.SETTINGS}
      >
        <CurrencyForm onSuccess={() => closeModal(MODAL.CURRENCY_CREATE)} />
      </CustomModal>
    </>
  );
}
