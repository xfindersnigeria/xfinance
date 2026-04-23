import {
  useQuery,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import * as projectsService from "../services/projectsService";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { toast } from "sonner";

// ────────────────────────────────────────────────
// Projects
// ────────────────────────────────────────────────

export const useProjects = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["projects", params?.search, params?.page, params?.limit],
    queryFn: () => projectsService.getProjects(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ["projects", "detail", id],
    queryFn: () => projectsService.getProjectById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateProject = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: projectsService.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully");
      closeModal(MODAL.PROJECT_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create project",
      );
    },
    ...options,
  });
};

export const useUpdateProject = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => projectsService.updateProject(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["projects", "detail", variables.id],
        });
      }
      toast.success("Project updated successfully");
      closeModal(MODAL.PROJECT_EDIT);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update project",
      );
    },
    ...options,
  });
};

export const useProjectMilestones = (projectId: string) => {
  return useQuery({
    queryKey: ["projects", "milestones", projectId],
    queryFn: () => projectsService.getProjectMilestones(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateMilestone = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: projectsService.createProjectMilestone,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects", "milestones", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects", "detail", variables.projectId] });
      toast.success("Milestone created successfully");
      closeModal(MODAL.PROJECT_MILESTONE_ADD);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create milestone");
    },
    ...options,
  });
};

export const useUpdateMilestone = (options?: UseMutationOptions<any, Error, { id: string; data: any; projectId: string }>) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => projectsService.updateProjectMilestone(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects", "milestones", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects", "detail", variables.projectId] });
      toast.success("Milestone updated successfully");
      closeModal(MODAL.PROJECT_MILESTONE_EDIT);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update milestone");
    },
    ...options,
  });
};

export const useUpdateProjectTeamMember = (options?: UseMutationOptions<any, Error, { id: string; data: any; projectId: string }>) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => projectsService.updateProjectTeamMember(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects", "team-members", variables.projectId] });
      toast.success("Team member updated successfully");
      closeModal(MODAL.PROJECT_TEAM_MEMBER_EDIT);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update team member");
    },
    ...options,
  });
};

export const useProjectTeamMembers = (projectId: string) => {
  return useQuery({
    queryKey: ["projects", "team-members", projectId],
    queryFn: () => projectsService.getProjectTeamMembers(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useAddProjectTeamMember = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: projectsService.createProjectTeamMember,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects", "team-members", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects", "detail", variables.projectId] });
      toast.success("Team member added successfully");
      closeModal(MODAL.PROJECT_TEAM_MEMBER_ADD);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to add team member",
      );
    },
    ...options,
  });
};

export const useDeleteProject = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: projectsService.deleteProject,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["projects", "detail", id],
        });
      }
      toast.success("Project deleted successfully");
      closeModal(MODAL.PROJECT_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete project",
      );
    },
    ...options,
  });
};

// ── Project sub-resource hooks ──────────────────────────────────────────────

export const useProjectIncome = (id: string) => {
  return useQuery({
    queryKey: ["projects", "income", id],
    queryFn: () => projectsService.getProjectIncome(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProjectExpenses = (id: string) => {
  return useQuery({
    queryKey: ["projects", "expenses", id],
    queryFn: () => projectsService.getProjectExpenses(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProjectTeam = (id: string) => {
  return useQuery({
    queryKey: ["projects", "team", id],
    queryFn: () => projectsService.getProjectTeam(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProjectMilestonesTab = (id: string) => {
  return useQuery({
    queryKey: ["projects", "milestones-tab", id],
    queryFn: () => projectsService.getProjectMilestonesById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProjectSupplies = (id: string) => {
  return useQuery({
    queryKey: ["projects", "supplies", id],
    queryFn: () => projectsService.getProjectSupplies(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProjectOverview = (id: string) => {
  return useQuery({
    queryKey: ["projects", "overview", id],
    queryFn: () => projectsService.getProjectOverview(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProjectAnalysis = (id: string) => {
  return useQuery({
    queryKey: ["projects", "analysis", id],
    queryFn: () => projectsService.getProjectAnalysis(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};
