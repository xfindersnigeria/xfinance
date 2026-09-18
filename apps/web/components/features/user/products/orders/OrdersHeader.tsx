"use client";

import React from "react";
import { Download, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtAmount, useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import type { OrderStats } from "@/lib/api/services/ordersService";
import OrderStatCardSmall from "./OrderStatCardSmall";

const vsYesterday = (change: number | null | undefined) =>
  change === null || change === undefined ? undefined : `${change > 0 ? "+" : ""}${change}% vs yesterday`;

export default function OrdersHeader({
  stats,
  loading,
  onExport,
  exporting,
  onNewSale,
}: {
  stats?: OrderStats;
  loading: boolean;
  onExport: () => void;
  exporting: boolean;
  onNewSale: () => void;
}) {
  const sym = useEntityCurrencySymbol();
  const show = (v: React.ReactNode) => (loading && !stats ? "—" : v);

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Orders</h2>
          <p className="text-muted-foreground">View and manage POS and online store orders</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl" onClick={onExport} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}
            Export
          </Button>
          <Button className="rounded-xl" onClick={onNewSale}>
            <Plus />
            New sale
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OrderStatCardSmall
          title="Today's Sales"
          value={show(fmtAmount(stats?.salesToday ?? 0, sym))}
          subtitle={vsYesterday(stats?.salesChange)}
        />
        <OrderStatCardSmall
          title="Orders Today"
          value={show(stats?.ordersToday ?? 0)}
          subtitle={stats ? `${stats.completedToday} completed` : undefined}
        />
        <OrderStatCardSmall
          title="Pending Orders"
          value={show(stats?.pendingOrders ?? 0)}
          subtitle={stats ? (stats.pendingOrders > 0 ? "Needs attention" : "All caught up") : undefined}
        />
        <OrderStatCardSmall
          title="Avg Order Value"
          value={show(fmtAmount(stats?.avgOrderValue ?? 0, sym))}
          subtitle={vsYesterday(stats?.avgOrderChange)}
        />
      </div>
    </div>
  );
}
