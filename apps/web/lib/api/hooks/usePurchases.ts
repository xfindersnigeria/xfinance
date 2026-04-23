// lib/api/hooks/usePurchases.ts

import {
  useQuery,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import * as purchasesService from "../services/purchasesService";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { toast } from "sonner";

// ────────────────────────────────────────────────
// Vendors
// ────────────────────────────────────────────────

export const useVendors = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  type?: string;
}) => {
  return useQuery({
    queryKey: ["vendors", params?.search, params?.page, params?.limit, params?.type],
    queryFn: () => purchasesService.getVendors(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useVendor = (id: string) => {
  return useQuery({
    queryKey: ["vendors", "detail", id],
    queryFn: () => purchasesService.getVendorById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateVendor = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: purchasesService.createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor created successfully");
      closeModal(MODAL.VENDOR_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create vendor",
      );
    },
    ...options,
  });
};

export const useUpdateVendor = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => purchasesService.updateVendor(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["vendors", "detail", variables.id],
        });
      }
      toast.success("Vendor updated successfully");
      closeModal(MODAL.VENDOR_EDIT + "-" + variables.id); // ← changed to include ID for better handling of multiple edits
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update vendor",
      );
    },
    ...options,
  });
};

export const useDeleteVendor = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: purchasesService.deleteVendor,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["vendors", "detail", id],
        });
      }
      toast.success("Vendor deleted successfully");
      closeModal(MODAL.VENDOR_DELETE + "-" + id); // ← changed to include ID for better handling of multiple deletions
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete vendor",
      );
    },
    ...options,
  });
};

// ────────────────────────────────────────────────
// Bills
// ────────────────────────────────────────────────

export const useBills = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  category?: string;
}) => {
  return useQuery({
    queryKey: ["bills", params?.search, params?.page, params?.limit, params?.category],
    queryFn: () => purchasesService.getBills(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useBill = (id: string) => {
  return useQuery({
    queryKey: ["bills", "detail", id],
    queryFn: () => purchasesService.getBillById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateBill = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: purchasesService.createBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Bill created successfully");
      closeModal(MODAL.BILL_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create bill",
      );
    },
    ...options,
  });
};

export const useUpdateBill = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => purchasesService.updateBill(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["bills", "detail", variables.id],
        });
      }
      toast.success("Bill updated successfully");
      closeModal(MODAL.BILL_EDIT + "-" + variables.id); // ← changed to include ID for better handling of multiple edits
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update bill",
      );
    },
    ...options,
  });
};

export const useDeleteBill = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: purchasesService.deleteBill,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["bills", "detail", id],
        });
      }
      toast.success("Bill deleted successfully");
      closeModal(MODAL.BILL_DELETE + "-" + id); // ← changed to include ID for better handling of multiple deletions
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete bill",
      );
    },
    ...options,
  });
};

export const useMarkBillUnpaid = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchasesService.markBillUnpaid,
    onSuccess: (_, billId) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      if (billId) {
        queryClient.invalidateQueries({
          queryKey: ["bills", "detail", billId],
        });
      }
      toast.success("Bill marked as unpaid successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark bill as unpaid",
      );
    },
    ...options,
  });
};

export const useCreateBillPayment = (
  options?: UseMutationOptions<any, Error, { billId: string; data: any }>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ billId, data }) => purchasesService.createBillPayment(billId, data),
    onSuccess: (_, variables) => {
      if (variables?.billId) {
        queryClient.invalidateQueries({
          queryKey: ["bills", "detail", variables.billId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["billPayments"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Payment recorded successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to record payment",
      );
    },
    ...options,
  });
};

export const useBillPayments = (params?: {
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["bill-payments", params?.page, params?.limit],
    queryFn: () => purchasesService.getBillPayments(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useBillsByVendor = (vendorId: string, params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: ["bills", "vendor", vendorId, params?.page, params?.limit, params?.search],
    queryFn: () => purchasesService.getBills({ ...params, vendorId }),
    enabled: !!vendorId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// ────────────────────────────────────────────────
// Payment Made
// ────────────────────────────────────────────────

export const useCreatePaymentMade = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: purchasesService.createPaymentMade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bill-payments"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Payment recorded successfully");
      closeModal(MODAL.PAYMENT_MADE_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to record payment",
      );
    },
    ...options,
  });
};

export const useUpdatePaymentMade = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => purchasesService.updatePaymentMade(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bill-payments"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["payment-made", "detail", variables.id],
        });
      }
      toast.success("Payment updated successfully");
      closeModal(MODAL.PAYMENT_MADE_EDIT + "-" + variables.id);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update payment",
      );
    },
    ...options,
  });
};

export const useDeletePaymentMade = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: purchasesService.deletePaymentMade,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["bill-payments"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["payment-made", "detail", id],
        });
      }
      toast.success("Payment deleted successfully");
      closeModal(MODAL.PAYMENT_MADE_DELETE + "-" + id);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete payment",
      );
    },
    ...options,
  });
};

export const usePaymentMade = (id: string) => {
  return useQuery({
    queryKey: ["payment-made", "detail", id],
    queryFn: () => purchasesService.getPaymentMadeById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// ────────────────────────────────────────────────
// Expenses
// ────────────────────────────────────────────────

export const useExpenses = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  category?: string;
}) => {
  return useQuery({
    queryKey: ["expenses", params?.search, params?.page, params?.limit, params?.category],
    queryFn: () => purchasesService.getExpenses(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useExpense = (id: string) => {
  return useQuery({
    queryKey: ["expenses", "detail", id],
    queryFn: () => purchasesService.getExpenseById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateExpense = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: purchasesService.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense created successfully");
      closeModal(MODAL.EXPENSE_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create expense",
      );
    },
    ...options,
  });
};

export const useUpdateExpense = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => purchasesService.updateExpense(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["expenses", "detail", variables.id],
        });
      }
      toast.success("Expense updated successfully");
      closeModal(MODAL.EXPENSE_EDIT);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update expense",
      );
    },
    ...options,
  });
};

export const useDeleteExpense = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: purchasesService.deleteExpense,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["expenses", "detail", id],
        });
      }
      toast.success("Expense deleted successfully");
      closeModal(MODAL.EXPENSE_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete expense",
      );
    },
    ...options,
  });
};

export const useUpdateExpenseStatus = (
  options?: UseMutationOptions<any, Error, { id: string; status: string }>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => purchasesService.updateExpenseStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["expenses", "detail", variables.id],
        });
      }
      toast.success("Expense approved successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to approve expense",
      );
    },
    ...options,
  });
};

export const useApproveExpense = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchasesService.approveExpense,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["expenses", "detail", id],
        });
      }
      toast.success("Expense approved successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to approve expense",
      );
    },
    ...options,
  });
};
