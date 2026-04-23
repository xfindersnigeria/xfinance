"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateEntity, useUpdateEntity } from "@/lib/api/hooks/useEntity";
import { EntityFormData } from "@/lib/api/services/entityService";

const entitySchema = z.object({
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
  name: z.string().min(1, "Entity name is required"),
  legalName: z.string().min(1, "Legal name is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Base currency is required"),
  yearEnd: z.string().min(1, "Fiscal year end is required"),
  address: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  postalCode: z.string().min(1, "ZIP/Postal code is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type EntityFormDataLocal = z.infer<typeof entitySchema>;

interface EntityFormProps {
  entity?: Partial<EntityFormDataLocal> & {
    id?: string;
    logo?: { publicId?: string; secureUrl?: string };
  };
  isEditMode?: boolean;
}

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "Japan",
  "Australia",
  "Nigeria",
];
const CURRENCIES = [
  "USD - US Dollar",
  "GBP - British Pound",
  "EUR - Euro",
  "JPY - Japanese Yen",
  "AUD - Australian Dollar",
  "CAD - Canadian Dollar",
  "NGN - Nigerian Naira",
];
const FISCAL_YEAR_ENDS = ["December 31", "March 31", "June 30", "September 30"];

export function EntityForm({
  entity,
  isEditMode = false,
}: EntityFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);


  const createEntityMutation = useCreateEntity();
  const updateEntityMutation = useUpdateEntity();

  const form = useForm<EntityFormDataLocal>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      logo: undefined,
      name: entity?.name || "",
      legalName: entity?.legalName || "",
      taxId: entity?.taxId || "",
      country: entity?.country || "United States",
      currency: entity?.currency || "USD - US Dollar",
      yearEnd: entity?.yearEnd || "December 31",
      address: entity?.address || "",
      city: entity?.city || "",
      state: entity?.state || "",
      postalCode: entity?.postalCode || "",
      phoneNumber: entity?.phoneNumber || "",
      email: entity?.email || "",
      website: entity?.website && entity.website !== null ? entity.website : "",
    },
  });

  useEffect(() => {
    if (entity) {
      form.reset({
        logo: undefined,
        name: entity?.name || "",
        legalName: entity?.legalName || "",
        taxId: entity?.taxId || "",
        country: entity?.country || "United States",
        currency: entity?.currency || "USD - US Dollar",
        yearEnd: entity?.yearEnd || "December 31",
        address: entity?.address || "",
        city: entity?.city || "",
        state: entity?.state || "",
        postalCode: entity?.postalCode || "",
        phoneNumber: entity?.phoneNumber || "",
        email: entity?.email || "",
        website: entity?.website || "",
      });
      // Set preview from existing logo
      if (entity?.logo?.secureUrl) {
        setLogoPreview(entity.logo.secureUrl);
      }
    }
  }, [entity, form]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error("Only PNG, JPG, and WebP files are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("logo", file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    form.setValue("logo", undefined);
  };

  const onSubmit = async (values: EntityFormDataLocal) => {
    if (isEditMode && entity?.id) {
      // Pass full form data including File logo to mutation
      updateEntityMutation.mutate({
        ...values,
        id: entity.id,
      } as EntityFormData & { id: string });
    } else {
      // Create new entity with full form data
      createEntityMutation.mutate(values as EntityFormData);
    }
  };

  const isLoading =
    createEntityMutation.isPending || updateEntityMutation.isPending;
  console.log(entity);
  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Logo Upload Section */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h6 className="font-medium text-sm mb-4">Entity Logo</h6>
            <div className="flex items-center gap-6">
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
              <div className="flex-1">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 transition">
                    <span className="text-sm">Upload Logo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeLogo}
                      className="w-fit"
                    >
                      Remove Logo
                    </Button>
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Entity Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Hunslow Inc. (UK)"
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
                      <FormLabel className="text-xs">Legal Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Hunslow Limited" {...field} />
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
                      <FormLabel className="text-xs">
                        Tax ID / Registration Number *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="XX-XXXXXXX" {...field} />
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
                      <FormLabel className="text-xs">Country *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Financial Configuration */}
          <div className="bg-green-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-4">
              Financial Configuration
            </h6>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Base Currency *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yearEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Fiscal Year End *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FISCAL_YEAR_ENDS.map((date) => (
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
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-amber-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-4">Address Information</h6>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Street Address *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Business Street, Suite 100"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">City *</FormLabel>
                      <FormControl>
                        <Input placeholder="London" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        State / Province *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="England" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Postal Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="SW1A 1AA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-purple-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-4">Contact Information</h6>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+44 20 1234 5678" {...field} />
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
                      <FormLabel className="text-xs">Email Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="uk@hunslow.com" {...field} />
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
                      <Input
                        placeholder="https://www.hunslow.co.uk"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  ? "Update Entity"
                  : "Create Entity"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
