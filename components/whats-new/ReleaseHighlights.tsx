"use client";

// The current release at the top of /whats-new: a headline and a pill per
// feature, and a tap on a pill opens a picture of that feature, with the
// neighbours a swipe of the arrows away. The pills match the release's
// announcement image, so the picture a reader saw on Discord is the page
// they land on. Data and the reasons for it: lib/whatsNew/highlights.ts.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD, CARD_BG, PILL } from "@/components/ui/Graphite";
import { Close } from "@/components/ui/icons/Close";
import { cn } from "@/lib/cn";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { useReducedMotion } from "@/lib/ui/motion";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useDraggableSheet } from "@/lib/ui/useDraggableSheet";
import { RELEASE_HIGHLIGHTS } from "@/lib/whatsNew/highlights";

const ITEMS = RELEASE_HIGHLIGHTS.items;

export function ReleaseHighlights() {
  const { t } = useTranslate();
  const [open, setOpen] = useState<number | null>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  // Where focus goes back to when the picture closes: the pill that opened it.
  const returnTo = useRef<number | null>(null);

  const show = (i: number) => {
    returnTo.current = i;
    setOpen(i);
  };
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (open !== null || returnTo.current === null) return;
    triggers.current[returnTo.current]?.focus();
    returnTo.current = null;
  }, [open]);

  return (
    <section aria-labelledby="release-highlights-title" className={cn(CARD, "hover:translate-y-0")} style={CARD_BG}>
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-premium-soft">
        {t(RELEASE_HIGHLIGHTS.eyebrow)}
      </p>
      <h2
        id="release-highlights-title"
        className="mt-3 text-title font-bold leading-[1.08] tracking-[-0.02em] text-paper md:text-display-sm"
      >
        {t(RELEASE_HIGHLIGHTS.title)}
      </h2>
      <p className="mt-3 max-w-[56ch] font-sans text-ui leading-[1.6] text-paper/70">{t(RELEASE_HIGHLIGHTS.sub)}</p>
      <ul className="mt-6 flex flex-wrap gap-2.5">
        {ITEMS.map((it, i) => (
          <li key={it.id}>
            <button
              ref={(el) => {
                triggers.current[i] = el;
              }}
              type="button"
              aria-haspopup="dialog"
              onClick={() => show(i)}
              className={cn(
                PILL,
                "px-4 text-detail",
                // The app's gold is the Premium one; --color-gold is a near-white grey.
                it.accent && "border-premium/55 bg-premium/[0.12] text-premium-ink hover:border-premium hover:bg-premium/20",
              )}
            >
              {t(it.label)}
            </button>
          </li>
        ))}
      </ul>
      <HighlightDialog index={open} onClose={close} onMove={setOpen} />
    </section>
  );
}

/**
 * One feature's picture. A bottom sheet on a phone and a card on a wider
 * screen, and either way it follows the finger like every pop-up card
 * (lib/ui/useDraggableSheet): drag its top to move it, flick it down to close
 * it, and the backdrop dims and blurs in step.
 */
function HighlightDialog({
  index,
  onClose,
  onMove,
}: {
  index: number | null;
  onClose: () => void;
  onMove: (i: number) => void;
}) {
  const { t } = useTranslate();
  const reduced = useReducedMotion();
  // half: 1, because the sheet ends in its arrows.
  const { mounted, panelRef, scrimRef, bodyRef, grab } = useDraggableSheet({
    open: index !== null,
    onClose,
    reduced,
    half: 1,
  });
  // Keep showing the last picture while the sheet slides away.
  const [last, setLast] = useState(index ?? 0);
  if (index !== null && index !== last) setLast(index);
  const shown = index ?? last;
  const it = ITEMS[shown];
  const prev = (shown - 1 + ITEMS.length) % ITEMS.length;
  const next = (shown + 1) % ITEMS.length;

  useEffect(() => {
    if (!mounted) return;
    lockBodyScroll();
    setOverlayOpen(true);
    return () => {
      unlockBodyScroll();
      setOverlayOpen(false);
    };
  }, [mounted]);

  // Focus the panel on open and on every move, so a screen reader hears the
  // new heading and the arrow keys keep working.
  useEffect(() => {
    if (index !== null) panelRef.current?.focus({ preventScroll: true });
  }, [index, mounted, panelRef]);

  useEffect(() => {
    if (index === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onMove(next);
      else if (e.key === "ArrowLeft") onMove(prev);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onClose, onMove, next, prev]);

  useAndroidBack(mounted, onClose);

  if (!mounted || typeof document === "undefined") return null;

  // Portaled to <body> for the same reason as components/ui/Sheet.tsx: inline,
  // the native tab bar would paint over the lower part of the picture.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="highlight-title"
    >
      {/* Backdrop. Its opacity and blur are driven by the sheet's position. */}
      <button
        ref={scrimRef}
        type="button"
        tabIndex={-1}
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-night/70"
        style={{ opacity: 0 }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-[980px] flex-col overflow-hidden rounded-t-3xl border border-paper/15 bg-night shadow-[0_24px_60px_rgba(0,0,0,0.6)] outline-none will-change-transform sm:rounded-3xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* The handle and title bar are one grab area. */}
        <div className="cursor-grab touch-none select-none active:cursor-grabbing" {...grab}>
          <div className="flex justify-center pt-2.5">
            <span aria-hidden className="block h-1.5 w-11 rounded-full bg-paper/25" />
          </div>
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-2 md:px-6">
            <h2 id="highlight-title" className="text-lede font-semibold text-paper">
              {t(it.label)}
            </h2>
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-pill text-paper/65 hover:text-paper"
            >
              <Close size={18} />
            </button>
          </div>
        </div>

        <figure ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 md:px-6">
          <div className="flex justify-center">
            <Image
              key={it.id}
              src={it.image.src}
              alt={t(it.label)}
              width={it.image.width}
              height={it.image.height}
              unoptimized
              // Shown the moment the dialog opens, so waiting for it to come
              // near the viewport only delays it: on a phone it arrived late.
              loading="eager"
              className="h-auto max-h-[62dvh] w-auto max-w-full rounded-xl"
            />
          </div>
          <figcaption className="mx-auto mt-4 max-w-[64ch] font-sans text-ui leading-[1.6] text-paper/80">
            {t(it.caption)}
          </figcaption>
        </figure>

        <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-6">
          <button type="button" onClick={() => onMove(prev)} className={cn(PILL, "px-4 text-detail")}>
            <span aria-hidden className="mr-1.5">
              ←
            </span>
            {t("common.previous")}
          </button>
          <span className="font-sans text-caption tabular-nums text-paper/50">
            {shown + 1} / {ITEMS.length}
          </span>
          <button type="button" onClick={() => onMove(next)} className={cn(PILL, "px-4 text-detail")}>
            {t("common.next")}
            <span aria-hidden className="ml-1.5">
              →
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
