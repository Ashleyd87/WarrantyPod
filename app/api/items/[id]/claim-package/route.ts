import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { auth } from "@/lib/auth";
import {
  ASSET_TYPE_LABELS,
  CATEGORY_LABELS,
  CLAIM_STATUS_LABELS,
  WARRANTY_TYPE_LABELS,
  type AssetType,
  type Category,
  type ClaimStatus,
  type WarrantyType,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/storage";
import { formatDate, formatMoney } from "@/lib/utils";

export const maxDuration = 60;

const PAGE = { width: 595.28, height: 841.89, margin: 48 }; // A4
const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const ACCENT = rgb(0.09, 0.46, 0.42);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.productItem.findFirst({
    where: { id, userId: session.user.id },
    include: {
      assets: { orderBy: { createdAt: "asc" } },
      claims: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Claim-builder UI lets the user choose which proof to include
  // (?assets=id1,id2). No param = include everything.
  const assetFilter = request.nextUrl.searchParams.get("assets");
  if (assetFilter !== null) {
    const wanted = new Set(assetFilter.split(",").filter(Boolean));
    item.assets = item.assets.filter((a) => wanted.has(a.id));
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // ---- Cover page ----
  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;

  const drawText = (
    text: string,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; x?: number } = {}
  ) => {
    page.drawText(text, {
      x: opts.x ?? PAGE.margin,
      y,
      size: opts.size ?? 11,
      font: opts.font ?? font,
      color: opts.color ?? INK,
    });
  };

  drawText("WARRANTY CLAIM PACKAGE", { size: 20, font: bold, color: ACCENT });
  y -= 18;
  drawText(`Generated ${formatDate(new Date())} · Product Warranty & Serial Vault`, {
    size: 9,
    color: MUTED,
  });
  y -= 30;

  drawText(`${item.brand} ${item.modelName}`, { size: 16, font: bold });
  y -= 26;

  const rows: [string, string][] = [
    ["Category", CATEGORY_LABELS[item.category as Category] ?? item.category],
    ["Serial number", item.serialNumber ?? "—"],
    ["Purchase date", formatDate(item.purchaseDate)],
    [
      "Purchase price",
      formatMoney(item.purchasePrice ? item.purchasePrice.toString() : null, item.currency),
    ],
    ["Store", item.storeName ?? "—"],
    [
      "Warranty type",
      WARRANTY_TYPE_LABELS[item.warrantyType as WarrantyType] ?? item.warrantyType,
    ],
    ["Warranty provider", item.warrantyProvider ?? "—"],
    [
      "Warranty duration",
      item.warrantyDurationMonths
        ? `${item.warrantyDurationMonths} months${item.warrantyAssumed ? " (assumed)" : ""}`
        : "—",
    ],
    ["Warranty expires", formatDate(item.warrantyExpirationDate)],
  ];

  for (const [label, value] of rows) {
    drawText(label.toUpperCase(), { size: 8, color: MUTED });
    y -= 13;
    drawText(value, { size: 12 });
    y -= 20;
  }

  if (item.notes) {
    drawText("NOTES", { size: 8, color: MUTED });
    y -= 13;
    for (const line of wrapText(item.notes, 90)) {
      drawText(line, { size: 10 });
      y -= 14;
    }
    y -= 6;
  }

  const latestClaim = item.claims[0];
  if (latestClaim) {
    y -= 8;
    drawText("CURRENT CLAIM", { size: 8, color: MUTED });
    y -= 13;
    drawText(
      `Status: ${CLAIM_STATUS_LABELS[latestClaim.status as ClaimStatus] ?? latestClaim.status}` +
        (latestClaim.claimNumber ? ` · Ref ${latestClaim.claimNumber}` : ""),
      { size: 12, font: bold }
    );
    y -= 16;
    for (const line of wrapText(latestClaim.issueDescription, 90)) {
      drawText(line, { size: 10 });
      y -= 14;
    }
  }

  // ---- Evidence pages: one image per page ----
  for (const asset of item.assets) {
    if (!asset.mimeType.startsWith("image/")) continue;
    let bytes: Buffer;
    try {
      bytes = await readUpload(asset.fileKey);
    } catch {
      continue;
    }

    let image;
    try {
      image =
        asset.mimeType === "image/png"
          ? await pdf.embedPng(bytes)
          : await pdf.embedJpg(bytes);
    } catch {
      continue; // Unsupported encoding (e.g. HEIC) — skip rather than fail.
    }

    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
    drawText(
      ASSET_TYPE_LABELS[asset.type as AssetType] ?? asset.type,
      { size: 13, font: bold, color: ACCENT }
    );
    y -= 14;
    drawText(`${item.brand} ${item.modelName}`, { size: 9, color: MUTED });

    const maxW = PAGE.width - PAGE.margin * 2;
    const maxH = y - PAGE.margin - 24;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, {
      x: (PAGE.width - w) / 2,
      y: PAGE.margin + (maxH - h) / 2,
      width: w,
      height: h,
    });
  }

  const bytes = await pdf.save();
  const safeName = `claim-package-${item.brand}-${item.modelName}`
    .replace(/[^\w-]+/g, "-")
    .toLowerCase();

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      if ((current + " " + word).trim().length > maxChars) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = (current + " " + word).trim();
      }
    }
    lines.push(current);
    if (lines.length > 40) break; // keep the cover page bounded
  }
  return lines;
}
