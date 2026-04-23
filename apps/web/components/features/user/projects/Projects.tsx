"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import { CustomTable } from "@/components/local/custom/custom-table";
import ProjectsHeader from "./ProjectsHeader";
import { projectsColumns } from "./ProjectsColumn";
import { useProjects } from "@/lib/api/hooks/useProjects";

export default function Projects() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const pageSize = 10;

  const { data: projectsData, isPending } = useProjects({
    search: debouncedSearchTerm,
    page,
    limit: pageSize,
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleRowClick = (project: any) => {
    router.push(`/projects/${project.projectNumber}`);
  };

  return (
    <div className="space-y-4 p-4">
      <ProjectsHeader data={(projectsData as any)?.stats} loading={isPending} />
      <CustomTable
        searchPlaceholder="Search projects..."
        tableTitle="All Projects"
        columns={projectsColumns}
        data={(projectsData as any)?.data || []}
        pageSize={pageSize}
        loading={isPending}
        onSearchChange={handleSearchChange}
        onRowClick={handleRowClick}
        statusOptions={["All", "In_Progress", "Completed", "Planning", "On_Hold"]}
        onStatusChange={setStatusFilter}
        display={{ searchComponent: true }}
        pagination={{
          page,
          totalPages: Math.ceil((projectsData as any)?.pagination?.totalPages) || 1,
          total: (projectsData as any)?.pagination?.total || 0,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
