"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Plus, Calendar, Clock, CheckCircle } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import EmployeeForm from "./LeaveManagementForm";
import { MODULES } from "@/lib/types/enums";
import LeaveManagementStatCardSmall from "./LeaveManagementStatCardSmall";
import LeaveManagementForm from "./LeaveManagementForm";
import { EmployeeStats } from "@/lib/api/hooks/types/hrTypes";

interface LeaveManagementHeaderProps {
  stats?: EmployeeStats;
  loading: boolean;
}

export default function LeaveManagementHeader({
  stats,
  loading,
}: LeaveManagementHeaderProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Manage Leave</h2>
          <p className="text-muted-foreground">
            Approve and track employee leave requests{" "}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
          <Button onClick={() => setOpen(true)} className="rounded-xl">
            <Plus /> Apply Leave
          </Button>
        </div>
      </div>
           
     
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <LeaveManagementStatCardSmall
          title="Total Requests"
          value={(stats as any)?.totalRequests || 0}
          subtitle="Filters apply"
          loading={loading}
          icon={<Calendar size={18} />}
        />
        <LeaveManagementStatCardSmall
          title="Pending Approval"
          value={(stats as any)?.totalPending}
          subtitle="Filters apply"
          loading={loading}
          icon={<Clock size={18} />}
        />
        <LeaveManagementStatCardSmall
          title="Approved"
          value={(stats as any)?.totalApproved || 0}
          subtitle="Filters apply"
          loading={loading}
          icon={<CheckCircle size={18} />}
        />
        <LeaveManagementStatCardSmall
          title="Total Leave Days"
          value={(stats as any)?.totalDaysRequested || 0}
          subtitle="Filters apply"
          loading={loading}
          icon={<Calendar size={18} />}
        />
      </div>

      <CustomModal
        title="Apply for Leave"
        description="Submit a leave request for approval"
        module={MODULES.HR_PAYROLL}
        open={open}
        onOpenChange={setOpen}
      >
        <LeaveManagementForm onSuccess={() => setOpen(false)} />
      </CustomModal>
    </div>
  );
}
