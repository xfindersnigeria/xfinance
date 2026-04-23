"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import CustomerDetails from "@/components/features/user/income/customers/details/CustomerDetails";

export default function CustomerDetailsPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <Button
          variant={"ghost"}
          className="cursor-pointer gap-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>
      <CustomerDetails />
    </div>
  );
}
