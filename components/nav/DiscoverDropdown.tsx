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
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { campaignsEnabled } from "@/lib/campaigns/flags";
import { cn } from "@/lib/cn";
import { trapezaEnabled } from "@/lib/trapeza/flags";

type Child = { key: string; label: string; href: string };

export const DISCOVER_CHILDREN: Child[] = [
  // The full Discover library, in the same menologion order as the
  // /discover page, minus surfaces that already hold their own
  // top-level nav slot (Saints, Calendar, Bible, Prayers) and the shop
  // (its own top-level button, gated by the marketplace flag).
  { key: "history", label: "Orthodox History", href: "/history" },
  { key: "reading", label: "Reading", href: "/reading" },
  // Community prayer, gated by the campaigns flag until its tables are live.
  ...(campaignsEnabled()
    ? [{ key: "campaigns", label: "Prayer Campaigns", href: "/campaigns" }]
    : []),
  // The fasting-recipe board, gated by its flag until the tables are live.
  ...(trapezaEnabled()
    ? [{ key: "trapeza", label: "The Trapeza", href: "/trapeza" }]
    : []),
  { key: "theology", label: "Theology", href: "/theology" },
  { key: "apologetics", label: "Apologetics", href: "/apologetics" },
  { key: "topics", label: "Topics", href: "/topics" },
  { key: "heresies", label: "Heresies", href: "/heresies" },
  { key: "councils", label: "Councils", href: "/councils" },
  { key: "psalter", label: "The Psalter", href: "/bible/psalms/1" },
  { key: "patristic", label: "Patristic commentary", href: "/bible/john/1" },
];

/** Hrefs that light up the Discover slot as "active". The two Bible
 * deep links are excluded: standing in the Psalter should light the
 * Bible slot, not two nav items at once. */
export const DISCOVER_CHILD_HREFS = DISCOVER_CHILDREN.map((c) => c.href).filter(
  (h) => !h.startsWith("/bible"),
);

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

  // Stable (useCallback with no deps — only refs and setState inside) so
  // the effects below can list it as a dependency without re-running.
  const clearTimers = useCallback(() => {
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const closeNow = useCallback(() => {
    clearTimers();
    setOpen(false);
  }, [clearTimers]);

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

  // Close on route change. The state is adjusted during render (React's
  // "adjust state when a prop changes" pattern) instead of in an effect;
  // the effect below only clears pending hover timers so a queued open
  // can't fire on the page we just navigated to.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    clearTimers();
  }, [pathname, clearTimers]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeNow();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeNow]);

  // Cleanup pending timers on unmount.
  useEffect(() => clearTimers, [clearTimers]);

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
          // Programmatically focusable (not in the tab order): the a11y
          // contract for the menu role. Tabbing still goes to the items.
          tabIndex={-1}
          className={cn(
            "absolute left-1/2 top-full mt-3 min-w-[230px] origin-top",
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
