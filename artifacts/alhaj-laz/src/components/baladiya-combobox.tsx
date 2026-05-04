import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ALGERIAN_BALADIYAT } from "@/lib/constants";

interface BaladiyaComboboxProps {
  wilaya: string;
  value: string;
  onChange: (value: string) => void;
}

export function BaladiyaCombobox({ wilaya, value, onChange }: BaladiyaComboboxProps) {
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    if (!wilaya) return [];
    return ALGERIAN_BALADIYAT[wilaya] ?? [];
  }, [wilaya]);

  const filtered = useMemo(() => {
    const q = query.trim();
    const items = list.map((name, idx) => ({ name, idx }));
    if (!q) return items;
    const startsWith = items.filter((it) => it.name.startsWith(q));
    const includes = items.filter(
      (it) => !it.name.startsWith(q) && it.name.includes(q),
    );
    return [...startsWith, ...includes];
  }, [query, list]);

  if (!wilaya) {
    return (
      <div className="rounded-md border border-input bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        اختر الولاية أولاً
      </div>
    );
  }

  return (
    <div className="rounded-md border border-input bg-muted/50 overflow-hidden">
      <div className="relative border-b border-input bg-background">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن البلدية..."
          className="h-11 border-0 bg-transparent pr-9 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      <div
        className="max-h-[280px] overflow-y-scroll"
        style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
      >
        {filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            لا توجد بلدية مطابقة
          </div>
        ) : (
          <ul className="py-1">
            {filtered.map(({ name, idx }) => {
              const selected = value === name;
              return (
                <li key={`${name}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => onChange(name)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-right text-base transition-colors",
                      selected
                        ? "bg-primary/15 text-primary font-semibold"
                        : "hover:bg-accent active:bg-accent",
                    )}
                  >
                    <span className="flex-1 truncate">{name}</span>
                    {selected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
