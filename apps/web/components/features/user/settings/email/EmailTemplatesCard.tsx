"use client";
import React from "react";
import { Eye, FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmailTemplateSummary, EmailTemplateType } from "@/lib/api/services/emailSettingsService";
import { SettingsSection } from "./SettingsSection";

interface Props {
  templates: EmailTemplateSummary[] | undefined;
  loading?: boolean;
  onOpen: (type: EmailTemplateType, mode: "edit" | "preview") => void;
}

export default function EmailTemplatesCard({ templates, loading, onOpen }: Props) {
  return (
    <SettingsSection
      title="Email Templates"
      subtitle="Customise the subject and message of each email your customers receive"
      icon={<FileText />}
    >
      <div className="space-y-3">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        {templates?.map((t) => (
          <div
            key={t.type}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{t.name}</p>
                {t.isCustom && (
                  <Badge className="bg-primary/10 text-primary border-transparent rounded-full font-medium">
                    Customised
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => onOpen(t.type, "preview")}>
                <Eye className="w-3.5 h-3.5 mr-1" />
                Preview
              </Button>
              <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => onOpen(t.type, "edit")}>
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
