"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { settingsSchema } from "@/lib/validators";
import type { FormLike } from "@/lib/item-input";
import type { ActionResult } from "./items";

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

export async function updateSettings(formData: FormLike): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse({
    reminderLeadDays: formData.get("reminderLeadDays"),
    currency: formData.get("currency"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: parsed.data,
    create: { userId: user.id, ...parsed.data },
  });

  // Lead-time change invalidates previously generated reminders.
  await prisma.notification.deleteMany({
    where: { userId: user.id, type: "EXPIRING_SOON", readAt: null },
  });

  revalidatePath("/settings");
  revalidatePath("/notifications");
  revalidatePath("/");
}
