"use client";
import React, { useState } from "react";
import { FileText, Globe, Info, Percent, Plus, Receipt } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { MODULES } from "@/lib/types/enums";
import { useTaxOverview } from "@/lib/api/hooks/useTax";
import { SettingsSection } from "../email/SettingsSection";
import TaxConfigCard from "./TaxConfigCard";
import { createTaxRateColumns } from "./rates/TaxRateColumn";
import TaxRateForm from "./rates/TaxRateForm";
import { createTaxGroupColumns } from "./groups/TaxGroupColumn";
import TaxGroupForm from "./groups/TaxGroupForm";
import { taxExemptionColumns } from "./exemptions/TaxExemptionColumn";
import TaxExemptionForm from "./exemptions/TaxExemptionForm";
import TaxJurisdictionList from "./jurisdictions/TaxJurisdictionList";
import TaxJurisdictionForm from "./jurisdictions/TaxJurisdictionForm";

const TAB_STORAGE_KEY = "tax-settings-tab";
const SUB_TABS = [
  { value: "rates", title: "Tax Rates", icon: Percent },
  { value: "groups", title: "Tax Groups", icon: FileText },
  { value: "exemptions", title: "Exemptions", icon: Receipt },
  { value: "jurisdictions", title: "Jurisdictions", icon: Globe },
];

function readSavedTab(): string {
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    if (saved && SUB_TABS.some((t) => t.value === saved)) return saved;
  } catch {
    // storage unavailable — fall through
  }
  return "rates";
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="sm" className="rounded-2xl" onClick={onClick}>
      <Plus className="w-4 h-4 mr-1" />
      {label}
    </Button>
  );
}

export default function TaxSettings() {
  const { isOpen, openModal, closeModal } = useModal();
  const { data, isLoading } = useTaxOverview();
  const [tab, setTab] = useState<string>(() => (typeof window === "undefined" ? "rates" : readSavedTab()));

  const rates = data?.rates ?? [];
  const groups = data?.groups ?? [];
  const exemptions = data?.exemptions ?? [];
  const jurisdictions = data?.jurisdictions ?? [];
  const compound = !!data?.config.compoundTax;

  const changeTab = (value: string) => {
    setTab(value);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  };

  const modalProps = (key: string) => ({
    open: isOpen(key),
    onOpenChange: (open: boolean) => (open ? openModal(key) : closeModal(key)),
    module: MODULES.SETTINGS,
  });

  return (
    <div className="space-y-6">
      <TaxConfigCard config={data?.config} />

      <Tabs value={tab} onValueChange={changeTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="bg-white shadow-md rounded-2xl p-1 h-auto w-max">
            {SUB_TABS.map(({ value, title, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-xl px-3 py-1.5 font-normal data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                <Icon className="w-4 h-4 mr-1" />
                {title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="rates">
          <CustomTable
            tableTitle="Tax Rates"
            tableSubtitle="Exactly one rate is the default — new documents start with it when tax calculation is on"
            columns={createTaxRateColumns(jurisdictions)}
            data={rates}
            pageSize={10}
            loading={isLoading}
            display={{ searchComponent: false }}
            headerActions={<AddButton label="Add Tax Rate" onClick={() => openModal(MODAL.TAX_RATE_CREATE)} />}
          />
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          {compound && (
            <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl p-4">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-primary">
                Compound Tax is on, so group totals are compounded — each rate is charged on top of the ones before it,
                in the order set on the group.
              </p>
            </div>
          )}
          <CustomTable
            tableTitle="Tax Groups"
            tableSubtitle="Combine multiple tax rates into one tax you can pick on documents"
            columns={createTaxGroupColumns(rates, compound)}
            data={groups}
            pageSize={10}
            loading={isLoading}
            display={{ searchComponent: false }}
            headerActions={
              <AddButton label="Add Tax Group" onClick={() => openModal(MODAL.TAX_GROUP_CREATE)} />
            }
          />
        </TabsContent>

        <TabsContent value="exemptions">
          <CustomTable
            tableTitle="Tax Exemptions"
            tableSubtitle="Exemption categories and codes you can apply instead of a tax"
            columns={taxExemptionColumns}
            data={exemptions}
            pageSize={10}
            loading={isLoading}
            display={{ searchComponent: false }}
            headerActions={
              <AddButton label="Add Exemption" onClick={() => openModal(MODAL.TAX_EXEMPTION_CREATE)} />
            }
          />
        </TabsContent>

        <TabsContent value="jurisdictions">
          <SettingsSection
            title="Tax Jurisdictions"
            subtitle="Group your tax rates by country or region"
            actions={
              <AddButton label="Add Jurisdiction" onClick={() => openModal(MODAL.TAX_JURISDICTION_CREATE)} />
            }
          >
            <TaxJurisdictionList jurisdictions={jurisdictions} loading={isLoading} />
          </SettingsSection>
        </TabsContent>
      </Tabs>

      <CustomModal
        title="Add Tax Rate"
        description="Add a tax rate you can apply to invoices, receipts, bills and POS sales"
        {...modalProps(MODAL.TAX_RATE_CREATE)}
      >
        {isOpen(MODAL.TAX_RATE_CREATE) && (
          <TaxRateForm
            jurisdictions={jurisdictions}
            isFirst={rates.length === 0}
            onSuccess={() => closeModal(MODAL.TAX_RATE_CREATE)}
          />
        )}
      </CustomModal>

      <CustomModal
        title="Add Tax Group"
        description="Combine tax rates — order matters when compound tax is on"
        {...modalProps(MODAL.TAX_GROUP_CREATE)}
      >
        {isOpen(MODAL.TAX_GROUP_CREATE) && (
          <TaxGroupForm rates={rates} compound={compound} onSuccess={() => closeModal(MODAL.TAX_GROUP_CREATE)} />
        )}
      </CustomModal>

      <CustomModal
        title="Add Exemption"
        description="Add a tax exemption category"
        {...modalProps(MODAL.TAX_EXEMPTION_CREATE)}
      >
        {isOpen(MODAL.TAX_EXEMPTION_CREATE) && (
          <TaxExemptionForm onSuccess={() => closeModal(MODAL.TAX_EXEMPTION_CREATE)} />
        )}
      </CustomModal>

      <CustomModal
        title="Add Jurisdiction"
        description="Add a country or region to group tax rates under"
        {...modalProps(MODAL.TAX_JURISDICTION_CREATE)}
      >
        {isOpen(MODAL.TAX_JURISDICTION_CREATE) && (
          <TaxJurisdictionForm onSuccess={() => closeModal(MODAL.TAX_JURISDICTION_CREATE)} />
        )}
      </CustomModal>
    </div>
  );
}
