import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as taxService from "../services/taxService";

// entity-config: the default rate is mirrored into Settings (shown under Income)
const TAX_KEYS = [["tax-settings"], ["tax-options"], ["entity-config"]];

export const useTaxOverview = () =>
  useQuery({
    queryKey: ["tax-settings"],
    queryFn: async () => (await taxService.getTaxOverview()).data,
    staleTime: 60 * 1000,
  });

/** Default tax + pickable taxes for invoice / receipt / bill / POS forms */
export const useTaxOptions = () =>
  useQuery({
    queryKey: ["tax-options"],
    queryFn: async () => (await taxService.getTaxOptions()).data,
    staleTime: 60 * 1000,
  });

/** Every tax settings change refreshes both the settings page and the form options */
function useTaxMutation<TVars>(fn: (vars: TVars) => Promise<unknown>, success: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      TAX_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      toast.success(success);
    },
    onError: (error: Error) => toast.error(error.message || "Something went wrong"),
  });
}

export const useUpdateTaxConfig = () =>
  useTaxMutation((payload: Partial<taxService.TaxConfig>) => taxService.updateTaxConfig(payload), "Tax configuration updated");

export const useCreateTaxRate = () =>
  useTaxMutation((payload: taxService.TaxRatePayload) => taxService.createTaxRate(payload), "Tax rate created");
export const useUpdateTaxRate = () =>
  useTaxMutation(
    ({ id, payload }: { id: string; payload: Partial<taxService.TaxRatePayload> }) => taxService.updateTaxRate(id, payload),
    "Tax rate updated",
  );
export const useDeleteTaxRate = () => useTaxMutation((id: string) => taxService.deleteTaxRate(id), "Tax rate deleted");

export const useCreateTaxGroup = () =>
  useTaxMutation((payload: taxService.TaxGroupPayload) => taxService.createTaxGroup(payload), "Tax group created");
export const useUpdateTaxGroup = () =>
  useTaxMutation(
    ({ id, payload }: { id: string; payload: Partial<taxService.TaxGroupPayload> }) => taxService.updateTaxGroup(id, payload),
    "Tax group updated",
  );
export const useDeleteTaxGroup = () => useTaxMutation((id: string) => taxService.deleteTaxGroup(id), "Tax group deleted");

export const useCreateTaxExemption = () =>
  useTaxMutation((payload: taxService.TaxExemptionPayload) => taxService.createTaxExemption(payload), "Exemption created");
export const useUpdateTaxExemption = () =>
  useTaxMutation(
    ({ id, payload }: { id: string; payload: Partial<taxService.TaxExemptionPayload> }) =>
      taxService.updateTaxExemption(id, payload),
    "Exemption updated",
  );
export const useDeleteTaxExemption = () =>
  useTaxMutation((id: string) => taxService.deleteTaxExemption(id), "Exemption deleted");

export const useCreateTaxJurisdiction = () =>
  useTaxMutation(
    (payload: taxService.TaxJurisdictionPayload) => taxService.createTaxJurisdiction(payload),
    "Jurisdiction created",
  );
export const useUpdateTaxJurisdiction = () =>
  useTaxMutation(
    ({ id, payload }: { id: string; payload: Partial<taxService.TaxJurisdictionPayload> }) =>
      taxService.updateTaxJurisdiction(id, payload),
    "Jurisdiction updated",
  );
export const useDeleteTaxJurisdiction = () =>
  useTaxMutation((id: string) => taxService.deleteTaxJurisdiction(id), "Jurisdiction deleted");
