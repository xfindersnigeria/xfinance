"use client";

import { useParams } from "next/navigation";
import { ReconciliationPage } from "@/components/features/user/banking/reconciliation";

export default function BankReconciliationPage() {
  const params = useParams<{ id: string }>();
  return <ReconciliationPage bankAccountId={params.id} />;
}
