"use client";

import SalesForm from "./SalesForm";
import SalesHeader from "./SalesHeader";

export default function Sales() {
  return (
    <div className="space-y-4">
      <SalesHeader />

      <SalesForm />
    </div>
  );
}
