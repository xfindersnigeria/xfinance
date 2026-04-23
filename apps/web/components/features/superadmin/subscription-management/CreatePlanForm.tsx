// "use client";

// import React, { useEffect, useMemo } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import * as z from "zod";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { Switch } from "@/components/ui/switch";
// import { useModulesAll } from "@/lib/api/hooks/useModules";
// import {
//   useCreateSubscriptionTier,
//   useUpdateSubscriptionTier,
// } from "@/lib/api/hooks/useSubscription";
// import { Card } from "@/components/ui/card";

// const tierSchema = z.object({
//   name: z.string().min(1, "Tier name is required"),
//   description: z.string().optional(),
//   monthlyPrice: z.string().min(1, "Monthly price is required"),
//   yearlyPrice: z.string().min(1, "Yearly price is required"),
//   maxUsers: z.string().min(1, "Max users is required"),
//   maxEntities: z.string().min(1, "Max entities is required"),
//   // maxTransactionsMonth: z.string().min(1, "Max transactions/month is required"),
//   // maxStorageGB: z.string().min(1, "Max storage is required"),
//   // maxApiRatePerHour: z.string().min(1, "Max API rate is required"),
//   // apiAccess: z.boolean().default(false),
//   // webhooks: z.boolean().default(false),
//   // sso: z.boolean().default(false),
//   customBranding: z.boolean(),
//   prioritySupport: z.boolean(),
//   moduleIds: z.array(z.string()),
// });

// type TierFormData = z.infer<typeof tierSchema>;

// interface CreatePlanFormProps {
//   tier?: any;
//   isEditMode?: boolean;
//   onSuccess?: () => void;
// }

// export function CreatePlanForm({
//   tier,
//   isEditMode = false,
//   onSuccess,
// }: CreatePlanFormProps) {
//   const { data: allModules, isLoading: modulesLoading } = useModulesAll();
//   const createTier = useCreateSubscriptionTier();
//   const updateTier = useUpdateSubscriptionTier();

//   // Group modules by scope (ENTITY and GROUP only)
//   const modulesByScope = useMemo(() => {
//     if (!allModules) return { ENTITY: [], GROUP: [] };

//     return {
//       ENTITY: allModules.filter((m) => m.scope === "ENTITY") || [],
//       GROUP: allModules.filter((m) => m.scope === "GROUP") || [],
//     };
//   }, [allModules]);

//   console.log(allModules)

//   const form = useForm<TierFormData>({
//     resolver: zodResolver(tierSchema),
//     defaultValues: {
//       name: tier?.name || "",
//       description: tier?.description || "",
//       monthlyPrice: (tier?.monthlyPrice || 0).toString(),
//       yearlyPrice: (tier?.yearlyPrice || 0).toString(),
//       maxUsers: (tier?.maxUsers || 5).toString(),
//       maxEntities: (tier?.maxEntities || 1).toString(),
//       // maxTransactionsMonth: (tier?.maxTransactionsMonth || 1000).toString(),
//       // maxStorageGB: (tier?.maxStorageGB || 10).toString(),
//       // maxApiRatePerHour: (tier?.maxApiRatePerHour || 100).toString(),
//       // apiAccess: tier?.apiAccess ?? false,
//       // webhooks: tier?.webhooks ?? false,
//       // sso: tier?.sso ?? false,
//       customBranding: tier?.customBranding ?? false,
//       prioritySupport: tier?.prioritySupport ?? false,
//       moduleIds: tier?.subscriptionModules?.map((m: any) => m.moduleId) || [],
//     },
//   });

//   useEffect(() => {
//     if (tier) {
//       console.log("📋 Editing tier:", tier.name);
//       form.reset({
//         name: tier?.name || "",
//         description: tier?.description || "",
//         monthlyPrice: (tier?.monthlyPrice || 0).toString(),
//         yearlyPrice: (tier?.yearlyPrice || 0).toString(),
//         maxUsers: (tier?.maxUsers || 5).toString(),
//         maxEntities: (tier?.maxEntities || 1).toString(),
//         // maxTransactionsMonth: (tier?.maxTransactionsMonth || 1000).toString(),
//         // maxStorageGB: (tier?.maxStorageGB || 10).toString(),
//         // maxApiRatePerHour: (tier?.maxApiRatePerHour || 100).toString(),
//         // apiAccess: tier?.apiAccess ?? false,
//         // webhooks: tier?.webhooks ?? false,
//         // sso: tier?.sso ?? false,
//         customBranding: tier?.customBranding ?? false,
//         prioritySupport: tier?.prioritySupport ?? false,
//         moduleIds: tier?.subscriptionModules?.map((m: any) => m.moduleId) || [],
//       });
//     }
//   }, [tier, form]);

//   const onSubmit = async (values: TierFormData) => {
//     try {
//       const payload = {
//         name: values.name,
//         description: values.description || "",
//         monthlyPrice: parseInt(values.monthlyPrice, 10),
//         yearlyPrice: parseInt(values.yearlyPrice, 10),
//         maxUsers: parseInt(values.maxUsers, 10),
//         maxEntities: parseInt(values.maxEntities, 10),
//         // maxTransactionsMonth: parseInt(values.maxTransactionsMonth, 10),
//         // maxStorageGB: parseInt(values.maxStorageGB, 10),
//         // maxApiRatePerHour: parseInt(values.maxApiRatePerHour, 10),
//         // apiAccess: values.apiAccess,
//         // webhooks: values.webhooks,
//         // sso: values.sso,
//         customBranding: values.customBranding,
//         prioritySupport: values.prioritySupport,
//         moduleIds: values.moduleIds || [],
//       };

//       if (isEditMode && tier?.id) {
//         await updateTier.mutateAsync({
//           tierId: tier.id,
//           payload,
//         });
//       } else {
//         await createTier.mutateAsync(payload);
//       }

//       onSuccess?.();
//     } catch (error) {
//       console.error("Error:", error);
//     }
//   };

//   const isLoading =
//     modulesLoading || createTier.isPending || updateTier.isPending;

//   return (
//     <div className="w-full">
//       <Form {...form}>
//         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//           {/* Basic Info */}
//           <Card className="p-4  bg-blue-50 border-blue-200">
//             <h3 className="font-semibold text-blue-900 mb-0">
//               Basic Information
//             </h3>
//             <div className="space-y-4">
//               <FormField
//                 control={form.control}
//                 name="name"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Tier Name *</FormLabel>
//                     <FormControl>
//                       <Input
//                         placeholder="e.g., Starter, Professional"
//                         {...field}
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <FormField
//                 control={form.control}
//                 name="description"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Description</FormLabel>
//                     <FormControl>
//                       <Input
//                         placeholder="Brief description of this tier"
//                         {...field}
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <div className="grid grid-cols-2 gap-4">
//                 <FormField
//                   control={form.control}
//                   name="monthlyPrice"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel>Monthly Price (USD) *</FormLabel>
//                       <FormControl>
//                         <Input
//                           type="number"
//                           placeholder="e.g., 4999"
//                           {...field}
//                         />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//                 <FormField
//                   control={form.control}
//                   name="yearlyPrice"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel>Yearly Price (USD) *</FormLabel>
//                       <FormControl>
//                         <Input
//                           type="number"
//                           placeholder="e.g., 49999"
//                           {...field}
//                         />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//               </div>
//             </div>
//           </Card>

//           {/* Usage Limits */}
//           <Card className="p-4 bg-green-50 border-green-200">
//             <h3 className="font-semibold text-green-900 mb-0">Usage Limits</h3>
//             <div className="grid grid-cols-2 gap-4">
//               <FormField
//                 control={form.control}
//                 name="maxUsers"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Max Users *</FormLabel>
//                     <FormControl>
//                       <Input type="number" placeholder="e.g., 5" {...field} />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <FormField
//                 control={form.control}
//                 name="maxEntities"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Max Entities *</FormLabel>
//                     <FormControl>
//                       <Input type="number" placeholder="e.g., 1" {...field} />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               {/* <FormField
//                 control={form.control}
//                 name="maxTransactionsMonth"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Transactions/Month *</FormLabel>
//                     <FormControl>
//                       <Input
//                         type="number"
//                         placeholder="e.g., 1000"
//                         {...field}
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               /> */}
//               {/* <FormField
//                 control={form.control}
//                 name="maxStorageGB"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Storage (GB) *</FormLabel>
//                     <FormControl>
//                       <Input type="number" placeholder="e.g., 10" {...field} />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               /> */}
//               {/* <FormField
//                 control={form.control}
//                 name="maxApiRatePerHour"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>API Rate/Hour *</FormLabel>
//                     <FormControl>
//                       <Input type="number" placeholder="e.g., 100" {...field} />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               /> */}
//             </div>
//           </Card>

//           {/* Platform Features */}
//           <Card className="p-4 bg-purple-50 border-purple-200">
//             <h3 className="font-semibold text-purple-900 mb-0">
//               Platform Features
//             </h3>
//             <div className="space-y-3">
//               {/* <FormField
//                 control={form.control}
//                 name="apiAccess"
//                 render={({ field }) => (
//                   <FormItem className="flex items-center justify-between rounded-lg border border-purple-200 p-3 bg-white">
//                     <FormLabel className="mt-0! cursor-pointer">
//                       API Access
//                     </FormLabel>
//                     <FormControl>
//                       <Switch
//                         checked={field.value}
//                         onCheckedChange={field.onChange}
//                       />
//                     </FormControl>
//                   </FormItem>
//                 )}
//               /> */}
//               {/* <FormField
//                 control={form.control}
//                 name="webhooks"
//                 render={({ field }) => (
//                   <FormItem className="flex items-center justify-between rounded-lg border border-purple-200 p-3 bg-white">
//                     <FormLabel className="mt-0! cursor-pointer">
//                       Webhooks
//                     </FormLabel>
//                     <FormControl>
//                       <Switch
//                         checked={field.value}
//                         onCheckedChange={field.onChange}
//                       />
//                     </FormControl>
//                   </FormItem>
//                 )}
//               /> */}
//               {/* <FormField
//                 control={form.control}
//                 name="sso"
//                 render={({ field }) => (
//                   <FormItem className="flex items-center justify-between rounded-lg border border-purple-200 p-3 bg-white">
//                     <FormLabel className="mt-0! cursor-pointer">
//                       SSO (Single Sign-On)
//                     </FormLabel>
//                     <FormControl>
//                       <Switch
//                         checked={field.value}
//                         onCheckedChange={field.onChange}
//                       />
//                     </FormControl>
//                   </FormItem>
//                 )}
//               /> */}
//               <FormField
//                 control={form.control}
//                 name="customBranding"
//                 render={({ field }) => (
//                   <FormItem className="flex items-center justify-between rounded-lg border border-purple-200 p-3 bg-white">
//                     <FormLabel className="mt-0! cursor-pointer">
//                       Custom Branding
//                     </FormLabel>
//                     <FormControl>
//                       <Switch
//                         checked={field.value}
//                         onCheckedChange={field.onChange}
//                       />
//                     </FormControl>
//                   </FormItem>
//                 )}
//               />
//               <FormField
//                 control={form.control}
//                 name="prioritySupport"
//                 render={({ field }) => (
//                   <FormItem className="flex items-center justify-between rounded-lg border border-purple-200 p-3 bg-white">
//                     <FormLabel className="mt-0! cursor-pointer">
//                       Priority Support
//                     </FormLabel>
//                     <FormControl>
//                       <Switch
//                         checked={field.value}
//                         onCheckedChange={field.onChange}
//                       />
//                     </FormControl>
//                   </FormItem>
//                 )}
//               />
//             </div>
//           </Card>

//           {/* Entity Modules */}
//           {modulesByScope.ENTITY && modulesByScope.ENTITY.length > 0 && (
//             <div>
//               <h4 className="font-semibold text-gray-700 mb-3">
//                 Entity Modules
//               </h4>
//               <div className="space-y-3">
//                 {modulesByScope.ENTITY.map((module) => (
//                   <FormField
//                     key={module.id}
//                     control={form.control}
//                     name="moduleIds"
//                     render={({ field }) => (
//                       <FormItem className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-white">
//                         <FormLabel className="mt-0! cursor-pointer">
//                           {module.displayName}
//                         </FormLabel>
//                         <FormControl>
//                           <Switch
//                             checked={field.value?.includes(module.id) || false}
//                             onCheckedChange={(checked) => {
//                               const updatedModules = checked
//                                 ? [...(field.value || []), module.id]
//                                 : field.value?.filter((m) => m !== module.id) ||
//                                   [];
//                               field.onChange(updatedModules);
//                             }}
//                           />
//                         </FormControl>
//                       </FormItem>
//                     )}
//                   />
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Group Modules */}
//           {modulesByScope.GROUP && modulesByScope.GROUP.length > 0 && (
//             <div>
//               <h4 className="font-semibold text-gray-700 mb-3">
//                 Group Modules
//               </h4>
//               <div className="space-y-3">
//                 {modulesByScope.GROUP.map((module) => (
//                   <FormField
//                     key={module.id}
//                     control={form.control}
//                     name="moduleIds"
//                     render={({ field }) => (
//                       <FormItem className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-white">
//                         <FormLabel className="mt-0! cursor-pointer">
//                           {module.displayName}
//                         </FormLabel>
//                         <FormControl>
//                           <Switch
//                             checked={field.value?.includes(module.id) || false}
//                             onCheckedChange={(checked) => {
//                               const updatedModules = checked
//                                 ? [...(field.value || []), module.id]
//                                 : field.value?.filter((m) => m !== module.id) ||
//                                   [];
//                               field.onChange(updatedModules);
//                             }}
//                           />
//                         </FormControl>
//                       </FormItem>
//                     )}
//                   />
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Submit Button */}
//           <div className="flex gap-3 pt-4">
//             <Button
//               type="submit"
//               className="flex-1 bg-indigo-600 hover:bg-indigo-700"
//               disabled={isLoading}
//             >
//               {isLoading ? (
//                 <>Loading...</>
//               ) : isEditMode ? (
//                 <>Update Tier</>
//               ) : (
//                 <>Create Tier</>
//               )}
//             </Button>
//           </div>
//         </form>
//       </Form>
//     </div>
//   );
// }

"use client";

import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Switch } from "@/components/ui/switch";
import { useModulesAll } from "@/lib/api/hooks/useModules";
import {
  useCreateSubscriptionTier,
  useUpdateSubscriptionTier,
} from "@/lib/api/hooks/useSubscription";
import { Card } from "@/components/ui/card";

const tierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  description: z.string().optional(),
  monthlyPrice: z.string().min(1, "Monthly price is required"),
  yearlyPrice: z.string().min(1, "Yearly price is required"),
  maxUsers: z.string().min(1, "Max users is required"),
  maxEntities: z.string().min(1, "Max entities is required"),
  customBranding: z.boolean(),
  prioritySupport: z.boolean(),
  moduleIds: z.array(z.string()),
});

type TierFormData = z.infer<typeof tierSchema>;

interface CreatePlanFormProps {
  tier?: any;
  isEditMode?: boolean;
  onSuccess?: () => void;
}

export function CreatePlanForm({
  tier,
  isEditMode = false,
  onSuccess,
}: CreatePlanFormProps) {
  const { data: allModules, isLoading: modulesLoading } = useModulesAll();
  const createTier = useCreateSubscriptionTier();
  const updateTier = useUpdateSubscriptionTier();

  // Group by scope then by menu
  const groupedModules = useMemo(() => {
    if (!allModules) return { ENTITY: {}, GROUP: {} };

    const entityModules = allModules.filter((m) => m.scope === "ENTITY");
    const groupModules = allModules.filter((m) => m.scope === "GROUP");

    const groupByMenu = (modules: any[]) =>
      modules.reduce((acc: any, module: any) => {
        const menu = module.menu || "Other";
        if (!acc[menu]) acc[menu] = [];
        acc[menu].push(module);
        return acc;
      }, {});

    return {
      ENTITY: groupByMenu(entityModules),
      GROUP: groupByMenu(groupModules),
    };
  }, [allModules]);

  const form = useForm<TierFormData>({
    resolver: zodResolver(tierSchema),
    defaultValues: {
      name: tier?.name || "",
      description: tier?.description || "",
      monthlyPrice: (tier?.monthlyPrice || 0).toString(),
      yearlyPrice: (tier?.yearlyPrice || 0).toString(),
      maxUsers: (tier?.maxUsers || 5).toString(),
      maxEntities: (tier?.maxEntities || 1).toString(),
      customBranding: tier?.customBranding ?? false,
      prioritySupport: tier?.prioritySupport ?? false,
      moduleIds: tier?.subscriptionModules?.map((m: any) => m.moduleId) || [],
    },
  });

  useEffect(() => {
    if (tier) {
      form.reset({
        name: tier?.name || "",
        description: tier?.description || "",
        monthlyPrice: (tier?.monthlyPrice || 0).toString(),
        yearlyPrice: (tier?.yearlyPrice || 0).toString(),
        maxUsers: (tier?.maxUsers || 5).toString(),
        maxEntities: (tier?.maxEntities || 1).toString(),
        customBranding: tier?.customBranding ?? false,
        prioritySupport: tier?.prioritySupport ?? false,
        moduleIds: tier?.subscriptionModules?.map((m: any) => m.moduleId) || [],
      });
    }
  }, [tier, form]);

  const onSubmit = async (values: TierFormData) => {
    try {
      const payload = {
        name: values.name,
        description: values.description || "",
        monthlyPrice: parseInt(values.monthlyPrice, 10),
        yearlyPrice: parseInt(values.yearlyPrice, 10),
        maxUsers: parseInt(values.maxUsers, 10),
        maxEntities: parseInt(values.maxEntities, 10),
        customBranding: values.customBranding,
        prioritySupport: values.prioritySupport,
        moduleIds: values.moduleIds || [],
      };

      if (isEditMode && tier?.id) {
        await updateTier.mutateAsync({ tierId: tier.id, payload });
      } else {
        await createTier.mutateAsync(payload);
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const isLoading =
    modulesLoading || createTier.isPending || updateTier.isPending;

  const menuColors: Record<string, string> = {
    "HR & Payroll": "bg-rose-50 border-rose-200",
    Income: "bg-emerald-50 border-emerald-200",
    Expense: "bg-amber-50 border-amber-200",
    Accounts: "bg-sky-50 border-sky-200",
    Products: "bg-violet-50 border-violet-200",
    "Assets & Inventory": "bg-orange-50 border-orange-200",
    Projects: "bg-teal-50 border-teal-200",
    Banking: "bg-cyan-50 border-cyan-200",
    Reports: "bg-indigo-50 border-indigo-200",
    Settings: "bg-gray-50 border-gray-200",
    Admin: "bg-slate-50 border-slate-200",
    Dashboard: "bg-blue-50 border-blue-200",
    "Budgeting & Forecasts": "bg-lime-50 border-lime-200",
    Intercompany: "bg-fuchsia-50 border-fuchsia-200",
    "Master Chart of Accounts": "bg-purple-50 border-purple-200",
    "Group Reports": "bg-purple-50 border-purple-200",
    Other: "bg-zinc-50 border-zinc-200",
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info - unchanged */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-0">
              Basic Information
            </h3>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tier Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Starter, Professional"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of this tier"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Price (USD) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 4999"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yearlyPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yearly Price (USD) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 49999"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Usage Limits - unchanged */}
          <Card className="p-4 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-900 mb-0">Usage Limits</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxUsers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Users *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxEntities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Entities *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Platform Features - unchanged */}
          <Card className="p-4 bg-purple-50 border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-0">
              Platform Features
            </h3>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="customBranding"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-purple-200 p-3 bg-white">
                    <FormLabel className="mt-0! cursor-pointer">
                      Custom Branding
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prioritySupport"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-purple-200 p-3 bg-white">
                    <FormLabel className="mt-0! cursor-pointer">
                      Priority Support
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Modules Section - Grouped by Scope → Menu */}
          {Object.entries(groupedModules).map(([scope, menus]) => (
            <div key={scope}>
              <h4 className="font-semibold text-gray-700 mb-3 capitalize">
                {scope} Modules
              </h4>
              <div className="space-y-6">
                {Object.entries(menus).map(([menu, modules]) => (
                  <div
                    key={menu}
                    className={`rounded-xl p-4 border ${menuColors[menu] || menuColors.Other}`}
                  >
                    <h5 className="font-medium text-gray-800 mb-3">{menu}</h5>
                    <div className="space-y-3">
                      {(modules as any[]).map((module) => (
                        <FormField
                          key={module.id}
                          control={form.control}
                          name="moduleIds"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-white">
                              <FormLabel className="mt-0! cursor-pointer">
                                {module.displayName}
                              </FormLabel>
                              <FormControl>
                                <Switch
                                  checked={
                                    field.value?.includes(module.id) || false
                                  }
                                  onCheckedChange={(checked) => {
                                    const updatedModules = checked
                                      ? [...(field.value || []), module.id]
                                      : field.value?.filter(
                                          (m) => m !== module.id,
                                        ) || [];
                                    field.onChange(updatedModules);
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              disabled={isLoading}
            >
              {isLoading
                ? "Loading..."
                : isEditMode
                  ? "Update Tier"
                  : "Create Tier"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
