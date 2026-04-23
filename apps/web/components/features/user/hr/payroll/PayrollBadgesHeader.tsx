"use client";

import { Button } from "@/components/ui/button";
import PayrollBadgeStatCardSmall from "./PayrollBadgeStatCardSmall";
import { FileText, Edit3, Clock, CheckCircle2 } from "lucide-react";
import { Download, Plus } from "lucide-react";
import React from "react";

export default function PayrollBadgesHeader({
  data,
  loading,
}: {
  data?: any;
  loading: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            Payroll Batches
          </h2>
          <p className="text-muted-foreground">
            Manage and approve payroll batch processing{" "}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PayrollBadgeStatCardSmall
          title={
            <span className="flex items-center gap-2 justify-between">Total Batches <FileText className="w-4 h-4 text-indigo-500" /></span>
          }
          value={<span className="text-2xl">{data?.totalBatches ?? 0}</span>}
          loading={loading}
        />
        <PayrollBadgeStatCardSmall
          title={
            <span className="flex items-center gap-2 justify-between">Draft <Edit3 className="w-4 h-4 text-gray-500" /></span>
          }
          value={<span className="text-2xl">{data?.draft ?? 0}</span>}
          loading={loading}
        />
        <PayrollBadgeStatCardSmall
          title={
            <span className="flex items-center gap-2 justify-between">Pending Approval <Clock className="w-4 h-4 text-yellow-500" /></span>
          }
          value={<span className="text-2xl">{data?.pending ?? 0}</span>}
          loading={loading}
        />
        <PayrollBadgeStatCardSmall
          title={
            <span className="flex items-center gap-2 justify-between">Approved <CheckCircle2 className="w-4 h-4 text-green-500" /></span>
          }
          value={<span className="text-2xl">{data?.approved ?? 0}</span>}
          loading={loading}
        />
      </div>
    </div>
  );
}
