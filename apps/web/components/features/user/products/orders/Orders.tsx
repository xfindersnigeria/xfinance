"use client";
import { CustomTable } from "@/components/local/custom/custom-table";

import { useCustomers } from "@/lib/api/hooks/useSales";
import { ordersColumns, ordersData } from "./OrderColumn";
import OrdersHeader from "./OrdersHeader";
import OnlineStoreCard from "./OnlineStoreCard";

export default function Orders() {
  const { data, isLoading } = useCustomers();
  const customers = data?.customers || [];
  return (
    <div className="space-y-4">
      <OrdersHeader data={data} loading={isLoading} />
      <OnlineStoreCard />
      <CustomTable
        searchPlaceholder="Search orders..."
        tableTitle="Recent Orders"
        columns={ordersColumns}
        data={ordersData}
        pageSize={10}
        loading={isLoading}
        display={{ filterComponent: false }}
      />
    </div>
  );
}
