"use client";
import React from "react";
import { CustomTabs, type Tab } from "@/components/local/custom/tabs";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useProductCategories, useProductUnits, useProductBrands } from "@/lib/api/hooks/useSettings";

import { categoryColumns } from "./categories/CategoryColumn";
import CategoryForm from "./categories/CategoryForm";

import { unitColumns } from "./units/UnitColumn";
import UnitForm from "./units/UnitForm";

import { brandColumns } from "./brands/BrandColumn";
import BrandForm from "./brands/BrandForm";

function CategoriesTab() {
  const { isOpen, openModal, closeModal } = useModal();
  const { data: response, isLoading } = useProductCategories();
  const categories = (response as any)?.data ?? [];

  return (
    <>
      <CustomTable
        tableTitle="Product Categories"
        searchPlaceholder="Search categories..."
        columns={categoryColumns}
        data={categories}
        pageSize={10}
        loading={isLoading}
        display={{ searchComponent: false }}
        headerActions={
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={() => openModal(MODAL.PRODUCT_CATEGORY_CREATE)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Category
          </Button>
        }
      />

      <CustomModal
        title="Add Category"
        open={isOpen(MODAL.PRODUCT_CATEGORY_CREATE)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.PRODUCT_CATEGORY_CREATE)
            : closeModal(MODAL.PRODUCT_CATEGORY_CREATE)
        }
        module={MODULES.PRODUCTS}
      >
        <CategoryForm onSuccess={() => closeModal(MODAL.PRODUCT_CATEGORY_CREATE)} />
      </CustomModal>
    </>
  );
}

function UnitsTab() {
  const { isOpen, openModal, closeModal } = useModal();
  const { data: response, isLoading } = useProductUnits();
  const units = (response as any)?.data ?? [];

  return (
    <>
      <CustomTable
        tableTitle="Units of Measurement"
        searchPlaceholder="Search units..."
        columns={unitColumns}
        data={units}
        pageSize={10}
        loading={isLoading}
        display={{ searchComponent: false }}
        headerActions={
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={() => openModal(MODAL.PRODUCT_UNIT_CREATE)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Unit
          </Button>
        }
      />

      <CustomModal
        title="Add Unit"
        open={isOpen(MODAL.PRODUCT_UNIT_CREATE)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.PRODUCT_UNIT_CREATE)
            : closeModal(MODAL.PRODUCT_UNIT_CREATE)
        }
        module={MODULES.PRODUCTS}
      >
        <UnitForm onSuccess={() => closeModal(MODAL.PRODUCT_UNIT_CREATE)} />
      </CustomModal>
    </>
  );
}

function BrandsTab() {
  const { isOpen, openModal, closeModal } = useModal();
  const { data: response, isLoading } = useProductBrands();
  const brands = (response as any)?.data ?? [];

  return (
    <>
      <CustomTable
        tableTitle="Product Brands"
        searchPlaceholder="Search brands..."
        columns={brandColumns}
        data={brands}
        pageSize={10}
        loading={isLoading}
        display={{ searchComponent: false }}
        headerActions={
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={() => openModal(MODAL.PRODUCT_BRAND_CREATE)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Brand
          </Button>
        }
      />

      <CustomModal
        title="Add Brand"
        open={isOpen(MODAL.PRODUCT_BRAND_CREATE)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.PRODUCT_BRAND_CREATE)
            : closeModal(MODAL.PRODUCT_BRAND_CREATE)
        }
        module={MODULES.PRODUCTS}
      >
        <BrandForm onSuccess={() => closeModal(MODAL.PRODUCT_BRAND_CREATE)} />
      </CustomModal>
    </>
  );
}

const productTabs: Tab[] = [
  { title: "Categories", value: "categories", content: <CategoriesTab /> },
  { title: "Units", value: "units", content: <UnitsTab /> },
  { title: "Brands", value: "brands", content: <BrandsTab /> },
];

export default function ProductSettings() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Product</h2>
        <p className="text-sm text-gray-500">Manage categories, units, and brands for your products</p>
      </div>
      <CustomTabs tabs={productTabs} storageKey="settings-product-tab" />
    </div>
  );
}
