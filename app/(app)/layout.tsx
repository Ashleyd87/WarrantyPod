import { BottomNav, Sidebar } from "@/components/shell/nav";
import { getUnreadCount, syncNotifications } from "@/lib/notifications";
import { getOrCreateSettings, requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const settings = await getOrCreateSettings(user.id);
  // Generate any due warranty reminders on shell load (idempotent).
  await syncNotifications(user.id, settings.reminderLeadDays);
  const unreadCount = await getUnreadCount(user.id);

  return (
    <div className="min-h-dvh">
      <Sidebar userName={user.name || user.email} unreadCount={unreadCount} />
      <BottomNav unreadCount={unreadCount} />
      <div className="md:pl-60">
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
