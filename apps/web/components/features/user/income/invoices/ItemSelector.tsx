"use client";

import { SearchableCombobox } from "@/components/ui/searchable-combobox";

interface Item {
  id: string;
  name: string;
  sku?: string;
  [key: string]: any;
}

interface ItemSelectorProps {
  items: Item[] | undefined;
  isLoading: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabledIds?: string[];
}

export function ItemSelector({
  items,
  isLoading,
  value,
  onChange,
  placeholder = "Select item...",
  disabledIds = [],
}: ItemSelectorProps) {
  const options = (items ?? []).map((item) => ({
    value: item.id,
    label: item.name,
    description: item.sku,
  }));

  return (
    <SearchableCombobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search items..."
      emptyMessage="No items found."
      isLoading={isLoading}
      disabledValues={disabledIds}
      className="w-75"
    />
  );
}
