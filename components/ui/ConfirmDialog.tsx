"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useEscape } from "@/lib/ui/escape";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useReducedMotion } from "@/lib/ui/motion";
import { useDraggableSheet } from "@/lib/ui/useDraggableSheet";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";

/**
 * Purify-styled confirmation dialog. Replaces `window.confirm()` for
 * any destructive action so the site stops surfacing the browser's
 * generic Chrome / Safari modal (which reads as a system-level alert,
 * not part of the app's visual world).
 *
 * Design register matches the rest of the app:
 *   - A surface of the palette's own night with a thin hairline border.
 *   - Rubric-red treatment on the destructive button (matches the
 *     existing Unlink and SignOutEverywhere pill colors).
 *   - Backdrop tap, Escape, Android back, and Cancel all dismiss.
 *   - Enter triggers the destructive action; focus lands on Cancel
 *     by default so an absent-minded keypress doesn't commit.
 *
 * It moves like every pop-up card (lib/ui/useDraggableSheet): a bottom sheet
 * on a phone and a centred card above `md`, either way following the finger,
 * closing on a flick down, with the backdrop dimming and blurring in step.
 * While `pending` it cannot be dismissed: a drag springs back.
 *
 * Its two buttons are 44 to the touch (`min-h-11`). They stood at 39 until
 * 2026-11-11, their height coming from their words and padding alone, which
 * the touch count (lib/ui/__tests__/touchTargets.test.ts) cannot see; a
 * drawing of the care note's question measured it.
 * lib/ui/__tests__/confirmDialogTargets.test.ts holds them.
 *
 * Its card follows the reader's palette (CARD_GROUND below). Until 2026-11-11
 * the card's gradient was Dark's two night colours typed out, so on Light the
 * card stayed near-black under words that had turned dark: the question stood
 * at 1.42:1 and Cancel at 1.07:1, measured on a drawing of a campaign's
 * take-down question (scripts/mock-campaigns.mjs, still 48).
 * lib/ui/__tests__/confirmDialogPalette.test.ts holds it on all five palettes.
 */
/**
 * The card's ground: the palette's own night, soft above and deep below, laid
 * over a solid `bg-night-soft`. The same two stops that were typed here until
 * 2026-11-11 (rgba(29,29,32,0.65) and rgba(16,16,19,0.95), which are Dark's
 * --color-night-soft and --color-night), now by name, and mixed in sRGB as
 * they were: on Dark the card is the same to within one level in 255 (a
 * drawing before and after was compared pixel by pixel), and every other
 * palette gets its own night.
 *
 * Solid: nothing of the page shows through. The surface under the gradient
 * was `bg-night-soft/95` until 2026-11-11. On a phone the backdrop's blur
 * stops at the card's top (lib/ui/useDraggableSheet.ts), so what stood under
 * the card was the page itself, sharp, and its largest words showed through
 * the question at about 4 levels in 255, on every palette.
 */
const CARD_GROUND =
  "linear-gradient(180deg in srgb, color-mix(in srgb, var(--color-night-soft) 65%, transparent) 0%, color-mix(in srgb, var(--color-night) 95%, transparent) 100%)";

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
  const reduced = useReducedMotion();
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const dismiss = () => {
    if (!pending) onCancel();
  };
  const { mounted, panelRef, scrimRef, bodyRef, grab } = useDraggableSheet({
    open,
    onClose: dismiss,
    reduced,
    half: 1,
    locked: pending,
  });

  useEffect(() => {
    if (!mounted) return;
    lockBodyScroll();
    setOverlayOpen(true);
    return () => {
      unlockBodyScroll();
      setOverlayOpen(false);
    };
  }, [mounted]);

  // Land focus on Cancel by default so an Enter keypress doesn't fire the
  // destructive action by accident.
  useEffect(() => {
    if (open) cancelBtnRef.current?.focus({ preventScroll: true });
  }, [open, mounted]);

  // Esc closes; Enter confirms (only when not pending). Escape is answered by
  // the overlay that rose last, so a press here does not also close a sheet
  // this dialog stands over (lib/ui/escape.ts).
  useEscape(open, (e) => {
    e.preventDefault();
    if (!pending) onCancel();
  });
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (!pending) onConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onConfirm]);

  useAndroidBack(mounted, dismiss);

  if (!mounted || typeof document === "undefined") return null;

  const confirmAccent = destructive
    ? "bg-crimson/[0.10] border-crimson/55 text-crimson-soft hover:bg-crimson/[0.20] hover:border-crimson/80"
    : "bg-gold/15 border-gold/50 text-gold hover:bg-gold/25 hover:border-gold/75";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:px-4"
    >
      {/* Backdrop: parchment-night wash with the same vignette feel as
          /calendar pages. Its opacity and blur follow the card. */}
      <button
        ref={scrimRef}
        type="button"
        tabIndex={-1}
        aria-label={cancelLabel}
        onClick={dismiss}
        className="absolute inset-0 bg-night/72"
        style={{
          opacity: 0,
          backgroundImage:
            "radial-gradient(ellipse 100% 80% at 50% 50%, rgba(16,16,19,0) 0%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Card: a thin hairline and a solid surface of the palette's own
          night (CARD_GROUND). A sheet with a handle on a phone, a floating
          card above md. */}
      <div
        ref={panelRef}
        data-confirm-card=""
        className="relative w-full rounded-t-3xl border-t border-paper/15 bg-night-soft shadow-2xl will-change-transform md:max-w-[420px] md:rounded-lg md:border"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          backgroundImage: CARD_GROUND,
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

        <div className="cursor-grab touch-none select-none active:cursor-grabbing md:hidden" {...grab}>
          <div className="flex justify-center pb-1 pt-2.5">
            <span aria-hidden className="block h-1.5 w-11 rounded-full bg-paper/25" />
          </div>
        </div>

        {/* On a phone the whole card pulls down from here too (the body's
            touch handling in useDraggableSheet). */}
        <div ref={bodyRef} className="px-6 pb-6 pt-3 md:p-7">
          <h2
            id="confirm-dialog-title"
            className="text-title-sm text-paper leading-[1.2] tracking-[-0.01em]"
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
              className="min-h-11 font-sans text-detail font-medium rounded-pill border border-paper/20 bg-paper/[0.04] text-paper/85 hover:bg-paper/10 hover:border-paper/40 px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              // The edge of a removal is the house's one alert red on every
              // palette (--color-crimson, app/globals.css); its words follow
              // the palette (--color-crimson-soft).
              data-mock-allow={destructive ? "palette" : undefined}
              data-mock-why={destructive ? "the alert red is one red on every palette (--color-crimson)" : undefined}
              className={
                "min-h-11 font-sans text-detail font-semibold rounded-pill border px-5 py-2 disabled:opacity-60 disabled:cursor-wait transition-colors " +
                confirmAccent
              }
            >
              {pending ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
