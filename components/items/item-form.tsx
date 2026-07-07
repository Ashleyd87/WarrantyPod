"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Camera,
  Loader2,
  ReceiptText,
  ScanBarcode,
  Sparkles,
  X,
} from "lucide-react";
import { createItem, updateItem } from "@/app/actions/items";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from "@/lib/client-image";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  WARRANTY_TYPES,
  WARRANTY_TYPE_LABELS,
} from "@/lib/constants";
import { toDateInputValue } from "@/lib/utils";
import type { ExtractionResult } from "@/lib/validators";

type Confidence = "high" | "medium" | "low";

interface PhotoSlot {
  key: string;
  assetType: string;
  label: string;
  icon: React.ReactNode;
  file: File | null;
  previewUrl: string | null;
}

export interface ItemFormValues {
  brand: string;
  modelName: string;
  category: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: string;
  currency: string;
  storeName: string;
  warrantyType: string;
  warrantyProvider: string;
  warrantyDurationMonths: string;
  warrantyExpirationDate: string;
  warrantyAssumed: boolean;
  notes: string;
}

const EMPTY: ItemFormValues = {
  brand: "",
  modelName: "",
  category: "OTHER",
  serialNumber: "",
  purchaseDate: "",
  purchasePrice: "",
  currency: "USD",
  storeName: "",
  warrantyType: "MANUFACTURER",
  warrantyProvider: "",
  warrantyDurationMonths: "",
  warrantyExpirationDate: "",
  warrantyAssumed: false,
  notes: "",
};

function addMonthsToDateString(dateStr: string, months: number): string {
  // Work purely in UTC so the result never shifts a day across timezones.
  const d = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInMonth = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(day, daysInMonth));
  return toDateInputValue(d);
}

export function ItemForm({
  mode,
  itemId,
  initialValues,
  defaultCurrency = "USD",
}: {
  mode: "create" | "edit";
  itemId?: string;
  initialValues?: Partial<ItemFormValues>;
  defaultCurrency?: string;
}) {
  const [values, setValues] = useState<ItemFormValues>({
    ...EMPTY,
    currency: defaultCurrency,
    ...initialValues,
  });
  const [confidence, setConfidence] = useState<Record<string, Confidence>>({});
  const [expiryTouched, setExpiryTouched] = useState(
    Boolean(initialValues?.warrantyExpirationDate)
  );
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [slots, setSlots] = useState<PhotoSlot[]>(
    mode === "create"
      ? [
          {
            key: "receipt",
            assetType: "RECEIPT",
            label: "Receipt",
            icon: <ReceiptText className="size-5" />,
            file: null,
            previewUrl: null,
          },
          {
            key: "serial",
            assetType: "SERIAL_STICKER",
            label: "Serial / barcode sticker",
            icon: <ScanBarcode className="size-5" />,
            file: null,
            previewUrl: null,
          },
        ]
      : []
  );
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const hasPhotos = slots.some((s) => s.file);

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      // Keep the computed expiry in sync until the user overrides it.
      if (
        !expiryTouched &&
        (key === "purchaseDate" || key === "warrantyDurationMonths")
      ) {
        const months = parseInt(String(next.warrantyDurationMonths), 10);
        next.warrantyExpirationDate =
          next.purchaseDate && months > 0
            ? addMonthsToDateString(next.purchaseDate, months)
            : "";
      }
      return next;
    });
  }

  async function onPickFile(slotKey: string, file: File | null) {
    if (!file) return;
    const compressed = await compressImage(file);
    setSlots((prev) =>
      prev.map((s) =>
        s.key === slotKey
          ? {
              ...s,
              file: compressed,
              previewUrl: URL.createObjectURL(compressed),
            }
          : s
      )
    );
  }

  function clearSlot(slotKey: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === slotKey ? { ...s, file: null, previewUrl: null } : s
      )
    );
  }

  async function runExtraction() {
    const files = slots.filter((s) => s.file).map((s) => s.file!) ;
    if (files.length === 0) {
      toast.error("Add at least one photo first");
      return;
    }
    setExtracting(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("images", f);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Extraction failed");

      const r: ExtractionResult = json.result;
      const months = r.estimatedWarrantyMonths ?? 12;
      const assumed = r.warrantyAssumed || r.estimatedWarrantyMonths === null;

      setValues((v) => {
        const next: ItemFormValues = {
          ...v,
          brand: r.brand ?? v.brand,
          modelName: r.modelName ?? v.modelName,
          category: r.suggestedCategory ?? v.category,
          serialNumber: r.serialNumber ?? v.serialNumber,
          purchaseDate: r.purchaseDate ?? v.purchaseDate,
          purchasePrice:
            r.purchasePrice !== null ? String(r.purchasePrice) : v.purchasePrice,
          currency: r.currency ?? v.currency,
          storeName: r.storeName ?? v.storeName,
          warrantyDurationMonths: String(months),
          warrantyAssumed: assumed,
        };
        next.warrantyExpirationDate =
          next.purchaseDate && months > 0
            ? addMonthsToDateString(next.purchaseDate, months)
            : "";
        return next;
      });
      setConfidence(r.confidence ?? {});
      setExpiryTouched(false);
      setExtracted(true);
      toast.success(
        json.mock
          ? "Demo extraction complete (no API key configured — sample data)"
          : "Details extracted — please double-check every field"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) {
      fd.set(k, typeof v === "boolean" ? (v ? "true" : "") : v);
    }
    for (const slot of slots) {
      if (slot.file) {
        fd.append("assetFile", slot.file);
        fd.append("assetType", slot.assetType);
      }
    }
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createItem(fd)
          : await updateItem(itemId!, fd);
      if (result?.error) toast.error(result.error);
    });
  }

  const confidenceHint = useMemo(() => {
    const flagged = Object.entries(confidence).filter(
      ([, c]) => c !== "high"
    );
    return new Map(flagged as [string, Confidence][]);
  }, [confidence]);

  function FieldFlag({ field }: { field: string }) {
    const c = confidenceHint.get(field);
    if (!c || !extracted) return null;
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-warning"
        title={`The AI was ${c === "low" ? "not confident" : "only somewhat confident"} about this — please verify`}
      >
        <AlertTriangle className="size-3.5" /> check
      </span>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="size-5 text-primary" /> Smart upload
            </CardTitle>
            <CardDescription>
              Snap the receipt and the serial sticker — AI fills in the form.
              You can also skip this and type everything manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {slots.map((slot) => (
                <div key={slot.key}>
                  <input
                    ref={(el) => {
                      inputRefs.current[slot.key] = el;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) =>
                      onPickFile(slot.key, e.target.files?.[0] ?? null)
                    }
                  />
                  {slot.previewUrl ? (
                    <div className="relative overflow-hidden rounded-xl border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slot.previewUrl}
                        alt={slot.label}
                        className="h-36 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => clearSlot(slot.key)}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                        aria-label={`Remove ${slot.label}`}
                      >
                        <X className="size-4" />
                      </button>
                      <p className="bg-card px-2 py-1.5 text-xs font-medium">
                        {slot.label}
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => inputRefs.current[slot.key]?.click()}
                      className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/50 p-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                    >
                      {slot.icon}
                      {slot.label}
                      <span className="text-xs font-normal">
                        Tap to photograph
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={!hasPhotos || extracting}
              onClick={runExtraction}
            >
              {extracting ? (
                <>
                  <Loader2 className="animate-spin" /> Reading your photos…
                </>
              ) : (
                <>
                  <Sparkles /> Extract details with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {extracted && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            AI extraction is an assistant, not an authority — review every
            field below before saving.
            {values.warrantyAssumed &&
              " No warranty length was visible, so 12 months is suggested as an assumption."}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brand" className="flex items-center gap-2">
              Brand * <FieldFlag field="brand" />
            </Label>
            <Input
              id="brand"
              required
              value={values.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="Samsung"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modelName" className="flex items-center gap-2">
              Model * <FieldFlag field="modelName" />
            </Label>
            <Input
              id="modelName"
              required
              value={values.modelName}
              onChange={(e) => set("modelName", e.target.value)}
              placeholder="WW90T534DAW"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              value={values.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="serialNumber" className="flex items-center gap-2">
              Serial number <FieldFlag field="serialNumber" />
            </Label>
            <Input
              id="serialNumber"
              value={values.serialNumber}
              onChange={(e) => set("serialNumber", e.target.value)}
              placeholder="S/N on the product sticker"
              className="font-mono"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Extended warranty phone number, where it's installed, accessories…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="purchaseDate" className="flex items-center gap-2">
              Purchase date <FieldFlag field="purchaseDate" />
            </Label>
            <Input
              id="purchaseDate"
              type="date"
              value={values.purchaseDate}
              onChange={(e) => set("purchaseDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storeName" className="flex items-center gap-2">
              Store <FieldFlag field="storeName" />
            </Label>
            <Input
              id="storeName"
              value={values.storeName}
              onChange={(e) => set("storeName", e.target.value)}
              placeholder="Where you bought it"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchasePrice" className="flex items-center gap-2">
              Price <FieldFlag field="purchasePrice" />
            </Label>
            <Input
              id="purchasePrice"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={values.purchasePrice}
              onChange={(e) => set("purchasePrice", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={values.currency}
              onChange={(e) => set("currency", e.target.value.toUpperCase())}
              maxLength={3}
              placeholder="USD"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Warranty</CardTitle>
          <CardDescription>
            The expiry date is calculated from purchase date + duration; you
            can override it if the paperwork says otherwise.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="warrantyType">Warranty type</Label>
            <Select
              id="warrantyType"
              value={values.warrantyType}
              onChange={(e) => set("warrantyType", e.target.value)}
            >
              {WARRANTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {WARRANTY_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="warrantyProvider">Warranty provider</Label>
            <Input
              id="warrantyProvider"
              value={values.warrantyProvider}
              onChange={(e) => set("warrantyProvider", e.target.value)}
              placeholder="Who honours the claim (brand, store…)"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="warrantyDurationMonths"
              className="flex items-center gap-2"
            >
              Duration (months) <FieldFlag field="estimatedWarrantyMonths" />
              {values.warrantyAssumed && (
                <span className="text-xs font-medium text-warning">
                  assumed
                </span>
              )}
            </Label>
            <Input
              id="warrantyDurationMonths"
              type="number"
              inputMode="numeric"
              min="0"
              max="600"
              value={values.warrantyDurationMonths}
              onChange={(e) => {
                set("warrantyDurationMonths", e.target.value);
                if (values.warrantyAssumed) set("warrantyAssumed", false);
              }}
              placeholder="12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="warrantyExpirationDate">Expires on</Label>
            <Input
              id="warrantyExpirationDate"
              type="date"
              value={values.warrantyExpirationDate}
              onChange={(e) => {
                setExpiryTouched(true);
                set("warrantyExpirationDate", e.target.value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" /> Saving…
          </>
        ) : mode === "create" ? (
          "Save to vault"
        ) : (
          "Save changes"
        )}
      </Button>
    </form>
  );
}
