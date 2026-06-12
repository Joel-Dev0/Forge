"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Menu, X, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  // Animate open
  useEffect(() => {
    if (!sidebarRef.current || !overlayRef.current) return;

    if (sidebarOpen) {
      gsap.to(overlayRef.current, { opacity: 1, duration: 0.25, ease: "power2.out" });
      gsap.to(sidebarRef.current, { x: "0%", duration: 0.35, ease: "power3.out" });
      gsap.from(itemsRef.current!.children, {
        x: 30, opacity: 0, duration: 0.3, stagger: 0.07, delay: 0.15, ease: "power2.out",
      });
    } else {
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: "power2.in" });
      gsap.to(sidebarRef.current, { x: "100%", duration: 0.3, ease: "power3.in" });
    }
  }, [sidebarOpen]);

  const close = () => setSidebarOpen(false);

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    { name: "Documentation", href: "/docs" },
    { name: "Downloads", href: "/downloads" },
    { name: "Roadmap", href: "/roadmap" },
  ];

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-surface-2 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="text-2xl font-bold text-primary tracking-tighter">
              Forge.
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === item.href ? "text-primary" : "text-foreground/80"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Right side: theme toggle + hamburger */}
            <div className="flex items-center gap-2">
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-full hover:bg-surface-2 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === "dark"
                    ? <Sun className="h-5 w-5 text-accent" />
                    : <Moon className="h-5 w-5 text-accent" />
                  }
                </button>
              )}

              {/* Hamburger — mobile only */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-surface-2 transition-colors"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5 text-foreground" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile sidebar ───────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={close}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm opacity-0 pointer-events-none md:hidden"
        style={{ pointerEvents: sidebarOpen ? "auto" : "none" }}
      />

      {/* Drawer panel */}
      <div
        ref={sidebarRef}
        className="fixed top-0 right-0 h-full w-72 z-[70] flex flex-col bg-surface-1 border-l border-surface-2 translate-x-full md:hidden"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-2">
          <Link href="/" onClick={close} className="text-2xl font-bold text-primary tracking-tighter">
            Forge.
          </Link>
          <button
            onClick={close}
            className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Nav items */}
        <div ref={itemsRef} className="flex flex-col px-4 py-6 gap-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/80 hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Drawer footer — download CTA */}
        <div className="px-6 py-6 border-t border-surface-2">
          <Link
            href="/downloads"
            onClick={close}
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_16px_rgba(255,107,0,0.4)]"
          >
            <Download className="w-4 h-4" /> Download Free
          </Link>
        </div>
      </div>
    </>
  );
}
