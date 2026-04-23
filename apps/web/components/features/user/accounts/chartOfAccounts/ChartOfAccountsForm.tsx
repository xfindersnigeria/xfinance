"use client";

import React, { useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { ChartOfAccountsFormData, chartOfAccountsSchema } from "./utils/schema";
import {
  useCreateAccount,
  useUpdateAccount,
} from "@/lib/api/hooks/useAccounts";
import { useAccountTypes } from "@/lib/api/hooks/useAccountTypes";
import { useAccountCategories } from "@/lib/api/hooks/useAccountCategories";
import { useSubCategoriesByCategory } from "@/lib/api/hooks/useAccountSubCategories";

// Zod schema for Chart of Accounts

interface ChartOfAccountsFormProps {
  account?: Partial<ChartOfAccountsFormData> & { id?: string };
  isEditMode?: boolean;
}

export default function ChartOfAccountsForm({
  account,
  isEditMode = false,
}: ChartOfAccountsFormProps) {
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const [typeId, setTypeId] = React.useState<string>("");

  const form = useForm<ChartOfAccountsFormData>({
    resolver: zodResolver(chartOfAccountsSchema) as any,
    defaultValues: {
      // accountCode: account?.accountCode || "",
      accountName: account?.accountName || "",
      categoryId: account?.categoryId || "",
      subCategoryId: account?.subCategoryId || "",
      description: account?.description || "",
      status: account?.status || "Active",
    },
  });

  // Load account types, categories, and subcategories
  const { data: accountTypes, isLoading: loadingTypes } = useAccountTypes();
  const { data: categories, isLoading: loadingCategories } =
    useAccountCategories();

  // Filter categories by selected type
  const filteredCategories = typeId
    ? categories?.filter((cat) => cat.typeId === typeId)
    : [];

  const selectedCategoryId = form.watch("categoryId");
  const { data: subcategories, isLoading: loadingSubcategories } =
    useSubCategoriesByCategory(selectedCategoryId);

  useEffect(() => {
    if (account) {
      form.reset({
        accountType: account?.accountType || "",
        // accountCode: account?.accountCode || "",
        accountName: account?.accountName || "",
        categoryId: account?.categoryId || "",
        subCategoryId: account?.subCategoryId || "",
        description: account?.description || "",
        status: account?.status || "Active",
      });
    }
  }, [account]);

  const onSubmit = async (values: ChartOfAccountsFormData) => {
    try {
      const payload = {
        name: values.accountName,
        // code: values.accountCode,
        subCategoryId: values.subCategoryId,
        categoryId: values.categoryId,
        description: values.description,
      };
      if (isEditMode && account?.id) {
        await updateAccount.mutateAsync({ id: account.id, data: payload });
      } else {
        await createAccount.mutateAsync(payload);
      }
    } catch (error) {
      // error handled below
    }
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Account Type Section (Top Most) */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <FormField
              control={form.control}
              name="accountType"
              render={() => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-gray-900">
                    Account Type <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    value={typeId}
                    onValueChange={setTypeId}
                    disabled={loadingTypes}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full rounded-lg border-gray-300">
                        <SelectValue
                          placeholder={
                            loadingTypes ? "Loading..." : "Select account type"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountTypes?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.code} - {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Category Section */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-gray-900">
                    Category <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={
                      !typeId ||
                      (filteredCategories && filteredCategories.length === 0)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full rounded-lg border-gray-300">
                        <SelectValue
                          placeholder={
                            !typeId
                              ? "Select a type first"
                              : filteredCategories &&
                                  filteredCategories.length === 0
                                ? "No categories available"
                                : "Select category"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.code} - {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Subcategory Section */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <FormField
              control={form.control}
              name="subCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-gray-900">
                    Subcategory <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loadingSubcategories || !selectedCategoryId}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full rounded-lg border-gray-300">
                        <SelectValue
                          placeholder={
                            loadingSubcategories
                              ? "Loading..."
                              : "Select subcategory"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subcategories?.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.code} - {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Account Name Section */}
          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">=</span>
                    <FormLabel className="text-base font-semibold text-gray-900">
                      Account Name <span className="text-red-500">*</span>
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="e.g., Cash and Cash Equivalent"
                      className="rounded-lg border-gray-300"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-600 mt-1">
                    Descriptive name for the account
                  </p>
                </FormItem>
              )}
            />
          </div>

          {/* Description Section */}
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-gray-900">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the purpose and usage of this account..."
                      className="rounded-lg border-gray-300 min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-600 mt-1">
                    Optional: Add notes about when to use this account and what
                    it tracks
                  </p>
                </FormItem>
              )}
            />
          </div>

          {/* Status Section */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Status</p>
                <p className="text-sm text-gray-600">
                  Active accounts can be used in transactions
                </p>
              </div>
              <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                Active
              </Badge>
            </div>
          </div>

          {/* Master Chart of Accounts Guidelines */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-2">
                  Master Chart of Accounts Guidelines
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Account codes should follow your organization's numbering
                    convention
                  </li>
                  <li>
                    • Categories group related accounts (1000s = Assets, 2000s =
                    Liabilities, etc.)
                  </li>
                  <li>
                    • Child accounts will inherit properties from their parent
                    account
                  </li>
                  <li>
                    • You can map entity-specific accounts to this master
                    account later
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between w-full gap-3 border-t pt-4">
            <p className="text-xs text-gray-600">
              <span className="text-red-500">*</span> Required fields
            </p>{" "}
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="outline" className="rounded-lg" type="button">
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                disabled={createAccount.isPending || updateAccount.isPending}
              >
                {createAccount.isPending || updateAccount.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Please wait</span>
                  </>
                ) : isEditMode ? (
                  <>
                    <span>Update Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>{" "}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
