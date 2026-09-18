"use client";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Eye, Info, Loader2, Pencil, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import {
  useEmailTemplate,
  usePreviewEmailTemplate,
  useResetEmailTemplate,
  useSaveEmailTemplate,
} from "@/lib/api/hooks/useEmailSettings";
import type { EmailTemplatePreview, EmailTemplateType } from "@/lib/api/services/emailSettingsService";
import { SettingsSection } from "./SettingsSection";

interface Props {
  type: EmailTemplateType;
  initialMode: "edit" | "preview";
  onBack: () => void;
}

export default function EmailTemplateEditor({ type, initialMode, onBack }: Props) {
  const { data: template, isLoading } = useEmailTemplate(type);
  const save = useSaveEmailTemplate();
  const reset = useResetEmailTemplate();
  const preview = usePreviewEmailTemplate();

  const [mode, setMode] = useState<"edit" | "preview">(initialMode);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [rendered, setRendered] = useState<EmailTemplatePreview | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Seed the editor from the saved template (on load, save and reset)
  useEffect(() => {
    if (!template) return;
    setSubject(template.subject);
    setBody(template.body);
  }, [template]);

  const dirty = !!template && (subject !== template.subject || body !== template.body);
  const matchesDefault = !!template && subject === template.defaults.subject && body === template.defaults.body;
  const canSave = dirty && subject.trim().length > 0 && body.trim().length > 0;

  const renderPreview = (s: string, b: string) => {
    if (!s.trim() || !b.trim()) {
      toast.error("Subject and body can't be empty");
      return;
    }
    preview.mutate({ type, subject: s, body: b }, { onSuccess: (res) => setRendered(res) });
  };

  // (Re)render the preview when the saved template loads or changes (save / reset) while previewing
  useEffect(() => {
    if (mode === "preview" && template) renderPreview(template.subject, template.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const showPreview = () => {
    setMode("preview");
    renderPreview(subject, body);
  };

  const copyVariable = async (variable: string) => {
    const token = `{{${variable}}}`;
    try {
      await navigator.clipboard.writeText(token);
      toast.success(`Copied ${token} to clipboard`);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const insertVariable = (variable: string) => {
    const token = `{{${variable}}}`;
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleReset = (confirmed: boolean) => {
    setConfirmReset(false);
    if (!confirmed || !template) return;
    if (template.isCustom) {
      // The hook writes the default back into the template cache, which re-seeds the editor
      reset.mutate(type);
    } else {
      // Nothing saved yet — just put the defaults back in the editor
      setSubject(template.defaults.subject);
      setBody(template.defaults.body);
      if (mode === "preview") renderPreview(template.defaults.subject, template.defaults.body);
      toast.info("Template reset to default");
    }
  };

  const handleSave = () => {
    save.mutate({ type, subject, body });
  };

  const lastModified = template?.updatedAt
    ? new Date(template.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "Never (using the default)";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-md">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to email settings" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-normal text-base">{template?.name ?? "Email Template"}</h2>
              {template?.isCustom && (
                <Badge className="bg-primary/10 text-primary border-transparent rounded-full font-medium">
                  Customised
                </Badge>
              )}
              {dirty && (
                <Badge variant="outline" className="rounded-full font-normal">
                  Unsaved changes
                </Badge>
              )}
            </div>
            {template?.description && <p className="text-sm text-gray-500">{template.description}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "edit" ? (
            <Button variant="outline" className="rounded-2xl" onClick={showPreview} disabled={!template}>
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
          ) : (
            <Button variant="outline" className="rounded-2xl" onClick={() => setMode("edit")} disabled={!template}>
              <Pencil className="w-4 h-4 mr-1" />
              Edit Template
            </Button>
          )}
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => setConfirmReset(true)}
            disabled={!template || (!template.isCustom && matchesDefault) || reset.isPending}
          >
            {reset.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
            Reset to Default
          </Button>
          <Button className="rounded-2xl" onClick={handleSave} disabled={!canSave || save.isPending}>
            {save.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 min-w-0">
          {isLoading || !template ? (
            <div className="bg-white p-6 rounded-2xl shadow-md space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          ) : mode === "edit" ? (
            <SettingsSection title="Template Editor" icon={<Pencil />}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-subject">Subject Line</Label>
                  <Input
                    id="template-subject"
                    value={subject}
                    maxLength={300}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject"
                  />
                  {!subject.trim() && <p className="text-xs text-red-500">Subject is required</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-body">Email Body</Label>
                  <Textarea
                    id="template-body"
                    ref={bodyRef}
                    value={body}
                    maxLength={10000}
                    onChange={(e) => setBody(e.target.value)}
                    className="min-h-[320px] sm:min-h-[400px] text-sm"
                    placeholder="Enter email body content"
                  />
                  {!body.trim() && <p className="text-xs text-red-500">Body is required</p>}
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4">
                  <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary">Using variables</p>
                    <p className="text-xs text-primary/80 mt-0.5">
                      Variables like {"{{customer_name}}"} are replaced with real data when the email is sent. Click a
                      variable to copy it, or use Insert to add it where your cursor is. Your email signature is added
                      automatically.
                    </p>
                  </div>
                </div>
              </div>
            </SettingsSection>
          ) : (
            <SettingsSection title="Email Preview" subtitle="Rendered with sample data" icon={<Eye />}>
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-50 border-b p-4 text-sm space-y-1">
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Subject:</span>
                    <span className="text-gray-900 break-words min-w-0">
                      {rendered?.subject ?? (preview.isPending ? "Rendering…" : "—")}
                    </span>
                  </div>
                </div>
                <div className="relative bg-white">
                  {preview.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                    </div>
                  )}
                  {rendered ? (
                    <iframe
                      title="Email preview"
                      sandbox=""
                      srcDoc={rendered.html}
                      className="w-full h-[480px] sm:h-[600px] border-0"
                    />
                  ) : (
                    <div className="h-[320px]" />
                  )}
                </div>
              </div>
              {dirty && (
                <p className="text-xs text-gray-500 mt-3">
                  This preview includes your unsaved changes. Save the template to use it.
                </p>
              )}
            </SettingsSection>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 min-w-0">
          <SettingsSection title="Available Variables" subtitle="Click to copy">
            {template ? (
              <div className="space-y-2">
                {template.variables.map((variable) => (
                  <div
                    key={variable}
                    className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <button
                      type="button"
                      className="text-xs text-gray-700 text-left break-all flex-1"
                      onClick={() => copyVariable(variable)}
                    >
                      {`{{${variable}}}`}
                    </button>
                    <div className="flex shrink-0">
                      {mode === "edit" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => insertVariable(variable)}
                        >
                          Insert
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => copyVariable(variable)}
                        aria-label={`Copy ${variable}`}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </SettingsSection>

          <SettingsSection title="Template Info">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Status</p>
                {template?.isCustom ? (
                  <Badge className="bg-primary/10 text-primary border-transparent rounded-full font-medium">
                    Customised
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600 border-transparent rounded-full font-medium">
                    Default
                  </Badge>
                )}
              </div>
              <Separator />
              <div>
                <p className="text-gray-500 mb-1">Last Modified</p>
                <p className="text-gray-900">{lastModified}</p>
              </div>
              <Separator />
              <div>
                <p className="text-gray-500 mb-1">Total Variables</p>
                <p className="text-gray-900">{template?.variables.length ?? "—"}</p>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>

      <CustomModal
        title="Reset to Default"
        open={confirmReset}
        onOpenChange={setConfirmReset}
        module={MODULES.SETTINGS}
      >
        <ConfirmationForm
          title={
            template?.isCustom
              ? "Discard your customised template and go back to the default?"
              : "Discard your changes and go back to the default?"
          }
          onResult={handleReset}
          loading={reset.isPending}
        />
      </CustomModal>
    </div>
  );
}
