"use client";

import { useToday } from "@/lib/calendar/useToday";
import {
  verseDayKey,
  type VerseOfDayEntry,
} from "@/lib/today/verseOfDay.types";
import { VerseCardActions } from "./VerseCardActions";
import { T } from "@/components/i18n/T";

/**
 * The Verse of the Day card itself. Client-side so it can read the
 * reader's own calendar day; the verse TEXT still comes from the server
 * (or, on Android, from the build), because it is loaded out of
 * data/bible through `server-only` code that cannot run on a device.
 *
 * `table` is a date-keyed window produced by the parent. See
 * lib/today/verseOfDay.ts for why it is a window rather than one entry.
 */
export function VerseOfDayView({
  table,
  headingId,
}: {
  table: Record<string, VerseOfDayEntry>;
  /** See VerseOfDayCard: promotes the label to a named `<h2>`. */
  headingId?: string;
}) {
  const today = useToday();
  const key = today ? verseDayKey(today) : null;
  // Before hydration, and if a long-installed build runs past the end of
  // its window, fall back to the first entry rather than an empty card.
  const keys = Object.keys(table);
  const vod = (key && table[key]) || (keys.length ? table[keys[0]] : null);
  const stale = Boolean(key && keys.length && !table[key]);
  const Label = headingId ? "h2" : "span";

  return (
    <article
      className="relative overflow-hidden rounded-[28px] border border-paper/10 p-6 pt-5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)]"
      style={{
        background:
          "radial-gradient(120% 85% at 85% 8%, rgba(255,255,255,0.10) 0%, transparent 52%), linear-gradient(165deg, #26262b 0%, #1a1a1d 52%, #101013 100%)",
      }}
    >
      {/* A scatter of faint stars — the meditation "night sky" motif. */}
      <svg
        aria-hidden
        viewBox="0 0 400 220"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
        preserveAspectRatio="xMidYMid slice"
      >
        {[
          [44, 30, 1.4], [120, 18, 1], [330, 26, 1.6], [368, 70, 1],
          [300, 14, 0.9], [78, 64, 0.9], [356, 150, 1.2], [28, 120, 1],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.7)" />
        ))}
        {/* soft crescent moon, upper right */}
        <path
          d="M352 44 a16 16 0 1 0 10 28 a13 13 0 1 1 -10 -28 Z"
          fill="rgba(255,255,255,0.45)"
        />
      </svg>

      {/* Soft wave shape at lower-right, owned SVG */}
      <svg
        aria-hidden
        viewBox="0 0 400 200"
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-50"
        preserveAspectRatio="none"
      >
        <path
          d="M0 160 C 80 120, 160 200, 240 150 S 400 120, 400 160 L 400 200 L 0 200 Z"
          fill="rgba(16,16,19,0.85)"
        />
      </svg>

      <div className="relative">
        {/* Eyebrow row: label + a small owned three-bar cross anchoring
            this as the day's word, with the kind chip on the right. */}
        <div className="flex items-center justify-between gap-3">
          {/* The inline font is not a style preference: globals.css sets
              h1..h6 to Lora 700 UNLAYERED, which beats any font-* utility,
              so an <h2 className="font-sans"> would still render as bold
              Lora and this 11px uppercase label would change face the
              moment it became a heading. */}
          <Label
            id={headingId}
            style={
              headingId
                ? { fontFamily: "var(--font-sans)", fontWeight: 600 }
                : undefined
            }
            className="inline-flex items-center gap-2 font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold/80"
          >
            <ThreeBarCross />
            <T k="today.verseOfDay" />
          </Label>
          {vod && vod.source !== "rotation" && !stale && (
            <span className="shrink-0 inline-flex items-center rounded-full border border-paper/15 bg-paper/[0.05] px-2.5 py-[2px] font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-paper/60">
              {vod.source === "gospel" ? (
                <T k="bible.kindGospel" />
              ) : vod.source === "epistle" ? (
                <T k="bible.kindEpistle" />
              ) : (
                <T k="bible.kindOt" />
              )}
            </span>
          )}
        </div>

        <p className="mt-3 font-sans text-detail font-semibold tracking-[0.01em] text-paper/80">
          {vod?.label ?? " "}
        </p>

        <div className="mt-2 font-serif text-title-sm leading-[1.32] text-paper/95">
          {vod?.text ?? (
            <span className="text-paper/45 italic">
              <T k="today.loadingVerse" />
            </span>
          )}
        </div>

        {vod && (
          <VerseCardActions
            refLabel={vod.label}
            href={vod.href}
            shareText={vod.text ?? vod.label}
            shareUrl={vod.href}
            book={vod.book}
            bookName={vod.bookName}
            chapter={vod.chapter}
            verse={vod.verse}
          />
        )}
      </div>
    </article>
  );
}

function ThreeBarCross() {
  return (
    <svg
      width={11}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className="shrink-0"
      aria-hidden
    >
      <line x1="12" y1="2.5" x2="12" y2="21.5" />
      <line x1="8.5" y1="6" x2="15.5" y2="6" />
      <line x1="5.5" y1="9.5" x2="18.5" y2="9.5" />
      <line x1="8" y1="16.5" x2="16" y2="14" />
    </svg>
  );
}
