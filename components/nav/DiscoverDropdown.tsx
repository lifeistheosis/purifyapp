"use client";

// The Discover slot in the desktop top nav. Behaves as a plain Link to
// /discover when clicked, and reveals a hover/focus dropdown listing the
// study verticals that no longer get their own top-level slot.
//
// Used by both AppNav (in-app header) and Navbar (marketing header).
// The dropdown contents and timing live here once; each caller passes
// the trigger styling so the slot reads visually like the rest of its
// own nav row.

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "@/lib/cn";

type Child = { key: string; label: string; href: string };

export const DISCOVER_CHILDREN: Child[] = [
  { key: "theology", label: "Theology", href: "/theology" },
  { key: "apologetics", label: "Apologetics", href: "/apologetics" },
  { key: "reading", label: "Reading", href: "/reading" },
  { key: "councils", label: "Councils", href: "/councils" },
  { key: "topics", label: "Topics", href: "/topics" },
  { key: "heresies", label: "Heresies", href: "/heresies" },
];

/** Hrefs that should also light up the Discover slot as "active". */
export const DISCOVER_CHILD_HREFS = DISCOVER_CHILDREN.map((c) => c.href);

const OPEN_DELAY = 120;
const CLOSE_DELAY = 200;

export function DiscoverDropdown({
  pathname,
  triggerLabel,
  triggerHref,
  triggerClassName,
  triggerStyle,
}: {
  pathname: string;
  triggerLabel: string;
  triggerHref: string;
  triggerClassName: string;
  triggerStyle?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  function clearTimers() {
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleOpen() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (open || openTimer.current) return;
    openTimer.current = window.setTimeout(() => {
      openTimer.current = null;
      setOpen(true);
    }, OPEN_DELAY);
  }

  function scheduleClose() {
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) return;
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
    }, CLOSE_DELAY);
  }

  function openNow() {
    clearTimers();
    setOpen(true);
  }

  function closeNow() {
    clearTimers();
    setOpen(false);
  }

  // Close on route change.
  useEffect(() => {
    closeNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeNow();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Cleanup pending timers on unmount.
  useEffect(() => clearTimers, []);

  return (
    <div
      className="relative"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocus={openNow}
      onBlur={(e) => {
        // Close when focus leaves the whole subtree.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          scheduleClose();
        }
      }}
    >
      <Link
        href={triggerHref}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClassName}
        style={triggerStyle}
      >
        {triggerLabel}
      </Link>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute left-1/2 top-full -translate-x-1/2 mt-3 min-w-[200px]",
            "rounded-md border border-white/12 bg-night/95 backdrop-blur-xl",
            "shadow-[0_10px_40px_rgba(0,0,0,0.55)] py-2 z-50",
          )}
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
        >
          {DISCOVER_CHILDREN.map((c) => {
            const isActive =
              pathname === c.href || pathname.startsWith(c.href + "/");
            return (
              <Link
                key={c.key}
                href={c.href}
                role="menuitem"
                className={cn(
                  "block px-4 py-2 font-sans text-ui font-medium",
                  "transition-colors duration-150",
                  isActive
                    ? "text-paper"
                    : "text-paper/75 hover:text-paper hover:bg-white/[0.04]",
                )}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
