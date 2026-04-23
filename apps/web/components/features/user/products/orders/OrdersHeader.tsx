"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import OrderStatCardSmall from "./OrderStatCardSmall";
import { Download, Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";

export default function OrdersHeader({
  data,
  loading,
}: {
  data?: any;
  loading: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Orders</h2>
          <p className="text-muted-foreground">
            View and manage POS and online store orders{" "}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OrderStatCardSmall
          title="Today's Sales"
          value={<span className="text-2xl font-bold text-primary">$4,470</span>}
          subtitle={"+12% vs yesterday"}
        />
        <OrderStatCardSmall
          title="Orders Today"
          value={<span className="text-2xl font-bold text-primary">32</span>}
          subtitle={"28 completed"}
        />
        <OrderStatCardSmall
          title="Pending Orders"
          value={<span className="text-2xl font-bold text-primary">4</span>}
          subtitle={"Needs attention"}
        />
        <OrderStatCardSmall
          title="Avg Order Value"
          value={<span className="text-2xl font-bold text-primary">$139.69</span>}
          subtitle={"+8% vs yesterday"}
        />
      </div>
    </div>
  );
}
