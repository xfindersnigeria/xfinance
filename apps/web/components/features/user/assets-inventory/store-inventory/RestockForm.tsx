"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCreateStoreSupplyRestock } from "@/lib/api/hooks/useAssets";

interface RestockFormProps {
  row: { id: string; name: string; sku?: string; quantity: number; minQuantity: number; unitPrice: number };
  onCancel: () => void;
}

export default function RestockForm({ row, onCancel }: RestockFormProps) {
  const [quantityToRestock, setQuantityToRestock] = useState(1);
  const [unitPrice, setUnitPrice] = useState(row.unitPrice);
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const createRestock = useCreateStoreSupplyRestock();
  const newStock = row.quantity + quantityToRestock;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRestock.mutate({
      supplyId: row.id,
      quantity: quantityToRestock,
      unitPrice,
      supplier,
      notes: notes || undefined,
      restockDate: new Date(),
    } as any);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      {/* Stock summary */}
      <div className="grid grid-cols-3 gap-3 bg-blue-50 rounded-xl p-4">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Current Stock</div>
          <div className="text-2xl font-bold text-gray-800">{row.quantity}</div>
        </div>
        <div className="text-center border-x border-blue-200">
          <div className="text-xs text-gray-500 mb-1">Min. Quantity</div>
          <div className="text-2xl font-bold text-yellow-600">{row.minQuantity}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">New Stock</div>
          <div className={`text-2xl font-bold ${newStock > row.minQuantity ? "text-green-600" : "text-red-500"}`}>
            {newStock}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Quantity to Restock</label>
          <Input
            type="number"
            min={1}
            value={quantityToRestock}
            onChange={(e) => setQuantityToRestock(Math.max(1, Number(e.target.value)))}
            className="bg-gray-100"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Unit Price (₦)</label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={unitPrice}
            onChange={(e) => setUnitPrice(Number(e.target.value))}
            className="bg-gray-100"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Supplier</label>
          <Input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="e.g. Office Mart Nigeria"
            className="bg-gray-100"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Notes (Optional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="bg-gray-100"
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={createRestock.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={createRestock.isPending}>
          {createRestock.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
          {createRestock.isPending ? "Restocking..." : "Restock"}
        </Button>
      </div>
    </form>
  );
}
