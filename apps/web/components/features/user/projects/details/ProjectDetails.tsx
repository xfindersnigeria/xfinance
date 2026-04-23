"use client";

import React from "react";
import { CustomTabs } from "@/components/local/custom/tabs";
import { Project } from "../utils/types";
import ProjectProfileHeader from "./ProjectProfileHeader";
import ProjectOverview from "./ProjectOverview";
import ProjectIncome from "./ProjectIncome";
import ProjectExpenses from "./ProjectExpenses";
import ProjectAnalysis from "./ProjectAnalysis";
import ProjectTeam from "./ProjectTeam";
import ProjectMilestones from "./ProjectMilestones";
import ProjectSupplies from "./ProjectSupplies";

interface ProjectDetailsProps {
  project: Project;
}

export default function ProjectDetails({ project }: ProjectDetailsProps) {
  const projectId = project.id;
  const projectName = project.name;

  const tabs = [
    {
      title: "Overview",
      value: "overview",
      content: <ProjectOverview projectId={projectId} />,
    },
    {
      title: "Income",
      value: "income",
      content: <ProjectIncome projectId={projectId} />,
    },
    {
      title: "Expenses",
      value: "expenses",
      content: <ProjectExpenses projectId={projectId} />,
    },
    {
      title: "Analysis",
      value: "analysis",
      content: <ProjectAnalysis projectId={projectId} />,
    },
    {
      title: "Team",
      value: "team",
      content: <ProjectTeam projectId={projectId} projectName={projectName} />,
    },
    {
      title: "Milestones",
      value: "milestones",
      content: <ProjectMilestones projectId={projectId} projectName={projectName} />,
    },
    {
      title: "Supplies",
      value: "supplies",
      content: <ProjectSupplies projectId={projectId} />,
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <ProjectProfileHeader project={project} />
      <div className="">
        <CustomTabs
          classNames={"p-0"}
          tabs={tabs}
          storageKey={`project-details-tab-${project.id}`}
          variant="button"
        />
      </div>
    </div>
  );
}
