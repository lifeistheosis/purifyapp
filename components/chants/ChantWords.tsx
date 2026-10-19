"use client";

import { useEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sliders } from "@/components/ui/icons/Sliders";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { captionsFor, loadTiming } from "@/lib/chants/media";
import { useChantPlayback } from "@/lib/chants/play";
import type { ChantIndexVariant, ChantTiming, ChantVariant } from "@/lib/chants/types";
import { setWordsPrefs, useWordsPrefs } from "@/lib/chants/wordsPrefs";
import { captionLines, lineAt } from "@/lib/player/captions";
import { play, seek } from "@/lib/prayers/persistentAudioStore";

const NONE = { translit: false, en: false };

/**
 * A version's words (1.7), to read with or without the recording: each line
 * as it is sung (Lora), then, where the reader keeps them, its
 * transliteration and its English (DM Sans, quieter). While this version
 * plays, the line being sung is lit and the rest step back, as lyrics do;
 * a tap on a line goes there. At the foot, where the words and the English
 * come from, said plainly.
 *
 * The words are the Church's published text, never a transcript (note 28).
 */
export function ChantWords({ variant, indexVariant }: { variant: ChantVariant; indexVariant: ChantIndexVariant }) {
  const { t } = useTranslate();
  const prefs = useWordsPrefs();
  const [options, setOptions] = useState(false);
  const { loaded, playing, position } = useChantPlayback(indexVariant);

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
  const timed = useMemo(
    () => (timing ? captionLines(captionsFor(variant.lines, timing, NONE), variant.audio.durationSec) : null),
    [timing, variant.audio.durationSec, variant.lines],
  );
  const lineTimes = timed && timed.length === variant.lines.length ? timed : null;
  const current = loaded && lineTimes ? lineAt(lineTimes, position) : -1;

  const hasTranslit = variant.lines.some((l) => l.translit);
  const hasEnglish = variant.lines.some((l) => l.en);

  return (
    <div>
      {hasTranslit || hasEnglish ? (
        <div className="-mt-2 mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setOptions(true)}
            className="tap-press inline-flex min-h-11 items-center gap-2 rounded-pill px-3 font-sans text-detail font-medium text-paper/65 motion-safe:transition-colors hover:text-paper"
          >
            <Sliders size={17} />
            {t("chants.words.options")}
          </button>
        </div>
      ) : null}

      <ol lang={variant.language} dir={variant.rtl ? "rtl" : undefined} className="space-y-1">
        {variant.lines.map((line, i) => {
          const lit = current === i;
          const quiet = playing && current >= 0 && !lit;
          const body = (
            <>
              <span dir="auto" className="block font-serif text-lede leading-[1.5] text-paper">
                {line.text}
              </span>
              {prefs.translit && line.translit ? (
                <span lang={`${variant.language}-Latn`} dir="ltr" className="mt-1 block font-sans text-detail leading-snug text-paper/55">
                  {line.translit}
                </span>
              ) : null}
              {prefs.en && line.en ? (
                <span lang="en" dir="ltr" className="mt-1 block font-sans text-ui leading-snug text-paper/70">
                  {line.en}
                </span>
              ) : null}
            </>
          );
          return (
            <li
              key={i}
              aria-current={lit ? "true" : undefined}
              className={cn(
                "rounded-[12px] motion-safe:transition-opacity motion-safe:duration-300",
                quiet ? "opacity-45" : "opacity-100",
              )}
            >
              {loaded && lineTimes ? (
                <button
                  type="button"
                  onClick={() => {
                    seek(lineTimes[i].at);
                    if (!playing) play();
                  }}
                  className="tap-press block w-full py-2 text-start"
                >
                  {body}
                </button>
              ) : (
                <div className="py-2">{body}</div>
              )}
            </li>
          );
        })}
      </ol>

      <dl className="mt-8 space-y-3 border-t border-paper/[0.08] pt-5 font-sans text-caption leading-[1.55]">
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

      <Sheet open={options} onClose={() => setOptions(false)} title={t("chants.words.options")} desktop>
        <div className="space-y-1 pb-2">
          {hasTranslit ? (
            <Switch label={t("chants.words.translit")} on={prefs.translit} onChange={(v) => setWordsPrefs({ translit: v })} />
          ) : null}
          {hasEnglish ? <Switch label={t("chants.words.english")} on={prefs.en} onChange={(v) => setWordsPrefs({ en: v })} /> : null}
        </div>
      </Sheet>
    </div>
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
