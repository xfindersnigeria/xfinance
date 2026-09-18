"use client";
import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useEmailSettings } from "@/lib/api/hooks/useEmailSettings";
import type { EmailTemplateType } from "@/lib/api/services/emailSettingsService";
import SmtpSettingsCard from "./SmtpSettingsCard";
import EmailAutomationCard from "./EmailAutomationCard";
import EmailTemplatesCard from "./EmailTemplatesCard";
import EmailSignatureCard from "./EmailSignatureCard";
import EmailTemplateEditor from "./EmailTemplateEditor";

export default function EmailSettings() {
  const { data, isLoading, isError, error } = useEmailSettings();
  const [editor, setEditor] = useState<{ type: EmailTemplateType; mode: "edit" | "preview" } | null>(null);

  const openEditor = (type: EmailTemplateType, mode: "edit" | "preview") => {
    setEditor({ type, mode });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (editor) {
    return (
      <EmailTemplateEditor
        key={`${editor.type}-${editor.mode}`}
        type={editor.type}
        initialMode={editor.mode}
        onBack={() => setEditor(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-gray-500">
        <Loader2 className="animate-spin w-5 h-5 mr-2" />
        Loading email settings...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-md text-sm text-red-500">
        {(error as Error)?.message || "Couldn't load email settings"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SmtpSettingsCard smtp={data.smtp} delivery={data.delivery} />
      <EmailAutomationCard automation={data.automation} />
      <EmailTemplatesCard templates={data.templates} onOpen={openEditor} />
      <EmailSignatureCard signature={data.signature} />
    </div>
  );
}
