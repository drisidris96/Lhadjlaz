import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ALGERIAN_WILAYAS } from "@/lib/constants";

interface WilayaComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function WilayaCombobox({
  value,
  onChange,
  placeholder = "اختر الولاية",
}: WilayaComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedIndex = ALGERIAN_WILAYAS.findIndex((w) => w === value);
  const displayLabel =
    selectedIndex >= 0 ? `${selectedIndex + 1} - ${ALGERIAN_WILAYAS[selectedIndex]}` : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-12 w-full justify-between bg-muted/50 px-3 text-base font-normal",
            !value && "text-muted-foreground",
          )}
          data-testid="wilaya-trigger"
        >
          <span className="truncate text-right">{displayLabel || placeholder}</span>
          <ChevronDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
      >
        <Command
          dir="rtl"
          filter={(itemValue, search) => {
            if (!search) return 1;
            const s = search.trim();
            if (!s) return 1;
            return itemValue.startsWith(s) ? 1 : itemValue.includes(s) ? 0.5 : 0;
          }}
        >
          <CommandInput placeholder="ابحث عن الولاية..." className="h-11 text-base" />
          <CommandList className="max-h-[280px] overflow-y-auto overscroll-contain">
            <CommandEmpty>لا توجد ولاية مطابقة</CommandEmpty>
            <CommandGroup>
              {ALGERIAN_WILAYAS.map((w, i) => (
                <CommandItem
                  key={w}
                  value={w}
                  onSelect={() => {
                    onChange(w);
                    setOpen(false);
                  }}
                  className="text-base"
                >
                  <Check
                    className={cn(
                      "ms-2 h-4 w-4",
                      value === w ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span>
                    {i + 1} - {w}
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
