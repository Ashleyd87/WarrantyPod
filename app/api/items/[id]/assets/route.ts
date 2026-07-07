import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-helpers";
import { collectAssets, type FormLike } from "@/lib/item-input";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const item = await prisma.productItem.findFirst({
    where: { id, userId: user.id },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let assets;
  try {
    assets = await collectAssets(
      (await request.formData()) as unknown as FormLike
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 }
    );
  }
  if (assets.length === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const created = [];
  for (const a of assets) {
    const key = await saveUpload(user.id, a.file);
    created.push(
      await prisma.asset.create({
        data: {
          productItemId: id,
          type: a.type,
          fileKey: key,
          fileName: a.file.name,
          mimeType: a.file.type,
          sizeBytes: a.file.size,
        },
      })
    );
  }

  return NextResponse.json(
    {
      assets: created.map((a) => ({
        id: a.id,
        type: a.type,
        fileName: a.fileName,
        mimeType: a.mimeType,
      })),
    },
    { status: 201 }
  );
}
