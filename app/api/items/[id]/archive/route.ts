import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const item = await prisma.productItem.findFirst({
    where: { id, userId: user.id },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.productItem.update({
    where: { id },
    data: { archived: !item.archived },
  });
  return NextResponse.json({ archived: updated.archived });
}
