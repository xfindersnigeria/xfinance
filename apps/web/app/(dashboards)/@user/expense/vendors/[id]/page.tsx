"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { VendorDetails } from "@/components/features/user/purchases/vendors/details";

export default function VendorDetailsPage() {
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
      <VendorDetails />
    </div>
  );
}
