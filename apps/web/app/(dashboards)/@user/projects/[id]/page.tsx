"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ProjectDetails } from "@/components/features/user/projects/details";
import { useProject } from "@/lib/api/hooks/useProjects";
import { Project } from "@/components/features/user/projects/utils/types";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id ? params.id.toString() : "";

  const { data: project, isLoading, isError } = useProject(id);
  console.log(project, "Fetched project details:"); // Debug log to check fetched data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading project...</p>
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
          <p className="text-gray-600 mt-2">
            The project you&apos;re looking for doesn&apos;t exist.
          </p>
          <button
            onClick={() => router.push("/projects")}
            className="mt-4 text-indigo-600 underline text-sm"
          >
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  return <ProjectDetails project={project as Project} />;
}
