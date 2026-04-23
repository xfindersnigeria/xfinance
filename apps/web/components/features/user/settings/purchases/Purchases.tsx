"use client";

import PurchasesForm from "./PurchasesForm";
import PurchasesHeader from "./PurchasesHeader";

export default function Purchases() {
  return (
    <div className="space-y-4">
      <PurchasesHeader />

      <PurchasesForm />
    </div>
  );
}
