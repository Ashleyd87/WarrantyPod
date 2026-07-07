import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-helpers";
import { syncNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings } from "@/lib/session";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const settings = await getOrCreateSettings(user.id);
  await syncNotifications(user.id, settings.reminderLeadDays);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: Boolean(n.readAt),
      productItemId: n.productItemId,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount: notifications.filter((n) => !n.readAt).length,
  });
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  if (body.all === true) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (typeof body.id === "string") {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: user.id },
      data: { readAt: new Date() },
    });
  } else {
    return NextResponse.json({ error: "Pass id or all:true" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
