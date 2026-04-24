import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as settingsService from "../services/settingsService";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { toast } from "sonner";

export const useDepartments = () =>
  useQuery({
    queryKey: ["departments"],
    queryFn: settingsService.getDepartments,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: settingsService.createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department created successfully");
      closeModal(MODAL.DEPARTMENT_CREATE);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create department");
    },
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: settingsService.UpdateDepartmentPayload }) =>
      settingsService.updateDepartment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department updated successfully");
      closeModal(MODAL.DEPARTMENT_EDIT);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update department");
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsService.deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete department");
    },
  });
};

// ── Statutory Deductions ─────────────────────────────────────

export const useStatutoryDeductions = () =>
  useQuery({
    queryKey: ["statutory-deductions"],
    queryFn: settingsService.getStatutoryDeductions,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useCreateStatutoryDeduction = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: settingsService.createStatutoryDeduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statutory-deductions"] });
      toast.success("Statutory deduction created successfully");
      closeModal(MODAL.STATUTORY_DEDUCTION_CREATE);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create statutory deduction");
    },
  });
};

export const useUpdateStatutoryDeduction = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: settingsService.UpdateStatutoryDeductionPayload }) =>
      settingsService.updateStatutoryDeduction(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statutory-deductions"] });
      toast.success("Statutory deduction updated successfully");
      closeModal(MODAL.STATUTORY_DEDUCTION_EDIT);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update statutory deduction");
    },
  });
};

export const useDeleteStatutoryDeduction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsService.deleteStatutoryDeduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statutory-deductions"] });
      toast.success("Statutory deduction deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete statutory deduction");
    },
  });
};

// ── Other Deductions ─────────────────────────────────────────

export const useOtherDeductions = () =>
  useQuery({
    queryKey: ["other-deductions"],
    queryFn: settingsService.getOtherDeductions,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useCreateOtherDeduction = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: settingsService.createOtherDeduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["other-deductions"] });
      toast.success("Deduction created successfully");
      closeModal(MODAL.OTHER_DEDUCTION_CREATE);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create deduction");
    },
  });
};

export const useUpdateOtherDeduction = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: settingsService.UpdateOtherDeductionPayload }) =>
      settingsService.updateOtherDeduction(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["other-deductions"] });
      toast.success("Deduction updated successfully");
      closeModal(MODAL.OTHER_DEDUCTION_EDIT);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update deduction");
    },
  });
};

export const useDeleteOtherDeduction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsService.deleteOtherDeduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["other-deductions"] });
      toast.success("Deduction deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete deduction");
    },
  });
};

// ── Product Categories ────────────────────────────────────────

export const useProductCategories = () =>
  useQuery({
    queryKey: ["product-categories"],
    queryFn: settingsService.getProductCategories,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useCreateProductCategory = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: settingsService.createProductCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Category created successfully");
      closeModal(MODAL.PRODUCT_CATEGORY_CREATE);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create category");
    },
  });
};

export const useUpdateProductCategory = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: settingsService.UpdateProductCategoryPayload }) =>
      settingsService.updateProductCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Category updated successfully");
      closeModal(MODAL.PRODUCT_CATEGORY_EDIT);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update category");
    },
  });
};

export const useDeleteProductCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsService.deleteProductCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete category");
    },
  });
};

// ── Product Units ─────────────────────────────────────────────

export const useProductUnits = () =>
  useQuery({
    queryKey: ["product-units"],
    queryFn: settingsService.getProductUnits,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useCreateProductUnit = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: settingsService.createProductUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-units"] });
      toast.success("Unit created successfully");
      closeModal(MODAL.PRODUCT_UNIT_CREATE);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create unit");
    },
  });
};

export const useUpdateProductUnit = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: settingsService.UpdateProductUnitPayload }) =>
      settingsService.updateProductUnit(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-units"] });
      toast.success("Unit updated successfully");
      closeModal(MODAL.PRODUCT_UNIT_EDIT);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update unit");
    },
  });
};

export const useDeleteProductUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsService.deleteProductUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-units"] });
      toast.success("Unit deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete unit");
    },
  });
};

// ── Product Brands ────────────────────────────────────────────

export const useProductBrands = () =>
  useQuery({
    queryKey: ["product-brands"],
    queryFn: settingsService.getProductBrands,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useCreateProductBrand = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: settingsService.createProductBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-brands"] });
      toast.success("Brand created successfully");
      closeModal(MODAL.PRODUCT_BRAND_CREATE);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create brand");
    },
  });
};

export const useUpdateProductBrand = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: settingsService.UpdateProductBrandPayload }) =>
      settingsService.updateProductBrand(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-brands"] });
      toast.success("Brand updated successfully");
      closeModal(MODAL.PRODUCT_BRAND_EDIT);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update brand");
    },
  });
};

export const useDeleteProductBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsService.deleteProductBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-brands"] });
      toast.success("Brand deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete brand");
    },
  });
};

// ── Group Currencies ──────────────────────────────────────────

export const useCurrencies = (activeOnly = false) =>
  useQuery({
    queryKey: ['currencies', activeOnly],
    queryFn: () => settingsService.getCurrencies(activeOnly),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useCreateCurrency = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: settingsService.createCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      toast.success('Currency added successfully');
      closeModal(MODAL.CURRENCY_CREATE);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add currency');
    },
  });
};

export const useUpdateCurrency = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: settingsService.UpdateCurrencyPayload }) =>
      settingsService.updateCurrency(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      toast.success('Currency updated successfully');
      closeModal(MODAL.CURRENCY_EDIT);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update currency');
    },
  });
};

export const useToggleCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      settingsService.toggleCurrency(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update currency status');
    },
  });
};

export const useSetPrimaryCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsService.setPrimaryCurrency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      toast.success('Primary currency updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set primary currency');
    },
  });
};

export const useDeleteCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsService.deleteCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      toast.success('Currency removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove currency');
    },
  });
};

// ── Entity Config ─────────────────────────────────────────────

export const useEntityConfig = () =>
  useQuery({
    queryKey: ['entity-config'],
    queryFn: settingsService.getEntityConfig,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useUpdateEntityConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsService.updateEntityConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-config'] });
      toast.success('Configuration saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save configuration');
    },
  });
};

// ── Module Toggle ─────────────────────────────────────────────

export const useToggleEntityModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ menuName, enabled }: { menuName: string; enabled: boolean }) =>
      settingsService.toggleEntityMenu(menuName, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update module");
    },
  });
};
