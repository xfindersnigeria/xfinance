"use client";

import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { useProjectSupplies } from "@/lib/api/hooks/useProjects";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface ProjectSuppliesProps {
  projectId: string;
}

export default function ProjectSupplies({ projectId }: ProjectSuppliesProps) {
  const sym = useEntityCurrencySymbol();
  const { data, isLoading } = useProjectSupplies(projectId);

  function fmtMoney(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000) return `${sym}${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${sym}${value}`;
  }

  const issues: any[] = (data as any)?.data ?? [];
  const totalSuppliesCost: number = (data as any)?.totalSuppliesCost ?? 0;

  const columns = [
    {
      key: "id",
      title: "ID",
      render: (value: string) => (
        <span className="text-indigo-600 font-medium text-sm">{value}</span>
      ),
    },
    {
      key: "date",
      title: "Date",
      render: (value: string) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toISOString().slice(0, 10)}
        </span>
      ),
    },
    {
      key: "supplyName",
      title: "Supply Name",
      render: (value: string) => (
        <span className="text-sm text-gray-700">{value}</span>
      ),
    },
    {
      key: "sku",
      title: "SKU",
      render: (value: string) => (
        <span className="text-sm text-gray-500">{value || "—"}</span>
      ),
    },
    {
      key: "quantity",
      title: "Quantity",
      render: (value: number) => (
        <span className="text-sm text-gray-700">{value}</span>
      ),
    },
    {
      key: "unitPrice",
      title: "Unit Price",
      render: (value: number) => (
        <span className="text-sm text-gray-700">{fmtMoney(value)}</span>
      ),
    },
    {
      key: "totalCost",
      title: "Total Cost",
      render: (value: number) => (
        <span className="text-sm font-medium text-red-600">{fmtMoney(value)}</span>
      ),
    },
  ];

  return (
    <>
      <CustomTable
        columns={columns}
        data={issues}
        tableTitle="Project Supplies"
        display={{ searchComponent: false }}
        loading={isLoading}
      />

      <div className="mt-0 bg-white rounded-b-2xl border-t border-gray-100 px-4 py-3 flex items-center">
        <span className="font-semibold text-sm text-gray-700 mr-auto">Total Supplies Cost</span>
        <span className="text-sm font-bold text-red-600">{fmtMoney(totalSuppliesCost)}</span>
      </div>
    </>
  );
}
