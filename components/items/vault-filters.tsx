"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const FILTER_CHIPS = [
  { value: "", label: "All" },
  { value: "active", label: "Under warranty" },
  { value: "expiring", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "claims", label: "Claims" },
  { value: "archived", label: "Archived" },
];

export function VaultFilters({
  q,
  category,
  filter,
}: {
  q: string;
  category: string;
  filter: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function apply(next: { q?: string; category?: string; filter?: string }) {
    const params = new URLSearchParams();
    const merged = { q: search, category, filter, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.category) params.set("category", merged.category);
    if (merged.filter) params.set("filter", merged.filter);
    router.replace(`/vault${params.size ? `?${params}` : ""}`);
  }

  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (debounce.current) clearTimeout(debounce.current);
              const value = e.target.value;
              debounce.current = setTimeout(() => apply({ q: value }), 350);
            }}
            placeholder="Search brand, model, serial, store…"
            className="pl-9"
          />
        </div>
        <Select
          value={category}
          onChange={(e) => apply({ category: e.target.value })}
          className="w-40"
          aria-label="Category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => apply({ filter: chip.value })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === chip.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
