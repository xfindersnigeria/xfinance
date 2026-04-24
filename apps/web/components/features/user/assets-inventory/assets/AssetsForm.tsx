"use client";

import { useEffect } from "react";
import { useCreateAsset, useUpdateAsset } from "@/lib/api/hooks/useAssets";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Loader2, Settings2 } from "lucide-react";
import { assetsSchema } from "./utils/schema";
import {
  AssetTypeEnum,
  AssetDepartmentEnum,
  DepreciationMethodEnum,
} from "@/lib/api/hooks/types/assetsTypes";
import { useEmployees } from "@/lib/api/hooks/useHR";
import { useDepartments } from "@/lib/api/hooks/useSettings";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

type assetsFormData = z.infer<typeof assetsSchema>;

interface assetsFormProps {
  assets?: Partial<assetsFormData> & { id?: string };
  isEditMode?: boolean;
  onSuccess?: () => void;
}

// Helper to format ISO date to YYYY-MM-DD
const formatDate = (isoDate?: string) => {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

export default function AssetsForm({
  assets,
  isEditMode = false,
  onSuccess,
}: assetsFormProps) {
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const sym = useEntityCurrencySymbol();

  // Fetch all employees for assignment
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({
    limit: 1000,
  });
  const employees = (employeesData as any)?.employees || [];

  const { data: departmentsData, isLoading: departmentsLoading } =
    useDepartments();
  const departments = (departmentsData as any)?.data || [];
  const form = useForm<assetsFormData>({
    resolver: zodResolver(assetsSchema),
    defaultValues: {
      assetName: (assets as any)?.name || "",
      assetType: (assets as any)?.type || "",
      // assetId: assets?.assetId || "",
      departmentId: assets?.departmentId || "",
      assignedId: assets?.assignedId || "",
      description: assets?.description || "",
      purchaseDate: formatDate(assets?.purchaseDate),
      purchaseCost: assets?.purchaseCost || "",
      currentValue: assets?.currentValue || "",
      warrantyExpiry: formatDate((assets as any)?.expiryDate),
      trackDepreciation:
        typeof assets?.trackDepreciation === "boolean"
          ? assets.trackDepreciation
          : false,
      depreciationMethod: assets?.depreciationMethod || "",
      usefulLife: (assets as any)?.years || "",
      salvageValue: assets?.salvageValue || "",
      activeAsset:
        typeof assets?.activeAsset === "boolean" ? assets.activeAsset : true,
    },
  });

  useEffect(() => {
    // Reset when assets prop changes (edit mode)
    if (assets) {
      form.reset({
        assetName: (assets as any)?.name || "",
        assetType: (assets as any)?.type || "",
        // assetId: assets?.assetId || "",
        departmentId: assets?.departmentId || "",
        assignedId: assets?.assignedId || "",
        description: assets?.description || "",
        purchaseDate: formatDate(assets?.purchaseDate),
        purchaseCost: assets?.purchaseCost || "",
        currentValue: assets?.currentValue || "",
        warrantyExpiry: formatDate((assets as any)?.expiryDate),
        trackDepreciation:
          typeof assets?.trackDepreciation === "boolean"
            ? assets.trackDepreciation
            : false,
        depreciationMethod: assets?.depreciationMethod || "",
        usefulLife: (assets as any)?.years || "",
        salvageValue: assets?.salvageValue || "",
        activeAsset:
          typeof assets?.activeAsset === "boolean" ? assets.activeAsset : true,
      });
    }
  }, [assets]);

  const onSubmit = async (values: assetsFormData) => {
    try {
      // Convert dates to ISO-8601 DateTime format
      const convertToISO = (dateStr: string) => {
        if (!dateStr) return "";
        return new Date(dateStr).toISOString();
      };

      const payload = {
        name: values.assetName,
        type: values.assetType as AssetTypeEnum,
        departmentId: values.departmentId as AssetDepartmentEnum,
        assignedId: values.assignedId || "",
        description: values.description,
        purchaseDate: convertToISO(values.purchaseDate),
        purchaseCost: Math.round(Number(values.purchaseCost)),
        currentValue: Math.round(Number(values.currentValue) || 0),
        expiryDate: values.warrantyExpiry
          ? convertToISO(values.warrantyExpiry)
          : "",
        depreciationMethod: values.depreciationMethod as DepreciationMethodEnum,
        years: Number(values.usefulLife) || 0,
        salvageValue: Math.round(Number(values.salvageValue) || 0),
        trackDepreciation: values.trackDepreciation,
        activeAsset: values.activeAsset,
      };

      if (isEditMode && assets?.id) {
        await updateAsset.mutateAsync({ id: assets.id, data: payload });
      } else {
        await createAsset.mutateAsync(payload);
      }
    } catch (error) {
      // error handled below
    }
  };

  // useEffect(() => {
  //   if (createAsset.isSuccess || updateAsset.isSuccess) {
  //     toast.success("Asset saved successfully");
  //     if (onSuccess) onSuccess();
  //   }
  //   if (createAsset.isError) {
  //     toast.error(createAsset.error?.message || "Failed to create asset");
  //   }
  //   if (updateAsset.isError) {
  //     toast.error(updateAsset.error?.message || "Failed to update asset");
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [
  //   createAsset.isSuccess,
  //   createAsset.isError,
  //   updateAsset.isSuccess,
  //   updateAsset.isError,
  // ]);

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <div className="bg-blue-50 p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-indigo-500">
                <Settings2 />{" "}
              </span>
              <h6 className="font-semibold text-base text-primary">
                Basic Information
              </h6>
            </div>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="assetName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      Asset Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="rounded-2xl"
                        placeholder="e.g., Dell Laptop XPS 15"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="assetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">
                        Asset Type <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-full rounded-2xl">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Computer Equipment">
                              Computer Equipment
                            </SelectItem>
                            <SelectItem value="Furniture">Furniture</SelectItem>
                            <SelectItem value="IT Equipment">
                              IT Equipment
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">
                        Asset ID/Serial Number
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-2 flex items-center text-gray-400">
                            <svg
                              width="18"
                              height="18"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="2" y="5" width="14" height="10" rx="2" />
                              <path d="M7 7h.01" />
                              <path d="M7 11h.01" />
                              <path d="M11 7h.01" />
                              <path d="M11 11h.01" />
                            </svg>
                          </span>
                          <Input
                            className="pl-8 rounded-2xl"
                            placeholder="AST-2024-001"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">
                        Department
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-full rounded-2xl">
                            <SelectValue
                              placeholder={
                                departmentsLoading
                                  ? "Loading..."
                                  : "Select Department"
                              }
                            />{" "}
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dep: any) => (
                              <SelectItem key={dep.id} value={dep.id}>
                                {dep.name}
                              </SelectItem>
                            ))}{" "}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignedId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">
                        Assigned To
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={employeesLoading}
                        >
                          <SelectTrigger className="w-full rounded-2xl">
                            <SelectValue
                              placeholder={
                                employeesLoading
                                  ? "Loading..."
                                  : "Select employee"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp: any) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                <div className="flex flex-col gap-0">
                                  <span className="text-left">
                                    {emp.firstName} {emp.lastName}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {emp.email}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-semibold">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        className="rounded-2xl"
                        placeholder="Additional details about the asset..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="bg-green-50 p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-green-600">
                {/* LucideReact DollarSign icon */}
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v2m0 14v-2m6-7h-8a2 2 0 0 1 0-4h4a2 2 0 0 1 0 4zm-8 4h8a2 2 0 0 1 0 4h-4a2 2 0 0 1 0-4z" />
                </svg>
              </span>
              <h6 className="font-semibold text-base text-green-900">
                Financial Information
              </h6>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-center">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      Purchase Date <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-2 flex items-center text-gray-400">
                          {/* LucideReact Calendar icon */}
                          <svg
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="4" width="13" height="11" rx="2" />
                            <path d="M16 2v2" />
                            <path d="M7 2v2" />
                            <path d="M3 8h13" />
                          </svg>
                        </span>
                        <Input
                          type="date"
                          className="pl-8 rounded-2xl"
                          placeholder="mm/dd/yyyy"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchaseCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      Purchase Cost <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-2 flex items-center text-gray-400">
                          {/* LucideReact DollarSign icon */}
                          <svg
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 3v2m0 14v-2m6-7h-8a2 2 0 0 1 0-4h4a2 2 0 0 1 0 4zm-8 4h8a2 2 0 0 1 0 4h-4a2 2 0 0 1 0-4z" />
                          </svg>
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-8 rounded-2xl"
                          placeholder={`${sym} 0.00`}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      Current Value
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-2 flex items-center text-gray-400">
                          {/* LucideReact DollarSign icon */}
                          <svg
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 3v2m0 14v-2m6-7h-8a2 2 0 0 1 0-4h4a2 2 0 0 1 0 4zm-8 4h8a2 2 0 0 1 0 4h-4a2 2 0 0 1 0-4z" />
                          </svg>
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-8 rounded-2xl"
                          placeholder={`${sym} 0.00`}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="warrantyExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      Warranty Expiry Date
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-2 flex items-center text-gray-400">
                          {/* LucideReact Calendar icon */}
                          <svg
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="4" width="13" height="11" rx="2" />
                            <path d="M16 2v2" />
                            <path d="M7 2v2" />
                            <path d="M3 8h13" />
                          </svg>
                        </span>
                        <Input
                          type="date"
                          className="pl-8 rounded-2xl"
                          placeholder="mm/dd/yyyy"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="bg-yellow-50 p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-yellow-600">
                {/* LucideReact Landmark icon */}
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="7" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <h6 className="font-semibold text-base text-yellow-900">
                Depreciation Settings
              </h6>
            </div>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="trackDepreciation"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 mb-2">
                      <div>
                        <div className="font-semibold">Track Depreciation</div>
                        <div className="text-gray-500 text-sm">
                          Calculate depreciation for this asset
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depreciationMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      Depreciation Method
                    </FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full rounded-2xl">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Straight Line">
                            Straight Line
                          </SelectItem>
                          <SelectItem value="Declining Balance">
                            Declining Balance
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="usefulLife"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">
                        Useful Life (Years)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          className="rounded-2xl"
                          placeholder="Years"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salvageValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">
                        Salvage Value
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-2 flex items-center text-gray-400">
                            {/* LucideReact DollarSign icon */}
                            <svg
                              width="18"
                              height="18"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 3v2m0 14v-2m6-7h-8a2 2 0 0 1 0-4h4a2 2 0 0 1 0 4zm-8 4h8a2 2 0 0 1 0 4h-4a2 2 0 0 1 0-4z" />
                            </svg>
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-8 rounded-2xl"
                            placeholder={`${sym} 0.00`}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="activeAsset"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 mt-2">
                      <div>
                        <div className="font-semibold">Active Asset</div>
                        <div className="text-gray-500 text-sm">
                          Asset is currently in use
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-1 pb-3">
            <Button variant={"outline"}>Cancel</Button>
            <Button
              type="submit"
              className=""
              disabled={createAsset.isPending || updateAsset.isPending}
            >
              {createAsset.isPending || updateAsset.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  <span>Please wait</span>
                </>
              ) : (
                <>
                  <span>{isEditMode ? "Update Asset" : "Add Asset"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
