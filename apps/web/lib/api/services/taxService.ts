import { apiClient } from "../client";

// Settings → Tax (apps/api/src/settings/tax)

export interface TaxConfig {
  taxCalculation: boolean;
  taxInclusive: boolean;
  compoundTax: boolean;
  reverseChargeVat: boolean;
}

export type TaxRateType = "VAT" | "Sales Tax" | "Withholding Tax" | "Other";

export interface TaxRate {
  id: string;
  name: string;
  type: TaxRateType;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
  jurisdictionId: string | null;
  jurisdiction?: { id: string; name: string } | null;
}

export interface TaxGroup {
  id: string;
  name: string;
  isActive: boolean;
  rates: Array<{ id: string; name: string; rate: number }>;
  totalRate: number;
}

export interface TaxExemption {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
}

export interface TaxJurisdiction {
  id: string;
  name: string;
  description: string | null;
  countryCode: string | null;
  isActive: boolean;
  taxRates: Array<{ id: string; name: string; rate: number; isActive: boolean }>;
}

export interface TaxOverview {
  config: TaxConfig;
  rates: TaxRate[];
  groups: TaxGroup[];
  exemptions: TaxExemption[];
  jurisdictions: TaxJurisdiction[];
}

/** One pickable tax on a document form */
export interface TaxOption {
  key: string; // rate:<id> | group:<id> | exemption:<id>
  kind: "rate" | "group" | "exemption";
  label: string;
  rate: number;
  taxName: string;
}

export interface TaxFormOptions extends TaxConfig {
  /** What new documents start with — null when tax calculation is off */
  default: { key: string | null; rate: number; taxName: string | null } | null;
  options: TaxOption[];
}

interface Envelope<T> {
  data: T;
  message: string;
  statusCode: number;
}

export const getTaxOverview = () => apiClient<Envelope<TaxOverview>>("settings/tax", { method: "GET" });
export const getTaxOptions = () => apiClient<Envelope<TaxFormOptions>>("settings/tax/options", { method: "GET" });

export const updateTaxConfig = (payload: Partial<TaxConfig>) =>
  apiClient<Envelope<TaxConfig>>("settings/tax/config", { method: "PATCH", body: JSON.stringify(payload) });

export interface TaxRatePayload {
  name: string;
  type: TaxRateType;
  rate: number;
  isDefault?: boolean;
  isActive?: boolean;
  jurisdictionId?: string | null;
}
export const createTaxRate = (payload: TaxRatePayload) =>
  apiClient("settings/tax/rates", { method: "POST", body: JSON.stringify(payload) });
export const updateTaxRate = (id: string, payload: Partial<TaxRatePayload>) =>
  apiClient(`settings/tax/rates/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteTaxRate = (id: string) => apiClient(`settings/tax/rates/${id}`, { method: "DELETE" });

export interface TaxGroupPayload {
  name: string;
  taxRateIds: string[];
  isActive?: boolean;
}
export const createTaxGroup = (payload: TaxGroupPayload) =>
  apiClient("settings/tax/groups", { method: "POST", body: JSON.stringify(payload) });
export const updateTaxGroup = (id: string, payload: Partial<TaxGroupPayload>) =>
  apiClient(`settings/tax/groups/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteTaxGroup = (id: string) => apiClient(`settings/tax/groups/${id}`, { method: "DELETE" });

export interface TaxExemptionPayload {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}
export const createTaxExemption = (payload: TaxExemptionPayload) =>
  apiClient("settings/tax/exemptions", { method: "POST", body: JSON.stringify(payload) });
export const updateTaxExemption = (id: string, payload: Partial<TaxExemptionPayload>) =>
  apiClient(`settings/tax/exemptions/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteTaxExemption = (id: string) =>
  apiClient(`settings/tax/exemptions/${id}`, { method: "DELETE" });

export interface TaxJurisdictionPayload {
  name: string;
  description?: string;
  countryCode?: string;
  isActive?: boolean;
}
export const createTaxJurisdiction = (payload: TaxJurisdictionPayload) =>
  apiClient("settings/tax/jurisdictions", { method: "POST", body: JSON.stringify(payload) });
export const updateTaxJurisdiction = (id: string, payload: Partial<TaxJurisdictionPayload>) =>
  apiClient(`settings/tax/jurisdictions/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteTaxJurisdiction = (id: string) =>
  apiClient(`settings/tax/jurisdictions/${id}`, { method: "DELETE" });
