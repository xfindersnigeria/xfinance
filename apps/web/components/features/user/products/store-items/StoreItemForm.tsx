"use client";

import { useState } from "react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StoreItemProductForm from "./StoreItemProductForm";
import StoreItemServiceForm from "./StoreItemServiceForm";
import { useProductCategories, useProductUnits } from "@/lib/api/hooks/useSettings";

export default function StoreItemForm({
  item,
  isEditMode = false,
}: {
  item?: any;
  isEditMode?: boolean;
}) {
  // Determine which tab to show in edit mode, or allow switching in add mode
  const initialTab = isEditMode && item?.type ? item.type : "product";
  const [tab, setTab] = useState(initialTab);

  const { data: categoriesData, isLoading: categoriesLoading } =
    useProductCategories();

    // console.log(categoriesData)
  const categories = (categoriesData as any)?.data || [];

   const { data: unitsData, isLoading: unitsLoading } =
    useProductUnits();

    // console.log(unitsData)
  const units = (unitsData as any)?.data || [];

  const handleTabChange = (value: string) => {
    if (isEditMode) return; // Prevent tab switch in edit mode
    setTab(value);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <Tabs value={tab} onValueChange={handleTabChange} className="mb-4">
        {!isEditMode && (
          <TabsList className="w-2/5 flex bg-gray-50 rounded-t-xl">
            <TabsTrigger
              value="product"
              className={tab === "product" ? "text-green-600 font-bold" : ""}
            >
              Product
            </TabsTrigger>
            <TabsTrigger
              value="service"
              className={tab === "service" ? "text-blue-600 font-bold" : ""}
            >
              Service
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="product">
          {(!isEditMode || tab === "product") && (
            <StoreItemProductForm
              item={item}
              isEditMode={isEditMode && tab === "product"}
              categories={categories}
              units={units}
              unitsLoading={unitsLoading}
              categoriesLoading={categoriesLoading}
            />
          )}
        </TabsContent>
        <TabsContent value="service">
          {(!isEditMode || tab === "service") && (
            <StoreItemServiceForm
              item={item}
              isEditMode={isEditMode && tab === "service"}
                categories={categories}
              units={units}
              unitsLoading={unitsLoading}
              categoriesLoading={categoriesLoading}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
