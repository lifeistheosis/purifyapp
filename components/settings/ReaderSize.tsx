"use client";

// Reader size in Settings (1.8, the owner's pick A of round 3, "Lit panels"):
// a verse of John at the size chosen, over a slider with four stops. His note
// 9 of build 80 said reader size was "not right yet": it was four words in a
// row of pills, and showed nothing of what they did.
//
// It shows the size the Bible reads at. A reader who never chose one sees
// Large, as the Bible opens them (BIBLE_START_SIZE); until 1.8 this screen
// asked the store without the Bible's start and lit Medium, a size that
// reader had never seen.

import { Fragment, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  BIBLE_START_SIZE,
  FONT_CLASSES,
  SIZE_CLASSES,
  useReaderPrefs,
  type ReaderFont,
  type ReaderSize,
} from "@/components/reader/ReaderPrefs";
import { cn } from "@/lib/cn";
import { TEXT_SIZES } from "@/lib/reader/textSize";
import { JOHN_1_OPENING, PREVIEW_CHAPTER } from "@/lib/settings/preview";
import { stopAt, stopForKey, stopShare } from "@/lib/settings/sizeSlider";

import { Row } from "./LitPanel";
import { SizesGlyph } from "./glyphs";

/** Each size's name, as the reader's own settings name them. */
export const SIZE_KEYS: Readonly<Record<ReaderSize, string>> = {
  sm: "settings.sizeSmall",
  md: "settings.sizeMedium",
  lg: "settings.sizeLarge",
  xl: "settings.sizeExtraLarge",
};

const isRtl = (el: Element) => getComputedStyle(el).direction === "rtl";

/** The row, wired to the reader's preferences, starting where the Bible starts. */
export function ReaderSizeRow() {
  const { t } = useTranslate();
  const { size, setSize, font, leadingValue } = useReaderPrefs(BIBLE_START_SIZE);
  return (
    <Row icon={<SizesGlyph />} label={t("ui.readerSize")} description={t("settings.sizeHint")}>
      <ReaderSizeControl size={size} font={font} leading={leadingValue} onChange={setSize} />
    </Row>
  );
}

/** The verse at the size, and the slider under it. */
export function ReaderSizeControl({
  size,
  font,
  leading,
  onChange,
}: {
  size: ReaderSize;
  font: ReaderFont;
  /** The reader's line spacing, as the Bible sets it (undefined: the size's own). */
  leading?: number;
  onChange: (size: ReaderSize) => void;
}) {
  const { t } = useTranslate();
  const at = TEXT_SIZES.indexOf(size);
  return (
    <>
      {/* The page's own ground, set in: the verse reads here as it reads in
          the Bible, in the reader's face and spacing. */}
      <div aria-hidden className="set-well">
        <span className="set-well-ref">{`${t("bible.books.john")} ${PREVIEW_CHAPTER}`}</span>
        <p lang="en" dir="ltr" className={cn(FONT_CLASSES[font], SIZE_CLASSES[size])} style={leading ? { lineHeight: leading } : undefined}>
          {JOHN_1_OPENING.slice(0, 3).map((v) => (
            <Fragment key={v.n}>
              <span className="set-vn">{v.n}</span>
              {v.text}{" "}
            </Fragment>
          ))}
        </p>
      </div>
      <SizeSlider
        at={at}
        names={TEXT_SIZES.map((s) => t(SIZE_KEYS[s]))}
        label={t("ui.readerSize")}
        onChange={(i) => onChange(TEXT_SIZES[i])}
      />
    </>
  );
}

/**
 * Four stops on a carved track, the way to the chosen one lit. A tap lands on
 * the nearest stop and a drag along the track moves through them; a drag
 * that turns into a scroll of the page changes nothing. The keys move it as
 * a slider's do.
 */
function SizeSlider({
  at,
  names,
  label,
  onChange,
}: {
  at: number;
  names: readonly string[];
  label: string;
  onChange: (at: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const press = useRef<{ id: number; x: number; moved: boolean } | null>(null);
  const count = names.length;

  const land = (clientX: number) => {
    const el = track.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const next = stopAt(clientX, box.left, box.width, count, isRtl(el));
    if (next !== at) onChange(next);
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    press.current = { id: e.pointerId, x: e.clientX, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    // A few pixels of give, so a tap that wobbles is still a tap.
    if (!p.moved && Math.abs(e.clientX - p.x) < 4) return;
    p.moved = true;
    land(e.clientX);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    land(e.clientX);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = stopForKey(e.key, at, count, isRtl(e.currentTarget));
    if (next === null) return;
    e.preventDefault();
    if (next !== at) onChange(next);
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={count - 1}
      aria-valuenow={at}
      aria-valuetext={names[at]}
      className="set-slider"
      style={{ "--at": stopShare(at, count) } as CSSProperties}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        press.current = null;
      }}
      onKeyDown={key}
    >
      <div aria-hidden className="set-slider-bar">
        <span className="set-slider-a1">A</span>
        <div ref={track} className="set-slider-track">
          <span className="set-slider-fill" />
          {names.map((_, i) => (
            <span
              key={i}
              className="set-slider-stop"
              data-past={i < at ? "" : undefined}
              style={{ "--stop": stopShare(i, count) } as CSSProperties}
            />
          ))}
          <span className="set-slider-thumb" />
        </div>
        <span className="set-slider-a2">A</span>
      </div>
      <div aria-hidden className="set-slider-names">
        {names.map((name, i) => (
          <span key={i} data-on={i === at ? "" : undefined} style={{ "--stop": stopShare(i, count) } as CSSProperties}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
