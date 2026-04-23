// lib/api/hooks/useSales.ts

import {
  useQuery,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import * as salesService from "../services/salesService";
import { CustomersResponse } from "@/components/features/user/income/customers/utils/types";
import {
  InvoicesResponse,
  PaidInvoicesResponse,
} from "@/components/features/user/income/invoices/utils/types";
import { ReceiptsResponse } from "@/components/features/user/income/sales-receipt/utils/types";
import { PaymentReceivedResponse } from "@/components/features/user/income/payment-received/utils/types";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { toast } from "sonner";
import { ItemsResponse } from "@/components/features/user/income/items";

// ────────────────────────────────────────────────
// Customers
// ────────────────────────────────────────────────

export const useCustomers = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery<CustomersResponse>({
    queryKey: ["customers", params?.search, params?.page, params?.limit],
    queryFn: () =>
      salesService.getCustomers(params) as Promise<CustomersResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: () => salesService.getCustomerById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateCustomer = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: salesService.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully");
      closeModal(MODAL.CUSTOMER_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create customer",
      );
    },
    ...options,
  });
};

export const useUpdateCustomer = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => salesService.updateCustomer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["customers", "detail", variables.id],
        });
      }
      toast.success("Customer updated successfully");
      closeModal(MODAL.CUSTOMER_EDIT);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update customer",
      );
    },
    ...options,
  });
};

export const useDeleteCustomer = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: salesService.deleteCustomer,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["customers", "detail", id],
        });
      }
      toast.success("Customer deleted successfully");
      closeModal(MODAL.CUSTOMER_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete customer",
      );
    },
    ...options,
  });
};

// ────────────────────────────────────────────────
// Invoices
// ────────────────────────────────────────────────

export const useInvoices = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
}) => {
  return useQuery<InvoicesResponse>({
    queryKey: [
      "invoices",
      params?.search,
      params?.page,
      params?.limit,
      params?.status,
      params?.customerId,
    ],
    queryFn: () =>
      salesService.getInvoices(params) as Promise<InvoicesResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ["invoices", "detail", id],
    queryFn: () => salesService.getInvoiceById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateInvoice = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: salesService.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      // queryClient.invalidateQueries({ queryKey: ["projects", "income"] });
      toast.success("Invoice created successfully");
      closeModal(MODAL.INVOICE_CREATE); // ← changed to _CREATE (more consistent)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create invoice",
      );
    },
    ...options,
  });
};

export const useUpdateInvoice = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => salesService.updateInvoice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["invoices", "detail", variables.id],
        });
      }
      toast.success("Invoice updated successfully");
      closeModal(MODAL.INVOICE_EDIT + "-" + variables.id); // ← changed to include ID for better handling of multiple edits
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update invoice",
      );
    },
    ...options,
  });
};

// ────────────────────────────────────────────────
// Invoice Actions & Graphs
// ────────────────────────────────────────────────

export const useMarkInvoicePaid = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesService.updateInvoice(id, { status: "Paid" }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", "detail", id] });
      toast.success("Invoice marked as paid");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to mark invoice as paid");
    },
    ...options,
  });
};

export const useVoidInvoice = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesService.updateInvoice(id, { status: "Void" }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", "detail", id] });
      toast.success("Invoice voided successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to void invoice");
    },
    ...options,
  });
};

export const useSendInvoice = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  return useMutation({
    mutationFn: salesService.sendInvoice,
    onSuccess: () => {
      toast.success("Invoice sent to customer");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send invoice");
    },
    ...options,
  });
};

export const useDownloadInvoice = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  return useMutation({
    mutationFn: salesService.downloadInvoice,
    onSuccess: (data) => { // data is Blob
        // Create a link and download
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice.pdf`); // Ideally get filename from headers
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Invoice download started");
    },
    onError: (error) => {
      console.log("Download error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to download invoice");
    },
    ...options,
  });
};

export const useInvoiceGraphs = (params?: any) => {
    return useQuery({
        queryKey: ["invoices", "graphs", params],
        queryFn: () => salesService.getInvoiceGraphs(params),
        staleTime: 5 * 60 * 1000,
    });
};

export const useDeleteInvoice = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: salesService.deleteInvoice,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["invoices", "detail", id],
        });
      }
      toast.success("Invoice deleted successfully");
      closeModal(MODAL.INVOICE_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete invoice",
      );
    },
    ...options,
  });
};

export const useUpdateInvoiceStatus = (
  options?: UseMutationOptions<any, Error, { id: string; status: string }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, status }) =>
      salesService.updateInvoiceStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({
        queryKey: ["invoices", "detail", variables.id],
      });
      toast.success("Invoice status updated successfully");
      closeModal(MODAL.INVOICE_MARK_SENT + "-" + variables.id);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update invoice status",
      );
    },
    ...options,
  });
};

// ────────────────────────────────────────────────
// Paid Invoices (list only – no CRUD)
// ────────────────────────────────────────────────

export const usePaidInvoices = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery<PaidInvoicesResponse>({
    queryKey: ["paid-invoices", params?.search, params?.page, params?.limit],
    queryFn: () =>
      salesService.getPaidInvoices(params) as Promise<PaidInvoicesResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// ────────────────────────────────────────────────
// Receipts
// ────────────────────────────────────────────────

export const useReceipts = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  paymentMethod?: string;
}) => {
  return useQuery<ReceiptsResponse>({
    queryKey: [
      "receipts",
      params?.search,
      params?.page,
      params?.limit,
      params?.status,
      params?.paymentMethod,
    ],
    queryFn: () =>
      salesService.getReceipts(params) as Promise<ReceiptsResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useReceipt = (id: string) => {
  return useQuery({
    queryKey: ["receipts", "detail", id],
    queryFn: () => salesService.getReceiptById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateReceipt = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: salesService.createReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast.success("Receipt created successfully");
      closeModal(MODAL.SALES_RECEIPT_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create receipt",
      );
    },
    ...options,
  });
};

export const useUpdateReceipt = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => salesService.updateReceipt(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["receipts", "detail", variables.id],
        });
      }
      toast.success("Receipt updated successfully");
      closeModal(MODAL.SALES_RECEIPT_EDIT + "-" + variables.id); // ← changed to include ID for better handling of multiple edits
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update receipt",
      );
    },
    ...options,
  });
};

export const useDeleteReceipt = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: salesService.deleteReceipt,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["receipts", "detail", id],
        });
      }
      toast.success("Receipt deleted successfully");
      closeModal(MODAL.SALES_RECEIPT_DELETE + "-" + id);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete receipt",
      );
    },
    ...options,
  });
};

// ────────────────────────────────────────────────
// Payments Received
// ────────────────────────────────────────────────

export const usePaymentsReceived = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
}) => {
  return useQuery<PaymentReceivedResponse>({
    queryKey: [
      "payment-received",
      params?.search,
      params?.page,
      params?.limit,
      params?.status,
    ],
    queryFn: () =>
      salesService.getPaymentsReceived(
        params,
      ) as Promise<PaymentReceivedResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const usePaymentReceived = (id: string) => {
  return useQuery({
    queryKey: ["payment-received", "detail", id],
    queryFn: () => salesService.getPaymentReceivedById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreatePaymentReceived = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: salesService.createPaymentReceived,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-received"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment received created successfully");
      closeModal(MODAL.PAYMENT_RECEIVED_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create payment received",
      );
    },
    ...options,
  });
};

export const useUpdatePaymentReceived = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => salesService.updatePaymentReceived(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payment-received"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["payment-received", "detail", variables.id],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment received updated successfully");
      closeModal(MODAL.PAYMENT_RECEIVED_EDIT);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update payment received",
      );
    },
    ...options,
  });
};

export const useDeletePaymentReceived = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: salesService.deletePaymentReceived,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["payment-received"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["payment-received", "detail", id],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment received deleted successfully");
      closeModal(MODAL.PAYMENT_RECEIVED_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete payment received",
      );
    },
    ...options,
  });
};

// Optional – keep if needed, otherwise remove
export const usePaymentReceivedReportsSummary = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
}) => {
  return useQuery<PaymentReceivedResponse>({
    queryKey: ["payment-received-reports", params],
    queryFn: () =>
      salesService.getPaymentReceivedReportsSummary(
        params,
      ) as Promise<PaymentReceivedResponse>,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};


// ────────────────────────────────────────────────
//  Items
// ────────────────────────────────────────────────

export const useItems = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  category?: string;
type?: any;
}) => {
  return useQuery<ItemsResponse>({
    queryKey: ["items", params?.search, params?.page, params?.limit, params?.category, params?.type],
    queryFn: () => salesService.getItems(params) as Promise<ItemsResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useItem = (id: string) => {
  return useQuery({
    queryKey: ["items", "detail", id],
    queryFn: () => salesService.getItemById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateItem = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: salesService.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Item created successfully");
      closeModal(MODAL.ITEM_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create item",
      );
    },
    ...options,
  });
};

export const useUpdateItem = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => salesService.updateItem(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["items", "detail", variables.id],
        });
      }
      toast.success("Item updated successfully");
      closeModal(MODAL.ITEM_EDIT);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update item",
      );
    },
    ...options,
  });
};

export const useDeleteItem = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: salesService.deleteItem,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["items", "detail", id],
        });
      }
      toast.success("Item deleted successfully");
      closeModal(MODAL.ITEM_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete item",
      );
    },
    ...options,
  });
};