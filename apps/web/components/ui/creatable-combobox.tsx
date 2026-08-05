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
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComboboxOption } from "@/components/ui/searchable-combobox";

interface CreatableComboboxProps {
  options: ComboboxOption[];
  selectedId?: string;
  freeText?: string;
  onSelect: (id: string) => void;
  onFreeText: (text: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

/**
 * Searchable select that also accepts free text — pick an existing option,
 * or type a name that doesn't match anything and use it as-is. Callers keep
 * two separate fields (an id and a free-text name); exactly one is set at a
 * time. Used where a record (vendor, customer, ...) may not exist yet and
 * shouldn't be forced into a real lookup record just to save the form.
 */
export function CreatableCombobox({
  options,
  selectedId,
  freeText,
  onSelect,
  onFreeText,
  placeholder = "Select or type...",
  searchPlaceholder = "Search or type a new name...",
  emptyMessage = "No results.",
  isLoading = false,
  disabled = false,
  className,
  triggerClassName,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = options.find((o) => o.value === selectedId);
  const displayLabel = selected?.label || freeText || "";

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;
  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === search.trim().toLowerCase(),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal truncate", triggerClassName)}
          disabled={disabled || isLoading}
        >
          <span className="truncate">
            {displayLabel || (isLoading ? "Loading..." : placeholder)}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", className)} align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading..." : emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onSelect(option.value);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedId === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {search.trim() && !exactMatch && (
                <CommandItem
                  value={`__create__${search}`}
                  onSelect={() => {
                    onFreeText(search.trim());
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Use &quot;{search.trim()}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
