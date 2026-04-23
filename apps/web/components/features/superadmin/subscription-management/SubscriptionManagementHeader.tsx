"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { CreatePlanForm } from "./CreatePlanForm";

export function SubscriptionManagementHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Subscription Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage pricing plans and subscriptions
          </p>
        </div>

        <Button
          size="sm"
          className="gap-2 bg-primary hover:bg-indigo-700 w-fit"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create Plan
        </Button>
      </div>

      <CustomModal
        title="Create New Plan"
        description="Create a new subscription pricing plan"
        open={open}
        onOpenChange={setOpen}
        module={MODULES.SUBSCRIPTION}
      >
        <CreatePlanForm onSuccess={() => setOpen(false)} />
      </CustomModal>
    </div>
  );
}
