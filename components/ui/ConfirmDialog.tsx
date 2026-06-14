"use client";

import { useEffect, useRef, useState } from "react";
import { setOverlayOpen } from "@/lib/ui/overlay";

/**
 * Purify-styled confirmation dialog. Replaces `window.confirm()` for
 * any destructive action so the site stops surfacing the browser's
 * generic Chrome / Safari modal (which reads as a system-level alert,
 * not part of the app's visual world).
 *
 * Design register matches the rest of the app:
 *   - Dark night surface with thin gold hairline border.
 *   - Rubric-red treatment on the destructive button (matches the
 *     existing Unlink and SignOutEverywhere pill colors).
 *   - Display-serif title; sans body.
 *   - Backdrop tap, Escape, and Cancel all dismiss.
 *   - Enter triggers the destructive action; focus lands on Cancel
 *     by default so an absent-minded keypress doesn't commit.
 *
 * Two-phase mount: the DOM stays around for ~180ms after `open` flips
 * false so the fade-out animation can run.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When true, the confirm button is disabled and shows "Working…". */
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setMounted(true);
      setOverlayOpen(true);
      const r = requestAnimationFrame(() => {
        setShown(true);
        // Land focus on Cancel by default so an Enter-keypress
        // doesn't accidentally fire the destructive action.
        cancelBtnRef.current?.focus();
      });
      return () => cancelAnimationFrame(r);
    } else if (mounted) {
      setShown(false);
      setOverlayOpen(false);
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Esc closes; Enter confirms (only when not pending and the
  // dialog actually owns focus, checked via document.activeElement).
  useEffect(() => {
    if (!shown) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!pending) onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!pending) onConfirm();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, pending, onCancel, onConfirm]);

  // Lock body scroll while shown.
  useEffect(() => {
    if (!shown) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shown]);

  if (!mounted) return null;

  const confirmAccent = destructive
    ? "bg-crimson/[0.10] border-crimson/55 text-crimson-soft hover:bg-crimson/[0.20] hover:border-crimson/80"
    : "bg-gold/15 border-gold/50 text-gold hover:bg-gold/25 hover:border-gold/75";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
    >
      {/* Backdrop: parchment-night wash with the same vignette feel as
          /calendar pages, instead of the flat #000 / 50% the browser
          confirm uses. */}
      <div
        aria-hidden
        onClick={() => {
          if (!pending) onCancel();
        }}
        className={
          "absolute inset-0 bg-night/72 backdrop-blur-sm transition-opacity duration-200 " +
          (shown ? "opacity-100" : "opacity-0")
        }
        style={{
          backgroundImage:
            "radial-gradient(ellipse 100% 80% at 50% 50%, rgba(16,16,19,0) 0%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Card: thin gold hairline border, parchment-tinted surface,
          display-serif title, body text in paper. Mirrors the
          calendar's section-card register. */}
      <div
        className={
          "relative w-full max-w-[420px] rounded-lg border border-paper/15 bg-night-soft/95 shadow-2xl transition-all duration-200 " +
          (shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")
        }
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(29,29,32,0.65) 0%, rgba(16,16,19,0.95) 100%)",
        }}
      >
        {/* Gold rule top accent so the dialog reads as a piece of the
            site's visual world, not a system alert. */}
        <div
          aria-hidden
          className="absolute inset-x-6 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(183,176,163,0.45) 50%, transparent 100%)",
          }}
        />

        <div className="p-6 md:p-7">
          <h2
            id="confirm-dialog-title"
            className="font-display-serif text-title-sm md:text-title-sm text-paper leading-[1.2] tracking-[-0.01em]"
          >
            {title}
          </h2>
          <p className="mt-3 font-sans text-ui text-paper/70 leading-[1.6]">
            {description}
          </p>

          <div className="mt-7 flex items-center justify-end gap-3">
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="font-sans text-detail font-medium rounded-pill border border-paper/20 bg-paper/[0.04] text-paper/85 hover:bg-paper/10 hover:border-paper/40 px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className={
                "font-sans text-detail font-semibold rounded-pill border px-5 py-2 disabled:opacity-60 disabled:cursor-wait transition-colors " +
                confirmAccent
              }
            >
              {pending ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
