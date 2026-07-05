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
  // Doctrine, Topics, Heresies, and Apologetics now live under the one
  // Theology hub (which carries the shared mode switcher), so the top nav
  // points there once instead of listing four near-identical surfaces.
  { key: "theology", label: "Theology", href: "/theology" },
  { key: "reading", label: "Reading", href: "/reading" },
  { key: "councils", label: "Councils", href: "/councils" },
  // The shop is not listed here: it has its own top-level slot in both
  // headers (AppNav and Navbar), gated by the same marketplace flag.
];

/** Hrefs that light up the Discover slot as "active", including the four
 * theology modes folded under the hub, so their routes still highlight it. */
export const DISCOVER_CHILD_HREFS = [
  ...DISCOVER_CHILDREN.map((c) => c.href),
  "/topics",
  "/heresies",
  "/apologetics",
];

const OPEN_DELAY = 120;
const CLOSE_DELAY = 200;
// Duration of the panel's open/close animation. Kept in one place so the
// CSS transition and the unmount timer stay in step.
const MENU_ANIM_MS = 200;

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
  // `open` is the hover/focus intent. `mounted` keeps the panel in the DOM
  // through the close animation, and `visible` drives the transition (off on
  // mount so opening animates from the closed state, and off again before
  // unmount so closing animates too). Same two-phase pattern as components/ui/Sheet.
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- mount/visible are the
     animation gate; they must flip in an effect a frame apart so the CSS
     transition has a start and an end state (Sheet.tsx precedent). */
  useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), MENU_ANIM_MS);
    return () => window.clearTimeout(t);
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
      {mounted && (
        <div
          role="menu"
          className={cn(
            "absolute left-1/2 top-full mt-3 min-w-[200px] origin-top",
            "rounded-md border border-white/12 bg-night/95 backdrop-blur-xl",
            "shadow-[0_10px_40px_rgba(0,0,0,0.55)] py-2 z-50",
            // Smooth linear open/close: fade + a small slide-and-scale from
            // the trigger. Linear easing as requested; reduced motion snaps.
            "transition-[opacity,transform] duration-200 ease-linear",
            "motion-reduce:transition-none",
            visible
              ? "opacity-100 -translate-x-1/2 translate-y-0 scale-100"
              : "opacity-0 -translate-x-1/2 -translate-y-1 scale-[0.97] pointer-events-none",
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
