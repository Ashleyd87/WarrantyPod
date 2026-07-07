import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-helpers";
import { claimStatusTimestamps } from "@/lib/item-input";
import { prisma } from "@/lib/prisma";
import { claimSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { claimId } = await params;
  const claim = await prisma.claim.findFirst({
    where: { id: claimId, productItem: { userId: user.id } },
    include: { productItem: true },
  });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = claimSchema.safeParse({ ...body, status: body.status ?? claim.status });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const statusChanged = parsed.data.status !== claim.status;
  const ts = claimStatusTimestamps(parsed.data.status);

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: {
      ...parsed.data,
      submittedAt: claim.submittedAt ?? ts.submittedAt,
      resolvedAt: ts.resolvedAt ? (claim.resolvedAt ?? ts.resolvedAt) : null,
      resolutionNotes:
        typeof body.resolutionNotes === "string" && body.resolutionNotes.trim()
          ? body.resolutionNotes.trim()
          : null,
    },
  });

  if (statusChanged) {
    const title = `Claim ${parsed.data.status.toLowerCase().replace("_", " ")}: ${claim.productItem.brand} ${claim.productItem.modelName}`;
    const bodyText = `Claim status updated to ${parsed.data.status.replace("_", " ").toLowerCase()}.`;
    await prisma.notification.upsert({
      where: {
        userId_productItemId_type: {
          userId: user.id,
          productItemId: claim.productItemId,
          type: "CLAIM_UPDATE",
        },
      },
      update: { title, body: bodyText, readAt: null },
      create: {
        userId: user.id,
        productItemId: claim.productItemId,
        type: "CLAIM_UPDATE",
        title,
        body: bodyText,
      },
    });
  }

  return NextResponse.json({ claim: updated });
}
