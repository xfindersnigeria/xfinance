import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import * as ordersService from "../services/ordersService";

export const useOrders = (params: ordersService.OrdersQuery = {}) =>
  useQuery({
    queryKey: ["orders", params.page, params.limit, params.search, params.source, params.status],
    queryFn: () => ordersService.getOrders(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

export const useOrder = (id?: string) =>
  useQuery({
    queryKey: ["orders", "detail", id],
    queryFn: () => ordersService.getOrder(id as string),
    enabled: !!id,
    staleTime: 30 * 1000,
  });

export const useStoreSettings = () =>
  useQuery({
    queryKey: ["online-store-settings"],
    queryFn: ordersService.getStoreSettings,
    staleTime: 60 * 1000,
  });

/** Everything a sale touches: stock, orders, receipts, the ledger-backed dashboard */
function useInvalidateSaleQueries() {
  const queryClient = useQueryClient();
  return () => {
    [
      ["orders"],
      ["store-items"],
      ["inventory"],
      ["inventory-movements"],
      ["low-stock-items"],
      ["receipts"],
      ["dashboard"],
      ["kpis"],
      ["recentTransactions"],
      ["monthlyBreakdown"],
      ["cashFlow"],
      ["accounts"],
    ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  };
}

export const usePosCheckout = () => {
  const invalidate = useInvalidateSaleQueries();
  return useMutation({
    mutationFn: ordersService.posCheckout,
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message || "Checkout failed"),
  });
};

export const useCompleteOrder = () => {
  const invalidate = useInvalidateSaleQueries();
  return useMutation({
    mutationFn: ({ id, paymentMethod, depositTo }: { id: string; paymentMethod: string; depositTo: string }) =>
      ordersService.completeOrder(id, { paymentMethod, depositTo }),
    onSuccess: () => {
      invalidate();
      toast.success("Order marked as paid");
    },
    onError: (error: Error) => {
      invalidate();
      toast.error(error.message || "Could not complete the order");
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => ordersService.cancelOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled");
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.error(error.message || "Could not cancel the order");
    },
  });
};

export const useUpdateStoreSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersService.updateStoreSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["online-store-settings"], data);
      queryClient.invalidateQueries({ queryKey: ["online-store-settings"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not update the online store"),
  });
};

export const useEmailReceipt = () =>
  useMutation({
    mutationFn: ({ receiptId, to }: { receiptId: string; to: string }) => ordersService.emailReceipt(receiptId, to),
    onSuccess: (_, v) => toast.success(`Receipt sent to ${v.to}`),
    onError: (error: Error) => toast.error(error.message || "Could not send the receipt"),
  });
