// "use client";

// import React, { useEffect, useState } from "react";
// import { useForm, useFieldArray, Controller } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Button } from "@/components/ui/button";
// import { useCreateInvoice, useUpdateInvoice } from "@/lib/api/hooks/useSales";
// import { toast } from "sonner";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Calendar, Plus, Trash2 } from "lucide-react";
// import { format } from "date-fns";
// import { paymentTermsOptions } from "../customers/utils/data";
// import { useCustomers, useItems } from "@/lib/api/hooks/useSales";
// import { invoiceSchema } from "./utils/schema";
// import { ItemSelector } from "./ItemSelector";
// import type { StoreItemsResponse } from "@/lib/api/hooks/types/productsTypes";
// import { useProjects } from "@/lib/api/hooks/useProjects";

// type InvoiceFormData = z.infer<typeof invoiceSchema>;

// interface InvoiceFormProps {
//   invoice?: Partial<InvoiceFormData> & { id?: string };
//   isEditMode?: boolean;
//   defaultCustomerId?: string;
//   disabledCustomerSelect?: boolean;
// }

// export default function InvoiceForm({
//   invoice,
//   isEditMode = false,
//   defaultCustomerId,
//   disabledCustomerSelect,
// }: InvoiceFormProps) {
//   // Lock editing if invoice status is not Draft
//   const isLockedForEditing = isEditMode && (invoice as any)?.status !== "Draft";
//   const [invoiceStatus, setInvoiceStatus] = useState<"Draft" | "Sent">(
//     (invoice as any)?.status || "Draft",
//   );
//   const { data, isLoading: customersLoading } = useCustomers();
//   const itemsQuery = useItems() as {
//     data?: StoreItemsResponse;
//     isLoading: boolean;
//   };

//   const { data: projectsData, isLoading: projectsLoading } = useProjects({
//     limit: 1000,
//   });
//   const projects = (projectsData as any)?.data || [];

//   console.log(projects, "Fff")

//   const createInvoice = useCreateInvoice();
//   const updateInvoice = useUpdateInvoice();

//   const customers = data?.customers || [];
//   const items = itemsQuery.data?.items || [];
//   const itemsLoading = itemsQuery.isLoading;

//   console.log("Fetched customers for invoice form:", invoice, items); // Debug log to check fetched customers

//   const form = useForm<InvoiceFormData>({
//     resolver: zodResolver(invoiceSchema),
//     defaultValues: {
//       customerId: invoice?.customerId || defaultCustomerId || "",
//       invoiceDate: invoice?.invoiceDate
//         ? new Date(invoice.invoiceDate)
//         : new Date(),
//       dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : new Date(),
//       paymentTerms: invoice?.paymentTerms || "",
//       currency: invoice?.currency || "USD",
//       // initialize empty; we'll replace with server items on mount to avoid duplicates
//       lineItems: invoice?.lineItems || [],
//       notes: invoice?.notes || "",
//     },
//   });

//   const { fields, append, remove, replace } = useFieldArray({
//     control: form.control,
//     name: "lineItems",
//   });

//   // Calculate subtotal, tax, total
//   const subtotal = form
//     .watch("lineItems")
//     .reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0);
//   const tax = subtotal * 0.1;
//   const total = subtotal + tax;

//   // Calculate if all items are selected
//   const maxItemsSelected = form.watch("lineItems").length >= items.length;

//   useEffect(() => {
//     if (invoice) {
//       // Reset non-array fields
//       form.reset({
//         customerId: invoice?.customerId || "",
//         invoiceDate: invoice?.invoiceDate
//           ? new Date(invoice.invoiceDate)
//           : new Date(),
//         dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : new Date(),
//         paymentTerms: invoice?.paymentTerms || "",
//         currency: invoice?.currency || "USD",
//         lineItems: [],
//         notes: invoice?.notes || "",
//       });

//       // Replace field array with server items to avoid double entries
//       const mapped = (invoice as any)?.invoiceItem
//         ? (invoice as any).invoiceItem.map((ii: any) => ({
//             itemId: ii.itemId,
//             rate: ii.unitPrice,
//             quantity: ii.quantity,
//           }))
//         : invoice?.lineItems || [{ itemId: "", quantity: 1, rate: 0 }];
//       replace(mapped as any[]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [invoice]);

//   const onSubmit = async (
//     values: InvoiceFormData,
//     statusOverride?: "Draft" | "Sent",
//   ) => {
//     try {
//       // Determine status (prefer explicit override to avoid setState race)
//       const status = statusOverride ?? invoiceStatus;

//       // Prevent submitting invoice with no items
//       const itemsCount = Array.isArray(values.lineItems)
//         ? values.lineItems.length
//         : 0;
//       if (itemsCount === 0) {
//         toast.error("Invoice must have at least one line item");
//         return;
//       }

//       // Build same payload for both create and edit
//       const items = values.lineItems.map((li) => ({
//         itemId: li.itemId,
//         rate: Number(li.rate) || 0,
//         quantity: Number(li.quantity) || 0,
//       }));
//       const payload: any = {
//         customerId: values.customerId,
//         invoiceDate:
//           values.invoiceDate instanceof Date
//             ? values.invoiceDate.toISOString()
//             : String(values.invoiceDate),
//         dueDate:
//           values.dueDate instanceof Date
//             ? values.dueDate.toISOString()
//             : String(values.dueDate),
//         paymentTerms: values.paymentTerms,
//         currency: values.currency,
//         items,
//         notes: values.notes,
//         status: status === "Draft" ? "Draft" : "Sent",
//       };

//       if (isEditMode && invoice?.id) {
//         // Edit mode: always send as Draft (only editing Draft invoices allowed)
//         payload.status = "Draft";
//         await updateInvoice.mutateAsync({ id: invoice.id, data: payload });
//       } else {
//         // Create mode
//         await createInvoice.mutateAsync(payload);
//       }
//     } catch (error) {
//       // error handled below
//     }
//   };

//   // useEffect(() => {
//   //   if (createInvoice.isSuccess || updateInvoice.isSuccess) {
//   //     toast.success("Invoice saved successfully");
//   //     if (onSuccess) onSuccess();
//   //   }
//   //   if (createInvoice.isError) {
//   //     toast.error(createInvoice.error?.message || "Failed to create invoice");
//   //   }
//   //   if (updateInvoice.isError) {
//   //     toast.error(updateInvoice.error?.message || "Failed to update invoice");
//   //   }
//   //   // eslint-disable-next-line react-hooks/exhaustive-deps
//   // }, [
//   //   createInvoice.isSuccess,
//   //   createInvoice.isError,
//   //   updateInvoice.isSuccess,
//   //   updateInvoice.isError,
//   // ]);

//   return (
//     <div className="w-full max-w-lg mx-auto">
//       <Form {...form}>
//         <form
//           onSubmit={form.handleSubmit((v) => onSubmit(v))}
//           className="space-y-4"
//         >
//           {/* --- Invoice Details --- */}
//           <div className="p-4 bg-blue-50 rounded-xl">
//             <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
//               <Calendar className="w-4 h-4" /> Invoice Details
//             </h4>
//             <div className="mb-4">
//               <FormField
//                 control={form.control}
//                 name="customerId"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Customer *</FormLabel>
//                     <FormControl>
//                       <Select
//                         onValueChange={field.onChange}
//                         value={field.value}
//                         disabled={
//                           customersLoading ||
//                           disabledCustomerSelect ||
//                           isLockedForEditing
//                         }
//                       >
//                         <SelectTrigger className="w-full">
//                           <SelectValue
//                             placeholder={
//                               customersLoading
//                                 ? "Loading customers..."
//                                 : "Select customer"
//                             }
//                           />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {Array.isArray(customers) && customers.length > 0 ? (
//                             customers.map((c: any) => (
//                               <SelectItem
//                                 key={c.id}
//                                 value={c.id}
//                                 disabled={!!isEditMode}
//                               >
//                                 {c.name}
//                               </SelectItem>
//                             ))
//                           ) : (
//                             <SelectItem value="no-customers" disabled>
//                               No customers found
//                             </SelectItem>
//                           )}
//                         </SelectContent>
//                       </Select>
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {/* <FormField
//                 control={form.control}
//                 name="invoiceNumber"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Invoice Number *</FormLabel>
//                     <FormControl>
//                       <Input {...field} placeholder="" />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               /> */}
//               <FormField
//                 control={form.control}
//                 name="invoiceDate"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Invoice Date *</FormLabel>
//                     <FormControl>
//                       <Input
//                         type="date"
//                         value={format(field.value, "yyyy-MM-dd")}
//                         onChange={(e) =>
//                           field.onChange(new Date(e.target.value))
//                         }
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <FormField
//                 control={form.control}
//                 name="dueDate"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Due Date *</FormLabel>
//                     <FormControl>
//                       <Input
//                         type="date"
//                         value={format(field.value, "yyyy-MM-dd")}
//                         onChange={(e) =>
//                           field.onChange(new Date(e.target.value))
//                         }
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <FormField
//                 control={form.control}
//                 name="paymentTerms"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Payment Terms</FormLabel>
//                     <FormControl>
//                       <Select
//                         onValueChange={field.onChange}
//                         value={field.value}
//                       >
//                         <SelectTrigger className="w-full">
//                           <SelectValue placeholder="Select terms" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {paymentTermsOptions.map((pt) => (
//                             <SelectItem key={pt} value={pt}>
//                               {pt}
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <FormField
//                 control={form.control}
//                 name="currency"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Currency</FormLabel>
//                     <FormControl>
//                       <Select
//                         onValueChange={field.onChange}
//                         value={field.value}
//                       >
//                         <SelectTrigger className="w-full">
//                           <SelectValue placeholder="Select currency" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="USD">USD ($)</SelectItem>
//                           <SelectItem value="NGN">NGN (₦)</SelectItem>
//                           <SelectItem value="GBP">GBP (£)</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               <FormField
//                 control={form.control}
//                 name="projectId"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel className="font-semibold">Project</FormLabel>
//                     <FormControl>
//                       <Select
//                         onValueChange={field.onChange}
//                         defaultValue={field.value}
//                       >
//                         <SelectTrigger className="w-full rounded-2xl">
//                           <SelectValue
//                             placeholder={
//                               projectsLoading ? "Loading..." : "Select Project"
//                             }
//                           />{" "}
//                         </SelectTrigger>
//                         <SelectContent>
//                           {projects.map((pro: any) => (
//                             <SelectItem key={pro.id} value={pro.id}>
//                               {pro.name}
//                             </SelectItem>
//                           ))}{" "}
//                         </SelectContent>
//                       </Select>
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               <FormField
//                 control={form.control}
//                 name="milestoneId"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel className="font-semibold">Milestone</FormLabel>
//                     <FormControl>
//                       <Select
//                         onValueChange={field.onChange}
//                         defaultValue={field.value}
//                       >
//                         <SelectTrigger className="w-full rounded-2xl">
//                           <SelectValue
//                             placeholder={
//                               projectsLoading ? "Loading..." : "Select Project"
//                             }
//                           />{" "}
//                         </SelectTrigger>
//                         <SelectContent>
//                           {projects.map((pro: any) => (
//                             <SelectItem key={pro.id} value={pro.id}>
//                               {pro.name}
//                             </SelectItem>
//                           ))}{" "}
//                         </SelectContent>
//                       </Select>
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//             </div>
//           </div>
//           {/* --- Line Items --- */}
//           <div className="rounded-lg border p-4 bg-green-50">
//             <div className="flex items-center justify-between mb-2">
//               <h4 className="font-semibold text-green-900 flex items-center gap-2">
//                 <Plus className="w-4 h-4" /> Line Items *
//               </h4>
//               {!maxItemsSelected && (
//                 <Button
//                   type="button"
//                   variant="outline"
//                   size="sm"
//                   onClick={() => append({ itemId: "", quantity: 1, rate: 0 })}
//                 >
//                   <Plus className="w-4 h-4" /> Add Item
//                 </Button>
//               )}
//             </div>
//             <div className="space-y-3">
//               {/* Header Row */}
//               <div className="grid grid-cols-[4fr_1fr_1fr_2fr] gap-2 w-full px-2 py-2 text-sm font-semibold text-gray-700 border-b">
//                 <span>Item</span>
//                 <span className="text-center">Qty</span>
//                 <span className="text-center">Rate</span>
//                 {/* <span className="text-right">Total</span> */}
//               </div>
//               {fields.map((item, idx) => {
//                 // All selected except the current one
//                 const selectedIds = form
//                   .watch("lineItems")
//                   .map((li: any) => li.itemId)
//                   .filter((id: string, i: number) => i !== idx);
//                 return (
//                   <div
//                     key={item.id}
//                     className="flex flex-col gap-2 bg-white rounded-xl p-2 shadow-sm"
//                   >
//                     <div className="flex justify-between w-full items-center">
//                       <p className="">Item {idx + 1}</p>
//                       {fields.length > 1 && (
//                         <Button
//                           type="button"
//                           variant="ghost"
//                           size="icon"
//                           onClick={() => remove(idx)}
//                         >
//                           <Trash2 className="w-4 h-4 text-red-400" />
//                         </Button>
//                       )}
//                     </div>
//                     <div className="grid grid-cols-[3fr_1.5fr_1.5fr] gap-2 w-full items-center">
//                       <Controller
//                         control={form.control}
//                         name={`lineItems.${idx}.itemId`}
//                         render={({ field }) => (
//                           <ItemSelector
//                             items={items}
//                             isLoading={itemsLoading}
//                             value={field.value}
//                             onChange={(val) => {
//                               field.onChange(val);
//                               const selectedItem = items.find(
//                                 (i: any) => i.id === val,
//                               );
//                               if (selectedItem) {
//                                 form.setValue(
//                                   `lineItems.${idx}.rate`,
//                                   Number(selectedItem.unitPrice) || 0,
//                                 );
//                                 // Optional: if you had a description field
//                                 // form.setValue(`lineItems.${idx}.description`, selectedItem.description || "");
//                               }
//                             }}
//                             placeholder="Select item..."
//                             disabledIds={selectedIds}
//                           />
//                         )}
//                       />
//                       <Controller
//                         control={form.control}
//                         name={`lineItems.${idx}.quantity`}
//                         render={({ field }) => (
//                           <Input
//                             type="number"
//                             min={1}
//                             {...field}
//                             onChange={(e) =>
//                               field.onChange(Number(e.target.value))
//                             }
//                           />
//                         )}
//                       />
//                       <Controller
//                         control={form.control}
//                         name={`lineItems.${idx}.rate`}
//                         render={({ field }) => (
//                           <Input
//                             type="number"
//                             min={0}
//                             {...field}
//                             onChange={(e) =>
//                               field.onChange(Number(e.target.value))
//                             }
//                             prefix="₦"
//                             disabled={true}
//                           />
//                         )}
//                       />
//                       {/* <span className=" text-right font-semibold rounded-xl bg-gray-200 h-9 flex items-center justify-center">
//                         {form.watch(`currency`) === "NGN"
//                           ? "₦"
//                           : form.watch(`currency`) === "GBP"
//                             ? "£"
//                             : "$"}
//                         {(
//                           (form.watch(`lineItems.${idx}.quantity`) || 0) *
//                           (form.watch(`lineItems.${idx}.rate`) || 0)
//                         ).toLocaleString()}
//                       </span> */}
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//             {/* Subtotal, Tax, Total */}
//             <div className="mt-2 flex flex-col gap-1 text-sm bg-white rounded-xl p-3">
//               <div className="flex justify-between items-center">
//                 <p className="text-base font-normal">Subtotal:</p>
//                 <span className="font-semibold">
//                   {form.watch("currency") === "NGN"
//                     ? "₦"
//                     : form.watch("currency") === "GBP"
//                       ? "£"
//                       : "₦"}
//                   {subtotal.toLocaleString()}
//                 </span>
//               </div>
//               <div className="flex justify-between items-center">
//                 <p className="text-base font-normal">Tax (10%):</p>
//                 <span className="font-semibold">
//                   {form.watch("currency") === "NGN"
//                     ? "₦"
//                     : form.watch("currency") === "GBP"
//                       ? "£"
//                       : "₦"}
//                   {tax.toLocaleString()}
//                 </span>
//               </div>
//               <hr />
//               <div className="flex justify-between items-center">
//                 <p className="text-base font-normal">Total:</p>
//                 <span className="text-xl text-primary font-semibold">
//                   {form.watch("currency") === "NGN"
//                     ? "₦"
//                     : form.watch("currency") === "GBP"
//                       ? "£"
//                       : "₦"}
//                   {total.toLocaleString()}
//                 </span>
//               </div>
//             </div>
//           </div>
//           {/* --- Additional Information --- */}
//           <div className="rounded-lg border p-4 bg-purple-50">
//             <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
//               <Calendar className="w-4 h-4" /> Additional Information
//             </h4>
//             <FormField
//               control={form.control}
//               name="notes"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Notes</FormLabel>
//                   <FormControl>
//                     <Textarea
//                       placeholder="Additional notes or payment instructions..."
//                       {...field}
//                     />
//                   </FormControl>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />
//           </div>
//           {/* --- Actions --- */}
//           <div className="flex justify-end gap-2 border-t pt-1 pb-3">
//             <Button variant="outline" type="button">
//               Cancel{" "}
//             </Button>{" "}
//             {isLockedForEditing ? (
//               <div className="text-sm text-gray-500">
//                 This invoice cannot be edited because it is not in Draft status.
//               </div>
//             ) : (
//               (isEditMode && (invoice as any).status === "Draft") ||
//               (!isEditMode && (
//                 <Button
//                   type="submit"
//                   variant="outline"
//                   disabled={createInvoice.isPending || updateInvoice.isPending}
//                   onClick={(e) => {
//                     e.preventDefault();
//                     setInvoiceStatus("Draft");
//                     form.handleSubmit((v) => onSubmit(v, "Draft"))();
//                   }}
//                 >
//                   {createInvoice.isPending || updateInvoice.isPending
//                     ? "Please wait..."
//                     : isEditMode
//                       ? "Update as Draft"
//                       : "Save as Draft"}
//                 </Button>
//               ))
//             )}
//             {!isEditMode && (
//               <Button
//                 type="submit"
//                 disabled={createInvoice.isPending || updateInvoice.isPending}
//                 onClick={(e) => {
//                   e.preventDefault();
//                   setInvoiceStatus("Sent");
//                   form.handleSubmit((v) => onSubmit(v, "Sent"))();
//                 }}
//               >
//                 {" "}
//                 {createInvoice.isPending || updateInvoice.isPending
//                   ? "Please wait..."
//                   : "Create & Send Invoice"}{" "}
//               </Button>
//             )}
//             {isEditMode && (invoice as any).status === "Draft" && (
//               <Button
//                 type="submit"
//                 disabled={createInvoice.isPending || updateInvoice.isPending}
//                 onClick={(e) => {
//                   e.preventDefault();
//                   form.handleSubmit((v) => onSubmit(v))();
//                 }}
//               >
//                 {createInvoice.isPending || updateInvoice.isPending
//                   ? "Please wait..."
//                   : "Update Invoice"}{" "}
//               </Button>
//             )}{" "}
//           </div>{" "}
//         </form>{" "}
//       </Form>{" "}
//     </div>
//   );
// }

"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useCreateInvoice, useUpdateInvoice } from "@/lib/api/hooks/useSales";
import { toast } from "sonner";
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
import { Calendar, Plus, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { paymentTermsOptions } from "../customers/utils/data";
import { useCustomers, useItems } from "@/lib/api/hooks/useSales";
import { invoiceSchema } from "./utils/schema";
import { ItemSelector } from "./ItemSelector";
import type { StoreItemsResponse } from "@/lib/api/hooks/types/productsTypes";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useCurrencies, useEntityConfig } from "@/lib/api/hooks/useSettings";
import { getCurrencyByCode } from "@/lib/utils/currencies";

type InvoiceFormData = z.infer<typeof invoiceSchema>;

function calcDueDate(invoiceDate: Date, terms: string): Date {
  if (!terms || terms === "Due on Receipt") return new Date(invoiceDate);
  const match = terms.match(/Net (\d+)/i);
  if (match) return addDays(new Date(invoiceDate), parseInt(match[1], 10));
  return new Date(invoiceDate);
}

interface InvoiceFormProps {
  invoice?: Partial<InvoiceFormData> & { id?: string };
  isEditMode?: boolean;
  defaultCustomerId?: string;
  disabledCustomerSelect?: boolean;
}

export default function InvoiceForm({
  invoice,
  isEditMode = false,
  defaultCustomerId,
  disabledCustomerSelect,
}: InvoiceFormProps) {
  const isLockedForEditing = isEditMode && (invoice as any)?.status !== "Draft";
  const [invoiceStatus, setInvoiceStatus] = useState<"Draft" | "Sent">(
    (invoice as any)?.status || "Draft",
  );

  const { data, isLoading: customersLoading } = useCustomers();
  const itemsQuery = useItems() as {
    data?: StoreItemsResponse;
    isLoading: boolean;
  };

  const { data: projectsData, isLoading: projectsLoading } = useProjects({
    limit: 1000,
  });
  const projects = (projectsData as any)?.data || [];

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const { data: configRes } = useEntityConfig();
  const entityBaseCurrency: string = (configRes as any)?.data?.baseCurrency ?? "";
  const multiCurrency: boolean = (configRes as any)?.data?.multiCurrency ?? false;

  const { data: currencyRes } = useCurrencies(true);
  const activeCurrencies: any[] = (currencyRes as any)?.data ?? [];

  const customers = data?.customers || [];
  const items = itemsQuery.data?.items || [];
  const itemsLoading = itemsQuery.isLoading;

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: invoice?.customerId || defaultCustomerId || "",
      invoiceDate: invoice?.invoiceDate
        ? new Date(invoice.invoiceDate)
        : new Date(),
      dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : new Date(),
      paymentTerms: invoice?.paymentTerms || "",
      currency: invoice?.currency || entityBaseCurrency || "",
      lineItems: invoice?.lineItems || [],
      notes: invoice?.notes || "",
      projectId: invoice?.projectId || "",
      milestoneId: invoice?.milestoneId || "",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const selectedProjectId = form.watch("projectId");
  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);
  const milestones = selectedProject?.milestones || [];

  const subtotal = form
    .watch("lineItems")
    .reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const maxItemsSelected = form.watch("lineItems").length >= items.length;

  useEffect(() => {
    if (invoice) {
      form.reset({
        customerId: invoice?.customerId || "",
        invoiceDate: invoice?.invoiceDate
          ? new Date(invoice.invoiceDate)
          : new Date(),
        dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : new Date(),
        paymentTerms: invoice?.paymentTerms || "",
        currency: invoice?.currency || entityBaseCurrency || "",
        lineItems: [],
        notes: invoice?.notes || "",
        projectId: invoice?.projectId || "",
        milestoneId: invoice?.milestoneId || "",
      });

      const mapped = (invoice as any)?.invoiceItem
        ? (invoice as any).invoiceItem.map((ii: any) => ({
            itemId: ii.itemId,
            rate: ii.unitPrice,
            quantity: ii.quantity,
          }))
        : invoice?.lineItems || [{ itemId: "", quantity: 1, rate: 0 }];
      replace(mapped as any[]);
    }
  }, [invoice]);

  const onSubmit = async (
    values: InvoiceFormData,
    statusOverride?: "Draft" | "Sent",
  ) => {
    try {
      const status = statusOverride ?? invoiceStatus;
      const itemsCount = Array.isArray(values.lineItems)
        ? values.lineItems.length
        : 0;
      if (itemsCount === 0) {
        toast.error("Invoice must have at least one line item");
        return;
      }

      const items = values.lineItems.map((li) => ({
        itemId: li.itemId,
        rate: Number(li.rate) || 0,
        quantity: Number(li.quantity) || 0,
      }));

      const payload: any = {
        customerId: values.customerId,
        invoiceDate:
          values.invoiceDate instanceof Date
            ? values.invoiceDate.toISOString()
            : String(values.invoiceDate),
        dueDate:
          values.dueDate instanceof Date
            ? values.dueDate.toISOString()
            : String(values.dueDate),
        paymentTerms: values.paymentTerms,
        currency: values.currency,
        items,
        notes: values.notes,
        status: status === "Draft" ? "Draft" : "Sent",
        projectId: values.projectId || null,
        milestoneId: values.milestoneId || null,
      };

      if (isEditMode && invoice?.id) {
        payload.status = "Draft";
        await updateInvoice.mutateAsync({ id: invoice.id, data: payload });
      } else {
        await createInvoice.mutateAsync(payload);
      }
    } catch (error) {
      // error handled by hook
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => onSubmit(v))}
          className="space-y-4"
        >
          {/* --- Invoice Details --- */}
          <div className="p-4 bg-blue-50 rounded-xl">
            <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Invoice Details
            </h4>
            <div className="mb-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={
                          customersLoading ||
                          disabledCustomerSelect ||
                          isLockedForEditing
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              customersLoading
                                ? "Loading customers..."
                                : "Select customer"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(customers) && customers.length > 0 ? (
                            customers.map((c: any) => (
                              <SelectItem
                                key={c.id}
                                value={c.id}
                                disabled={!!isEditMode}
                              >
                                {c.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-customers" disabled>
                              No customers found
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={format(field.value, "yyyy-MM-dd")}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          field.onChange(newDate);
                          const terms = form.getValues("paymentTerms");
                          if (terms) {
                            form.setValue("dueDate", calcDueDate(newDate, terms), { shouldValidate: true });
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
                        value={format(field.value, "yyyy-MM-dd")}
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
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          const invoiceDate = form.getValues("invoiceDate");
                          form.setValue("dueDate", calcDueDate(invoiceDate, val), { shouldValidate: true });
                        }}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select terms" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTermsOptions.map((pt) => (
                            <SelectItem key={pt} value={pt}>
                              {pt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {multiCurrency && (
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeCurrencies.map((c: any) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.symbol} {c.code} — {c.name}
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

              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Project</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full rounded-2xl">
                          <SelectValue
                            placeholder={
                              projectsLoading ? "Loading..." : "Select Project"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
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

              {selectedProjectId && (
                <FormField
                  control={form.control}
                  name="milestoneId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Milestone</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full rounded-2xl">
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

          {/* --- Line Items --- */}
          <div className="rounded-lg border p-4 bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-green-900 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Line Items *
              </h4>
              {!maxItemsSelected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ itemId: "", quantity: 1, rate: 0 })}
                >
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
              )}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-[4fr_1fr_1fr_2fr] gap-2 w-full px-2 py-2 text-sm font-semibold text-gray-700 border-b">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-center">Rate</span>
              </div>
              {fields.map((item, idx) => {
                const selectedIds = form
                  .watch("lineItems")
                  .map((li: any) => li.itemId)
                  .filter((id: string, i: number) => i !== idx);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 bg-white rounded-xl p-2 shadow-sm"
                  >
                    <div className="flex justify-between w-full items-center">
                      <p className="">Item {idx + 1}</p>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(idx)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-[3fr_1.5fr_1.5fr] gap-2 w-full items-center">
                      <Controller
                        control={form.control}
                        name={`lineItems.${idx}.itemId`}
                        render={({ field }) => (
                          <ItemSelector
                            items={items}
                            isLoading={itemsLoading}
                            value={field.value}
                            onChange={(val) => {
                              field.onChange(val);
                              const selectedItem = items.find(
                                (i: any) => i.id === val,
                              );
                              if (selectedItem) {
                                form.setValue(
                                  `lineItems.${idx}.rate`,
                                  Number(selectedItem.unitPrice) || 0,
                                );
                              }
                            }}
                            placeholder="Select item..."
                            disabledIds={selectedIds}
                          />
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
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                            disabled={true}
                          />
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {(() => {
              const activeCurrency = form.watch("currency") || entityBaseCurrency;
              const sym = getCurrencyByCode(activeCurrency)?.symbol ?? activeCurrency ?? "";
              return (
                <div className="mt-2 flex flex-col gap-1 text-sm bg-white rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <p className="text-base font-normal">Subtotal:</p>
                    <span className="font-semibold">{sym}{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-base font-normal">Tax (10%):</p>
                    <span className="font-semibold">{sym}{tax.toLocaleString()}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between items-center">
                    <p className="text-base font-normal">Total:</p>
                    <span className="text-xl text-primary font-semibold">{sym}{total.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* --- Additional Information --- */}
          <div className="rounded-lg border p-4 bg-purple-50">
            <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Additional Information
            </h4>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes or payment instructions..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* --- Actions --- */}
          <div className="flex justify-end gap-2 border-t pt-1 pb-3">
            <Button variant="outline" type="button">
              Cancel
            </Button>
            {isLockedForEditing ? (
              <div className="text-sm text-gray-500">
                This invoice cannot be edited because it is not in Draft status.
              </div>
            ) : (
              <>
                {(isEditMode && (invoice as any).status === "Draft") ||
                  (!isEditMode && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={createInvoice.isPending || updateInvoice.isPending}
                      onClick={(e) => {
                        e.preventDefault();
                        setInvoiceStatus("Draft");
                        form.handleSubmit((v) => onSubmit(v, "Draft"))();
                      }}
                    >
                      {createInvoice.isPending || updateInvoice.isPending
                        ? "Please wait..."
                        : isEditMode
                          ? "Update as Draft"
                          : "Save as Draft"}
                    </Button>
                  ))}
                {!isEditMode && (
                  <Button
                    type="button"
                    disabled={createInvoice.isPending || updateInvoice.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      setInvoiceStatus("Sent");
                      form.handleSubmit((v) => onSubmit(v, "Sent"))();
                    }}
                  >
                    {createInvoice.isPending || updateInvoice.isPending
                      ? "Please wait..."
                      : "Create & Send Invoice"}
                  </Button>
                )}
                {isEditMode && (invoice as any).status === "Draft" && (
                  <Button
                    type="button"
                    disabled={createInvoice.isPending || updateInvoice.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      form.handleSubmit((v) => onSubmit(v))();
                    }}
                  >
                    {createInvoice.isPending || updateInvoice.isPending
                      ? "Please wait..."
                      : "Update Invoice"}
                  </Button>
                )}
              </>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}