"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** White settings card — same shell as CustomTable / Module Management */
export function SettingsSection({ title, subtitle, icon, actions, className, children }: SettingsSectionProps) {
  return (
    <section className={cn("w-full bg-white p-4 sm:p-6 rounded-2xl shadow-md", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0 [&>svg]:w-4 [&>svg]:h-4">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-normal text-base">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

interface SwitchRowProps {
  title: string;
  description: React.ReactNode;
  control: React.ReactNode;
}

/** A label + description on the left, a switch on the right */
export function SwitchRow({ title, description, control }: SwitchRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
