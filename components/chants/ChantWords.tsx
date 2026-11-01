"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { LiveCaptions } from "@/components/player/LiveCaptions";
import { cn } from "@/lib/cn";
import type { ShownVariant } from "@/lib/chants/cleared";
import { captionsFor, chantMediaUrl, loadTiming, timingInHand, WORDS_VIEWS, type WordsView } from "@/lib/chants/media";
import { useChantPlayback } from "@/lib/chants/play";
import type { ChantIndexVariant, ChantTiming, ChantVariant } from "@/lib/chants/types";
import { setWordsPrefs, useWordsPrefs } from "@/lib/chants/wordsPrefs";
import { useSungLines } from "@/lib/player/clock";
import { getAudioSnapshot, play, seek, setTrack } from "@/lib/prayers/persistentAudioStore";
import { tabForKey } from "@/lib/ui/sectionTabs";

/**
 * A version's words on its chant's page, behind the Words door (1.8, sheet
 * r3-18, the owner's pick of 2026-10-31, B's page: "the words as sung, large
 * and lit, and the English under the line being sung, only there").
 *
 * Each line is drawn from the version's own data, nothing added
 * (lib/chants/media.ts captionsFor, lib/player/captions.ts lineParts): the
 * words as they are sung lead, and a line's English (`en`, a version sung in
 * another language) stands under it, under the line being sung only, and
 * under every line while nothing is being sung, so the words read whole on
 * their own (components/player/LiveCaptions.tsx, `english="under"`).
 *
 * The switch on the words (notes 56 and 59, the owner: "there should be
 * Arabic, right? But you should also have the option to switch it to English
 * transliteration", "and there's an option to show both at the same time"):
 * the words as sung, their sound, or each word over its sound, read right to
 * left for Arabic, so a reader can match word to sound. Drawn for every
 * version of a chant some version of which has its sound written out
 * (`switchable`), its parts greyed for a version with none, never taken away,
 * so choosing another version moves nothing (note 61). The choice is kept on
 * the device (lib/chants/wordsPrefs.ts) and Now Playing shows the words the
 * same way.
 *
 * While this version plays, the line being sung is lit and rises, and its
 * words light as they are sung, from the one clock Now Playing's words read
 * too (lib/player/clock.ts); a tap on a line goes there. With nothing
 * playing, or no signal for the timing file, the words are simply the words,
 * every line at full strength.
 *
 * The words are the Church's published text, never a transcript (note 28),
 * and where they come from is said under the last line (ChantWordsSource).
 * Where a version's words as sung are cleared and switched on in the admin
 * (build 86 note 78, lib/chants/cleared.ts), they come with their own
 * timing, in hand, and are shown the same way.
 */
export function ChantWords({
  variant,
  indexVariant,
  switchable,
  active = true,
  className,
}: {
  variant: ShownVariant;
  indexVariant: ChantIndexVariant;
  /** The chant has a version with its sound written out: the switch is drawn, for every version. */
  switchable: boolean;
  /** The Words door is open. */
  active?: boolean;
  className?: string;
}) {
  const prefs = useWordsPrefs();
  const { loaded } = useChantPlayback(indexVariant);
  const hasSound = variant.lines.some((l) => l.translit);
  // A version with no sound written out shows its words as sung, whatever
  // was chosen for another; the choice stays for that other.
  const view: WordsView = hasSound ? prefs.view : "original";
  const shown = useMemo(() => ({ view, en: true }), [view]);

  // The line times, from the timing file beside the recording, at once when
  // it is already here (Now Playing's Read opens the page on the line being
  // sung). Without a signal there are none, and the words are simply the
  // words. Kept with the file it came from, so another version's times never
  // light this version's words.
  const [loadedTiming, setLoadedTiming] = useState<{ path: string; timing: ChantTiming | null } | null>(null);
  const clearedTiming = variant.clearedTiming;
  useEffect(() => {
    let alive = true;
    const path = variant.timing;
    if (path && !clearedTiming) {
      void loadTiming(path).then((found) => {
        if (alive) setLoadedTiming({ path, timing: found });
      });
    }
    return () => {
      alive = false;
    };
  }, [clearedTiming, variant.timing]);
  const timing =
    clearedTiming ?? (loadedTiming && loadedTiming.path === variant.timing ? loadedTiming.timing : timingInHand(variant.timing));
  const source = useMemo(() => captionsFor(variant.lines, timing, shown), [shown, timing, variant.lines]);
  const sung = useSungLines(source, variant.audio.durationSec, loaded);

  // One set of words: while this version plays, Now Playing shows these same
  // lines, the sound shown as the reader keeps it here.
  useEffect(() => {
    if (!loaded || !sung.timed) return;
    const snap = getAudioSnapshot();
    if (!snap.src || JSON.stringify(snap.captions) === JSON.stringify(source)) return;
    setTrack(chantMediaUrl(indexVariant.audio.src), { captions: source });
  }, [indexVariant.audio.src, loaded, source, sung.timed]);

  // A tap on a line: there, and playing.
  const onSeek = useCallback((at: number) => {
    seek(at);
    if (!getAudioSnapshot().playing) play();
  }, []);

  // Under the last line, in the same box: where the words come from. Made
  // once per version, so the words are not drawn again with every render.
  const footer = useMemo(() => <ChantWordsSource variant={variant} className="mt-6 border-t border-paper/[0.08] pt-3.5" />, [variant]);

  // Their sound alone reads left to right, in Latin letters.
  const latin = hasSound && view === "translit";
  return (
    <div className={cn("flex flex-col", className)}>
      {switchable ? <WordsViewSwitch variant={variant} view={view} disabled={!hasSound} className="shrink-0 -ms-2" /> : null}
      <div className="relative min-h-0 flex-1">
        <LiveCaptions
          source={source}
          lines={sung.lines}
          timed={sung.timed}
          current={sung.current}
          live={loaded}
          active={active}
          look="page"
          english="under"
          rtl={variant.rtl && !latin}
          lang={variant.language}
          onSeek={onSeek}
          footer={footer}
          className="absolute inset-0"
        />
      </div>
    </div>
  );
}

/**
 * The words' own switch (notes 56 and 59): the words as sung, named as the
 * version names itself ("العربية", "Ελληνικά"), their transliteration, or
 * both. Three parts in a strip (app/globals.css, .words-view), a radio group:
 * the arrows move in the reading direction, Home and End go to the ends, and
 * only the chosen part is in the tab order. In its place from the first
 * frame: it needs nothing but the version's own words. For a version with no
 * sound written out (`disabled`) only its own words are offered, the other
 * two greyed where they stand.
 */
export function WordsViewSwitch({
  variant,
  view,
  disabled = false,
  className,
}: {
  variant: Pick<ChantVariant, "label" | "language">;
  view: WordsView;
  /** This version has no sound written out. */
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslate();
  const rowRef = useRef<HTMLDivElement>(null);
  const label: Record<WordsView, string> = {
    original: variant.label,
    translit: t("chants.words.translit"),
    both: t("chants.words.both"),
  };

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const next = tabForKey(e.key, Math.max(0, WORDS_VIEWS.indexOf(view)), WORDS_VIEWS.length, rtl);
    if (next === null) return;
    e.preventDefault();
    setWordsPrefs({ view: WORDS_VIEWS[next] });
    rowRef.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  return (
    <div
      ref={rowRef}
      role="radiogroup"
      aria-label={t("chants.tab.words")}
      data-chant-control="words-view"
      className={cn("words-view", className)}
    >
      {WORDS_VIEWS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={view === id}
          tabIndex={view === id ? 0 : -1}
          disabled={disabled && id !== "original"}
          onClick={() => setWordsPrefs({ view: id })}
          onKeyDown={onKeyDown}
          lang={id === "original" ? variant.language : undefined}
          className="tap-press hit-44"
        >
          <span dir="auto" className="block truncate">
            {label[id]}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Where the words, and the English with them, come from, said plainly. */
export function ChantWordsSource({ variant, className }: { variant: ChantVariant; className?: string }) {
  const { t } = useTranslate();
  const hasEnglish = variant.lines.some((l) => l.en);
  return (
    <dl className={cn("space-y-3 font-sans text-caption leading-[1.55]", className)}>
      <div>
        <dt className="font-semibold text-paper/70">{t("chants.tab.words")}</dt>
        <dd lang="en" className="mt-0.5 text-paper/50">
          {variant.wordsSource}
        </dd>
      </div>
      {hasEnglish && variant.translation ? (
        <div>
          <dt className="font-semibold text-paper/70">{t("chants.words.english")}</dt>
          <dd lang="en" className="mt-0.5 text-paper/50">
            {variant.translation.title}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
