"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import EmployeesStatCardSmall from "./EmployeesStatCardSmall";
import { Download, Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import EmployeeForm from "./EmployeeForm";
import { MODULES } from "@/lib/types/enums";
import { EmployeeStats } from "@/lib/api/hooks/types/hrTypes";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

interface EmployeesHeaderProps {
  stats?: EmployeeStats;
  loading: boolean;
}

export default function EmployeesHeader({ stats, loading }: EmployeesHeaderProps) {
  const { isOpen, openModal, closeModal } = useModal();
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Employees</h2>
          <p className="text-muted-foreground">
            Manage employee information and records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
          <Button onClick={() => openModal(MODAL.EMPLOYEE_CREATE)} className="rounded-xl">
            <Plus /> New Employee
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <EmployeesStatCardSmall
          title="Total Employees"
          value={<span className="text-3xl">{stats?.totalEmployees || 0}</span>}
          subtitle="Total in system"
          loading={loading}
        />
        <EmployeesStatCardSmall
          title="Active"
          value={<span className="text-3xl">{stats?.totalActive || 0}</span>}
          subtitle="Currently working"
          loading={loading}
        />
        <EmployeesStatCardSmall
          title="On Leave"
          value={<span className="text-3xl">{stats?.totalOnLeave || 0}</span>}
          subtitle="Today"
          loading={loading}
        />
        <EmployeesStatCardSmall
          title="New Hires (Month)"
          value={<span className="text-3xl">{stats?.totalHiredThisMonth || 0}</span>}
          subtitle="Onboarding"
          loading={loading}
        />
      </div>

      <CustomModal
        title="Add New Employee"
        description="Create a new employee record with complete details"
        module={MODULES.HR_PAYROLL}
        open={isOpen(MODAL.EMPLOYEE_CREATE)}
        onOpenChange={(open) => open ? openModal(MODAL.EMPLOYEE_CREATE) : closeModal(MODAL.EMPLOYEE_CREATE)}
      >
        <EmployeeForm onSuccess={() => closeModal(MODAL.EMPLOYEE_CREATE)} />
      </CustomModal>
    </div>
  );
}
