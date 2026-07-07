import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-helpers";
import { claimStatusTimestamps } from "@/lib/item-input";
import { prisma } from "@/lib/prisma";
import { claimSchema } from "@/lib/validators";

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

  const body = await request.json();
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const ts = claimStatusTimestamps(parsed.data.status);
  const claim = await prisma.claim.create({
    data: {
      productItemId: id,
      ...parsed.data,
      submittedAt: ts.submittedAt,
      resolvedAt: ts.resolvedAt,
    },
  });

  return NextResponse.json({ claim }, { status: 201 });
}
