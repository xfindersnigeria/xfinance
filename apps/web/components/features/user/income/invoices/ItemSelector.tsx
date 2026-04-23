"use client";

import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  disabledIds?: string[]; // new prop
}

export function ItemSelector({
  items,
  isLoading,
  value,
  onChange,
  placeholder = "Select item...",
  disabledIds = [],
}: ItemSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedItem = items?.find((item) => item.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between truncate"
          disabled={isLoading}
        >
          {selectedItem
            ? `${selectedItem.name}${selectedItem.sku ? ` (${selectedItem.sku})` : ""}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-75 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search items..." />
          <CommandEmpty>
            {isLoading ? "Loading items..." : "No items found."}
          </CommandEmpty>
          <CommandList>
            <CommandGroup>
              {items?.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={(currentValue) => {
                    if (disabledIds.includes(item.id)) return;
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  disabled={disabledIds.includes(item.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.sku && (
                      <span className="text-sm text-muted-foreground">
                        {item.sku}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
