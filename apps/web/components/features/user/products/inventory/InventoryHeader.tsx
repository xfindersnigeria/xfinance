"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import InventoryStatCardSmall from "./InventoryStatCardSmall";
import { Download, Info, Package, TrendingDown, TrendingUp } from "lucide-react";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

export default function InventoryHeader({
  data,
  loading,
}: {
  data?: {
    totalItems?: number;
    normal?: number;
    lowStock?: number;
    critical?: number;
    totalStockValue?: number;
    monthlyMovements?: number;
  };
  loading: boolean;
}) {
  const sym = useEntityCurrencySymbol();

  function formatCurrency(n?: number): string {
    if (n === undefined || n === null) return "—";
    if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${sym}${(n / 1_000).toFixed(1)}K`;
    return `${sym}${n.toLocaleString()}`;
  }

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Inventory</h2>
          <p className="text-muted-foreground">Track stock levels and reorder points</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InventoryStatCardSmall
          title="Total Stock Value"
          value={loading ? "—" : formatCurrency(data?.totalStockValue ?? 0)}
          subtitle="Based on cost price"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <InventoryStatCardSmall
          title="Low Stock Items"
          value={loading ? "—" : (data?.lowStock ?? 0)}
          subtitle="Below reorder point"
          icon={<Info className="w-5 h-5" />}
        />
        <InventoryStatCardSmall
          title="Out of Stock"
          value={loading ? "—" : (data?.critical ?? 0)}
          subtitle="Needs immediate restock"
          icon={<TrendingDown className="w-5 h-5" />}
        />
        <InventoryStatCardSmall
          title="Stock Movements"
          value={loading ? "—" : (data?.monthlyMovements ?? 0)}
          subtitle="Units adjusted this month"
          icon={<Package className="w-5 h-5" />}
        />
      </div>
    </div>
  );
}
