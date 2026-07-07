"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { addAsset, deleteAsset } from "@/app/actions/items";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { compressImage } from "@/lib/client-image";
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  type AssetType,
} from "@/lib/constants";

export interface AssetData {
  id: string;
  type: string;
  fileName: string;
}

export function AssetManager({
  itemId,
  assets,
}: {
  itemId: string;
  assets: AssetData[];
}) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [assetType, setAssetType] = useState<string>("RECEIPT");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("assetFile", compressed);
      fd.append("assetType", assetType);
      const res = await addAsset(itemId, fd);
      if (res?.error) toast.error(res.error);
      else toast.success("Photo attached");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {assets.map((asset) => (
          <figure
            key={asset.id}
            className="group relative overflow-hidden rounded-xl border border-border"
          >
            <a
              href={`/api/files/${asset.id}`}
              target="_blank"
              rel="noreferrer"
              title="Open full size"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${asset.id}`}
                alt={ASSET_TYPE_LABELS[asset.type as AssetType] ?? asset.type}
                className="h-32 w-full object-cover"
                loading="lazy"
              />
            </a>
            <figcaption className="flex items-center justify-between gap-1 bg-card px-2 py-1.5 text-xs font-medium">
              <span className="truncate">
                {ASSET_TYPE_LABELS[asset.type as AssetType] ?? asset.type}
              </span>
              <button
                type="button"
                aria-label="Delete attachment"
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive"
                onClick={() =>
                  startTransition(async () => {
                    const res = await deleteAsset(asset.id);
                    if (res?.error) toast.error(res.error);
                  })
                }
              >
                <Trash2 className="size-3.5" />
              </button>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="flex gap-2">
        <Select
          value={assetType}
          onChange={(e) => setAssetType(e.target.value)}
          className="w-48"
          aria-label="Attachment type"
        >
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>
              {ASSET_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <ImagePlus /> Add photo
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
