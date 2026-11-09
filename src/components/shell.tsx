"use client";
import Link from "next/link";
import { Brand } from "./brand";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  ChartNoAxesCombined,
  CalendarDays,
  Headphones,
  Settings,
  Bell,
  Users,
  Files,
  LogOut,
  Menu,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { navigation } from "@/lib/navigation";
const icons: Record<string, typeof BookOpen> = {
  dashboard: LayoutDashboard,
  exams: ClipboardCheck,
  results: ChartNoAxesCombined,
  progress: ChartNoAxesCombined,
  attendance: CalendarDays,
  routines: CalendarDays,
  questions: Headphones,
  notifications: Bell,
  students: Users,
  teachers: Users,
  resources: Files,
  settings: Settings,
};
export function Shell({
  role,
  name,
  children,
}: {
  role: keyof typeof navigation;
  name: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const base = "/" + role.toLowerCase();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => {
          if (alive) setUnread(d.unreadCount || 0);
        })
        .catch(() => {
          if (alive) setUnread(-1);
        });
    refresh();
    window.addEventListener("notifications-updated", refresh);
    return () => {
      alive = false;
      window.removeEventListener("notifications-updated", refresh);
    };
  }, [pathname]);
  return (
    <div className="app-shell" lang="en">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Brand />
        <button
          type="button"
          aria-label="Close navigation"
          className="btn secondary small mobile-menu"
          onClick={() => setOpen(false)}
        >
          Close menu ×
        </button>
        <div className="eyebrow px-3">{role.toLowerCase()} workspace</div>
        <nav>
          {navigation[role].map(([key, label]) => {
            const Icon = icons[key] || BookOpen;
            const href = key === "dashboard" ? base : `${base}/${key}`;
            return (
              <Link
                key={key}
                href={href}
                onClick={() => setOpen(false)}
                className={pathname === href ? "active" : ""}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <strong>A little progress, every day.</strong>
          <p className="mt-2">
            Keep showing up. Your future self will thank you.
          </p>
          <Link href="/" className="text-rose-700 flex mt-3">
            Visit website <ArrowUpRight size={13} />
          </Link>
        </div>
      </aside>
      <div>
        <header className="topbar">
          <div className="flex">
            <button
              aria-label="Toggle navigation"
              aria-expanded={open}
              className="btn secondary small mobile-menu"
              onClick={() => setOpen(!open)}
            >
              <Menu size={18} />
            </button>
            <span className="muted text-xs">Your learning, connected.</span>
          </div>
          <div className="flex">
            <Link aria-label="Notifications" href={`${base}/notifications`}>
              <span className="flex">
                <Bell size={19} />
                {unread < 0 && (
                  <span title="Notification count unavailable">!</span>
                )}
                {unread > 0 && (
                  <span
                    className="pill"
                    aria-label={`${unread} unread notifications`}
                  >
                    {unread}
                  </span>
                )}
              </span>
            </Link>
            <span className="avatar">{name.slice(0, 1)}</span>
            <div className="user-name">
              <strong className="text-xs">{name}</strong>
              <p className="text-[10px] capitalize">{role.toLowerCase()}</p>
            </div>
            <button
              aria-label="Sign out"
              className="btn secondary small"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="px-8 pb-5 footnote">
          © Spark Academy. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
