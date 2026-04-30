"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  useForm,
  FormProvider,
  useFieldArray,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays } from "date-fns";
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
import { FileText, Layers, UploadCloud, Plus, Trash2 } from "lucide-react";
import {
  useCreateBill,
  useUpdateBill,
  useVendors,
} from "@/lib/api/hooks/usePurchases";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useEntityConfig } from "@/lib/api/hooks/useSettings";
import { getCurrencyByCode } from "@/lib/utils/currencies";
import { toast } from "sonner";

const lineItemSchema = z.object({
  name: z.string().min(1, "Item name required"),
  quantity: z.number().min(1, "Min 1"),
  rate: z.number().min(0, "Min 0"),
  expenseAccountId: z.string().optional(),
});

const billSchema = z.object({
  vendorId: z.string().min(1, "Vendor required"),
  billDate: z.date(),
  dueDate: z.date(),
  poNumber: z.string().optional(),
  paymentTerms: z.string().min(1, "Payment terms required"),
  lineItems: z.array(lineItemSchema).min(1, "At least 1 item"),
  discount: z.number().min(0, "Min 0"),
  tax: z.number().min(0, "Min 0"),
  accountsPayableId: z.string().min(1, "Accounts Payable is required"),
  subject: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.any().optional(),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
});

type BillFormType = z.infer<typeof billSchema>;

function calcDueDate(billDate: Date, terms: string): Date {
  if (!terms || terms === "Due on Receipt") return new Date(billDate);
  const match = terms.match(/Net (\d+)/i);
  if (match) return addDays(new Date(billDate), parseInt(match[1], 10));
  return new Date(billDate);
}

const defaultValues: BillFormType = {
  vendorId: "",
  billDate: new Date(),
  dueDate: new Date(),
  poNumber: "",
  paymentTerms: "Net 30",
  lineItems: [{ name: "", quantity: 1, rate: 0, expenseAccountId: "" }],
  discount: 0,
  tax: 0,
  accountsPayableId: "",
  subject: "",
  notes: "",
  attachments: undefined,
  projectId: "",
  milestoneId: "",
};

interface BillsFormProps {
  bill?: Partial<BillFormType> & { id?: string; billItem?: any[] };
  isEditMode?: boolean;
}

export default function BillsForm({
  bill,
  isEditMode = false,
}: BillsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  const { data: vendorsData, isLoading: vendorsLoading } = useVendors();
  const { data: configRes } = useEntityConfig();
  const entityBaseCurrency: string =
    (configRes as any)?.data?.baseCurrency ?? "";
  const currencySymbol =
    getCurrencyByCode(entityBaseCurrency)?.symbol ?? entityBaseCurrency ?? "—";

  const { data: accountsData, isLoading: accountsLoading } = useAccounts({
    type: "Expenses",
  });
  const { data: payableAccountsData, isLoading: payableAccountsLoading } =
    useAccounts({
      subCategory: "Accounts Payable",
    });
  const { data: projectsData, isLoading: projectsLoading } = useProjects({
    limit: 1000,
  });

  const vendors = (vendorsData as any)?.vendors || [];
  const expenseAccounts = (accountsData?.data as any) || [];
  const payableAccounts = (payableAccountsData?.data as any) || [];
  const projects = (projectsData as any)?.data || [];

  const form = useForm<BillFormType>({
    resolver: zodResolver(billSchema),
    defaultValues,
    mode: "onChange",
  });

  const selectedProjectId = form.watch("projectId");
  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);
  const milestones = selectedProject?.milestones || [];

  useEffect(() => {
    if (bill) {
      const mappedItems = (bill.billItem || []).map((ii: any) => ({
        name: ii.name || "",
        quantity: Number(ii.quantity) || 1,
        rate: Number(ii.rate) || 0,
        expenseAccountId: ii.expenseAccountId || "",
      }));

      form.reset({
        vendorId:
          (bill as any).vendorId || ((bill as any).vendor as any)?.id || "",
        billDate: bill.billDate ? new Date(bill.billDate) : new Date(),
        dueDate: bill.dueDate ? new Date(bill.dueDate) : new Date(),
        poNumber: bill.poNumber || "",
        paymentTerms: bill.paymentTerms || "Net 30",
        lineItems:
          mappedItems.length > 0
            ? mappedItems
            : [{ name: "", quantity: 1, rate: 0, expenseAccountId: "" }],
        discount: Number(bill.discount) || 0,
        tax: Number(bill.tax) || 0,
        accountsPayableId: (bill as any)?.accountsPayableId || "",
        subject: bill?.subject || "",
        notes: bill.notes || "",
        projectId: (bill as any)?.projectId || "",
        milestoneId: (bill as any)?.milestoneId || "",
      });
    }
  }, [bill, form]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const handleRemove = (index: number) => {
    remove(index);
  };

  const subtotal = form
    .watch("lineItems")
    .reduce(
      (sum, item) =>
        sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
      0,
    );
  const discount = Number(form.watch("discount")) || 0;
  const taxPercent = Number(form.watch("tax")) || 0;
  const taxAmount = ((subtotal - discount) * taxPercent) / 100;
  const total = subtotal - discount + taxAmount;

  const onSubmit = async (
    values: BillFormType,
    status?: "draft" | "unpaid",
  ) => {
    try {
      setIsSubmitting(true);
      const billStatus = status || "draft";

      const itemsPayload = values.lineItems.map((li: any) => ({
        name: li.name,
        rate: Number(li.rate) || 0,
        quantity: Number(li.quantity) || 0,
        ...(li.expenseAccountId && { expenseAccountId: li.expenseAccountId }),
      }));

      if (isEditMode && bill?.id) {
        await updateBill.mutateAsync({
          id: bill.id,
          data: {
            billDate:
              values.billDate instanceof Date
                ? values.billDate.toISOString()
                : String(values.billDate),
            vendorId: values.vendorId,
            dueDate:
              values.dueDate instanceof Date
                ? values.dueDate.toISOString()
                : String(values.dueDate),
            tax: Number(values.tax) || 0,
            discount: Number(values.discount) || 0,
            ...(values.accountsPayableId && {
              accountsPayableId: values.accountsPayableId,
            }),
            ...(values.subject && { subject: values.subject }),
            ...(values.projectId && {
              projectId:
                values.projectId === "no-project" ? "" : values.projectId,
            }),
            ...(values.milestoneId && { milestoneId: values.milestoneId }),
            items: itemsPayload,
          },
        });
      } else {
        const formData = new FormData();
        formData.append(
          "billDate",
          values.billDate instanceof Date
            ? values.billDate.toISOString()
            : String(values.billDate),
        );
        formData.append("vendorId", values.vendorId);
        formData.append(
          "dueDate",
          values.dueDate instanceof Date
            ? values.dueDate.toISOString()
            : String(values.dueDate),
        );
        if (values.poNumber) formData.append("poNumber", values.poNumber);
        formData.append("paymentTerms", values.paymentTerms);
        if (values.accountsPayableId)
          formData.append("accountsPayableId", values.accountsPayableId);
        if (values.subject) formData.append("subject", values.subject);
        if (values.notes) formData.append("notes", values.notes);
        if (values.tax) formData.append("tax", String(Number(values.tax)));
        if (values.discount)
          formData.append("discount", String(Number(values.discount)));
        if (values.projectId)
          formData.append(
            "projectId",
            values.projectId === "no-project" ? "" : values.projectId,
          );
        if (values.milestoneId)
          formData.append("milestoneId", values.milestoneId);
        formData.append("items", JSON.stringify(itemsPayload));
        formData.append("status", billStatus);

        if (values.attachments && values.attachments[0]) {
          formData.append("attachment", values.attachments[0]);
        }

        await createBill.mutateAsync(formData);
      }

      form.reset();
      setIsSubmitting(false);
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} bill:`,
        error,
      );
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          className="max-w-lg mx-auto space-y-6"
          onSubmit={form.handleSubmit((v) => onSubmit(v))}
        >
          {/* Bill Information */}
          <div className="rounded-2xl border bg-linear-to-br from-pink-50 to-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="text-pink-500 w-5 h-5" />
              <span className="font-semibold text-base">Bill Information</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Vendor *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={vendorsLoading}
                      >
                        <SelectTrigger className="w-full bg-white">
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
                name="billDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value instanceof Date
                            ? format(field.value, "yyyy-MM-dd")
                            : ""
                        }
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          field.onChange(newDate);
                          const terms = form.getValues("paymentTerms");
                          if (terms) {
                            form.setValue(
                              "dueDate",
                              calcDueDate(newDate, terms),
                              { shouldValidate: true },
                            );
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date *</FormLabel>
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
                name="accountsPayableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accounts Payable</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={payableAccountsLoading}
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue
                            placeholder={
                              payableAccountsLoading
                                ? "Loading..."
                                : "Select payable account"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(payableAccounts) &&
                          payableAccounts.length > 0 ? (
                            payableAccounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} - {account.code}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-payable" disabled>
                              No payable accounts
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
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Bill subject" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="poNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Purchase order number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          const billDate = form.getValues("billDate");
                          form.setValue("dueDate", calcDueDate(billDate, val), {
                            shouldValidate: true,
                          });
                        }}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Select terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="Due on Receipt">
                            Due on Receipt
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

          {/* Line Items - unchanged */}
          <div className="rounded-2xl border bg-linear-to-br from-purple-50 to-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-base text-purple-600">
                Line Items
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() =>
                  append({
                    name: "",
                    quantity: 1,
                    rate: 0,
                    expenseAccountId: "",
                  })
                }
              >
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1.5fr] gap-2 w-full px-2 py-2 text-sm font-semibold text-gray-700 border-b">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-center">Rate</span>
                <span className="text-center">Account</span>
              </div>
              {fields.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 bg-white rounded-xl p-2 shadow-sm"
                >
                  <div className="flex justify-between w-full items-center">
                    <p>Item {idx + 1}</p>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(idx)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1.5fr] gap-2 w-full items-center">
                    <Controller
                      control={form.control}
                      name={`lineItems.${idx}.name`}
                      render={({ field }) => (
                        <Input placeholder="Item name" {...field} />
                      )}
                    />
                    <Controller
                      control={form.control}
                      name={`lineItems.${idx}.quantity`}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      )}
                    />
                    <Controller
                      control={form.control}
                      name={`lineItems.${idx}.rate`}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      )}
                    />
                    <Controller
                      control={form.control}
                      name={`lineItems.${idx}.expenseAccountId`}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                          disabled={accountsLoading}
                        >
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue
                              placeholder={
                                accountsLoading
                                  ? "Loading..."
                                  : "Select account"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(expenseAccounts) &&
                            expenseAccounts.length > 0 ? (
                              expenseAccounts.map((account: any) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name} - {account.code}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-accounts" disabled>
                                No accounts available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1 text-sm bg-white w-2/3 flex flex-col ml-auto p-3 border rounded-xl">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  {currencySymbol}
                  {subtotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-20"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  )}
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Tax</span>
                <div className="flex items-center gap-1">
                  <FormField
                    control={form.control}
                    name="tax"
                    render={({ field }) => (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-14"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                  <span className="text-xs">%</span>
                  <span className="ml-2">
                    {currencySymbol}
                    {taxAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
              <div className="flex justify-between font-bold text-base mt-2">
                <span>Total</span>
                <span className="text-blue-700 text-xl">
                  {currencySymbol}
                  {total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Details - unchanged */}
          <div className="rounded-2xl border bg-linear-to-br from-green-50 to-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="text-green-400 w-5 h-5" />
              <span className="font-semibold text-base">
                Additional Details
              </span>
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add internal notes about this bill..."
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
                        Attach vendor invoice (PDF, JPG, PNG up to 10MB)
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

          {/* Actions - unchanged */}
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
                className="bg-pink-600 text-white"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault();
                  form.handleSubmit((v) => onSubmit(v, "unpaid"))();
                }}
              >
                {isSubmitting
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                    ? "Update Bill"
                    : "Create Bill"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
