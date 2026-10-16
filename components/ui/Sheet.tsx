"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { Close } from "@/components/ui/icons/Close";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { useReducedMotion } from "@/lib/ui/motion";
import { useDraggableSheet } from "@/lib/ui/useDraggableSheet";
import { useVisibleFrame } from "@/lib/ui/viewport";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Shared bottom sheet, used by the saint-works reader (TOC), the Bible reader
 * (chapter picker, reader settings, cross-references, word study), Plus,
 * the shop filters, the Today verse card, the history timeline and the
 * update prompt. Mobile-only by convention; desktop uses a dropdown, popover
 * or sidebar unless the caller opts in with `desktop`.
 *
 * It follows the finger, like the commentary sheet (lib/ui/useDraggableSheet):
 * the whole header drags both ways, the body pulls down from its top, a flick
 * closes it, and the backdrop dims and blurs in step with the sheet rather
 * than arriving at once. Long content opens to 60% of the screen and pulls up
 * to full, unless the sheet ends in its own action (`openFull`). The owner
 * asked for this on every pop-up card on 2026-10-01, after it shipped on the
 * commentary (2a1a80a8).
 *
 *  - `max-h-[85dvh]`, rounded top corners, a 44pt close button.
 *  - Backdrop tap, Escape, Android back and the close button all dismiss.
 *  - Body scroll is locked while open.
 *  - Registers with the shared overlay flag so floating UI (the PWA install
 *    banner) steps aside.
 *  - Reduced motion: the sheet and backdrop dissolve; a drag still follows
 *    the finger, because that is the reader's hand and not an animation.
 *  - On a tablet in the apps it is a centred panel 560px wide, not a bar
 *    across the whole screen (data-sheet-panel, globals.css, 1.7): the
 *    reader's translation, book and settings sheets open there now.
 *  - `layer="over-player"` stands it over Now Playing (z-[70]) at z-[80]:
 *    the sleep timer, the ambience sheet and the upgrade sheet opened from
 *    the player (1.7). Every other sheet stays at z-[60], under the player,
 *    as before.
 *  - `fill` (1.7, the journal's writing): the sheet takes the whole height
 *    of what the on-screen keyboard leaves (lib/ui/viewport.ts,
 *    useVisibleFrame), so a field in it is never under the keyboard. The box
 *    it sits in ignores the pointer, so the scrim behind still closes it.
 *  - `header` replaces the title row (a sheet with its own Cancel and Done);
 *    the handle above it still drags. `panelClassName` sizes the panel on a
 *    computer (a wider writing panel).
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
  /**
   * Let the sheet render above `md` as well.
   *
   * Off by default, because the house convention is that desktop uses a
   * dropdown or popover instead, and most callers rely on that. Opt in when
   * the same surface is shown on both (the Today verse card is on
   * /prayers/today, which is the web's desktop Today), and the alternative
   * would be a second affordance to build and keep in step.
   *
   * On desktop the panel stops being full-bleed: a 1920px-wide bar holding
   * three menu items reads as a mistake. It caps and centres instead.
   */
  desktop = false,
  /**
   * Open at full height even when the content is long. For a sheet whose
   * last line is its action (subscribe, update, apply filters), which a 60%
   * opening would hide below the screen.
   */
  openFull = false,
  /** Over Now Playing, for a sheet opened from inside it. */
  layer,
  /** Beside the title, before the close button: a small mark (the Plus mark). */
  titleExtra,
  /** As tall as what the keyboard leaves, for a sheet that takes typing. */
  fill = false,
  /** In place of the title row and its close button. */
  header,
  /** Added to the panel's classes, after the defaults (a computer's width). */
  panelClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  bodyClassName?: string;
  desktop?: boolean;
  openFull?: boolean;
  layer?: "over-player";
  titleExtra?: React.ReactNode;
  fill?: boolean;
  header?: React.ReactNode;
  panelClassName?: string;
}) {
  const { t } = useTranslate();
  const reduced = useReducedMotion();
  // half: 1 means a long sheet has no lower rest: it opens at its own height.
  const { mounted, panelRef, scrimRef, bodyRef, grab } = useDraggableSheet({
    open,
    onClose,
    reduced,
    half: openFull || fill ? 1 : undefined,
  });
  // The part of the screen the keyboard has not covered (fill only).
  const frame = useVisibleFrame();
  const keyboardUp =
    fill && frame !== null && typeof window !== "undefined" && window.innerHeight - (frame.top + frame.height) > 80;

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

  // Android hardware back closes the sheet rather than navigating away. The
  // sheet has no browser history of its own, so without this back feels stuck.
  useAndroidBack(mounted, onClose);

  if (!mounted || typeof document === "undefined") return null;

  // Portaled to <body>, same reasoning as the reader's "Exit focus" pill
  // (components/reader/ReaderPrefs.tsx): rendered inline, this z-[60] is
  // scoped to whatever stacking context the host page happens to create, so
  // the z-50 native tab bar painted OVER the sheet's lower region and buried
  // the chapter grid. At body level the z-index competes at the root, so a
  // modal sheet covers the app chrome the way a modal should.
  return createPortal(
    <div
      className={
        // native-md-block: inside the native shell a sheet is the only picker
        // there is, at every width. Without it a tablet lost the chapter grid,
        // the reader actions, the TOC and the update prompt above 768px.
        (desktop ? "" : "md:hidden native-md-block ") + (layer === "over-player" ? "fixed inset-0 z-[80]" : "fixed inset-0 z-[60]")
      }
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop. Its opacity and blur are driven by the sheet's position. */}
      <button
        ref={scrimRef}
        type="button"
        tabIndex={-1}
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-night/60"
        style={{ opacity: 0 }}
      />
      {/* fill: the panel stands in a box the size of what the keyboard has
          left, which lets the pointer through to the scrim. */}
      <div
        className={fill ? "pointer-events-none absolute inset-x-0" : "contents"}
        style={fill ? (frame ? { top: frame.top, height: frame.height } : { top: 0, bottom: 0 }) : undefined}
      >
        <div
          ref={panelRef}
          data-sheet-panel={desktop ? undefined : ""}
          className={cn(
            "absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl border-t border-paper/15 bg-night shadow-[0_-12px_36px_rgba(0,0,0,0.55)] will-change-transform",
            fill ? "pointer-events-auto h-[calc(100%-env(safe-area-inset-top,0px)-0.75rem)] max-h-full" : "max-h-[85dvh]",
            // Desktop: a capped, centred panel lifted off the edge, so it reads
            // as a floating menu rather than a bar across the whole screen.
            desktop && "md:mx-auto md:max-w-[440px] md:bottom-6 md:rounded-3xl md:border",
            desktop && fill && "md:h-auto md:max-h-[min(720px,calc(100%-3rem))]",
            panelClassName,
          )}
          // Over the keyboard there is no home bar to clear.
          style={{ paddingBottom: keyboardUp ? "0px" : "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* The handle and title bar are one grab area. touch-none stops the
              browser claiming the gesture before the pointer handlers see it. */}
          <div className="cursor-grab touch-none select-none active:cursor-grabbing" {...grab}>
            <div className="flex justify-center pb-1.5 pt-2.5">
              <span aria-hidden className="block h-1.5 w-11 rounded-full bg-paper/25" />
            </div>
            {header ?? (
              <div className="flex items-center justify-between gap-3 px-4 pb-2">
                <p className="min-w-0 truncate font-sans text-ui font-semibold text-paper">{title}</p>
                {titleExtra ? <span className="me-auto shrink-0">{titleExtra}</span> : null}
                <button
                  type="button"
                  aria-label={t("common.close")}
                  onClick={onClose}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill text-paper/65 hover:text-paper"
                >
                  <Close size={16} />
                </button>
              </div>
            )}
          </div>
          <div
            ref={bodyRef}
            className={"flex-1 overflow-y-auto overscroll-contain scrollbar-thin px-4 pb-5 " + (bodyClassName ?? "")}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
