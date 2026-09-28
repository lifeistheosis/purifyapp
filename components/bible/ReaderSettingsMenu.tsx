"use client";

import { useEffect, useRef, useState } from "react";
import { Sliders } from "@/components/ui/icons/Sliders";
import { Sheet } from "@/components/ui/Sheet";
import { useInterlinear } from "@/lib/bible/interlinear";
import { FONT_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import type {
  ReaderSize,
  ReaderFont,
  ReaderLeading,
} from "@/components/reader/ReaderPrefs";
import { ReadingModeChips } from "@/components/reader/ReadingModeChips";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

// Each size is shown as the letter A at a growing size rather than as a
// word or its first letter: "S M L X" meant nothing in half the 21
// languages (German gave K M G S), and four full words do not fit a row.
const SIZES: { v: ReaderSize; labelKey: string; glyph: string }[] = [
  { v: "sm", labelKey: "settings.sizeSmall", glyph: "text-[13px]" },
  { v: "md", labelKey: "settings.sizeMedium", glyph: "text-[16px]" },
  { v: "lg", labelKey: "settings.sizeLarge", glyph: "text-[19px]" },
  { v: "xl", labelKey: "bible.sizeXLarge", glyph: "text-[23px]" },
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

const EYEBROW =
  "font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55 mb-2";

/**
 * One option in a row of choices. Compact in the desktop popover; 44px tall
 * in the phone sheet, which is the smallest a thumb can hit reliably.
 */
function Choice({
  on,
  touch,
  onClick,
  label,
  className,
  children,
}: {
  on: boolean;
  touch: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex min-w-0 items-center justify-center rounded-md border px-1 font-sans font-medium leading-none transition-colors",
        touch ? "min-h-11 text-detail" : "min-h-9 text-caption",
        on
          ? "bg-paper/15 border-paper/45 text-paper"
          : "border-paper/12 text-paper/65 hover:bg-paper/8 hover:text-paper",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A full-width on/off row: Focus reading, Interlinear Greek. */
function ToggleRow({
  on,
  touch,
  onClick,
  label,
}: {
  on: boolean;
  touch: boolean;
  onClick: () => void;
  label: string;
}) {
  const { t } = useTranslate();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "w-full inline-flex items-center justify-between gap-3 rounded-pill border px-3.5 font-sans text-detail font-medium transition-colors",
        touch ? "min-h-12" : "h-[40px]",
        on
          ? "border-gold text-night bg-gold hover:bg-[#c89e2c]"
          : "border-paper/15 bg-paper/[0.04] text-paper/85 hover:bg-paper/10 hover:border-paper/30",
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={cn("inline-block h-2 w-2 shrink-0 rounded-full", on ? "bg-night" : "bg-paper/30")}
        />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-semibold">{on ? t("common.on") : t("common.off")}</span>
    </button>
  );
}

/**
 * Every reader preference, in one place: text size, font, line spacing,
 * reading mode, and (where there is no toolbar pill for them) Focus and
 * Interlinear. The desktop popover and the phone sheet render this same
 * block, so the two can no longer disagree about what a reader may change:
 * the phone's top-bar sheet used to offer size and font only, the Reader
 * pill's panel everything.
 */
function ReaderSettingsControls({
  showInterlinear,
  toggles,
  touch,
  onFocusToggled,
}: {
  showInterlinear: boolean;
  /** Include Focus and Interlinear. Off on desktop, where each has its own pill. */
  toggles: boolean;
  /** Phone sheet sizing. */
  touch: boolean;
  /** Focus hides the reader chrome, so whatever holds these controls closes. */
  onFocusToggled?: () => void;
}) {
  const { t } = useTranslate();
  const { size, setSize, font, setFont, leading, setLeading, focus, toggleFocus } =
    useReaderPrefs();
  const { on: interlinearOn, toggle: toggleInterlinear } = useInterlinear();

  return (
    <div className={touch ? "space-y-5" : "space-y-4"}>
      <div>
        <p className={EYEBROW}>{t("bible.textSize")}</p>
        <div className="grid grid-cols-4 gap-1.5">
          {SIZES.map((s) => (
            <Choice
              key={s.v}
              on={size === s.v}
              touch={touch}
              onClick={() => setSize(s.v)}
              label={t(s.labelKey)}
            >
              <span aria-hidden className={cn("font-serif font-semibold", s.glyph)}>
                A
              </span>
            </Choice>
          ))}
        </div>
      </div>

      <div>
        <p className={EYEBROW}>{t("bible.fontLabel")}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {FONTS.map((f) => (
            <Choice key={f.v} on={font === f.v} touch={touch} onClick={() => setFont(f.v)}>
              {/* Each name set in its own face, so the choice shows itself. */}
              <span className={cn("truncate", FONT_CLASSES[f.v])}>{t(f.labelKey)}</span>
            </Choice>
          ))}
        </div>
      </div>

      <div>
        <p className={EYEBROW}>{t("bible.lineSpacing")}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {LEADINGS.map((l) => (
            <Choice key={l.v} on={leading === l.v} touch={touch} onClick={() => setLeading(l.v)}>
              <span className="truncate">{t(l.labelKey)}</span>
            </Choice>
          ))}
        </div>
      </div>

      {/* Reading mode: the palette half of Premium Reading Modes. Focus, the
          chrome half, is its own toggle; the two compose. */}
      <div className="pt-3 border-t border-paper/10">
        <ReadingModeChips touch={touch} />
      </div>

      {toggles && (
        <div className="pt-3 border-t border-paper/10 space-y-2.5">
          <ToggleRow
            on={focus}
            touch={touch}
            label={t("bible.focusReading")}
            onClick={() => {
              toggleFocus();
              onFocusToggled?.();
            }}
          />
          {/* NT only, and only on the public-domain text. */}
          {showInterlinear && (
            <ToggleRow
              on={interlinearOn}
              touch={touch}
              label={t("bible.interlinearGreek")}
              onClick={toggleInterlinear}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The phone's reader settings: a bottom sheet the width of the screen.
 *
 * Opened from two places, the gear in the top bar (MobileReaderActions) and
 * the Reader pill under the book picker, and both now show this same sheet.
 * The pill used to open a 288px popover anchored to its own left edge. In
 * the New Testament the Interlinear pill sits in front of it, so the popover
 * started halfway across the screen and ran off the right side
 * (reported 2026-09-27 on Android, John 1).
 */
export function ReaderSettingsSheet({
  open,
  onClose,
  showInterlinear,
}: {
  open: boolean;
  onClose: () => void;
  showInterlinear: boolean;
}) {
  const { t } = useTranslate();
  return (
    <Sheet open={open} onClose={onClose} title={t("bible.readerSettings")}>
      <div className="space-y-5 py-2">
        <ReaderSettingsControls
          showInterlinear={showInterlinear}
          toggles
          touch
          onFocusToggled={onClose}
        />
        <p className="font-sans text-caption text-paper/45 leading-[1.55]">
          {t("bible.readerPrefsNote")}
        </p>
      </div>
    </Sheet>
  );
}

/**
 * The Reader pill. On desktop (`embedded`) it opens a popover under the pill,
 * right-aligned because the pill sits at the right of the toolbar, without
 * Focus and Interlinear, which have their own pills beside it. On phones it
 * opens ReaderSettingsSheet, with everything in it.
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
  const { on: interlinearOn } = useInterlinear();

  // Outside click and Escape for the desktop popover only. The phone sheet
  // dismisses itself, and it is portaled, so a tap inside it would count as
  // outside here.
  useEffect(() => {
    if (!open || !embedded) return;
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
  }, [open, embedded]);

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

      {embedded ? (
        open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t("bible.readerSettings")}
            // 288px, not 260: at 260 a reading mode chip had 67px for its
            // name, and Candlelight needs about 70 (2026-09-27).
            className="absolute right-0 mt-2 w-72 z-50 rounded-lg border border-paper/20 bg-night-soft shadow-pop p-4"
          >
            <ReaderSettingsControls
              showInterlinear={showInterlinear}
              toggles={false}
              touch={false}
            />
          </div>
        )
      ) : (
        <ReaderSettingsSheet
          open={open}
          onClose={() => setOpen(false)}
          showInterlinear={showInterlinear}
        />
      )}
    </div>
  );
}
