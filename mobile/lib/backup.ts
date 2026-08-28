import { Directory, File, Paths } from "expo-file-system";
import { photosDir, vault, VAULT_VERSION, type VaultItem } from "./vault";
import { formatDate } from "./format";

/**
 * The vault lives only on this device, so an export is the user's only
 * safety net against a lost or wiped phone. Two shapes:
 *
 *  - Full backup (.json): every record plus every photo inline as base64,
 *    restorable by this app. One file, so it survives being emailed or
 *    dropped in cloud storage without losing its attachments.
 *  - CSV: records only, for spreadsheets and insurance inventories.
 */

const BACKUP_FORMAT = "serial-vault-backup";

interface BackupPhoto {
  file: string;
  base64: string;
}

interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  document: unknown;
  photos: BackupPhoto[];
}

function exportsDir(): Directory {
  const dir = new Directory(Paths.cache, "exports");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function writeFile(name: string, contents: string): File {
  const file = new File(exportsDir(), name);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  return file;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Writes a complete, restorable backup and returns the file to share. */
export async function createBackup(): Promise<File> {
  const doc = await vault.raw();

  const photos: BackupPhoto[] = [];
  const dir = photosDir();
  for (const item of doc.items) {
    for (const asset of item.assets) {
      try {
        const f = new File(dir, asset.file);
        if (f.exists) {
          photos.push({ file: asset.file, base64: await f.base64() });
        }
      } catch {
        // Skip an unreadable photo rather than failing the whole backup —
        // the records are the irreplaceable part.
      }
    }
  }

  const payload: BackupFile = {
    format: BACKUP_FORMAT,
    version: VAULT_VERSION,
    exportedAt: new Date().toISOString(),
    document: doc,
    photos,
  };
  return writeFile(`serial-vault-backup-${stamp()}.json`, JSON.stringify(payload));
}

export interface RestoreResult {
  items: number;
  photos: number;
}

/**
 * Replaces the entire vault with a backup's contents. Destructive by design —
 * callers must confirm with the user first.
 */
export async function restoreBackup(uri: string): Promise<RestoreResult> {
  const raw = await new File(uri).text();
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't a Serial Vault backup.");
  }
  if (parsed?.format !== BACKUP_FORMAT || !parsed.document) {
    throw new Error("That file isn't a Serial Vault backup.");
  }
  if (parsed.version > VAULT_VERSION) {
    throw new Error(
      "This backup was made by a newer version of the app. Update, then restore."
    );
  }

  const dir = photosDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });

  let restoredPhotos = 0;
  for (const photo of parsed.photos ?? []) {
    try {
      const f = new File(dir, photo.file);
      if (f.exists) f.delete();
      f.create();
      await f.write(photo.base64, { encoding: "base64" });
      restoredPhotos += 1;
    } catch {
      // A photo that won't write shouldn't abort the record restore.
    }
  }

  const doc = parsed.document as { items?: VaultItem[] };
  await vault.replaceAll(parsed.document as never);
  return { items: doc.items?.length ?? 0, photos: restoredPhotos };
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Records-only export for spreadsheets and insurance inventories. */
export async function createCsv(): Promise<File> {
  const items = await vault.listItems();
  const header = [
    "Brand",
    "Model",
    "Category",
    "Serial number",
    "Barcode",
    "Purchase date",
    "Price",
    "Currency",
    "Store",
    "Warranty type",
    "Warranty provider",
    "Warranty months",
    "Warranty expires",
    "Status",
    "Days remaining",
    "Photos",
    "Claims",
    "Notes",
  ];
  const rows = items.map((i) =>
    [
      i.brand,
      i.modelName,
      i.category,
      i.serialNumber,
      i.barcode,
      i.purchaseDate ? formatDate(i.purchaseDate) : "",
      i.purchasePrice,
      i.currency,
      i.storeName,
      i.warrantyType,
      i.warrantyProvider,
      i.warrantyDurationMonths,
      i.warrantyExpirationDate ? formatDate(i.warrantyExpirationDate) : "",
      i.warranty.status,
      i.warranty.daysRemaining,
      i.assets.length,
      i.claims.length,
      i.notes,
    ]
      .map(csvCell)
      .join(",")
  );
  return writeFile(
    `serial-vault-${stamp()}.csv`,
    [header.map(csvCell).join(","), ...rows].join("\n")
  );
}
