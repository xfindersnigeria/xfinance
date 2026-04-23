"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MODULES } from "@/lib/types/enums";
import { Calendar } from "lucide-react";
import * as React from "react";

interface CustomModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  width?: string;
  module: MODULES;
}

export function CustomModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  width = "sm:max-w-xl",
  module,
}: // gradientClass = "from-cyan-500 to-blue-500",
CustomModalProps) {
  const getGradientClass = () => {
    if (module === MODULES.PURCHASES) return "from-orange-500 to-amber-700";
    if (module === MODULES.SALES) return "from-cyan-500 to-blue-500";
    if (module === MODULES.PRODUCTS) return "from-green-500 to-emerald-500";
    if (module === MODULES.ASSETS) return "from-purple-500 to-pink-500";
    if (module === MODULES.HR_PAYROLL) return "from-indigo-500 to-violet-500";
    if (module === MODULES.ACCOUNTS) return "from-teal-500 to-cyan-500";
    if (module === MODULES.BUDGET) return "from-yellow-500 to-orange-500";
    if (module === MODULES.ENTITY) return "from-gray-500 to-gray-700";
    if (module === MODULES.GROUP) return "from-blue-500 to-indigo-500";
    return "from-cyan-500 to-blue-500";
  };

  console.log("Modal open state:", open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={`${width} max-h-[90vh] overflow-hidden rounded-xl p-0`}
      >
        <div
          className={`sticky top-0 z-10 border-b rounded-t-xl px-6 py-4 flex items-center gap-2 bg-linear-to-br ${getGradientClass()}`}
        >
          <span className="bg-white/20 rounded-full p-2">
            <Calendar className="text-white w-5 h-5" />
          </span>
          <div>
            <DialogTitle
              className={`${
                title ? "text-white font-bold text-lg" : "sr-only"
              }`}
            >
              {title}
            </DialogTitle>
            <DialogDescription
              className="sr-only"
            >
              {description}
            </DialogDescription>
            <p
              className={`${description ? "text-white/80 text-xs" : "sr-only"}`}
            >
              {description}
            </p>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] pb-2 pt-0 px-4 -mt-6 z-10">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
