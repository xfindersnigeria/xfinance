"use client";
import { useParams } from "next/navigation";
import React from "react";
import ProfitAndLoss from "./profit-and-loss";
import CashFlowStatement from "./cash-flow-statement";
import { TriangleAlert } from "lucide-react";

const REPORT_COMPONENTS: Record<string, React.ComponentType> = {
  "profit-and-loss": ProfitAndLoss,
  "cash-flow-statement": CashFlowStatement,
};

export default function ReportsDetails() {
  const params = useParams();
  const key = params?.key ? params.key.toString() : "";

  const ReportComponent = REPORT_COMPONENTS[key];

  if (!ReportComponent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center ">
        <span className="bg-primary/10 rounded-lg p-6">
          {" "}
          <p className="text-lg font-semibold text-gray-700 flex items-center justify-center">
            <TriangleAlert className="w-5 h-5 inline mr-2 text-red-500" />
            Report not found
          </p>
          <p className="text-sm text-gray-500">
            The report <span className="font-mono text-gray-700">{key}</span> is
            not available yet.
          </p>
        </span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <ReportComponent />
    </div>
  );
}
