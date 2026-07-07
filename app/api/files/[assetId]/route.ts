import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/storage";

// Receipts and serial photos contain PII — they are never publicly served.
// This route checks the session AND that the asset belongs to the caller.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assetId } = await params;
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, productItem: { userId: session.user.id } },
  });
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await readUpload(asset.fileKey);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${asset.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
