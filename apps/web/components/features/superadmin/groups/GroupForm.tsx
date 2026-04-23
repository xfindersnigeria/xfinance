"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useCreateGroup, useUpdateGroup } from "@/lib/api/hooks/useGroup";
import {
  transformGroupFormToApiPayload,
  GroupFormData,
} from "@/lib/api/services/groupService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Image as ImageIcon, X } from "lucide-react";

const groupSchema = z.object({
  // Logo - can be File (when uploading) or object (when editing) or null
  logo: z
    .union([
      z.instanceof(File),
      z.object({
        publicId: z.string(),
        secureUrl: z.string(),
      }),
      z.null(),
    ])
    .optional(),
  // Basic Information
  groupName: z.string().min(1, "Group name is required"),
  legalName: z.string().min(1, "Legal name is required"),
  taxId: z.string().min(1, "Tax ID/EIN is required"),
  industry: z.string().min(1, "Industry is required"),
  // Address
  address: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "State/Province is required"),
  postalCode: z.string().min(1, "ZIP/Postal code is required"),
  country: z.string().min(1, "Country is required"),
  // Contact Information
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  // Subscription Settings
  subscriptionPlan: z.string().optional(),
  billingCycle: z.string().optional(),
});

interface GroupFormProps {
  group?: Partial<GroupFormData> & {
    id?: string;
    logo?: { secureUrl?: string };
  };
  isEditMode?: boolean;
}

export function GroupForm({
  group,
  isEditMode = false,
}: GroupFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const createGroupMutation = useCreateGroup();

  const updateGroupMutation = useUpdateGroup();
  console.log(group);
  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      logo: undefined,
      groupName: group?.groupName || "",
      legalName: group?.legalName || "",
      taxId: group?.taxId || "",
      industry: group?.industry || "",
      address: group?.address || "",
      city: group?.city || "",
      province: group?.province || "",
      postalCode: group?.postalCode || "",
      country: group?.country || "United States",
      email: group?.email || "",
      phone: group?.phone || "",
      website: group?.website && group.website !== null ? group.website : "",
      subscriptionPlan: group?.subscriptionPlan || "",
      billingCycle: group?.billingCycle || "",
    },
  });

  useEffect(() => {
    if (group) {
      form.reset({
        logo: undefined,
        groupName: group?.groupName || "",
        legalName: group?.legalName || "",
        taxId: group?.taxId || "",
        industry: group?.industry || "",
        address: group?.address || "",
        city: group?.city || "",
        province: group?.province || "",
        postalCode: group?.postalCode || "",
        country: group?.country || "United States",
        email: group?.email || "",
        phone: group?.phone || "",
        website: group?.website || "",
        subscriptionPlan: group?.subscriptionPlan || "",
        billingCycle: group?.billingCycle || "",
      });
      // Set preview from existing logo
      if (group?.logo?.secureUrl) {
        setLogoPreview(group.logo.secureUrl);
      }
    }
  }, [group, form]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error("Only PNG, JPG, and WebP files are allowed");
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      // Set preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Update form
      form.setValue("logo", file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    form.setValue("logo", undefined);
  };

  const onSubmit = async (values: GroupFormData) => {
    if (isEditMode && group?.id) {
      // Transform form data to API format for update
      const apiPayload = transformGroupFormToApiPayload(values);
      updateGroupMutation.mutate({
        id: group.id,
        ...apiPayload,
      } as any);
    } else {
      // Create new group
      createGroupMutation.mutate(values);
    }
  };

  const isLoading =
    createGroupMutation.isPending || updateGroupMutation.isPending;

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Logo Upload Section */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h6 className="font-medium text-sm mb-4">Group Logo</h6>
            <div className="flex items-center gap-6">
              {/* Logo Preview */}
              <div className="shrink-0">
                <div className="w-24 h-24 rounded-lg bg-indigo-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-indigo-300">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-indigo-400" />
                  )}
                </div>
              </div>
              {/* Upload Control */}
              <div className="flex-1">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 transition">
                    <span className="text-indigo-600 font-medium text-sm">
                      ⬇ Upload Logo
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" /> Remove Logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-blue-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-4">Basic Information</h6>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="groupName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Group Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Acme Group" {...field} />
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
                      <FormLabel className="text-xs">Legal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full legal name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tax ID / EIN</FormLabel>
                      <FormControl>
                        <Input placeholder="XX-XXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Industry</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Technology, Consulting"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-green-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-4">Address</h6>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        State / Province
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        ZIP / Postal Code
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Country</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="United States">
                            United States
                          </SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="United Kingdom">
                            United Kingdom
                          </SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                          <SelectItem value="Nigeria">Nigeria</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-yellow-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-4">Contact Information</h6>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Email Address <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@company.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Subscription Settings */}
          <div className="bg-orange-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-4">Subscription Settings</h6>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subscriptionPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Subscription Plan
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="starter">
                            Starter - ₦99/month
                          </SelectItem>
                          <SelectItem value="professional">
                            Professional - ₦299/month
                          </SelectItem>
                          <SelectItem value="enterprise">
                            Enterprise - Custom pricing
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingCycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Billing Cycle</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select billing cycle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-6">
            <Button variant="outline" type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isLoading
                ? "Please wait..."
                : isEditMode
                  ? "Update Group"
                  : "Create Group"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
