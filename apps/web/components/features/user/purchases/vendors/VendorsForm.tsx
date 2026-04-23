import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Building2,
  User2,
  CreditCard,
  Globe,
  Hash,
  Mail,
  Phone,
  MapPin,
  User,
  Landmark,
} from "lucide-react";
import { useCreateVendor, useUpdateVendor } from "@/lib/api/hooks/usePurchases";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import { toast } from "sonner";
// --- Zod Schemas ---
const basicInfoSchema = z.object({
  vendorType: z.string().min(1, "Vendor type is required"),
  vendorName: z.string().min(1, "Vendor name is required"),
  displayName: z.string().optional(),
  taxId: z.string().optional(),
  website: z.string().optional(),
});

const contactDetailsSchema = z.object({
  contactName: z.string().min(1, "Contact name is required"),
  title: z.string().optional(),
  email: z.string().email("Invalid email").min(1, "Email is required"),
  phone: z.string().min(1, "Phone is required"),
  mobile: z.string().optional(),
  fax: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

const financialInfoSchema = z.object({
  paymentTerms: z.string().optional(),
  currency: z.string().optional(),
  accountNumber: z.string().optional(),
  creditLimit: z.string().optional(),
  // defaultExpenseAccount: z.string().optional(),
  bankName: z.string().optional(),
  routingNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  internalNotes: z.string().optional(),
});

const vendorSchema = z.object({
  basicInfo: basicInfoSchema,
  contactDetails: contactDetailsSchema,
  financialInfo: financialInfoSchema,
});

type VendorFormType = z.infer<typeof vendorSchema>;

const LOCAL_STORAGE_KEY = "vendor-form-data";

const defaultValues: VendorFormType = {
  basicInfo: {
    vendorType: "",
    vendorName: "",
    displayName: "",
    taxId: "",
    website: "",
  },
  contactDetails: {
    contactName: "",
    title: "",
    email: "",
    phone: "",
    mobile: "",
    fax: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  },
  financialInfo: {
    paymentTerms: "",
    currency: "USD ($)",
    accountNumber: "",
    creditLimit: "0.00",
    // defaultExpenseAccount: "",
    bankName: "",
    routingNumber: "",
    bankAccountNumber: "",
    internalNotes: "",
  },
};

export default function VendorsForm({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  // const { data: accountsData, isLoading: accountsLoading } = useAccounts({
  //   subCategory: "Prepaid Expenses",
  // });
  // const expenseAccounts = accountsData?.data || [];
  const form = useForm<VendorFormType>({
    resolver: zodResolver(vendorSchema),
    defaultValues,
    mode: "onChange",
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        form.reset(JSON.parse(saved));
      } catch {}
    }
    // eslint-disable-next-line
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    const sub = form.watch((data) => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    });
    return () => sub.unsubscribe();
  }, [form]);

  // Step validation
  const validateStep = async () => {
    if (step === 0) {
      return await basicInfoSchema.safeParseAsync(form.getValues().basicInfo);
    }
    if (step === 1) {
      return await contactDetailsSchema.safeParseAsync(
        form.getValues().contactDetails
      );
    }
    if (step === 2) {
      return await financialInfoSchema.safeParseAsync(
        form.getValues().financialInfo
      );
    }
    return { success: true };
  };

  const handleNext = async () => {
    const valid = await validateStep();
    if (valid.success) setStep((s) => s + 1);
    else {
      // trigger validation errors
      if (step === 0) form.trigger("basicInfo");
      if (step === 1) form.trigger("contactDetails");
      if (step === 2) form.trigger("financialInfo");
    }
  };
  const handlePrev = () => setStep((s) => s - 1);

  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();

  const onSubmit = async (data: VendorFormType) => {
    try {
      setLoading(true);
      // Transform form data to API schema
      const payload = {
        name: data.basicInfo.vendorName,
        type: data.basicInfo.vendorType,
        displayName: data.basicInfo.displayName || data.basicInfo.vendorName,
        taxId: data.basicInfo.taxId || "",
        website: data.basicInfo.website || "",
        companyName: data.contactDetails.contactName,
        jobTitle: data.contactDetails.title || "",
        email: data.contactDetails.email,
        phone: data.contactDetails.phone,
        city: data.contactDetails.city || "",
        province: data.contactDetails.state || "",
        postalCode: data.contactDetails.zip || "",
        country: data.contactDetails.country || "",
        paymentTerms: data.financialInfo.paymentTerms || "",
        currency: data.financialInfo.currency || "USD",
        accountNumber: data.financialInfo.accountNumber || "",
        creditLimit: data.financialInfo.creditLimit || "",
        // expenseAccount: data.financialInfo.defaultExpenseAccount || "",
        bankName: data.financialInfo.bankName || "",
        accountName: data.contactDetails.contactName,
        routingNumber: data.financialInfo.routingNumber || "",
        internalNote: data.financialInfo.internalNotes || "",
      };

      await createVendor.mutateAsync(payload);
      // toast.success("Vendor created successfully");
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setLoading(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating vendor:", error);
      setLoading(false);
    }
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-w-xl mx-auto"
        >
          <Tabs value={String(step)} className="mb-4">
            <TabsList className="w-full flex bg-yellow-50 rounded-t-xl">
              <TabsTrigger
                value="0"
                className={
                  step === 0
                    ? "text-orange-600 font-bold border-b-2 border-orange-400"
                    : ""
                }
              >
                Basic Info
              </TabsTrigger>
              <TabsTrigger
                value="1"
                className={
                  step === 1
                    ? "text-yellow-600 font-bold border-b-2 border-yellow-400"
                    : ""
                }
              >
                Contact Details
              </TabsTrigger>
              <TabsTrigger
                value="2"
                className={
                  step === 2
                    ? "text-amber-600 font-bold border-b-2 border-amber-400"
                    : ""
                }
              >
                Financial Info
              </TabsTrigger>
            </TabsList>
            <TabsContent value="0">
              <div className="rounded-2xl bg-linear-to-br from-orange-50 to-yellow-50 p-6 mt-2 mb-4 border">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="text-orange-500" />
                  <span className="font-semibold text-lg">
                    Company Information
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="basicInfo.vendorType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Type *</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="supplier">Supplier</SelectItem>
                              <SelectItem value="contractor">
                                Contractor
                              </SelectItem>
                              <SelectItem value="consultant">
                                Consultant
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
                    name="basicInfo.vendorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="basicInfo.displayName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Name to display on transactions"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="basicInfo.taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID / EIN</FormLabel>
                        <FormControl>
                          <Input placeholder="XX-XXXXXXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="basicInfo.website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="1">
              <div className="rounded-2xl bg-linear-to-br from-blue-50 to-cyan-50 p-6 mt-2 mb-4 border">
                <div className="flex items-center gap-2 mb-4">
                  <User2 className="text-blue-500" />
                  <span className="font-semibold text-lg">Primary Contact</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactDetails.contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactDetails.title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Job title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactDetails.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactDetails.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactDetails.mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactDetails.fax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fax</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-6 flex items-center gap-2 mb-2">
                  <MapPin className="text-green-500" />
                  <span className="font-semibold text-base">
                    Billing Address
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactDetails.street"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactDetails.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactDetails.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactDetails.zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP/Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="ZIP code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactDetails.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USA">USA</SelectItem>
                              <SelectItem value="UK">UK</SelectItem>
                              <SelectItem value="Nigeria">Nigeria</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="2">
              <div className="rounded-2xl bg-linear-to-br from-purple-50 to-violet-50 p-6 mt-2 mb-4 border">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="text-purple-500" />
                  <span className="font-semibold text-lg">
                    Payment Information
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="financialInfo.paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
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
                    name="financialInfo.currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD ($)">USD ($)</SelectItem>
                              <SelectItem value="NGN (₦)">NGN (₦)</SelectItem>
                              <SelectItem value="GBP (£)">GBP (£)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="financialInfo.accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Vendor account number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="financialInfo.creditLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Limit</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* <FormField
                    control={form.control}
                    name="financialInfo.defaultExpenseAccount"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Default Expense Account</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="w-full bg-white" disabled={accountsLoading}>
                              <SelectValue placeholder="Select expense account" />
                            </SelectTrigger>
                            <SelectContent>
                              {expenseAccounts.length > 0 ? (
                                expenseAccounts.map((account) => (
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
                  /> */}
                </div>
                <div className="mt-6 flex items-center gap-2 mb-2">
                  <Landmark className="text-violet-500" />
                  <span className="font-semibold text-base">
                    Banking Details (Optional)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="financialInfo.bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Bank name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="financialInfo.routingNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Routing Number</FormLabel>
                        <FormControl>
                          <Input placeholder="9 digits" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="financialInfo.bankAccountNumber"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Bank Account Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Account number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="financialInfo.internalNotes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any internal notes about this vendor..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex justify-between mt-4">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={handlePrev}>
                Previous
              </Button>
            )}
            {step < 2 && (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            )}
            {step === 2 && (
              <Button
                type="submit"
                className="bg-orange-500 text-white"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Vendor"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
