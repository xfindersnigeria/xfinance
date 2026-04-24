"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import ProjectTeamMemberForm from "./ProjectTeamMemberForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { MODULES } from "@/lib/types/enums";
import { useProjectTeam } from "@/lib/api/hooks/useProjects";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface ProjectTeamProps {
  projectId: string;
  projectName: string;
}

export default function ProjectTeam({ projectId, projectName }: ProjectTeamProps) {
  const sym = useEntityCurrencySymbol();
  const { isOpen, openModal, closeModal } = useModal();
  const { data, isLoading } = useProjectTeam(projectId);

  function fmtRate(value: number): string {
    if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M/mo`;
    if (value >= 1_000) return `${sym}${(value / 1_000).toFixed(0)}K/mo`;
    return `${sym}${value}/mo`;
  }

  function fmtCost(value: number): string {
    if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (value >= 1_000) return `${sym}${(value / 1_000).toFixed(0)}K`;
    return `${sym}${value}`;
  }

  const members: any[] = (data as any)?.data ?? [];
  const totalLaborCost: number = (data as any)?.totalLaborCost ?? 0;
  const totalMonths: number = (data as any)?.totalMonths ?? 0;

  const columns = [
    {
      key: "fullName",
      title: "Name",
      render: (value: string) => (
        <span className="text-sm font-medium text-gray-800">{value}</span>
      ),
    },
    {
      key: "role",
      title: "Role",
      render: (value: string) => (
        <span className="text-sm text-gray-600">{value}</span>
      ),
    },
    {
      key: "estimatedMonths",
      title: "Months",
      render: (value: number) => (
        <span className="text-sm text-gray-600">{value}</span>
      ),
    },
    {
      key: "monthlyRate",
      title: "Monthly Rate",
      render: (value: number) => (
        <span className="text-sm text-gray-600">{fmtRate(value)}</span>
      ),
    },
    {
      key: "totalCost",
      title: "Total Cost",
      render: (value: number) => (
        <span className="text-sm font-medium text-red-600">{fmtCost(value)}</span>
      ),
    },
  ];

  const headerActions = (
    <Button
      onClick={() => openModal(MODAL.PROJECT_TEAM_MEMBER_ADD)}
      className="rounded-xl"
      size="sm"
    >
      <UserPlus className="w-4 h-4 mr-1" />
      Add Team Member
    </Button>
  );

  return (
    <>
      <CustomTable
        columns={columns}
        data={members}
        tableTitle="Team Members & Costs"
        headerActions={headerActions}
        display={{ searchComponent: false }}
        loading={isLoading}
      />

      <div className="mt-0 bg-white rounded-b-2xl border-t border-gray-100 px-4 py-3 flex items-center">
        <span className="font-semibold text-sm text-gray-700">Total Labor Cost</span>
        <span className="text-sm text-gray-500 ml-6">{totalMonths} mos</span>
        <span className="text-sm font-bold text-red-600 ml-auto">{fmtCost(totalLaborCost)}</span>
      </div>

      <CustomModal
        title="Add Team Member"
        description={`Add a new team member to ${projectName}`}
        open={isOpen(MODAL.PROJECT_TEAM_MEMBER_ADD)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.PROJECT_TEAM_MEMBER_ADD)
            : closeModal(MODAL.PROJECT_TEAM_MEMBER_ADD)
        }
        module={MODULES.PROJECTS}
      >
        <ProjectTeamMemberForm projectId={projectId} projectName={projectName} />
      </CustomModal>
    </>
  );
}
