"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import ProjectsStatCardSmall from "./ProjectsStatCardSmall";
import { Download, Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import ProjectsForm from "./ProjectsForm";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { ProjectStats } from "./utils/types";

interface ProjectsHeaderProps {
  data?: ProjectStats;
  loading?: boolean;
}

function fmtMoney(value: number): string {
  if (value >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  return `₦${value}`;
}

export default function ProjectsHeader({ data, loading }: ProjectsHeaderProps) {
  const { isOpen, openModal, closeModal } = useModal();

  const totalProjects = data?.totalProjects ?? 0;
  const activeProjects = data?.activeProjects ?? 0;
  const totalActualRevenue = data?.totalActualRevenue ?? 0;
  const totalBudgetRevenue = data?.totalBudgetRevenue ?? 0;
  const totalActualCost = data?.totalActualCost ?? 0;
  const totalBudgetCost = data?.totalBudgetCost ?? 0;
  const avgProfitMargin = data?.avgProfitMargin ?? "0%";

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Projects</h2>
          <p className="text-muted-foreground">
            Track project income, expenses, and profitability
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl" disabled>
            <Download />
            Export
          </Button>
          <Button onClick={() => openModal(MODAL.PROJECT_CREATE)} className="rounded-xl">
            <Plus /> New Project
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProjectsStatCardSmall
          title="Active Projects"
          value={
            <span className="text-2xl font-bold text-primary">
              {loading ? "—" : activeProjects}
            </span>
          }
          subtitle={`Of ${totalProjects} total`}
        />
        <ProjectsStatCardSmall
          title="Total Revenue"
          value={
            <span className="text-2xl font-bold text-green-600">
              {loading ? "—" : fmtMoney(totalActualRevenue)}
            </span>
          }
          subtitle={`Budget: ${fmtMoney(totalBudgetRevenue)}`}
        />
        <ProjectsStatCardSmall
          title="Total Costs"
          value={
            <span className="text-2xl font-bold text-red-600">
              {loading ? "—" : fmtMoney(totalActualCost)}
            </span>
          }
          subtitle={`Budget: ${fmtMoney(totalBudgetCost)}`}
        />
        <ProjectsStatCardSmall
          title="Avg Profit Margin"
          value={
            <span className="text-2xl font-bold text-purple-600">
              {loading ? "—" : avgProfitMargin}
            </span>
          }
          subtitle="Across all projects"
        />
      </div>

      <CustomModal
        title="Add New Project"
        module={MODULES.PROJECTS}
        open={isOpen(MODAL.PROJECT_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.PROJECT_CREATE) : closeModal(MODAL.PROJECT_CREATE)
        }
      >
        <ProjectsForm />
      </CustomModal>
    </div>
  );
}
