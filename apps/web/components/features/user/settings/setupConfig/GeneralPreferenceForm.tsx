"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { useEntityConfig, useUpdateEntityConfig } from "@/lib/api/hooks/useSettings";

// Zod schema for General Preference Form
const generalPreferenceSchema = z.object({
  emailNotifications: z.boolean().default(true),
  twoFactorAuth: z.boolean().default(false),
  auditLog: z.boolean().default(true),
  timeZone: z.string().min(1, "Time zone is required").default("UTC"),
  language: z.string().min(1, "Language is required").default("en"),
});

type GeneralPreferenceFormData = z.infer<typeof generalPreferenceSchema>;

interface GeneralPreferenceFormProps {
  onSuccess?: () => void;
}

const timeZoneOptions = [
  { id: "UTC", name: "UTC (UTC±0)" },
  { id: "EST", name: "EST (UTC-5)" },
  { id: "CST", name: "CST (UTC-6)" },
  { id: "MST", name: "MST (UTC-7)" },
  { id: "PST", name: "PST (UTC-8)" },
  { id: "GMT", name: "GMT (UTC±0)" },
  { id: "CET", name: "CET (UTC+1)" },
  { id: "IST", name: "IST (UTC+5:30)" },
  { id: "JST", name: "JST (UTC+9)" },
  { id: "AEST", name: "AEST (UTC+10)" },
];

const languageOptions = [
  { id: "en", name: "English" },
  { id: "es", name: "Spanish" },
  { id: "fr", name: "French" },
  { id: "de", name: "German" },
  { id: "it", name: "Italian" },
  { id: "pt", name: "Portuguese" },
  { id: "ru", name: "Russian" },
  { id: "ja", name: "Japanese" },
];

export default function GeneralPreferenceForm({
  onSuccess,
}: GeneralPreferenceFormProps) {
  const { data: configRes, isLoading: configLoading } = useEntityConfig();
  const config: any = (configRes as any)?.data ?? {};
  const updateConfig = useUpdateEntityConfig();

  const form = useForm<GeneralPreferenceFormData>({
    resolver: zodResolver(generalPreferenceSchema) as any,
    defaultValues: {
      emailNotifications: true,
      twoFactorAuth: false,
      auditLog: true,
      timeZone: "UTC",
      language: "en",
    },
  });

  useEffect(() => {
    if (config && !configLoading) {
      form.reset({
        emailNotifications: config.emailNotifications ?? true,
        twoFactorAuth: config.twoFactorAuth ?? false,
        auditLog: config.auditLog ?? true,
        timeZone: config.timezone ?? "UTC",
        language: config.language ?? "en",
      });
    }
  }, [config, configLoading]);

  const onSubmit = (values: GeneralPreferenceFormData) => {
    updateConfig.mutate(
      {
        emailNotifications: values.emailNotifications,
        twoFactorAuth: values.twoFactorAuth,
        auditLog: values.auditLog,
        timezone: values.timeZone,
        language: values.language,
      },
      { onSuccess },
    );
  };

  return (
    <div className="w-full space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          General Preferences
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage your account preferences and settings
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Preferences Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
            {/* Email Notifications */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Email Notifications
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Receive email notifications for important account activities
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem>
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

            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Two-Factor Authentication
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Enhance security with two-factor authentication
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="twoFactorAuth"
                render={({ field }) => (
                  <FormItem>
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

            {/* Audit Log */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Audit Log
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Keep track of all system activities and changes
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="auditLog"
                render={({ field }) => (
                  <FormItem>
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

            {/* Time Zone */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Time Zone
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Select your preferred time zone
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="timeZone"
                render={({ field }) => (
                  <FormItem className="w-48">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg border-gray-300 w-full">
                          <SelectValue placeholder="Select time zone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeZoneOptions.map((tz) => (
                          <SelectItem key={tz.id} value={tz.id}>
                            {tz.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Language
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Select your preferred language
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem className="w-48">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg border-gray-300 w-full">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languageOptions.map((lang) => (
                          <SelectItem key={lang.id} value={lang.id}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateConfig.isPending}
              className="bg-primary text-white rounded-lg px-5 py-4 font-semibold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {updateConfig.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
