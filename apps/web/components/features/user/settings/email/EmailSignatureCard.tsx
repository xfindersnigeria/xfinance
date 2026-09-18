"use client";
import React, { useEffect, useState } from "react";
import { Loader2, PenLine, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpdateEmailSignature } from "@/lib/api/hooks/useEmailSettings";
import { SettingsSection } from "./SettingsSection";

const MAX_LENGTH = 2000;

export default function EmailSignatureCard({ signature }: { signature: string | undefined }) {
  const update = useUpdateEmailSignature();
  const [value, setValue] = useState(signature ?? "");

  useEffect(() => {
    setValue(signature ?? "");
  }, [signature]);

  const dirty = value !== (signature ?? "");
  const tooLong = value.length > MAX_LENGTH;

  return (
    <SettingsSection
      title="Email Signature"
      subtitle="Added to the bottom of every email sent to your customers"
      icon={<PenLine />}
    >
      <div className="space-y-2">
        <Label htmlFor="email-signature">Signature Content</Label>
        <Textarea
          id="email-signature"
          className="min-h-[120px]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={"Best regards,\nYour Business Name\n\nPhone: …\nEmail: …"}
        />
        <p className={tooLong ? "text-xs text-red-500" : "text-xs text-gray-500"}>
          {value.length}/{MAX_LENGTH} characters
        </p>
      </div>
      <div className="flex justify-end mt-4">
        <Button
          className="rounded-2xl w-full sm:w-auto"
          disabled={!dirty || tooLong || update.isPending}
          onClick={() => update.mutate(value)}
        >
          {update.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Save Signature
        </Button>
      </div>
    </SettingsSection>
  );
}
