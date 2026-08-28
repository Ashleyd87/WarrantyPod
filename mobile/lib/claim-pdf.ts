import { Directory, File, Paths } from "expo-file-system";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDate, formatMoney } from "./format";
import { CATEGORY_LABELS, WARRANTY_TYPE_LABELS } from "./constants";
import { assetUri, type OwnerDetails, type VaultAsset, type VaultItemView } from "./vault";

/**
 * Builds the claim package on-device, so receipts and serial photos never
 * leave the phone. Page 1 is a structured claim form a manufacturer can act
 * on without a covering email; the evidence follows, one image per page.
 */

const INK = rgb(0.04, 0.04, 0.04);
const MUTED = rgb(0.54, 0.52, 0.49);
const RULE = rgb(0.88, 0.87, 0.85);

const PAGE = { width: 595.28, height: 841.89 }; // A4 portrait
const MARGIN = 48;

export const REMEDY_LABELS: Record<string, string> = {
  REPAIR: "Repair under warranty",
  REPLACE: "Replacement unit",
  REFUND: "Refund",
};

const ASSET_LABELS: Record<string, string> = {
  RECEIPT: "Proof of purchase",
  SERIAL_STICKER: "Serial number photo",
  PRODUCT_PHOTO: "Product photo",
  WARRANTY_CARD: "Warranty documentation",
  MANUAL: "Manual",
  OTHER: "Supporting photo",
};

function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      if ((line + " " + word).trim().length > max) {
        if (line) out.push(line.trim());
        line = word;
      } else {
        line = `${line} ${word}`;
      }
    }
    out.push(line.trim());
  }
  return out.filter((l) => l.length > 0);
}

/** Short human reference so the claimant and manufacturer can cite the same thing. */
export function claimReference(item: VaultItemView): string {
  return `SV-${item.id.slice(0, 6).toUpperCase()}`;
}

export interface ClaimPdfInput {
  item: VaultItemView;
  owner: OwnerDetails;
  issue: string;
  remedy: string | null;
  /** Asset ids the user ticked for inclusion. */
  includedAssetIds: string[];
  sendTo?: string | null;
}

export async function buildClaimPdf(input: ClaimPdfInput): Promise<File> {
  const { item, owner, issue, remedy } = input;
  const included = item.assets.filter((a) => input.includedAssetIds.includes(a.id));

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;

  const text = (
    value: string,
    opts: { size?: number; bold?: boolean; color?: typeof INK; indent?: number } = {}
  ) => {
    page.drawText(value, {
      x: MARGIN + (opts.indent ?? 0),
      y,
      size: opts.size ?? 10,
      font: opts.bold ? bold : font,
      color: opts.color ?? INK,
    });
  };

  const rule = () => {
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: PAGE.width - MARGIN, y: y + 4 },
      thickness: 1,
      color: RULE,
    });
  };

  const heading = (label: string) => {
    y -= 10;
    rule();
    y -= 14;
    text(label.toUpperCase(), { size: 8, bold: true, color: MUTED });
    y -= 15;
  };

  /** Label on the left, value on the right of a fixed column. */
  const field = (label: string, value: string | null | undefined) => {
    if (!value) return;
    text(label, { size: 9.5, color: MUTED });
    page.drawText(value, {
      x: MARGIN + 150,
      y,
      size: 10.5,
      font,
      color: INK,
      maxWidth: PAGE.width - MARGIN * 2 - 150,
    });
    y -= 17;
  };

  // ---- Header
  text("WARRANTY CLAIM", { size: 20, bold: true });
  y -= 20;
  text(
    `Reference ${claimReference(item)} · Raised ${formatDate(new Date().toISOString())}`,
    { size: 9.5, color: MUTED }
  );
  y -= 6;

  // ---- Claimant (the gap that used to force manual editing)
  heading("Claimant");
  field("Name", owner.name || "—");
  field("Email", owner.email);
  field("Phone", owner.phone);
  if (owner.address) {
    text("Address", { size: 9.5, color: MUTED });
    const lines = wrap(owner.address, 46);
    lines.forEach((line, i) => {
      page.drawText(line, {
        x: MARGIN + 150,
        y: y - i * 14,
        size: 10.5,
        font,
        color: INK,
      });
    });
    y -= 17 + (lines.length - 1) * 14;
  }

  // ---- Product
  heading("Product");
  field("Brand", item.brand);
  field("Model", item.modelName);
  field("Category", CATEGORY_LABELS[item.category] ?? item.category);
  field("Serial number", item.serialNumber);
  field("Barcode", item.barcode);

  // ---- Purchase
  heading("Purchase");
  field("Date of purchase", item.purchaseDate ? formatDate(item.purchaseDate) : null);
  field(
    "Price paid",
    item.purchasePrice ? formatMoney(item.purchasePrice, item.currency) : null
  );
  field("Retailer", item.storeName);

  // ---- Warranty
  heading("Warranty");
  field("Cover", WARRANTY_TYPE_LABELS[item.warrantyType] ?? item.warrantyType);
  field("Provider", item.warrantyProvider);
  field(
    "Length",
    item.warrantyDurationMonths ? `${item.warrantyDurationMonths} months` : null
  );
  field(
    "Expires",
    item.warrantyExpirationDate ? formatDate(item.warrantyExpirationDate) : null
  );
  field(
    "Status at claim",
    item.warranty.status === "EXPIRED"
      ? `Expired ${Math.abs(item.warranty.daysRemaining ?? 0)} days ago`
      : item.warranty.daysRemaining !== null
        ? `In warranty — ${item.warranty.daysRemaining} days remaining`
        : "In warranty"
  );

  // ---- Fault
  heading("Reported fault");
  for (const line of wrap(issue.trim() || "—", 92)) {
    text(line, { size: 10.5 });
    y -= 14;
  }

  // ---- Remedy
  if (remedy) {
    heading("Remedy requested");
    text(REMEDY_LABELS[remedy] ?? remedy, { size: 11, bold: true });
    y -= 16;
  }

  // ---- Evidence index
  heading("Enclosed evidence");
  if (included.length === 0) {
    text("None attached.", { size: 10.5, color: MUTED });
    y -= 14;
  } else {
    included.forEach((a, i) => {
      text(`${i + 1}. ${ASSET_LABELS[a.type] ?? "Attachment"} — ${a.fileName}`, {
        size: 10.5,
      });
      y -= 14;
    });
  }

  y -= 10;
  rule();
  y -= 14;
  for (const line of wrap(
    "This claim package was generated by Serial Vault. The pages that follow are the supporting evidence listed above.",
    100
  )) {
    text(line, { size: 8.5, color: MUTED });
    y -= 11;
  }

  // ---- Evidence pages, one image per page
  for (const asset of included) {
    if (!asset.mimeType.startsWith("image/")) continue;
    let embedded;
    try {
      const bytes = await new File(assetUri(asset)).base64();
      embedded =
        asset.mimeType === "image/png"
          ? await pdf.embedPng(bytes)
          : await pdf.embedJpg(bytes);
    } catch {
      continue; // An unreadable photo shouldn't sink the whole package.
    }

    const p = pdf.addPage([PAGE.width, PAGE.height]);
    p.drawText(ASSET_LABELS[asset.type] ?? "Attachment", {
      x: MARGIN,
      y: PAGE.height - MARGIN,
      size: 12,
      font: bold,
      color: INK,
    });
    p.drawText(`${claimReference(item)} · ${asset.fileName}`, {
      x: MARGIN,
      y: PAGE.height - MARGIN - 16,
      size: 9,
      font,
      color: MUTED,
    });

    const boxW = PAGE.width - MARGIN * 2;
    const boxH = PAGE.height - MARGIN * 2 - 50;
    const scale = Math.min(boxW / embedded.width, boxH / embedded.height, 1);
    const w = embedded.width * scale;
    const h = embedded.height * scale;
    p.drawImage(embedded, {
      x: (PAGE.width - w) / 2,
      y: MARGIN + (boxH - h) / 2,
      width: w,
      height: h,
    });
  }

  const base64 = await pdf.saveAsBase64();
  const dir = new Directory(Paths.cache, "exports");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const safe = `${item.brand}-${item.modelName}`
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const out = new File(dir, `claim-${safe || "package"}.pdf`);
  if (out.exists) out.delete();
  out.create();
  await out.write(base64, { encoding: "base64" });
  return out;
}

/**
 * Plain-text claim details for pasting into a manufacturer's web form —
 * many run portals rather than accepting email.
 */
export function claimAsText(input: ClaimPdfInput): string {
  const { item, owner, issue, remedy } = input;
  const lines = [
    `Warranty claim — reference ${claimReference(item)}`,
    "",
    "CLAIMANT",
    `Name: ${owner.name || "—"}`,
    owner.email ? `Email: ${owner.email}` : null,
    owner.phone ? `Phone: ${owner.phone}` : null,
    owner.address ? `Address: ${owner.address.replace(/\n/g, ", ")}` : null,
    "",
    "PRODUCT",
    `Brand: ${item.brand}`,
    `Model: ${item.modelName}`,
    item.serialNumber ? `Serial number: ${item.serialNumber}` : null,
    item.barcode ? `Barcode: ${item.barcode}` : null,
    "",
    "PURCHASE",
    item.purchaseDate ? `Date: ${formatDate(item.purchaseDate)}` : null,
    item.purchasePrice
      ? `Price: ${formatMoney(item.purchasePrice, item.currency)}`
      : null,
    item.storeName ? `Retailer: ${item.storeName}` : null,
    item.warrantyExpirationDate
      ? `Warranty expires: ${formatDate(item.warrantyExpirationDate)}`
      : null,
    "",
    "FAULT",
    issue.trim() || "—",
    remedy ? "" : null,
    remedy ? `REMEDY REQUESTED: ${REMEDY_LABELS[remedy] ?? remedy}` : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}
