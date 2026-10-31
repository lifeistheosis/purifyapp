"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { LiveCaptions } from "@/components/player/LiveCaptions";
import { Sliders } from "@/components/ui/icons/Sliders";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { captionsFor, chantMediaUrl, loadTiming, WORDS_VIEWS, type WordsView } from "@/lib/chants/media";
import { useChantPlayback } from "@/lib/chants/play";
import type { ChantIndexVariant, ChantTiming, ChantVariant } from "@/lib/chants/types";
import { setWordsPrefs, useWordsPrefs } from "@/lib/chants/wordsPrefs";
import { useSungLines } from "@/lib/player/clock";
import { getAudioSnapshot, play, seek, setTrack } from "@/lib/prayers/persistentAudioStore";
import { tabForKey } from "@/lib/ui/sectionTabs";

/**
 * A version's words as a chant's Sing along (1.8, the owner's pick of
 * 2026-10-27, round 9 A, Homebase/boards/purify-master/variants/09-chants):
 * "the words move with the singing, the original under each English line".
 *
 * Each line is drawn from the version's own data, nothing added
 * (lib/chants/media.ts captionsFor, lib/player/captions.ts lineParts):
 *
 *   - a line with its English (`en`, a version sung in another language,
 *     the French anthem's line-for-line English) reads the English, large,
 *     and carries the words as they are sung (`text`) under it, in italic;
 *   - any other line (the English anthem, the Arabic one, which has no
 *     English beside its lines) is its own words.
 *
 * A version sung in a script other than Latin, with its sound written out
 * (`translit`), carries its own switch on the words (notes 56 and 59, the
 * owner: "there should be Arabic, right? But you should also have the option
 * to switch it to English transliteration", "and there's an option to show
 * both at the same time"): the words as sung, their sound, or each word over
 * its sound, read right to left for Arabic, so a reader can match word to
 * sound. The choice is kept on the device (lib/chants/wordsPrefs.ts) and
 * Now Playing shows the words the same way. The English over them stays the
 * reader's to keep or leave in the sheet, as in 1.7.
 *
 * While this version plays, the line being sung is lit and rises, and its
 * words light as they are sung, from the one clock Now Playing's words read
 * too (lib/player/clock.ts); a tap on a line goes there. With nothing
 * playing, or no signal for the timing file, the words are simply the words,
 * every line at full strength.
 *
 * The words are the Church's published text, never a transcript (note 28),
 * and where they come from is said under the controls (ChantWordsSource).
 */
export function ChantWords({
  variant,
  indexVariant,
  className,
}: {
  variant: ChantVariant;
  indexVariant: ChantIndexVariant;
  className?: string;
}) {
  const prefs = useWordsPrefs();
  const { loaded } = useChantPlayback(indexVariant);
  const hasSound = variant.lines.some((l) => l.translit);

  // The line times, from the timing file beside the recording. Without a
  // signal there are none, and the words are simply the words.
  // Kept with the file it came from, so another version's times never light
  // this version's words.
  const [loadedTiming, setLoadedTiming] = useState<{ path: string; timing: ChantTiming | null } | null>(null);
  useEffect(() => {
    let alive = true;
    const path = variant.timing;
    if (path) {
      void loadTiming(path).then((found) => {
        if (alive) setLoadedTiming({ path, timing: found });
      });
    }
    return () => {
      alive = false;
    };
  }, [variant.timing]);
  const timing = loadedTiming && loadedTiming.path === variant.timing ? loadedTiming.timing : null;
  const source = useMemo(() => captionsFor(variant.lines, timing, prefs), [prefs, timing, variant.lines]);
  const sung = useSungLines(source, variant.audio.durationSec, loaded);

  // One set of words: while this version plays, Now Playing shows these same
  // lines, the English kept or left and the sound shown as the reader keeps
  // them here.
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

  // Their sound alone reads left to right, in Latin letters.
  const latin = hasSound && prefs.view === "translit";
  const words = (
    <LiveCaptions
      source={source}
      lines={sung.lines}
      timed={sung.timed}
      current={sung.current}
      live={loaded}
      look="page"
      rtl={variant.rtl && !latin}
      lang={variant.language}
      onSeek={onSeek}
      className={hasSound ? "mt-2 min-h-0 flex-1" : className}
    />
  );
  if (!hasSound) return words;
  return (
    <div className={cn("flex flex-col", className)}>
      <WordsViewSwitch variant={variant} view={prefs.view} className="shrink-0 self-center" />
      {words}
    </div>
  );
}

/**
 * The words' own switch (notes 56 and 59): the words as sung, named as the
 * version names itself ("العربية", "Ελληνικά"), their transliteration, or
 * both. Three parts in one carved track (app/globals.css, .words-view), a
 * radio group: the arrows move in the reading direction, Home and End go to
 * the ends, and only the chosen part is in the tab order. In its place from
 * the first frame: it needs nothing but the version's own words.
 */
export function WordsViewSwitch({
  variant,
  view,
  className,
}: {
  variant: Pick<ChantVariant, "label" | "language">;
  view: WordsView;
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
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const next = tabForKey(e.key, Math.max(0, WORDS_VIEWS.indexOf(view)), WORDS_VIEWS.length, rtl);
    if (next === null) return;
    e.preventDefault();
    setWordsPrefs({ view: WORDS_VIEWS[next] });
    rowRef.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  return (
    <div ref={rowRef} role="radiogroup" aria-label={t("chants.tab.words")} className={cn("words-view", className)}>
      {WORDS_VIEWS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={view === id}
          tabIndex={view === id ? 0 : -1}
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

/**
 * The English over the sung words, the reader's to keep or leave (1.7). A
 * button, and its sheet; nothing where the version has no English. The
 * transliteration has its own switch on the words since notes 56 and 59.
 */
export function ChantWordsOptions({ variant, className }: { variant: ChantVariant; className?: string }) {
  const { t } = useTranslate();
  const prefs = useWordsPrefs();
  const [open, setOpen] = useState(false);
  const hasEnglish = variant.lines.some((l) => l.en);
  if (!hasEnglish) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t("chants.tab.words")}
        className={cn(
          "tap-press grid h-11 w-11 shrink-0 place-items-center rounded-full text-paper/70 motion-safe:transition-colors hover:bg-paper/[0.06] hover:text-paper",
          className,
        )}
      >
        <Sliders size={19} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("chants.tab.words")} desktop>
        <div className="space-y-1 pb-2">
          <Switch label={t("chants.words.english")} on={prefs.en} onChange={(v) => setWordsPrefs({ en: v })} />
        </div>
      </Sheet>
    </>
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

function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-12 w-full items-center justify-between gap-3 text-start"
    >
      <span className="font-sans text-ui text-paper/85">{label}</span>
      <span aria-hidden className={cn("relative h-6 w-10 shrink-0 rounded-full motion-safe:transition-colors", on ? "bg-paper" : "bg-paper/20")}>
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full motion-safe:transition-transform",
            on ? "translate-x-[18px] bg-night" : "translate-x-0.5 bg-paper/80",
          )}
        />
      </span>
    </button>
  );
}
