"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import ProjectMilestoneForm from "./ProjectMilestoneForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { MODULES } from "@/lib/types/enums";
import { useProjectMilestonesTab } from "@/lib/api/hooks/useProjects";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface ProjectMilestonesProps {
  projectId: string;
  projectName: string;
}

const STATUS_STYLE: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  In_Progress: "bg-indigo-100 text-indigo-700",
  Upcoming: "bg-gray-100 text-gray-600",
  On_Hold: "bg-yellow-100 text-yellow-700",
};

const STATUS_LABEL: Record<string, string> = {
  Completed: "Completed",
  In_Progress: "In Progress",
  Upcoming: "Upcoming",
  On_Hold: "On Hold",
};

export default function ProjectMilestones({
  projectId,
  projectName,
}: ProjectMilestonesProps) {
  const sym = useEntityCurrencySymbol();
  const { isOpen, openModal, closeModal } = useModal();

  function fmtMoney(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000) return `${sym}${(value / 1_000).toFixed(0)}K`;
    return `${sym}${value}`;
  }
  const { data, isLoading } = useProjectMilestonesTab(projectId);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);

  const milestones: any[] = (data as any)?.data ?? [];
  const totalBudget: number = (data as any)?.totalBudget ?? 0;
  const totalActual: number = (data as any)?.totalActual ?? 0;

  const handleEdit = (row: any, _rowIndex: number) => {
    setEditingMilestone(row);
    openModal(MODAL.PROJECT_MILESTONE_EDIT);
  };

  const columns = [
    {
      key: "name",
      title: "Milestone",
      render: (value: string) => (
        <span className="text-sm font-medium text-gray-800">{value}</span>
      ),
    },
    {
      key: "dueDate",
      title: "Due Date",
      render: (value: string) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toISOString().slice(0, 10)}
        </span>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (value: string) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[value] ?? "bg-gray-100 text-gray-600"}`}
        >
          {STATUS_LABEL[value] ?? value}
        </span>
      ),
    },
    {
      key: "budgetAmount",
      title: "Budget",
      render: (value: number) => (
        <span className="text-sm text-gray-700">{fmtMoney(value)}</span>
      ),
    },
    {
      key: "actualAmount",
      title: "Actual",
      render: (value: number, row: any) => (
        // row.status === "Upcoming" ? (
        //   <span className="text-sm text-gray-400">-</span>
        // ) : (
        <span className="text-sm text-gray-700">{fmtMoney(value ?? 0)}</span>
      ),
      // ),
    },
    {
      key: "variance",
      title: "Variance",
      render: (_: any, row: any) => {
        // if (row.status === "Upcoming") return <span className="text-sm text-gray-400">-</span>;
        const variance: number = row.variance ?? 0;
        const pct: number = row.variancePercent ?? 0;
        // positive variance = under budget (good), negative = over budget
        const isGood = variance >= 0;
        return (
          <span
            className={`text-sm font-medium ${isGood ? "text-green-600" : "text-red-600"}`}
          >
            {isGood ? "+" : ""}
            {fmtMoney(variance)} ({isGood ? "+" : ""}
            {pct.toFixed(1)}%)
          </span>
        );
      },
    },
  ];

  const headerActions = (
    <Button
      onClick={() => openModal(MODAL.PROJECT_MILESTONE_ADD)}
      className="rounded-xl"
      size="sm"
    >
      <Plus className="w-4 h-4 mr-1" />
      Add Milestone
    </Button>
  );

  return (
    <>
      <CustomTable
        columns={columns}
        data={milestones}
        tableTitle="Project Milestones"
        headerActions={headerActions}
        display={{ searchComponent: false }}
        loading={isLoading}
        onRowClick={handleEdit}
      />

      <div className="mt-0 bg-white rounded-b-2xl border-t border-gray-100 px-4 py-3 flex items-center gap-8">
        <span className="font-semibold text-sm text-gray-700">
          Total Budget
        </span>
        <span className="text-sm font-bold text-gray-800">
          {fmtMoney(totalBudget)}
        </span>
        <span className="font-semibold text-sm text-gray-700 ml-auto">
          Total Actual
        </span>
        <span className="text-sm font-bold text-red-600">
          {fmtMoney(totalActual)}
        </span>
      </div>

      <CustomModal
        title="Add Milestone"
        description={`Create a new milestone for ${projectName}`}
        open={isOpen(MODAL.PROJECT_MILESTONE_ADD)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.PROJECT_MILESTONE_ADD)
            : closeModal(MODAL.PROJECT_MILESTONE_ADD)
        }
        module={MODULES.PROJECTS}
      >
        <ProjectMilestoneForm projectId={projectId} projectName={projectName} />
      </CustomModal>

      <CustomModal
        title="Edit Milestone"
        description={`Update milestone for ${projectName}`}
        open={isOpen(MODAL.PROJECT_MILESTONE_EDIT)}
        onOpenChange={(open) => {
          if (!open) {
            closeModal(MODAL.PROJECT_MILESTONE_EDIT);
            setEditingMilestone(null);
          }
        }}
        module={MODULES.PROJECTS}
      >
        {editingMilestone && (
          <ProjectMilestoneForm
            projectId={projectId}
            projectName={projectName}
            milestone={editingMilestone}
            isEditMode
          />
        )}
      </CustomModal>
    </>
  );
}
