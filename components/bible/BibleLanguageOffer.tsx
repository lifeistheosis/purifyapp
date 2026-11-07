"use client";

// "Change the app's language?" (1.9). The owner, 2026-11-06: "if they pick a
// Romanian Bible ... a pop-up ... do you want to change the translation of
// the app to Romanian also? And also add a button to click never show
// again." And of its first draw, a sheet rising from the foot, 2026-11-07:
// "make this a pop up rather than a pull up bar".
//
// Asked once, when a reader picks a Bible in another language than the
// app's (lib/bible/downloads/languageOffer.ts). Switch changes the app's
// language as the language setting does (useApplyLocale); Not now leaves it;
// Never ask again leaves it and is kept for every Bible after. The sentence
// names the language in the app's own language ("Russian", "Russisch"), the
// button in its own words ("Русский"), as the language setting names it.
//
// A card in the middle of the screen, over a dimmed page: it fades and grows
// in on the app's motion switch, and is simply there without it. A tap off
// the card, Escape and Android's back are Not now.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useApplyLocale } from "@/components/i18n/useApplyLocale";
import { downloadableBible, type DownloadableBible } from "@/lib/bible/downloads/catalog";
import { onLanguageOffer, refuseLanguageOffer } from "@/lib/bible/downloads/languageOffer";
import { cn } from "@/lib/cn";
import { getLocale } from "@/lib/i18n/locales";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { useReducedMotion } from "@/lib/ui/motion";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";

/** How long the card takes to leave, so it can fade before it goes. */
const LEAVE_MS = 180;

export function BibleLanguageOffer() {
  const { t, locale } = useTranslate();
  const applyLocale = useApplyLocale();
  const reduced = useReducedMotion();
  const [bible, setBible] = useState<DownloadableBible | null>(null);
  const [shown, setShown] = useState(false);
  const [switching, setSwitching] = useState(false);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => onLanguageOffer((id) => setBible(downloadableBible(id))), []);
  const open = bible !== null;

  const close = useCallback(() => {
    setShown(false);
    window.setTimeout(() => setBible(null), reduced ? 0 : LEAVE_MS);
  }, [reduced]);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    setOverlayOpen(true);
    // In one frame after it is drawn, so it fades and grows in.
    const frame = window.requestAnimationFrame(() => setShown(true));
    first.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      unlockBodyScroll();
      setOverlayOpen(false);
    };
  }, [open, close]);

  useAndroidBack(open, close);

  if (!bible || typeof document === "undefined") return null;
  const native = getLocale(bible.language).nativeLabel;
  const language = named(bible.language, locale) ?? native;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bible-language-title"
      aria-describedby="bible-language-body"
      className="fixed inset-0 z-[80] flex items-center justify-center px-6"
      data-bible-language-offer=""
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={close}
        className={cn("absolute inset-0 bg-night/75 motion-safe:transition-opacity motion-safe:duration-200", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative w-full max-w-[340px] rounded-[24px] border border-paper/12 bg-night-soft px-6 pb-5 pt-7 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]",
          "motion-safe:transition-[opacity,transform,translate,scale] motion-safe:duration-200 motion-safe:ease-house",
          shown ? "scale-100 opacity-100" : "scale-[0.96] opacity-0",
        )}
      >
        <h2 id="bible-language-title" className="text-balance font-heading text-title-sm font-bold leading-tight text-paper">
          {t("bible.languageOffer.title")}
        </h2>
        <p id="bible-language-body" className="mx-auto mt-3 max-w-[30ch] text-pretty font-sans text-detail leading-[1.55] text-paper/70">
          {t("bible.languageOffer.body", { language })}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            ref={first}
            type="button"
            disabled={switching}
            onClick={() => {
              setSwitching(true);
              void applyLocale(bible.language).finally(() => {
                setSwitching(false);
                close();
              });
            }}
            className="tap-press inline-flex min-h-12 items-center justify-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night disabled:opacity-60"
          >
            {t("bible.languageOffer.switch", { native })}
          </button>
          <button
            type="button"
            onClick={close}
            className="tap-press inline-flex min-h-12 items-center justify-center rounded-pill border border-paper/15 bg-paper/[0.04] px-5 font-sans text-ui font-semibold text-paper/90 hover:border-paper/30"
          >
            {t("bible.languageOffer.notNow")}
          </button>
          <button
            type="button"
            onClick={() => {
              refuseLanguageOffer();
              close();
            }}
            className="tap-press mt-1 inline-flex min-h-11 items-center justify-center rounded-pill px-5 font-sans text-detail font-medium text-paper/55 hover:text-paper/85"
          >
            {t("bible.languageOffer.never")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** A language's name in the app's language, as the translations list names it. */
function named(code: string, locale: string): string | null {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? null;
  } catch {
    return null;
  }
}
