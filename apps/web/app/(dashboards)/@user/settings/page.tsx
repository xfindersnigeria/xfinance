"use client";

import { CustomTabs, type Tab } from "@/components/local/custom/tabs";
import Organization from "@/components/features/user/settings/organization/Organization";
import SetupConfig from "@/components/features/user/settings/setupConfig/SetupConfig";
import Purchases from "@/components/features/user/settings/purchases/Purchases";
import Sales from "@/components/features/user/settings/sales/Sales";
import PayrollSettings from "@/components/features/user/settings/payroll";
import ModulesSettings from "@/components/features/user/settings/modules";
import ProductSettings from "@/components/features/user/settings/product";

const settingsTabs: Tab[] = [
  {
    title: "Organization",
    value: "organization",
    content: <Organization />,
  },
  {
    title: "Setup & Config",
    value: "setup-config",
    content: <SetupConfig />,
  },
  {
    title: "Modules",
    value: "modules",
    content: <ModulesSettings />,
  },
  {
    title: "Income",
    value: "income",
    content: <Sales />,
  },
  {
    title: "Expense",
    value: "expense",
    content: <Purchases />,
  },
  {
    title: "Email",
    value: "email",
    content: <div className="p-4">Email - Coming soon</div>,
  },
  {
    title: "Product",
    value: "product",
    content: <ProductSettings />,
  },
  {
    title: "Tax",
    value: "tax",
    content: <div className="p-4">Tax - Coming soon</div>,
  },
  {
    title: "Payroll",
    value: "payroll",
    content: <PayrollSettings />,
  },
];

export default function SettingsPage() {
  return (
    <>
      <div className="">
        <CustomTabs tabs={settingsTabs} storageKey="settings-tab" variant="route" classNames="p-4"/>
      </div>
    </>
  );
}
