"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { highlightVars, useHighlightNames } from "@/lib/bible/highlightColors";
import { cn } from "@/lib/cn";

/**
 * Choosing a highlight's colour (1.7.1): the top of a verse's tools and of a
 * paragraph's, on a phone (MobileVerseToolbar) and in the hover toolbar's
 * popover on a computer.
 *
 * The owner, 2026-10-18: "the color picking and the when you click it to
 * change what each color means. I want you to optimize the UI for that."
 * Before, a row of 28px discs sat above the tools with nothing to say what
 * a colour meant, the current one marked only by a thin ring; a separate
 * spark toggled the highlight, and the only way to name a colour was a key at
 * the foot of every chapter.
 *
 *   - Six discs, each a 44px target for the thumb. One tap highlights in that
 *     colour, or changes the colour of a highlight already there. The colour
 *     the words wear carries a check, drawn in as it moves, and a tap on it
 *     takes the highlight away; so does Remove, beside its name.
 *   - Above them, a line saying what the colour means: the reader's name for
 *     the colour their finger rests on, or the one the words wear, or, before
 *     anything is chosen, what a tap will do. A colour with no name goes by
 *     what it is called ("Rose").
 *   - Names opens the sheet where each colour is named
 *     (HighlightNamesSheet), at the colour in question.
 *
 * `guard` answers whether a tap is really the lift of the finger that opened
 * the tools (lib/ui/liftGuard.ts); such a tap is ignored.
 */
export function HighlightPicker({
  active,
  onPick,
  onRemove,
  onNames,
  hint,
  guard,
  className,
}: {
  /** The colour the words wear now, or null when they wear none. */
  active: string | null;
  /** Highlight in this colour, or change to it. */
  onPick: (id: string) => void;
  /** Take the highlight away. */
  onRemove: () => void;
  /** Open the names, at this colour when there is one in question. */
  onNames: (id: string | null) => void;
  /** What a tap does, before there is a colour: "Highlight verse". */
  hint: string;
  guard?: () => boolean;
  className?: string;
}) {
  const { t } = useTranslate();
  const { colors, nameOf, labelOf, colorName } = useHighlightNames();
  // The colour under the finger (or the pointer), shown in the line above
  // before the tap lands.
  const [peek, setPeek] = useState<string | null>(null);
  const shown = peek ?? active;
  const ignore = () => guard?.() === true;

  return (
    <div className={className}>
      <div className="flex min-h-9 items-center gap-1 pe-1 ps-3">
        <p className="flex min-w-0 flex-1 items-center gap-2 font-sans text-caption font-semibold text-paper/85" aria-live="polite">
          {shown ? (
            <span aria-hidden data-hl-color={shown} style={highlightVars(shown)} className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--hl-swatch)]" />
          ) : null}
          <span className="truncate">{shown ? labelOf(shown) : hint}</span>
        </p>
        {active ? (
          <button
            type="button"
            onClick={() => {
              if (!ignore()) onRemove();
            }}
            aria-label={t("bible.removeHighlight")}
            className="tap-press hit-44 inline-flex h-9 shrink-0 items-center rounded-pill px-3 font-sans text-caption font-semibold text-paper/70 hover:text-paper active:bg-paper/10"
          >
            {t("common.remove")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (!ignore()) onNames(shown);
          }}
          className="tap-press hit-44 inline-flex h-9 shrink-0 items-center rounded-pill px-3 font-sans text-caption font-semibold text-paper/70 hover:text-paper active:bg-paper/10"
        >
          {t("bible.highlightNames.open")}
        </button>
      </div>
      <div role="group" aria-label={t("bible.highlightColors")} className="flex items-center justify-between">
        {colors.map((c) => {
          const on = active === c.id;
          const name = nameOf(c.id);
          return (
            <button
              key={c.id}
              type="button"
              data-hl-color={c.id}
              data-hl-swatch=""
              style={highlightVars(c.id)}
              aria-pressed={on}
              aria-label={t("bible.highlightColorNamed", { label: name ? `${colorName(c.id)}, ${name}` : colorName(c.id) })}
              title={labelOf(c.id)}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") setPeek(c.id);
              }}
              onPointerDown={() => setPeek(c.id)}
              onPointerLeave={() => setPeek(null)}
              onPointerCancel={() => setPeek(null)}
              onClick={() => {
                setPeek(null);
                if (ignore()) return;
                if (on) onRemove();
                else onPick(c.id);
              }}
              className="tap-press grid h-11 w-11 min-w-0 shrink place-items-center rounded-full"
            >
              <span
                aria-hidden
                className={cn(
                  "grid h-[30px] w-[30px] place-items-center rounded-full bg-[var(--hl-swatch)] text-night shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)] motion-safe:transition-transform motion-safe:duration-200",
                  on && "scale-[1.13]",
                )}
              >
                {on ? <Check key={c.id} size={17} strokeWidth={2.4} className="check-draw" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
