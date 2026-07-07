"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Package,
  PlusCircle,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vault", label: "Vault", icon: Package },
  { href: "/vault/new", label: "Add", icon: PlusCircle },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/vault") return pathname === "/vault" || (pathname.startsWith("/vault/") && pathname !== "/vault/new");
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  userName,
  unreadCount,
}: {
  userName: string;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Warranty Vault</p>
          <p className="text-xs text-muted-foreground">Serial & receipt keeper</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(pathname, href)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="size-4.5" />
            {label}
            {href === "/notifications" && unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{userName}</p>
        <button
          onClick={async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="size-4.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function BottomNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden">
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("size-5", href === "/vault/new" && "size-6")} />
              {label}
              {href === "/notifications" && unreadCount > 0 && (
                <span className="absolute right-[calc(50%-16px)] top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
