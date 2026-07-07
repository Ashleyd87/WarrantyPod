import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-helpers";
import { isMockMode } from "@/lib/extraction";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings } from "@/lib/session";
import { settingsSchema } from "@/lib/validators";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const settings = await getOrCreateSettings(user.id);
  return NextResponse.json({
    settings: {
      reminderLeadDays: settings.reminderLeadDays,
      currency: settings.currency,
    },
    user: { name: user.name, email: user.email },
    aiMockMode: isMockMode(),
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: parsed.data,
    create: { userId: user.id, ...parsed.data },
  });

  // Lead-time change invalidates previously generated reminders.
  await prisma.notification.deleteMany({
    where: { userId: user.id, type: "EXPIRING_SOON", readAt: null },
  });

  return NextResponse.json({
    settings: {
      reminderLeadDays: settings.reminderLeadDays,
      currency: settings.currency,
    },
  });
}
