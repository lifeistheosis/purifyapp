"use client";

import { useEffect, useState } from "react";
import { setOverlayOpen } from "@/lib/ui/overlay";

/**
 * Shared mobile bottom-sheet primitive, extracted from the bespoke
 * `MobileCommentarySheet` pattern so it can be reused by the saint-works
 * reader (TOC sheet) and the Bible reader (chapter picker, reader
 * settings sheet). Mobile-only by convention, desktop should use a
 * different affordance (dropdown, popover, sidebar).
 *
 *  - Slides up from the bottom, `max-h-[85dvh]`, rounded top corners.
 *  - Grab handle at top, title bar with close button (44pt tap target).
 *  - Backdrop tap, Escape key, and close button all dismiss.
 *  - Body scroll is locked while open.
 *  - Registers with the shared overlay flag so floating UI (the PWA
 *    install banner) steps aside.
 *
 * Animation: a 220ms slide. Mounting/unmounting is two-phase so the
 * exit animation runs before the DOM node disappears.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  /**
   * Optional class applied to the inner scrolling container. Pass
   * `space-y-3` etc. to control the children layout.
   */
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  // Two-phase mount: keep the DOM around for ~220ms after `open` flips
  // false so the slide-down animation can complete.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(r);
    } else {
      setShown(false);
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setOverlayOpen(true);
    return () => {
      document.body.style.overflow = prev;
      setOverlayOpen(false);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="md:hidden fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={
          "absolute inset-0 bg-night/70 backdrop-blur-sm transition-opacity duration-200 " +
          (shown ? "opacity-100" : "opacity-0")
        }
      />
      <div
        className={
          "absolute inset-x-0 bottom-0 max-h-[85dvh] bg-night border-t border-paper/15 rounded-t-3xl shadow-[0_-12px_36px_rgba(0,0,0,0.55)] flex flex-col transition-transform duration-200 ease-out " +
          (shown ? "translate-y-0" : "translate-y-full")
        }
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Grab handle */}
        <div className="pt-2.5 pb-1.5 flex justify-center">
          <div
            aria-hidden
            className="h-1 w-10 rounded-full bg-paper/25"
          />
        </div>
        {/* Title bar */}
        <div className="px-4 pb-2 flex items-center justify-between gap-3">
          <p className="font-sans text-ui font-semibold text-paper truncate">
            {title}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="h-10 w-10 inline-flex items-center justify-center rounded-pill text-paper/65 hover:text-paper"
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div
          className={
            "flex-1 overflow-y-auto scrollbar-thin px-4 pb-5 " +
            (bodyClassName ?? "")
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
