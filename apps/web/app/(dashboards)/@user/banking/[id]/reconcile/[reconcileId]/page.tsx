"use client";

import { useParams } from "next/navigation";
import { ReconciliationPage } from "@/components/features/user/banking/reconciliation";

export default function BankReconciliationDetailPage() {
  const params = useParams<{ id: string; reconcileId: string }>();
  return <ReconciliationPage bankAccountId={params.id} reconcileId={params.reconcileId} />;
}
