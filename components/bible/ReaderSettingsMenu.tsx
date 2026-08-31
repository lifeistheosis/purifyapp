"use client";

import { useEffect, useRef, useState } from "react";
import { Sliders } from "@/components/ui/icons/Sliders";
import { useInterlinear } from "@/lib/bible/interlinear";
import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import type {
  ReaderSize,
  ReaderFont,
  ReaderLeading,
} from "@/components/reader/ReaderPrefs";
import { ReadingModeChips } from "@/components/reader/ReadingModeChips";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

const SIZES: { v: ReaderSize; labelKey: string }[] = [
  { v: "sm", labelKey: "settings.sizeSmall" },
  { v: "md", labelKey: "settings.sizeMedium" },
  { v: "lg", labelKey: "settings.sizeLarge" },
  { v: "xl", labelKey: "bible.sizeXLarge" },
];

const FONTS: { v: ReaderFont; labelKey: string }[] = [
  { v: "serif", labelKey: "bible.fontSerif" },
  { v: "display", labelKey: "settings.fontDisplay" },
  { v: "sans", labelKey: "settings.fontSans" },
];

const LEADINGS: { v: ReaderLeading; labelKey: string }[] = [
  { v: "normal", labelKey: "bible.leadingNormal" },
  { v: "relaxed", labelKey: "bible.leadingRelaxed" },
  { v: "loose", labelKey: "bible.leadingLoose" },
];

/**
 * Consolidated reader menu: text size, font family, line spacing, and
 * (on mobile) the Focus + Interlinear toggles. Collapses what would
 * otherwise be 3–5 chrome chips down to a single "Reader" pill.
 *
 * `embedded` is set true on desktop where Focus and Interlinear are
 * already shown as their own dedicated pills next to this menu — in
 * that mode we hide the in-panel Focus + Interlinear sections AND the
 * gold status dot on the button, so the same control doesn't appear
 * twice on the row.
 */
export function ReaderSettingsMenu({
  showInterlinear,
  embedded = false,
}: {
  showInterlinear: boolean;
  embedded?: boolean;
}) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { size, setSize, font, setFont, leading, setLeading, focus, toggleFocus } =
    useReaderPrefs();
  const { on: interlinearOn, toggle: toggleInterlinear } = useInterlinear();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (buttonRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const tm = setTimeout(
      () => document.addEventListener("mousedown", onDoc),
      50,
    );
    return () => {
      clearTimeout(tm);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("bible.readerSettings")}
        className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] hover:border-paper/30 hover:bg-paper/10 px-3.5 h-[42px] font-sans text-detail font-medium text-paper transition-colors"
      >
        <Sliders aria-hidden className="h-4 w-4" />
        <span>{t("bible.reader")}</span>
        {/* Status dot: reserved space so the button width never shifts as
            interlinear toggles. Suppressed in embedded mode (desktop), where
            Interlinear has its own dedicated pill next to this menu and a
            second indicator here would be a duplicate signal. */}
        {!embedded && (
          <span
            aria-hidden
            className={cn(
              "inline-block w-1.5 h-1.5 rounded-full transition-colors",
              interlinearOn && showInterlinear
                ? "bg-gold"
                : "bg-transparent",
            )}
            title={
              interlinearOn && showInterlinear
                ? t("bible.interlinearIsOn")
                : undefined
            }
          />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t("bible.readerSettings")}
          // Anchor to the side the button sits on so the panel opens into
          // the page, never off it: the desktop (embedded) pill is on the
          // right of the toolbar, the mobile pill is at the left of its
          // row. Right-aligning the mobile panel shot it off the left edge.
          // The viewport cap is a guard for very narrow phones.
          className={cn(
            "absolute mt-2 w-[260px] max-w-[calc(100vw-1.5rem)] z-50 rounded-lg border border-paper/20 bg-night-soft shadow-pop p-4 space-y-4",
            embedded ? "right-0" : "left-0",
          )}
        >
          {/* Text size */}
          <div>
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55 mb-2">
              {t("bible.textSize")}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s.v}
                  type="button"
                  onClick={() => setSize(s.v)}
                  className={cn(
                    "rounded-md border py-2 font-sans text-caption font-medium transition-colors",
                    size === s.v
                      ? "bg-paper/15 border-paper/45 text-paper"
                      : "border-paper/12 text-paper/65 hover:bg-paper/8 hover:text-paper",
                  )}
                >
                  {t(s.labelKey).charAt(0)}
                </button>
              ))}
            </div>
          </div>

          {/* Font family */}
          <div>
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55 mb-2">
              {t("bible.fontLabel")}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {FONTS.map((f) => (
                <button
                  key={f.v}
                  type="button"
                  onClick={() => setFont(f.v)}
                  className={cn(
                    "rounded-md border py-2 font-sans text-caption font-medium transition-colors",
                    font === f.v
                      ? "bg-paper/15 border-paper/45 text-paper"
                      : "border-paper/12 text-paper/65 hover:bg-paper/8 hover:text-paper",
                  )}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Line spacing */}
          <div>
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55 mb-2">
              {t("bible.lineSpacing")}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {LEADINGS.map((l) => (
                <button
                  key={l.v}
                  type="button"
                  onClick={() => setLeading(l.v)}
                  className={cn(
                    "rounded-md border py-2 font-sans text-caption font-medium transition-colors",
                    leading === l.v
                      ? "bg-paper/15 border-paper/45 text-paper"
                      : "border-paper/12 text-paper/65 hover:bg-paper/8 hover:text-paper",
                  )}
                >
                  {t(l.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Reading mode — the palette half of Premium Reading Modes.
              Focus (the chrome half) keeps its own toggle below/on the
              toolbar; the two compose. */}
          <div className="pt-3 border-t border-paper/10">
            <ReadingModeChips />
          </div>

          {/* Focus reading. Hidden on desktop (embedded), where Focus is
              its own dedicated pill on the toolbar and would duplicate here. */}
          {!embedded && (
          <div className="pt-3 border-t border-paper/10">
            <button
              type="button"
              onClick={() => {
                toggleFocus();
                setOpen(false);
              }}
              aria-pressed={focus}
              className={cn(
                "w-full inline-flex items-center justify-between gap-3 rounded-pill border h-[40px] px-3.5 font-sans text-detail font-medium transition-colors",
                focus
                  ? "border-gold text-night bg-gold hover:bg-[#c89e2c]"
                  : "border-paper/15 bg-paper/[0.04] text-paper/85 hover:bg-paper/10 hover:border-paper/30",
              )}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "inline-block w-2 h-2 rounded-full",
                    focus ? "bg-night" : "bg-paper/30",
                  )}
                />
                {t("bible.focusReading")}
              </span>
              <span className="font-semibold">{focus ? t("common.on") : t("common.off")}</span>
            </button>
          </div>
          )}

          {/* Interlinear (NT only). Hidden on desktop (embedded) for the same
              reason as Focus above — it has its own dedicated pill there. */}
          {!embedded && showInterlinear && (
            <div className="pt-3 border-t border-paper/10">
              <button
                type="button"
                onClick={toggleInterlinear}
                aria-pressed={interlinearOn}
                className={cn(
                  "w-full inline-flex items-center justify-between gap-3 rounded-pill border h-[40px] px-3.5 font-sans text-detail font-medium transition-colors",
                  interlinearOn
                    ? "border-gold text-night bg-gold hover:bg-[#c89e2c]"
                    : "border-paper/15 bg-paper/[0.04] text-paper/85 hover:bg-paper/10 hover:border-paper/30",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "inline-block w-2 h-2 rounded-full",
                      interlinearOn ? "bg-night" : "bg-paper/30",
                    )}
                  />
                  {t("bible.interlinearGreek")}
                </span>
                <span className="font-semibold">{interlinearOn ? t("common.on") : t("common.off")}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
