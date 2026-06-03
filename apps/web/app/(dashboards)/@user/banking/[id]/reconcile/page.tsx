"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createId } from "@paralleldrive/cuid2";

// Redirect /banking/[id]/reconcile → /banking/[id]/reconcile/[newCuid]
// This creates a new reconciliation session with a pre-generated ID.
export default function NewReconciliationRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const newId = createId();
    router.replace(`/banking/${params.id}/reconcile/${newId}`);
  }, [params.id, router]);

  return null;
}
