"use client";
import React, { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useUpdateTaxConfig } from "@/lib/api/hooks/useTax";
import type { TaxConfig } from "@/lib/api/services/taxService";
import { SettingsSection, SwitchRow } from "../email/SettingsSection";

const SWITCHES: Array<{ key: keyof TaxConfig; title: string; description: string }> = [
  {
    key: "taxCalculation",
    title: "Enable Tax Calculation",
    description:
      "New invoices, receipts, bills and POS sales start with the default tax. When off they start with no tax — users can still pick one.",
  },
  {
    key: "taxInclusive",
    title: "Tax Inclusive Pricing",
    description: "Item prices already include tax — the tax is extracted from the price instead of added on top.",
  },
  {
    key: "compoundTax",
    title: "Compound Tax",
    description: "Tax groups charge each rate on top of the previous ones (tax on tax), in the order set on the group.",
  },
  {
    key: "reverseChargeVat",
    title: "Reverse Charge VAT",
    description:
      "Bills can be marked reverse charge — the tax is recorded but not added to what you owe the vendor.",
  },
];

export default function TaxConfigCard({ config }: { config: TaxConfig | undefined }) {
  const update = useUpdateTaxConfig();
  const [local, setLocal] = useState<TaxConfig | undefined>(config);

  useEffect(() => setLocal(config), [config]);

  const toggle = (key: keyof TaxConfig, value: boolean) => {
    setLocal((prev) => (prev ? { ...prev, [key]: value } : prev));
    update.mutate(
      { [key]: value },
      { onError: () => setLocal((prev) => (prev ? { ...prev, [key]: !value } : prev)) },
    );
  };

  return (
    <SettingsSection
      title="Tax Configuration"
      subtitle="Changes save as soon as you make them"
      icon={<Receipt />}
    >
      <div>
        {SWITCHES.map((s) => (
          <SwitchRow
            key={s.key}
            title={s.title}
            description={s.description}
            control={
              <Switch
                checked={!!local?.[s.key]}
                onCheckedChange={(v) => toggle(s.key, v)}
                disabled={!local}
                aria-label={s.title}
              />
            }
          />
        ))}
      </div>
    </SettingsSection>
  );
}
