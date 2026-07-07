import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { deleteUpload } from "@/lib/storage";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { assetId } = await params;
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, productItem: { userId: user.id } },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.asset.delete({ where: { id: assetId } });
  await deleteUpload(asset.fileKey);
  return NextResponse.json({ ok: true });
}
