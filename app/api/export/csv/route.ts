import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Full-inventory CSV — the "serial number registry for insurance" use case.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.productItem.findMany({
    where: { userId: session.user.id },
    orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { assets: true, claims: true } } },
  });

  const header = [
    "Brand",
    "Model",
    "Category",
    "Serial Number",
    "Purchase Date",
    "Purchase Price",
    "Currency",
    "Store",
    "Warranty Type",
    "Warranty Provider",
    "Warranty Months",
    "Warranty Expires",
    "Warranty Assumed",
    "Notes",
    "Attachments",
    "Claims",
    "Archived",
  ];

  const lines = [header.join(",")];
  for (const item of items) {
    lines.push(
      [
        csvEscape(item.brand),
        csvEscape(item.modelName),
        csvEscape(item.category),
        csvEscape(item.serialNumber),
        item.purchaseDate ? item.purchaseDate.toISOString().slice(0, 10) : "",
        item.purchasePrice ? item.purchasePrice.toString() : "",
        csvEscape(item.currency),
        csvEscape(item.storeName),
        csvEscape(item.warrantyType),
        csvEscape(item.warrantyProvider),
        item.warrantyDurationMonths?.toString() ?? "",
        item.warrantyExpirationDate
          ? item.warrantyExpirationDate.toISOString().slice(0, 10)
          : "",
        item.warrantyAssumed ? "yes" : "no",
        csvEscape(item.notes),
        String(item._count.assets),
        String(item._count.claims),
        item.archived ? "yes" : "no",
      ].join(",")
    );
  }

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="warranty-vault-export.csv"`,
    },
  });
}
