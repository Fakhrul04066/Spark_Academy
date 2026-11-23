"use client";

import Link from "next/link";
import { LogIn, Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const links = [
  ["home", "Home"], ["courses", "Courses"], ["features", "Features"],
  ["about", "About Us"], ["how", "How It Works"], ["faq", "FAQ"], ["contact", "Contact"],
] as const;

// One public navigation and one container scale for landing and account pages.
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    const outside = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, [open]);
  return <header className="site-header" ref={header} lang="en">
    <div className="site-container site-nav-row">
      <Link href="/" className="site-logo" aria-label="Spark Academy home">
        <img src="/spark-reference-wordmark.svg" alt="Spark Academy" width="190" height="52" />
      </Link>
      <nav id="site-navigation" className={`site-links${open ? " is-open" : ""}`} aria-label="Main navigation">
        {links.map(([id, label]) => <Link key={id} href={`/#${id}`} onClick={() => setOpen(false)}>{label}</Link>)}
      </nav>
      <form id="program-search" className="site-program-search" action="/#courses" role="search">
        <button aria-label="Search programs" type="submit"><Search size={18} aria-hidden="true" /></button>
        <input id="courseSearch" name="search" type="search" aria-label="Search academic programs" placeholder="Search courses…" />
      </form>
      <div className="site-actions">
        <Link href="/login" className="site-login" aria-current={pathname === "/login" ? "page" : undefined}><LogIn size={17} aria-hidden="true" /><span>Log In</span></Link>
        <Link href="/#courses" className="site-enroll">Enroll Now</Link>
        <button className="site-menu-toggle" ref={toggle} type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>{open ? <X size={23} /> : <Menu size={23} />}</button>
      </div>
    </div>
  </header>;
}
