"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { cn } from "@/lib/utils";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import {
  useAssetCategories,
  useAssetDepreciationSchedule,
} from "@/lib/api/hooks/useAssets";
import type { DepreciationScheduleRow } from "@/lib/api/services/assetsService";
import AssetCategoryActions from "./AssetCategoryActions";
import AssetCategoryForm from "./AssetCategoryForm";
import { fmtAmount } from "@/lib/api/hooks/useCurrencyFormat";
import { formatDate } from "./utils/format";

const AMOUNT_KEYS = [
  "openingBalance",
  "additions",
  "totalCost",
  "depreciationForYear",
  "openingAccumulated",
  "totalAccumulated",
] as const;

export default function AssetCategoriesTable({
  onSelectCategory,
}: {
  onSelectCategory: (category: { id: string; name: string }) => void;
}) {
  const sym = useEntityCurrencySymbol();
  const { isOpen, openModal, closeModal } = useModal();
  const [search, setSearch] = useState("");

  const { data: scheduleRes, isLoading } = useAssetDepreciationSchedule();
  const { data: categoriesRes } = useAssetCategories();
  const schedule = scheduleRes?.data;
  const categoriesById = useMemo(
    () => new Map((categoriesRes?.data ?? []).map((c) => [c.id, c])),
    [categoriesRes],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (schedule?.rows ?? []).filter((r) => !term || r.name.toLowerCase().includes(term));
  }, [schedule, search]);

  const totals = useMemo(
    () =>
      AMOUNT_KEYS.reduce(
        (t, k) => ({ ...t, [k]: rows.reduce((s, r) => s + r[k], 0) }),
        {} as Record<(typeof AMOUNT_KEYS)[number], number>,
      ),
    [rows],
  );

  const amount = (v: number) => fmtAmount(v, sym);
  const headCell = "px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap";
  const numCell = "px-4 py-2 text-right text-gray-700 whitespace-nowrap";

  const renderAmounts = (r: Pick<DepreciationScheduleRow, (typeof AMOUNT_KEYS)[number]>) => (
    <>
      <td className={numCell}>{amount(r.openingBalance)}</td>
      <td className={cn(numCell, "text-green-700")}>
        {r.additions > 0 ? `+${amount(r.additions)}` : amount(0)}
      </td>
      <td className={cn(numCell, "font-semibold text-gray-900")}>{amount(r.totalCost)}</td>
    </>
  );

  return (
    <div className="w-full bg-white p-4 rounded-2xl shadow-md">
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-normal text-base">Asset Categories</h2>
            <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs text-gray-700">
              Depreciation Schedule
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {schedule
              ? `Financial year ${formatDate(schedule.fiscalYear.start)} – ${formatDate(schedule.fiscalYear.end)}. `
              : ""}
            Click on a category name to filter the asset register.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-gray-100 rounded-2xl"
            />
          </div>
          <Button className="rounded-2xl" onClick={() => openModal(MODAL.ASSET_CATEGORY_CREATE)}>
            <Plus /> New Category
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full bg-white text-xs">
          <thead>
            <tr>
              <th className={headCell}>S/N</th>
              <th className={headCell}>Asset Category</th>
              <th className={cn(headCell, "text-right")}>Opening Bal.</th>
              <th className={cn(headCell, "text-right")}>Addition</th>
              <th className={cn(headCell, "text-right")}>Total Cost</th>
              <th className={cn(headCell, "text-center")}>Depr. %</th>
              <th className={cn(headCell, "text-right")}>Depr. in Year</th>
              <th className={cn(headCell, "text-right")}>Opening Accum</th>
              <th className={cn(headCell, "text-right")}>Total Accum</th>
              <th className={headCell}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t">
                  <td colSpan={10} className="px-4 py-2">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}

            {!isLoading && rows.length === 0 && (
              <tr className="border-t">
                <td colSpan={10} className="text-center py-8 text-gray-400">
                  {search ? "No categories match your search." : "No asset categories yet."}
                </td>
              </tr>
            )}

            {rows.map((r, i) => {
              const category = r.categoryId ? categoriesById.get(r.categoryId) : undefined;
              return (
                <tr key={r.categoryId ?? "uncategorised"} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      className={cn(
                        "text-left font-normal text-gray-900 hover:text-primary hover:underline",
                        !r.categoryId && "text-amber-700",
                      )}
                      onClick={() =>
                        onSelectCategory({ id: r.categoryId ?? "uncategorised", name: r.name })
                      }
                    >
                      {r.name}
                    </button>
                    <div className="text-xs text-gray-400">
                      {r.assetCount} asset{r.assetCount === 1 ? "" : "s"}
                    </div>
                  </td>
                  {renderAmounts(r)}
                  <td className="px-4 py-2 text-center">
                    {r.depreciationRate != null ? (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {r.depreciationRate}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={cn(numCell, "text-red-600")}>{amount(r.depreciationForYear)}</td>
                  <td className={cn(numCell, "text-gray-500")}>
                    {amount(r.openingAccumulated)}
                  </td>
                  <td className={cn(numCell, "font-semibold text-gray-900")}>{amount(r.totalAccumulated)}</td>
                  <td className="px-2 py-2">
                    {category && <AssetCategoryActions category={category} />}
                  </td>
                </tr>
              );
            })}

            {!isLoading && rows.length > 0 && (
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="px-4 py-2 text-gray-900" colSpan={2}>
                  Total
                </td>
                {renderAmounts(totals)}
                <td className="px-4 py-2 text-center">—</td>
                <td className={cn(numCell, "text-red-600")}>{amount(totals.depreciationForYear)}</td>
                <td className={cn(numCell, "text-gray-500")}>
                  {amount(totals.openingAccumulated)}
                </td>
                <td className={cn(numCell, "text-gray-900")}>{amount(totals.totalAccumulated)}</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CustomModal
        title="New Asset Category"
        module={MODULES.ASSETS}
        open={isOpen(MODAL.ASSET_CATEGORY_CREATE)}
        onOpenChange={(v) =>
          v ? openModal(MODAL.ASSET_CATEGORY_CREATE) : closeModal(MODAL.ASSET_CATEGORY_CREATE)
        }
      >
        <AssetCategoryForm />
      </CustomModal>
    </div>
  );
}
