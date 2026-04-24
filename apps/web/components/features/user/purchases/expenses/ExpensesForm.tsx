"use client";
import { useRef, useState, useEffect } from "react";
import { z } from "zod";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  FileText,
  User,
  DollarSign,
  CreditCard,
  Layers,
  UploadCloud,
} from "lucide-react";
import {
  useCreateExpense,
  useUpdateExpense,
  useVendors,
} from "@/lib/api/hooks/usePurchases";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useEntityConfig } from "@/lib/api/hooks/useSettings";
import { getCurrencyByCode } from "@/lib/utils/currencies";
import { paymentMethodOptions } from "../../income/payment-received/PaymentReceivedForm";

const expenseSchema = z.object({
  date: z.date(),
  reference: z.string().optional(),
  vendorId: z.string().min(1, "vendorId is required"),
  expenseAccountId: z.string().min(1, "Expense Account is required"),
  paymentMethod: z.enum([
    "Cash",
    "Card",
    "Bank_Transfer",
    "Mobile_Money",
    "Check",
    "Debit_Card",
    "Credit_Card",
    "ACH",
    "Wire_Transfer",
  ]),
  paymentAccountId: z.string().min(1, "Payment Account is required"),
  amount: z.number().min(0.01, "Amount is required"),
  tax: z.number().min(0, ""),
  description: z.string().optional(),
  tags: z.string().optional(),
  attachments: z.any().optional(),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
});

type ExpenseFormType = z.infer<typeof expenseSchema>;

const defaultValues: ExpenseFormType = {
  date: new Date(),
  reference: "",
  vendorId: "",
  expenseAccountId: "",
  paymentMethod: "Cash",
  paymentAccountId: "",
  amount: 0,
  tax: 0,
  description: "",
  tags: "",
  attachments: undefined,
  projectId: "",
  milestoneId: "",
};

interface ExpensesFormProps {
  expense?: Partial<ExpenseFormType> & { id?: string };
  isEditMode?: boolean;
}

export default function ExpensesForm({
  expense,
  isEditMode = false,
}: ExpensesFormProps = {}) {
  const { closeModal } = useModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const { data: vendorsData, isLoading: vendorsLoading } = useVendors();

  const { data: configRes } = useEntityConfig();
  const entityBaseCurrency: string = (configRes as any)?.data?.baseCurrency ?? "";
  const currencySymbol = getCurrencyByCode(entityBaseCurrency)?.symbol ?? entityBaseCurrency ?? "—";

  const { data: accountsData, isLoading: accountsLoading } = useAccounts({
    type: "Expenses",
  });
  const { data: paymentAccountsData, isLoading: paymentAccountsLoading } =
    useAccounts({
      subCategory: "Cash and Cash Equivalents",
    });
  const { data: projectsData, isLoading: projectsLoading } = useProjects({
    limit: 1000,
  });

  const vendors = (vendorsData as any)?.vendors || [];
  const expenseAccounts = (accountsData?.data as any) || [];
  const paymentAccounts = (paymentAccountsData?.data as any) || [];
  const projects = (projectsData as any)?.data || [];

  const form = useForm<ExpenseFormType>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
    mode: "onChange",
  });

  const selectedProjectId = form.watch("projectId");
  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);
  const milestones = selectedProject?.milestones || [];

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expense) {
      form.reset({
        date: expense?.date ? new Date(expense.date as any) : new Date(),
        reference: expense?.reference || "",
        vendorId: expense?.vendorId || "",
        expenseAccountId: expense?.expenseAccountId || "",
        paymentMethod: (expense?.paymentMethod as any) || "Cash",
        paymentAccountId: expense?.paymentAccountId || "",
        amount: expense?.amount || 0,
        tax: expense?.tax || 0,
        description: expense?.description || "",
        tags: expense?.tags || "",
        projectId: (expense as any)?.projectId || "",
        milestoneId: (expense as any)?.milestoneId || "",
        attachments: undefined,
      });
    }
  }, [expense, form]);

  const watchAmount = form.watch("amount");
  const watchTax = form.watch("tax");
  const total = (Number(watchAmount) || 0) + (Number(watchTax) || 0);

  const onSubmit = async (
    values: ExpenseFormType,
    status?: "draft" | "approved",
  ) => {
    try {
      setIsSubmitting(true);

      if (isEditMode && expense?.id) {
        const updateData: any = {
          date: values.date.toISOString(),
          vendorId: values.vendorId,
          expenseAccountId: values.expenseAccountId,
          paymentMethod: values.paymentMethod,
          paymentAccountId: values.paymentAccountId,
          amount: Math.round(values.amount),
          tax: Math.round(values.tax || 0),
          ...(values.projectId && {
            projectId:
              values.projectId === "no-project" ? "" : values.projectId,
          }),
          ...(values.milestoneId && { milestoneId: values.milestoneId }),
        };

        if (values.reference) updateData.reference = values.reference;
        if (values.description) updateData.description = values.description;
        if (values.tags) {
          const tagArray = values.tags.split(",").map((tag) => tag.trim());
          updateData.tags = tagArray;
        }

        await updateExpense.mutateAsync({ id: expense.id, data: updateData });
      } else {
        const formData = new FormData();
        formData.append("date", values.date.toISOString());
        if (values.reference) formData.append("reference", values.reference);
        formData.append("vendorId", values.vendorId);
        formData.append("expenseAccountId", values.expenseAccountId);
        formData.append("paymentMethod", values.paymentMethod);
        formData.append("paymentAccountId", values.paymentAccountId);
        formData.append("amount", Math.round(values.amount).toString());
        formData.append("tax", Math.round(values.tax).toString());
        if (values.description)
          formData.append("description", values.description);
        if (values.projectId)
          formData.append(
            "projectId",
            values.projectId === "no-project" ? "" : values.projectId,
          );
        if (values.milestoneId)
          formData.append("milestoneId", values.milestoneId);

        if (values.tags) {
          const tagArray = values.tags.split(",").map((tag) => tag.trim());
          tagArray.forEach((tag) => formData.append("tags", tag));
        }

        if (values.attachments && values.attachments[0]) {
          formData.append("attachment", values.attachments[0]);
        }

        formData.append("status", status || "draft");

        await createExpense.mutateAsync(formData);
      }

      form.reset();
      setIsSubmitting(false);
      closeModal(MODAL.EXPENSE_CREATE);
    } catch (error) {
      console.error("Error creating expense:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => onSubmit(v))}
        >
          {/* Basic Information */}
          <div className="rounded-2xl border bg-linear-to-br from-purple-50 to-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="text-purple-500 w-5 h-5" />
              <span className="font-semibold text-base">Basic Information</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value instanceof Date
                            ? format(field.value, "yyyy-MM-dd")
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(new Date(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference/Receipt #</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., REC-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Vendor & Category */}
          <div className="rounded-2xl border bg-linear-to-br from-blue-50 to-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="text-blue-500 w-5 h-5" />
              <span className="font-semibold text-base">Vendor & Category</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor/Supplier *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={vendorsLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              vendorsLoading
                                ? "Loading vendors..."
                                : "Select vendor"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(vendors) && vendors.length > 0 ? (
                            vendors.map((v: any) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.displayName || v.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-vendors" disabled>
                              No vendors found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expenseAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Account *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseAccounts.length > 0 ? (
                            expenseAccounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.code})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-accounts" disabled>
                              No expense accounts found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Payment Details */}
          <div className="rounded-2xl border bg-linear-to-br from-green-50 to-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="text-green-500 w-5 h-5" />
              <span className="font-semibold text-base">Payment Details</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethodOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Account *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentAccounts.length > 0 ? (
                            paymentAccounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.code})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-accounts" disabled>
                              No payment accounts found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Amount Details */}
          <div className="rounded-2xl border bg-linear-to-br from-pink-50 to-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-pink-500 w-5 h-5" />
              <span className="font-semibold text-base">Amount Details</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="mt-2 text-right font-bold text-lg text-blue-700">
              Total Amount{" "}
              <span className="text-2xl">
                {currencySymbol}{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Project & Milestone */}
          <div className="rounded-2xl border bg-linear-to-br from-indigo-50 to-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="text-indigo-500 w-5 h-5" />
              <span className="font-semibold text-base">
                Project & Milestone
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full bg-white rounded-2xl">
                          <SelectValue
                            placeholder={
                              projectsLoading ? "Loading..." : "Select Project"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-project">No Project</SelectItem>
                          {projects.map((pro: any) => (
                            <SelectItem key={pro.id} value={pro.id}>
                              {pro.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedProjectId && selectedProjectId !== "no-project" && (
                <FormField
                  control={form.control}
                  name="milestoneId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Milestone</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full bg-white rounded-2xl">
                            <SelectValue placeholder="Select Milestone" />
                          </SelectTrigger>
                          <SelectContent>
                            {milestones.map((ms: any) => (
                              <SelectItem key={ms.id} value={ms.id}>
                                {ms.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>

          {/* Additional Details */}
          <div className="rounded-2xl border bg-linear-to-br from-blue-50 to-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="text-blue-400 w-5 h-5" />
              <span className="font-semibold text-base">
                Additional Details
              </span>
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description/Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add details about this expense..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Add tags (comma separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attachments"
              render={({ field: { value, onChange } }) => (
                <FormItem className="mt-2">
                  <FormLabel>Attachments</FormLabel>
                  <FormControl>
                    <div
                      className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-gray-50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                      <div className="text-xs text-gray-500 mb-1">
                        Click to upload or drag and drop
                      </div>
                      <div className="text-xs text-gray-400">
                        PDF, JPG, PNG up to 10MB
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => onChange(e.target.files)}
                      />
                      {value && value.length > 0 && (
                        <div className="mt-2 text-xs text-gray-700">
                          {value.length} file(s) selected
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-2 pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Cancel
            </Button>
            <div className="flex gap-2 items-center">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault();
                  form.handleSubmit((v) => onSubmit(v, "draft"))();
                }}
              >
                {isSubmitting ? "Please wait..." : "Save as Draft"}
              </Button>
              <Button
                type="button"
                className="bg-purple-600 text-white"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault();
                  form.handleSubmit((v) => onSubmit(v, "approved"))();
                }}
              >
                {isSubmitting
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                    ? "Update Expense"
                    : "Create Expense"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
