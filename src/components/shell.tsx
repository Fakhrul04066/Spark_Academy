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
  MessageCircle,
  Users,
  Files,
  LogOut,
  Menu,
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
  students: Users,
  teachers: Users,
  resources: Files,
};
export function Shell({
  role,
  name,
  initialAvatar,
  children,
}: {
  role: keyof typeof navigation;
  name: string;
  initialAvatar?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState(initialAvatar || "");
  const [displayName, setDisplayName] = useState(name);
  useEffect(() => { setAvatar(initialAvatar || ""); setDisplayName(name); }, [initialAvatar, name]);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ avatar?: string; name?: string }>).detail;
      if (detail?.avatar) setAvatar(detail.avatar);
      if (detail?.name) setDisplayName(detail.name);
    };
    window.addEventListener("profile-updated", update);
    return () => window.removeEventListener("profile-updated", update);
  }, []);
  const pathname = usePathname();
  const base = "/" + role.toLowerCase();
  const section = pathname.split("/")[2] || "dashboard";
  const qaBoard = section === "questions" && role !== "ADMIN";
  const sectionName = section === "questions"
    ? "Q&A"
    : navigation[role].find(([key]) => key === (section === "attempt" ? "exams" : section))?.[1] ?? "Dashboard";
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
          {navigation[role].filter(([key]) => !["settings", "notifications", "attendance", "progress", "routines"].includes(key)).map(([key, label]) => {
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
          <strong>A focused academic workspace.</strong>
          <p className="mt-2">
            Everything you need to keep your academic activity organized.
          </p>
          <Link href="/" className="text-slate-700 flex mt-3">
            Visit website <ArrowUpRight size={13} />
          </Link>
        </div>
      </aside>
      <div>
        <header className="topbar">
          <div className="topbar-section">
            <button
              aria-label="Toggle navigation"
              aria-expanded={open}
              className="btn secondary small mobile-menu"
              onClick={() => setOpen(!open)}
            >
              <Menu size={18} />
            </button>
            {qaBoard ? (
              <h1 className="topbar-qa-title">
                <span aria-hidden="true"><MessageCircle size={17} /></span>
                Q&amp;A
              </h1>
            ) : (
              <span className="topbar-section-name" title={sectionName}>{sectionName}</span>
            )}
          </div>
          <div className="topbar-actions">
            <Link className="avatar" href={`${base}/${role === "ADMIN" ? "settings" : "profile"}`} aria-label="My profile">
              {avatar ? <img src={avatar} alt="Your profile photo" onError={() => setAvatar("")} /> : displayName.slice(0, 1)}
            </Link>
            <div className="user-name">
              <strong className="text-xs">{displayName}</strong>
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
