"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { ShareButton } from "@/components/ui/ShareButton";
import { cn } from "@/lib/cn";
import { useChantAvailability } from "@/lib/chants/live";
import { usePersistentAudio } from "@/lib/prayers/persistentAudioStore";
import { chantLineKey, chantTitleKey, kindKey, traditionKey } from "@/lib/chants/names";
import { formatDuration } from "@/lib/chants/media";
import { playChant, warmTiming } from "@/lib/chants/play";
import type { Chant, ChantIndexRow } from "@/lib/chants/types";
import { useWordsPrefs } from "@/lib/chants/wordsPrefs";
import { scrollBehavior } from "@/lib/ui/motion";

import { ChantAbout } from "./ChantAbout";
import { ChantCover } from "./ChantCover";
import { AvailabilityLine, ChantTransport, PlayPill, useChantPlay } from "./ChantPlay";
import { ChantRow } from "./ChantRow";
import { ChantVersions } from "./ChantVersions";
import { ChantWords, ChantWordsOptions, ChantWordsSource } from "./ChantWords";
import { firstVersion } from "./ChantsHome";

/**
 * One chant's page (1.7): the same page for every chant, the owner's note 15
 * of 2026-10-16 ("every chant gets its own page in one format: what it is,
 * where it comes from, its variants").
 *
 * 1.8, the owner's pick of 2026-10-27 (round 9, A, "Sing along",
 * Homebase/boards/purify-master/variants/09-chants): the page opens on the
 * words. The cover small beside the name, then the words, which move with
 * the singing, the line being sung lit and the original under each English
 * line (ChantWords); the recording's language below them, as a row of the
 * versions by their own names; then where it is, back 15, Play and forward
 * 15. Play stays on the page and sings along here; it does not open Now
 * Playing over it. Under the controls, where the words come from, then the
 * chant's About and its Versions, one switch between the two, and the chants
 * related to it. A slim bar with the name and Play takes over at the top
 * once the controls have scrolled away. One tree for every width: a centred
 * column on a tablet and a computer.
 *
 * No counter of any kind (the ban on a digital prayer rope stands; the
 * Anthem is a hymn), and the page carries only this chant.
 */
type Part = "about" | "versions";

export function ChantPage({ chant, row, related }: { chant: Chant; row: ChantIndexRow; related: ChantIndexRow[] }) {
  const { t, locale } = useTranslate();
  const title = t(chantTitleKey(chant.key));
  const [part, setPart] = useState<Part>("about");
  const [chosen, setChosen] = useState<string | null>(null);
  // Until the reader chooses, the page shows the version playing, if one of
  // this chant's is: the player's Read opens this page to its words, lit
  // where the singing has got to (1.8, components/player/NowPlayingSheet.tsx).
  const { src: playingSrc } = usePersistentAudio();
  const playingHere = playingSrc ? chant.variants.find((v) => playingSrc === v.audio.src || playingSrc.endsWith(v.audio.src)) : undefined;
  const variant = chant.variants.find((v) => v.id === chosen) ?? playingHere ?? firstVersion(chant.variants, locale);
  const indexVariant = row.variants.find((v) => v.id === variant.id) ?? row.variants[0];
  const play = useChantPlay({
    slug: chant.slug,
    title,
    variant: indexVariant,
    lines: variant.lines,
    coverSrc: chant.cover?.src,
    open: false,
  });
  const availabilityFor = useChantAvailability();
  const prefs = useWordsPrefs();
  const stageRef = useRef<HTMLDivElement>(null);

  // The timed words, asked for as the page opens, so they light at once.
  useEffect(() => warmTiming(indexVariant), [indexVariant]);

  // The slim bar: shown once the controls have scrolled up under the bars at
  // the top.
  const controlsRef = useRef<HTMLDivElement>(null);
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = controlsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < 120), {
      rootMargin: "-120px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const meta = [
    t(traditionKey(variant.tradition)),
    t(kindKey(chant.kind)),
    chant.tone ? t("chants.tone", { n: chant.tone }) : null,
    formatDuration(variant.audio.durationSec),
  ].filter((x): x is string => Boolean(x));

  /**
   * Choose a version: its words on the page. While the version shown is
   * playing, the recording switches with it (round 9 A: "switch the language
   * of the recording below"), from its start.
   */
  const choose = (id: string) => {
    if (id === variant.id) return;
    const wasPlaying = play.playing;
    setChosen(id);
    if (!wasPlaying) return;
    const next = chant.variants.find((v) => v.id === id);
    const nextIndex = row.variants.find((v) => v.id === id);
    if (!next || !nextIndex || availabilityFor(chant.slug, nextIndex) !== "playable") return;
    playChant({ slug: chant.slug, title, variant: nextIndex, lines: next.lines, coverSrc: chant.cover?.src, prefs, open: false });
  };

  /** A version started from the list: its words, at the top of the page. */
  const showStage = (id: string) => {
    setChosen(id);
    stageRef.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
  };

  return (
    <section className="relative bg-night px-5 pb-16 pt-3 md:px-8 md:pt-10">
      {/* The slim bar. Sticky below whatever bar is above it (the apps' way
          back, the website's header), out of the flow until it is needed. */}
      <div
        className={cn(
          "sticky sticky-safe-top under-back-bar z-20 -mx-5 -mb-14 h-14 border-b border-paper/[0.08] bg-night px-5 md:-mx-8 md:px-8",
          // `translate`, not `transform`: Tailwind 4 writes -translate-y-1 as
          // its own property, so a transform-only list let the bar jump.
          "motion-safe:transition-[opacity,translate] motion-safe:duration-200",
          past ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        )}
        aria-hidden={!past}
      >
        <div className="mx-auto flex h-14 w-full max-w-[720px] items-center gap-3">
          <ChantCover cover={chant.cover} size="thumb" className="w-9 shrink-0 rounded-[7px]" />
          <p className="min-w-0 flex-1 truncate font-sans text-ui font-semibold text-paper">{title}</p>
          <PlayPill
            size="sm"
            playing={play.playing}
            availability={play.availability}
            onToggle={play.toggle}
            className={past ? "" : "invisible"}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[720px]">
        {/* Sing along: the name, the words, the recording's language, the
            controls. */}
        <div ref={stageRef} className="scroll-mt-24">
          <div className="flex justify-end gap-1">
            <ShareButton titleKey={chantTitleKey(chant.key)} className="h-9" />
            <ChantWordsOptions variant={variant} className="-me-2" />
          </div>
          <div className="mt-1 flex items-center gap-3.5">
            <ChantCover cover={chant.cover} size="thumb" className="w-[70px] shrink-0 rounded-[14px]" />
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-[24px] font-bold leading-tight text-paper">{title}</h1>
              {chant.originalTitle ? (
                <p dir="auto" className="mt-0.5 font-serif text-detail text-paper/60">
                  {chant.originalTitle}
                </p>
              ) : null}
              <p className="mt-1 font-sans text-[13.5px] text-paper/55">{meta.join(" · ")}</p>
            </div>
          </div>

          <ChantWords variant={variant} indexVariant={indexVariant} className="mt-3 h-[clamp(240px,46svh,440px)]" />

          {chant.variants.length > 1 ? (
            <div role="radiogroup" aria-label={t("chants.tab.versions")} className="mt-3 flex flex-wrap gap-2">
              {chant.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={v.id === variant.id}
                  onClick={() => choose(v.id)}
                  dir="auto"
                  lang={v.language}
                  className={cn(
                    "tap-press hit-44 inline-flex min-h-8 items-center rounded-pill border px-[13px] font-sans text-[13.5px] font-medium motion-safe:transition-[color,background-color,border-color,box-shadow]",
                    v.id === variant.id
                      ? "border-paper bg-paper font-semibold text-night shadow-[0_0_14px_rgba(255,255,255,0.22)]"
                      : "border-paper/10 bg-paper/[0.06] text-paper/80 hover:border-paper/30 hover:text-paper",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          ) : null}

          <div ref={controlsRef}>
            <AvailabilityLine availability={play.availability} reserve className="mt-2" />
            <ChantTransport variant={indexVariant} play={play} className="mt-3" />
          </div>
        </div>

        <ChantWordsSource variant={variant} className="mt-8 border-t border-paper/[0.08] pt-5" />

        {/* About and Versions. */}
        <SegmentedSwitch
          label={title}
          idBase="chant"
          items={[
            { id: "about", label: t("chants.tab.about") },
            { id: "versions", label: t("chants.tab.versions") },
          ]}
          selected={part}
          onSelect={setPart}
          className="mt-10"
        />

        <div id={`chant-panel-${part}`} role="tabpanel" aria-labelledby={`chant-tab-${part}`} className="mt-6">
          {part === "about" ? (
            <>
              <p className="mb-8 max-w-[52ch] font-sans text-detail leading-[1.55] text-paper/65">{t(chantLineKey(chant.key))}</p>
              <ChantAbout chant={chant} />
            </>
          ) : (
            <ChantVersions
              slug={chant.slug}
              title={title}
              variants={row.variants}
              linesOf={(id) => chant.variants.find((v) => v.id === id)?.lines}
              coverSrc={chant.cover?.src}
              selected={variant.id}
              onSelect={showStage}
              onPlay={showStage}
              open={false}
            />
          )}
        </div>

        <ChantRow id="related" heading={t("chants.related")} rows={related} />
      </div>
    </section>
  );
}
