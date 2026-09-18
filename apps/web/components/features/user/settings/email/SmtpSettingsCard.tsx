"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Info, Loader2, Mail, Save, Send, Trash2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { MODULES } from "@/lib/types/enums";
import { useRemoveSmtp, useSaveSmtp, useTestSmtp } from "@/lib/api/hooks/useEmailSettings";
import type { EmailDelivery, SmtpEncryption, SmtpSettings } from "@/lib/api/services/emailSettingsService";
import { SettingsSection } from "./SettingsSection";

const DEFAULT_PORTS: Record<SmtpEncryption, string | null> = { tls: "587", ssl: "465", none: null };

const schema = z.object({
  host: z.string().trim().min(1, "SMTP host is required"),
  port: z
    .string()
    .trim()
    .regex(/^\d+$/, "Port must be a number")
    .refine((v) => Number(v) >= 1 && Number(v) <= 65535, "Port must be between 1 and 65535"),
  encryption: z.enum(["none", "tls", "ssl"]),
  username: z.string().trim().min(1, "SMTP username is required"),
  password: z.string().optional(),
  fromEmail: z.string().trim().min(1, "From email is required").email("Enter a valid email address"),
  fromName: z.string().trim().max(120, "Max 120 characters").optional(),
});

type FormValues = z.infer<typeof schema>;

function toFormValues(smtp: SmtpSettings | null | undefined): FormValues {
  return {
    host: smtp?.host ?? "",
    port: String(smtp?.port ?? 587),
    encryption: smtp?.encryption ?? "tls",
    username: smtp?.username ?? "",
    password: "",
    fromEmail: smtp?.fromEmail ?? "",
    fromName: smtp?.fromName ?? "",
  };
}

function DeliveryNotice({ delivery, onRemove }: { delivery: EmailDelivery; onRemove: () => void }) {
  if (delivery.mode === "smtp") {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
        <Mail className="w-4 h-4 text-green-700 shrink-0" />
        <p className="text-sm text-green-800 flex-1">
          Emails are sent through your SMTP server from <span className="font-medium">{delivery.from}</span>.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-2xl text-red-600 hover:text-red-700 hover:bg-red-50 self-start sm:self-auto"
          onClick={onRemove}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          Remove SMTP
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4">
      <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="text-sm text-primary">
          Emails are currently sent from{" "}
          <span className="font-medium">{delivery.from || "the platform mailer"}</span>
          {delivery.senderName && <> as &ldquo;{delivery.senderName}&rdquo;</>}
          {delivery.replyTo ? (
            <>
              , replies go to <span className="font-medium">{delivery.replyTo}</span>.
            </>
          ) : (
            "."
          )}{" "}
          Add your own SMTP server to send from your own address.
        </p>
        <p className="text-xs text-primary/80">Passwords are encrypted and never shown again after saving.</p>
      </div>
    </div>
  );
}

interface Props {
  smtp: SmtpSettings | null | undefined;
  delivery: EmailDelivery | undefined;
}

export default function SmtpSettingsCard({ smtp, delivery }: Props) {
  const { isOpen, openModal, closeModal } = useModal();
  const saveSmtp = useSaveSmtp();
  const removeSmtp = useRemoveSmtp();
  const testSmtp = useTestSmtp();
  const [showPassword, setShowPassword] = useState(false);
  const [testTo, setTestTo] = useState("");

  const hasPassword = !!smtp?.hasPassword;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(smtp),
  });

  // Re-seed the form whenever the saved settings change (load, save, remove)
  const smtpKey = JSON.stringify(smtp ?? null);
  useEffect(() => {
    form.reset(toFormValues(smtp));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smtpKey]);

  const handleEncryptionChange = (value: SmtpEncryption) => {
    const currentPort = form.getValues("port");
    const otherDefaults = Object.entries(DEFAULT_PORTS)
      .filter(([enc, port]) => enc !== value && port)
      .map(([, port]) => port);
    const suggested = DEFAULT_PORTS[value];
    if (suggested && (!currentPort || otherDefaults.includes(currentPort))) {
      form.setValue("port", suggested, { shouldValidate: true });
    }
    form.setValue("encryption", value, { shouldDirty: true });
  };

  const onSubmit = (values: FormValues) => {
    if (!values.password && !hasPassword) {
      form.setError("password", { message: "SMTP password is required" });
      return;
    }
    saveSmtp.mutate({
      host: values.host.trim(),
      port: Number(values.port),
      encryption: values.encryption,
      username: values.username.trim(),
      ...(values.password ? { password: values.password } : {}),
      fromEmail: values.fromEmail.trim(),
      fromName: values.fromName?.trim() || undefined,
    });
  };

  const openTestDialog = () => {
    setTestTo(form.getValues("fromEmail") || smtp?.fromEmail || "");
    openModal(MODAL.EMAIL_SMTP_TEST);
  };

  const testEmailValid = z.string().email().safeParse(testTo.trim()).success;

  const sendTest = () => {
    const v = form.getValues();
    const port = Number(v.port);
    testSmtp.mutate(
      {
        to: testTo.trim(),
        host: v.host.trim() || undefined,
        port: Number.isInteger(port) && port > 0 ? port : undefined,
        encryption: v.encryption,
        username: v.username.trim() || undefined,
        password: v.password || undefined,
        fromEmail: v.fromEmail.trim() || undefined,
        fromName: v.fromName?.trim() || undefined,
      },
      { onSuccess: () => closeModal(MODAL.EMAIL_SMTP_TEST) },
    );
  };

  return (
    <SettingsSection
      title="SMTP Configuration"
      subtitle="Send customer emails from your own mail server"
      icon={<Mail />}
    >
      <div className="space-y-4">
        {delivery && <DeliveryNotice delivery={delivery} onRemove={() => openModal(MODAL.EMAIL_SMTP_REMOVE)} />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      SMTP Host <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="smtp.gmail.com" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      SMTP Port <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="587" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="encryption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Encryption</FormLabel>
                  <Select value={field.value} onValueChange={(v) => handleEncryptionChange(v as SmtpEncryption)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tls">TLS (STARTTLS, port 587)</SelectItem>
                      <SelectItem value="ssl">SSL (port 465)</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      SMTP Username <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="you@yourdomain.com" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      SMTP Password {!hasPassword && <span className="text-red-500">*</span>}
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={hasPassword ? "••••••• saved — leave blank to keep" : "••••••••"}
                          autoComplete="new-password"
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {hasPassword && (
                      <FormDescription className="text-xs">
                        A password is saved. Leave blank to keep it.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      From Email Address <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="billing@yourdomain.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your business name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button type="button" variant="outline" className="rounded-2xl" onClick={openTestDialog}>
                <Send className="w-4 h-4 mr-1" />
                Send Test Email
              </Button>
              <Button type="submit" className="rounded-2xl" disabled={saveSmtp.isPending}>
                {saveSmtp.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Save SMTP Settings
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Test email recipient */}
      <CustomModal
        title="Send Test Email"
        description="Sends a test through the SMTP details currently on the form (unsaved changes included)"
        open={isOpen(MODAL.EMAIL_SMTP_TEST)}
        onOpenChange={(open) => (open ? openModal(MODAL.EMAIL_SMTP_TEST) : closeModal(MODAL.EMAIL_SMTP_TEST))}
        module={MODULES.SETTINGS}
      >
        <form
          className="space-y-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (testEmailValid) sendTest();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="smtp-test-to">Send to</Label>
            <Input
              id="smtp-test-to"
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@yourdomain.com"
              autoFocus
            />
            {testTo && !testEmailValid && <p className="text-xs text-red-500">Enter a valid email address</p>}
          </div>
          <Button type="submit" className="w-full" disabled={!testEmailValid || testSmtp.isPending}>
            {testSmtp.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </form>
      </CustomModal>

      {/* Remove SMTP confirmation */}
      <CustomModal
        title="Remove SMTP"
        open={isOpen(MODAL.EMAIL_SMTP_REMOVE)}
        onOpenChange={(open) => (open ? openModal(MODAL.EMAIL_SMTP_REMOVE) : closeModal(MODAL.EMAIL_SMTP_REMOVE))}
        module={MODULES.SETTINGS}
      >
        <ConfirmationForm
          title="Stop using your SMTP server? Emails will go back to being sent by the platform mailer."
          loading={removeSmtp.isPending}
          onResult={(confirmed) => {
            if (!confirmed) return closeModal(MODAL.EMAIL_SMTP_REMOVE);
            removeSmtp.mutate(undefined, { onSettled: () => closeModal(MODAL.EMAIL_SMTP_REMOVE) });
          }}
        />
      </CustomModal>
    </SettingsSection>
  );
}
