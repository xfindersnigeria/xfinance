import { apiClient } from "../client";

/**
 * Project Endpoints
 */
export const getProjects = async (params?: { search?: string; page?: number; limit?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `projects?${queryString}` : "projects";
  return apiClient(url, { method: "GET" });
};

export const getProjectById = async (id: string) => {
  return apiClient(`projects/${id}`, { method: "GET" });
};

export const createProject = async (data: any) => {
  return apiClient("projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateProject = async (id: string, data: any) => {
  return apiClient(`projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const deleteProject = async (id: string) => {
  return apiClient(`projects/${id}`, { method: "DELETE" });
};

export const createProjectMilestone = async (data: any) => {
  return apiClient("projects/milestones", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateProjectMilestone = async (id: string, data: any) => {
  return apiClient(`projects/milestones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const getProjectMilestones = async (projectId: string, params?: { page?: number; limit?: number }) => {
  const queryParams = new URLSearchParams({ projectId });
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  return apiClient(`projects/milestones/entity?${queryParams.toString()}`, { method: "GET" });
};

export const updateProjectTeamMember = async (id: string, data: any) => {
  return apiClient(`projects/team-members/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const createProjectTeamMember = async (data: any) => {
  return apiClient("projects/team-members", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const getProjectTeamMembers = async (projectId: string, params?: { page?: number; limit?: number }) => {
  const queryParams = new URLSearchParams({ projectId });
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  return apiClient(`projects/team-members?${queryParams.toString()}`, { method: "GET" });
};

// ── Project sub-resource endpoints ─────────────────────────────────────────

export const getProjectIncome = async (id: string) => {
  return apiClient(`projects/${id}/income`, { method: "GET" });
};

export const getProjectExpenses = async (id: string) => {
  return apiClient(`projects/${id}/expenses`, { method: "GET" });
};

export const getProjectTeam = async (id: string) => {
  return apiClient(`projects/${id}/team`, { method: "GET" });
};

export const getProjectMilestonesById = async (id: string) => {
  return apiClient(`projects/${id}/milestones`, { method: "GET" });
};

export const getProjectSupplies = async (id: string) => {
  return apiClient(`projects/${id}/supplies`, { method: "GET" });
};

export const getProjectOverview = async (id: string) => {
  return apiClient(`projects/${id}/overview`, { method: "GET" });
};

export const getProjectAnalysis = async (id: string) => {
  return apiClient(`projects/${id}/analysis`, { method: "GET" });
};
