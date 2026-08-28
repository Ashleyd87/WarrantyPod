import { Directory, File, Paths } from "expo-file-system";
import { getWarrantyInfo, type WarrantyInfo } from "./warranty";

/**
 * The vault lives on this device only — there is no account and nothing is
 * uploaded. Records are one JSON document in the app's private documents
 * directory; photos are files alongside it. Both are inside the app sandbox,
 * so no other app can read them, and they are removed when the app is
 * uninstalled (hence the backup export in lib/backup.ts).
 *
 * A JSON document rather than SQLite is a deliberate fit: every screen
 * already loads the whole vault and filters in memory, and a household
 * vault is tens — not millions — of records.
 */

export const VAULT_VERSION = 1;

export interface VaultAsset {
  id: string;
  /** RECEIPT | SERIAL_STICKER | PRODUCT_PHOTO | WARRANTY_CARD | MANUAL | OTHER */
  type: string;
  fileName: string;
  mimeType: string;
  /** Relative name inside the photos directory; resolved by assetUri(). */
  file: string;
  createdAt: string;
}

export interface VaultClaim {
  id: string;
  status: string;
  claimNumber: string | null;
  providerContact: string | null;
  issueDescription: string;
  /** REPAIR | REPLACE | REFUND | null */
  requestedRemedy: string | null;
  submittedAt: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

export interface VaultItem {
  id: string;
  brand: string;
  modelName: string;
  category: string;
  serialNumber: string | null;
  barcode: string | null;
  purchaseDate: string | null;
  purchasePrice: string | null;
  currency: string;
  storeName: string | null;
  warrantyType: string;
  warrantyProvider: string | null;
  warrantyDurationMonths: number | null;
  warrantyExpirationDate: string | null;
  warrantyAssumed: boolean;
  imageUrl: string | null;
  imageSource: string | null;
  imageCheckedAt: string | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  assets: VaultAsset[];
  claims: VaultClaim[];
}

/** Claimant details, reused on every claim so nothing is retyped. */
export interface OwnerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface VaultSettings {
  reminderLeadDays: number;
  currency: string;
  theme: string;
  owner: OwnerDetails;
  /** Ids of expiry alerts the user has already seen. */
  readAlerts: string[];
}

interface VaultDocument {
  version: number;
  settings: VaultSettings;
  items: VaultItem[];
}

/** An item with its derived warranty status attached, as screens consume it. */
export type VaultItemView = VaultItem & { warranty: WarrantyInfo } & {
  hasReceipt: boolean;
  hasOpenClaim: boolean;
};

const OPEN_CLAIM_STATUSES = ["DRAFT", "SUBMITTED", "IN_REVIEW"];

const DEFAULT_SETTINGS: VaultSettings = {
  reminderLeadDays: 30,
  currency: "USD",
  theme: "lime",
  owner: { name: "", email: "", phone: "", address: "" },
  readAlerts: [],
};

function emptyDocument(): VaultDocument {
  return { version: VAULT_VERSION, settings: { ...DEFAULT_SETTINGS }, items: [] };
}

const vaultFile = () => new File(Paths.document, "vault.json");
const photosDir = () => new Directory(Paths.document, "photos");

export function assetUri(asset: VaultAsset): string {
  return new File(photosDir(), asset.file).uri;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Document load / save -------------------------------------------------

let cache: VaultDocument | null = null;
/** Serializes writes so two rapid saves can't interleave and lose data. */
let writeChain: Promise<void> = Promise.resolve();

function migrate(raw: unknown): VaultDocument {
  const doc = raw as Partial<VaultDocument> | null;
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.items)) {
    return emptyDocument();
  }
  return {
    version: VAULT_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...(doc.settings ?? {}) ,
      owner: { ...DEFAULT_SETTINGS.owner, ...(doc.settings?.owner ?? {}) } },
    items: doc.items.map((i) => ({
      ...i,
      assets: i.assets ?? [],
      claims: i.claims ?? [],
    })) as VaultItem[],
  };
}

async function read(): Promise<VaultDocument> {
  if (cache) return cache;
  try {
    const f = vaultFile();
    if (f.exists) {
      cache = migrate(JSON.parse(await f.text()));
    } else {
      cache = emptyDocument();
    }
  } catch {
    // A corrupt document must not brick the app; start clean rather than
    // throwing on every screen. The old file is left in place untouched.
    cache = emptyDocument();
  }
  return cache;
}

function persist(doc: VaultDocument): Promise<void> {
  cache = doc;
  writeChain = writeChain.then(async () => {
    const f = vaultFile();
    if (!f.exists) f.create({ intermediates: true, overwrite: true });
    await f.write(JSON.stringify(doc));
  });
  return writeChain;
}

// ---- Views ----------------------------------------------------------------

function toView(item: VaultItem, leadDays: number): VaultItemView {
  return {
    ...item,
    warranty: getWarrantyInfo(item, leadDays),
    hasReceipt: item.assets.some((a) => a.type === "RECEIPT"),
    hasOpenClaim: item.claims.some((c) => OPEN_CLAIM_STATUSES.includes(c.status)),
  };
}

// ---- Public API -----------------------------------------------------------

export const vault = {
  async settings(): Promise<VaultSettings> {
    return (await read()).settings;
  },

  async saveSettings(patch: Partial<VaultSettings>): Promise<VaultSettings> {
    const doc = await read();
    const next: VaultDocument = {
      ...doc,
      settings: {
        ...doc.settings,
        ...patch,
        owner: { ...doc.settings.owner, ...(patch.owner ?? {}) },
      },
    };
    await persist(next);
    return next.settings;
  },

  async listItems(): Promise<VaultItemView[]> {
    const doc = await read();
    const lead = doc.settings.reminderLeadDays;
    return [...doc.items]
      .sort((a, b) => {
        if (a.archived !== b.archived) return a.archived ? 1 : -1;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .map((i) => toView(i, lead));
  },

  async getItem(id: string): Promise<VaultItemView | null> {
    const doc = await read();
    const item = doc.items.find((i) => i.id === id);
    return item ? toView(item, doc.settings.reminderLeadDays) : null;
  },

  async createItem(
    input: Omit<
      VaultItem,
      "id" | "createdAt" | "updatedAt" | "assets" | "claims" | "archived"
    > &
      Partial<Pick<VaultItem, "archived">>
  ): Promise<VaultItemView> {
    const doc = await read();
    const now = new Date().toISOString();
    const item: VaultItem = {
      ...input,
      archived: input.archived ?? false,
      id: newId(),
      createdAt: now,
      updatedAt: now,
      assets: [],
      claims: [],
    };
    await persist({ ...doc, items: [item, ...doc.items] });
    return toView(item, doc.settings.reminderLeadDays);
  },

  async updateItem(
    id: string,
    patch: Partial<VaultItem>
  ): Promise<VaultItemView | null> {
    const doc = await read();
    let updated: VaultItem | null = null;
    const items = doc.items.map((i) => {
      if (i.id !== id) return i;
      updated = { ...i, ...patch, id: i.id, updatedAt: new Date().toISOString() };
      return updated;
    });
    if (!updated) return null;
    await persist({ ...doc, items });
    return toView(updated, doc.settings.reminderLeadDays);
  },

  async deleteItem(id: string): Promise<void> {
    const doc = await read();
    const item = doc.items.find((i) => i.id === id);
    // Remove the item's photos too — orphaned files would linger forever.
    for (const a of item?.assets ?? []) removePhotoFile(a);
    await persist({ ...doc, items: doc.items.filter((i) => i.id !== id) });
  },

  async toggleArchive(id: string): Promise<VaultItemView | null> {
    const doc = await read();
    const item = doc.items.find((i) => i.id === id);
    if (!item) return null;
    return vault.updateItem(id, { archived: !item.archived });
  },

  // ---- Assets -------------------------------------------------------------

  /** Copies a captured photo into the vault and links it to the item. */
  async addAsset(
    itemId: string,
    sourceUri: string,
    type: string,
    mimeType = "image/jpeg"
  ): Promise<VaultAsset | null> {
    const doc = await read();
    if (!doc.items.some((i) => i.id === itemId)) return null;

    const dir = photosDir();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });

    const ext = mimeType === "application/pdf" ? "pdf" : "jpg";
    const fileName = `${newId()}.${ext}`;
    const dest = new File(dir, fileName);
    try {
      await new File(sourceUri).copy(dest);
    } catch {
      return null;
    }

    const asset: VaultAsset = {
      id: newId(),
      type,
      fileName: `${type.toLowerCase().replace(/_/g, "-")}.${ext}`,
      mimeType,
      file: fileName,
      createdAt: new Date().toISOString(),
    };
    const items = doc.items.map((i) =>
      i.id === itemId ? { ...i, assets: [...i.assets, asset] } : i
    );
    await persist({ ...doc, items });
    return asset;
  },

  async removeAsset(itemId: string, assetId: string): Promise<void> {
    const doc = await read();
    const item = doc.items.find((i) => i.id === itemId);
    const asset = item?.assets.find((a) => a.id === assetId);
    if (asset) removePhotoFile(asset);
    const items = doc.items.map((i) =>
      i.id === itemId
        ? { ...i, assets: i.assets.filter((a) => a.id !== assetId) }
        : i
    );
    await persist({ ...doc, items });
  },

  // ---- Claims -------------------------------------------------------------

  async saveClaim(
    itemId: string,
    claim: Partial<VaultClaim> & { issueDescription: string }
  ): Promise<VaultClaim | null> {
    const doc = await read();
    const item = doc.items.find((i) => i.id === itemId);
    if (!item) return null;

    const now = new Date().toISOString();
    const existing = claim.id
      ? item.claims.find((c) => c.id === claim.id)
      : item.claims.find((c) => OPEN_CLAIM_STATUSES.includes(c.status));

    const next: VaultClaim = existing
      ? { ...existing, ...claim, id: existing.id }
      : {
          id: newId(),
          status: claim.status ?? "DRAFT",
          claimNumber: claim.claimNumber ?? null,
          providerContact: claim.providerContact ?? null,
          issueDescription: claim.issueDescription,
          requestedRemedy: claim.requestedRemedy ?? null,
          submittedAt: null,
          resolvedAt: null,
          resolutionNotes: claim.resolutionNotes ?? null,
          createdAt: now,
        };

    // Status transitions imply their own timestamps.
    if (["SUBMITTED", "IN_REVIEW", "APPROVED", "DENIED", "RESOLVED"].includes(next.status)) {
      next.submittedAt = next.submittedAt ?? now;
    }
    if (["RESOLVED", "APPROVED", "DENIED"].includes(next.status)) {
      next.resolvedAt = next.resolvedAt ?? now;
    }

    const claims = existing
      ? item.claims.map((c) => (c.id === next.id ? next : c))
      : [next, ...item.claims];
    const items = doc.items.map((i) => (i.id === itemId ? { ...i, claims } : i));
    await persist({ ...doc, items });
    return next;
  },

  // ---- Whole-document access (backup / restore) ---------------------------

  async raw(): Promise<VaultDocument> {
    return read();
  },

  async replaceAll(doc: VaultDocument): Promise<void> {
    await persist(migrate(doc));
  },

  /** Drops the in-memory copy so the next read hits disk. */
  invalidate() {
    cache = null;
  },
};

function removePhotoFile(asset: VaultAsset) {
  try {
    const f = new File(photosDir(), asset.file);
    if (f.exists) f.delete();
  } catch {
    // A missing file is already the desired end state.
  }
}

export { photosDir };
