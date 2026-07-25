"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { Close } from "@/components/ui/icons/Close";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { useReducedMotion } from "@/lib/ui/motion";
import { useTranslate } from "@/components/i18n/MessagesProvider";

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
 * Animation: a slide over `--duration-fast`. Mounting/unmounting is
 * two-phase so the exit animation runs before the DOM node disappears.
 * Under `prefers-reduced-motion` the sheet appears and disappears
 * instantly, and the exit hold drops to zero so nothing lingers.
 *
 * No `backdrop-filter` on the scrim, deliberately: the Android WebView
 * bleeds imagery through it and drops frames (see the GiftBox note in
 * globals.css). A flat dim reads the same and costs nothing.
 */
// Keep in sync with --duration-fast. A CSS custom property cannot be read
// from a setTimeout, so this is the one place the value is duplicated.
const EXIT_MS = 200;

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
  const { t } = useTranslate();
  const reduced = useReducedMotion();
  // Two-phase mount: keep the DOM around for the exit animation after
  // `open` flips false so the slide-down can complete.
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
      const t = setTimeout(() => setMounted(false), reduced ? 0 : EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [open, reduced]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!mounted) return;
    lockBodyScroll();
    setOverlayOpen(true);
    return () => {
      unlockBodyScroll();
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

  // Android hardware back closes the sheet rather than navigating away — the
  // sheet has no browser history of its own, so without this back feels stuck.
  useAndroidBack(mounted, onClose);

  if (!mounted || typeof document === "undefined") return null;

  // Portaled to <body>, same reasoning as the reader's "Exit focus" pill
  // (components/reader/ReaderPrefs.tsx): rendered inline, this z-[60] is
  // scoped to whatever stacking context the host page happens to create, so
  // the z-50 native tab bar painted OVER the sheet's lower region and buried
  // the chapter grid — the backdrop's dim and blur did not reach the tab bar
  // either, which is how you can tell it was above rather than below. At body
  // level the z-index competes at the root, so a modal sheet covers the app
  // chrome the way a modal should.
  return createPortal(
    <div
      className="md:hidden fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className={
          "absolute inset-0 bg-night/70 transition-opacity duration-fast ease-house motion-reduce:transition-none " +
          (shown ? "opacity-100" : "opacity-0")
        }
      />
      <div
        className={
          "absolute inset-x-0 bottom-0 max-h-[85dvh] bg-night border-t border-paper/15 rounded-t-3xl shadow-[0_-12px_36px_rgba(0,0,0,0.55)] flex flex-col transition-transform duration-fast ease-house motion-reduce:transition-none " +
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
            aria-label={t("common.close")}
            onClick={onClose}
            className="h-10 w-10 inline-flex items-center justify-center rounded-pill text-paper/65 hover:text-paper"
          >
            <Close size={16} />
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
    </div>,
    document.body,
  );
}
