"use client";
import React, { useEffect, useState } from "react";
import { Info, Loader2, Save, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateEmailAutomation } from "@/lib/api/hooks/useEmailSettings";
import type { EmailAutomation } from "@/lib/api/services/emailSettingsService";
import { SettingsSection, SwitchRow } from "./SettingsSection";

type ToggleKey = Exclude<keyof EmailAutomation, "reminderSchedule">;

const TOGGLES: Array<{ key: ToggleKey; title: string; description: string }> = [
  {
    key: "invoiceEmails",
    title: "Invoice Emails",
    description: "Email the invoice (PDF attached) to the customer automatically when it is sent",
  },
  {
    key: "paymentReminders",
    title: "Payment Reminders",
    description: "Remind customers before and after an invoice's due date (sent daily at 8am)",
  },
  {
    key: "paymentConfirmation",
    title: "Payment Received Confirmation",
    description: "Email the customer a confirmation when a payment against their invoice is recorded",
  },
  {
    key: "receiptEmails",
    title: "Receipt Emails",
    description:
      "Email income receipts and POS sales to the saved customer, or to the email typed at the till",
  },
  {
    key: "monthlyStatements",
    title: "Monthly Statements",
    description:
      "On the 1st of each month, email last month's statement PDF to every customer with an email and activity or a balance",
  },
];

const SCHEDULE_PRESETS: Array<{ value: string; label: string }> = [
  { value: "3,7,14", label: "3, 7 and 14 days before due" },
  { value: "7,14", label: "7 and 14 days before due" },
  { value: "7", label: "7 days before due only" },
  { value: "3", label: "3 days before due only" },
];

const SCHEDULE_PATTERN = /^\s*\d{1,2}(\s*,\s*\d{1,2})*\s*$/;

const normalise = (v: string) => v.replace(/\s+/g, "");

export default function EmailAutomationCard({ automation }: { automation: EmailAutomation | undefined }) {
  const update = useUpdateEmailAutomation();
  const [local, setLocal] = useState<EmailAutomation | undefined>(automation);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const savedSchedule = automation?.reminderSchedule ?? "3,7,14";
  const isPreset = SCHEDULE_PRESETS.some((p) => p.value === normalise(savedSchedule));

  useEffect(() => {
    setLocal(automation);
    if (automation) {
      const preset = SCHEDULE_PRESETS.some((p) => p.value === normalise(automation.reminderSchedule));
      setCustomMode(!preset);
      setCustomValue(preset ? "" : automation.reminderSchedule);
    }
  }, [automation]);

  const toggle = (key: ToggleKey, value: boolean) => {
    setLocal((prev) => (prev ? { ...prev, [key]: value } : prev));
    update.mutate(
      { [key]: value },
      { onError: () => setLocal((prev) => (prev ? { ...prev, [key]: !value } : prev)) },
    );
  };

  const onScheduleSelect = (value: string) => {
    if (value === "custom") {
      setCustomMode(true);
      setCustomValue(isPreset ? savedSchedule : customValue || savedSchedule);
      return;
    }
    setCustomMode(false);
    if (value !== normalise(savedSchedule)) update.mutate({ reminderSchedule: value });
  };

  const customValid = SCHEDULE_PATTERN.test(customValue);
  const customChanged = normalise(customValue) !== normalise(savedSchedule);
  const remindersOn = !!local?.paymentReminders;

  return (
    <SettingsSection
      title="Automated Email Settings"
      subtitle="Choose which emails go out automatically. Changes save as soon as you make them."
      icon={<Zap />}
    >
      <div>
        {TOGGLES.map((t) => (
          <SwitchRow
            key={t.key}
            title={t.title}
            description={t.description}
            control={
              <Switch
                checked={!!local?.[t.key]}
                onCheckedChange={(v) => toggle(t.key, v)}
                disabled={!local}
                aria-label={t.title}
              />
            }
          />
        ))}
      </div>

      <Separator className="my-4" />

      <div className="space-y-2">
        <Label htmlFor="reminder-schedule">Payment Reminder Schedule</Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={customMode ? "custom" : normalise(savedSchedule)}
            onValueChange={onScheduleSelect}
            disabled={!remindersOn || update.isPending}
          >
            <SelectTrigger id="reminder-schedule" className="w-full sm:max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom schedule</SelectItem>
            </SelectContent>
          </Select>

          {customMode && (
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex gap-2">
                <Input
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="e.g. 1,5,10"
                  disabled={!remindersOn}
                  aria-label="Custom reminder days"
                  className="sm:max-w-xs"
                />
                <Button
                  type="button"
                  className="rounded-2xl"
                  disabled={!remindersOn || !customValid || !customChanged || update.isPending}
                  onClick={() => update.mutate({ reminderSchedule: normalise(customValue) })}
                >
                  {update.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
              {customValue && !customValid ? (
                <p className="text-xs text-red-500">Enter days before the due date, separated by commas (e.g. 1,5,10)</p>
              ) : (
                <p className="text-xs text-gray-500">Days before the due date, separated by commas</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-start gap-2 text-xs text-gray-500 pt-1">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            {remindersOn
              ? "Overdue reminders are also sent automatically 1, 7, 14 and 30 days after the due date."
              : "Turn on Payment Reminders to choose a schedule. When on, overdue reminders are also sent 1, 7, 14 and 30 days after the due date."}
          </span>
        </div>
      </div>
    </SettingsSection>
  );
}
