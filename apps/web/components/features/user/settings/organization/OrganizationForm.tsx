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
import { Upload, Check } from "lucide-react";

// Zod schema for Organization Form
const organizationFormSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  legalName: z.string().min(2, "Legal name is required"),
  taxId: z.string().min(1, "Tax ID / EIN is required"),
  fiscalYearEnd: z.string().min(1, "Fiscal year end is required"),
  businessAddress: z.string().min(5, "Business address is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Valid email is required"),
  logo: z.string().optional(),
});

type OrganizationFormData = z.infer<typeof organizationFormSchema>;

interface OrganizationFormProps {
  onSuccess?: () => void;
}

const fiscalYearEndOptions = [
  "January 31",
  "February 28",
  "March 31",
  "April 30",
  "May 31",
  "June 30",
  "July 31",
  "August 31",
  "September 30",
  "October 31",
  "November 30",
  "December 31",
];

export default function OrganizationForm({
  onSuccess,
}: OrganizationFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      companyName: "Hunslow Inc. (US)",
      legalName: "Hunslow Incorporated",
      taxId: "XX-XXXXXXX",
      fiscalYearEnd: "December 31",
      businessAddress: "123 Business St, Suite 100\nAustin, TX 78701\nUnited States",
      phone: "+1 (512) 555-0100",
      email: "info@hunslow.com",
      logo: "",
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/png", "image/jpeg", "image/svg+xml"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload PNG, JPG, or SVG format");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        form.setValue("logo", reader.result as string);
        toast.success("Logo uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = async (values: OrganizationFormData) => {
    try {
      console.log("Organization Form submitted:", values);
      toast.success("Organization settings saved successfully");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Failed to save organization settings");
    }
  };

  return (
    <div className="w-full space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Logo Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Company Logo</h3>

            <div className="flex gap-6">
              {/* Logo Preview Area */}
              <div className="shrink-0">
                <div
                  onClick={handleLogoClick}
                  className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Area */}
              <div className="flex-1">
                <h4 className="text-base font-semibold text-gray-900 mb-2">Upload Company Logo</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Recommended size: 400x400px. Supported formats: PNG, JPG, SVG
                </p>
                <Button
                  type="button"
                  onClick={handleLogoClick}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Logo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Company Information Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>

            {/* Company Name and Legal Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold">
                      Company Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Hunslow Inc. (US)"
                        className="rounded-lg border-gray-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold">
                      Legal Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Hunslow Incorporated"
                        className="rounded-lg border-gray-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tax ID and Fiscal Year End */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold">
                      Tax ID / EIN
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="XX-XXXXXXX"
                        className="rounded-lg border-gray-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fiscalYearEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold">
                      Fiscal Year End
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full rounded-lg border-gray-300">
                          <SelectValue placeholder="Select fiscal year end" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fiscalYearEndOptions.map((date) => (
                          <SelectItem key={date} value={date}>
                            {date}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Business Address */}
            <FormField
              control={form.control}
              name="businessAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">
                    Business Address
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Street address, City, State, ZIP, Country"
                      className="rounded-lg border-gray-300 min-h-24 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold">
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+1 (512) 555-0100"
                        className="rounded-lg border-gray-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="info@company.com"
                        className="rounded-lg border-gray-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Action Button */}
            <div className="flex justify-end border-t pt-6">
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/80 text-white rounded-lg px-8 py-6 font-semibold flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
