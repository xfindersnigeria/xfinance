"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Upload, Check, Loader2 } from "lucide-react";
import { useEntity, useUpdateEntity } from "@/lib/api/hooks/useEntity";
import { useSessionStore } from "@/lib/store/session";
import { Skeleton } from "@/components/ui/skeleton";

const organizationFormSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  legalName: z.string().min(2, "Legal name is required"),
  taxId: z.string().optional(),
  yearEnd: z.string().min(1, "Fiscal year end is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email("Valid email is required"),
  website: z.string().optional(),
  logo: z.any().optional(),
});

type OrganizationFormData = z.infer<typeof organizationFormSchema>;

interface OrganizationFormProps {
  onSuccess?: () => void;
}

const fiscalYearEndOptions = [
  "January 31",  "February 28", "March 31",    "April 30",
  "May 31",      "June 30",     "July 31",      "August 31",
  "September 30","October 31",  "November 30",  "December 31",
];

export default function OrganizationForm({ onSuccess }: OrganizationFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentEntity = useSessionStore((s) => s.getCurrentEntity());
  const entityId = currentEntity?.id ?? "";

  const { data: entityRes, isLoading } = useEntity(entityId);
  const entity = (entityRes as any)?.data ?? (entityRes as any) ?? null;

  const updateEntity = useUpdateEntity();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      companyName: "",
      legalName: "",
      taxId: "",
      yearEnd: "December 31",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      phoneNumber: "",
      email: "",
      website: "",
    },
  });

  useEffect(() => {
    if (entity && !isLoading) {
      form.reset({
        companyName: entity.companyName ?? entity.name ?? "",
        legalName:   entity.legalName   ?? "",
        taxId:       entity.taxId       ?? "",
        yearEnd:     entity.yearEnd      ?? "December 31",
        address:     entity.address     ?? "",
        city:        entity.city        ?? "",
        state:       entity.state       ?? "",
        postalCode:  entity.postalCode  ?? "",
        country:     entity.country     ?? "",
        phoneNumber: entity.phoneNumber ?? "",
        email:       entity.email       ?? "",
        website:     entity.website     ?? "",
      });
      if (entity.logo?.secureUrl) {
        setLogoPreview(entity.logo.secureUrl);
      }
    }
  }, [entity, isLoading]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload PNG, JPG, or SVG format");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = (values: OrganizationFormData) => {
    if (!entityId) {
      toast.error("No active entity found");
      return;
    }
    updateEntity.mutate(
      {
        id: entityId,
        name: values.companyName,
        legalName: values.legalName,
        taxId: values.taxId ?? "",
        yearEnd: values.yearEnd,
        address: values.address ?? "",
        city: values.city ?? "",
        state: values.state ?? "",
        postalCode: values.postalCode ?? "",
        country: values.country ?? "",
        phoneNumber: values.phoneNumber ?? "",
        email: values.email,
        website: values.website ?? "",
        currency: entity?.currency ?? "",
        logo: logoFile ?? (entity?.logo ?? undefined),
      },
      {
        onSuccess: () => {
          setLogoFile(null);
          onSuccess?.();
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Logo */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Company Logo</h3>
            <div className="flex gap-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-gray-900 mb-1">Upload Company Logo</h4>
                <p className="text-sm text-gray-600 mb-3">Recommended: 400×400px. PNG, JPG, or SVG.</p>
                <Button type="button" variant="outline" className="rounded-lg gap-2"
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4" /> {logoPreview ? "Change Logo" : "Upload Logo"}
                </Button>
                {logoFile && (
                  <p className="text-xs text-green-600 mt-2">New logo selected: {logoFile.name}</p>
                )}
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoUpload} className="hidden" />
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Acme Corp" className="rounded-lg border-gray-300" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="legalName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">Legal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Acme Corporation Ltd." className="rounded-lg border-gray-300" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="taxId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">Tax ID / RC Number</FormLabel>
                  <FormControl>
                    <Input placeholder="XX-XXXXXXX" className="rounded-lg border-gray-300" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="yearEnd" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">Fiscal Year End</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg border-gray-300 w-full">
                        <SelectValue placeholder="Select fiscal year end" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fiscalYearEndOptions.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-900 font-semibold">Street Address</FormLabel>
                <FormControl>
                  <Textarea placeholder="123 Business St, Suite 100" className="rounded-lg border-gray-300 min-h-20 resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">City</FormLabel>
                  <FormControl>
                    <Input placeholder="Lagos" className="rounded-lg border-gray-300" {...field} />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">State / Province</FormLabel>
                  <FormControl>
                    <Input placeholder="Lagos State" className="rounded-lg border-gray-300" {...field} />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">Country</FormLabel>
                  <FormControl>
                    <Input placeholder="Nigeria" className="rounded-lg border-gray-300" {...field} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+234 800 000 0000" className="rounded-lg border-gray-300" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="info@company.com" className="rounded-lg border-gray-300 bg-gray-50" readOnly {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed after entity creation.</p>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="website" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-900 font-semibold">Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://company.com" className="rounded-lg border-gray-300" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end border-t pt-6">
              <Button type="submit" disabled={updateEntity.isPending}
                className="bg-primary hover:bg-primary/80 text-white rounded-lg px-8 py-6 font-semibold gap-2">
                {updateEntity.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="w-4 h-4" /> Save Changes</>
                )}
              </Button>
            </div>
          </div>

        </form>
      </Form>
    </div>
  );
}
