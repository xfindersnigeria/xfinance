"use client";
import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { getAllCurrencies, CurrencyOption } from "@/lib/utils/currencies";

interface CurrencyPickerProps {
  value?: string;
  onChange: (currency: CurrencyOption) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** When provided, only these currencies are shown (e.g. group-active currencies) */
  options?: CurrencyOption[];
}

export default function CurrencyPicker({
  value,
  onChange,
  placeholder = "Select currency",
  disabled,
  className,
  options,
}: CurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const currencies = options ?? getAllCurrencies();
  const selected = currencies.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          {selected
            ? `${selected.symbol} ${selected.code} — ${selected.name}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {currencies.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.code} ${c.name}`}
                  onSelect={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === c.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-mono text-xs mr-2 text-muted-foreground w-10 shrink-0">
                    {c.code}
                  </span>
                  <span className="truncate">
                    {c.symbol} {c.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
