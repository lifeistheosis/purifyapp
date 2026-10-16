"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ShareButton } from "@/components/ui/ShareButton";
import { cn } from "@/lib/cn";
import { chantLineKey, chantTitleKey, kindKey, traditionKey } from "@/lib/chants/names";
import { formatDuration } from "@/lib/chants/media";
import { warmTiming } from "@/lib/chants/play";
import type { Chant, ChantIndexRow } from "@/lib/chants/types";

import { ChantAbout } from "./ChantAbout";
import { ChantCover } from "./ChantCover";
import { AvailabilityLine, PlayPill, useChantPlay } from "./ChantPlay";
import { ChantRow } from "./ChantRow";
import { ChantVersions } from "./ChantVersions";
import { ChantWords } from "./ChantWords";
import { firstVersion } from "./ChantsHome";

/**
 * One chant's page (1.7): the same page for every chant, the owner's note 15
 * of 2026-10-16 ("every chant gets its own page in one format: what it is,
 * where it comes from, its variants"), in place of the Prayer Rope Anthem's
 * page, which "reads like a web page, not a phone section".
 *
 * Phone first: the cover and Play at the top, then one switch between the
 * Words, About and Versions, so the page is three short parts rather than one
 * long one; a slim bar with the name and Play takes over at the top once the
 * cover has scrolled away. The words follow the version chosen, and while it
 * plays the line being sung is lit. One tree for every width: a centred
 * column on a tablet and a computer.
 *
 * No counter of any kind (the ban on a digital prayer rope stands; the
 * Anthem is a hymn), and the page carries only this chant.
 */
type Tab = "words" | "about" | "versions";
const TABS: Tab[] = ["words", "about", "versions"];

export function ChantPage({ chant, row, related }: { chant: Chant; row: ChantIndexRow; related: ChantIndexRow[] }) {
  const { t, locale } = useTranslate();
  const title = t(chantTitleKey(chant.key));
  const [tab, setTab] = useState<Tab>("words");
  const [chosen, setChosen] = useState<string | null>(null);
  const variant = chant.variants.find((v) => v.id === chosen) ?? firstVersion(chant.variants, locale);
  const indexVariant = row.variants.find((v) => v.id === variant.id) ?? row.variants[0];
  const play = useChantPlay({
    slug: chant.slug,
    title,
    variant: indexVariant,
    lines: variant.lines,
    coverSrc: chant.cover?.src,
  });

  // The timed words, asked for as the page opens, so they light at once.
  useEffect(() => warmTiming(indexVariant), [indexVariant]);

  // The slim bar: shown once the hero's Play has scrolled up under the bars
  // at the top.
  const playRef = useRef<HTMLDivElement>(null);
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = playRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < 120), {
      rootMargin: "-120px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const meta = useMemo(
    () =>
      [
        t(traditionKey(variant.tradition)),
        t(kindKey(chant.kind)),
        chant.tone ? t("chants.tone", { n: chant.tone }) : null,
        formatDuration(variant.audio.durationSec),
      ].filter((x): x is string => Boolean(x)),
    [chant.kind, chant.tone, t, variant],
  );

  return (
    <section className="relative bg-night px-5 pb-16 pt-4 md:px-8 md:pt-10">
      {/* The slim bar. Sticky below whatever bar is above it (the apps' way
          back, the website's header), out of the flow until it is needed. */}
      <div
        className={cn(
          "sticky sticky-safe-top under-back-bar z-20 -mx-5 -mb-14 h-14 border-b border-paper/[0.08] bg-night px-5 md:-mx-8 md:px-8",
          "motion-safe:transition-[opacity,transform] motion-safe:duration-200",
          past ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        )}
        aria-hidden={!past}
      >
        <div className="mx-auto flex h-14 w-full max-w-[720px] items-center gap-3">
          <ChantCover cover={chant.cover} title={title} size="thumb" className="w-9 shrink-0 rounded-[7px]" />
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
        {/* The hero. */}
        <div className="pt-4 text-center">
          <ChantCover
            cover={chant.cover}
            title={title}
            tradition={t(traditionKey(variant.tradition))}
            size="hero"
            className="mx-auto w-[min(300px,76vw)] rounded-[14px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
          />
          <h1 className="mt-6 text-title-sm font-bold leading-tight text-paper md:text-title">{title}</h1>
          {chant.originalTitle ? (
            <p dir="auto" className="mt-1 font-serif text-ui text-paper/60">
              {chant.originalTitle}
            </p>
          ) : null}
          <p className="mx-auto mt-2 max-w-[44ch] font-sans text-detail leading-[1.55] text-paper/65">{t(chantLineKey(chant.key))}</p>
          <p className="mt-1.5 font-sans text-caption text-paper/45">{meta.join(" · ")}</p>
          <div ref={playRef} className="mt-5 flex items-center justify-center gap-2.5">
            <PlayPill playing={play.playing} availability={play.availability} onToggle={play.toggle} />
            <ShareButton titleKey={chantTitleKey(chant.key)} className="h-12 px-4" />
          </div>
          <AvailabilityLine availability={play.availability} className="mt-3" />
          {chant.variants.length > 1 ? (
            <div role="radiogroup" aria-label={t("chants.tab.versions")} className="mt-5 flex flex-wrap justify-center gap-2">
              {chant.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={v.id === variant.id}
                  onClick={() => setChosen(v.id)}
                  dir="auto"
                  className={cn(
                    "tap-press hit-44 inline-flex min-h-9 items-center rounded-pill border px-4 font-sans text-detail font-semibold motion-safe:transition-colors",
                    v.id === variant.id
                      ? "border-paper bg-paper text-night"
                      : "border-paper/15 text-paper/70 hover:border-paper/35 hover:text-paper",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Words, About, Versions. */}
        <div
          role="tablist"
          aria-label={title}
          className="mt-8 grid grid-cols-3 gap-1 rounded-full border border-paper/10 bg-paper/[0.03] p-1"
        >
          {TABS.map((id) => (
            <button
              key={id}
              id={`chant-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`chant-panel-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full py-2 font-sans text-detail font-semibold motion-safe:transition-colors",
                tab === id ? "bg-paper text-night" : "text-paper/65 hover:text-paper",
              )}
            >
              {id === "words" ? t("chants.tab.words") : id === "about" ? t("chants.tab.about") : t("chants.tab.versions")}
            </button>
          ))}
        </div>

        <div id={`chant-panel-${tab}`} role="tabpanel" aria-labelledby={`chant-tab-${tab}`} className="mt-6">
          {tab === "words" ? (
            <ChantWords variant={variant} indexVariant={indexVariant} />
          ) : tab === "about" ? (
            <ChantAbout chant={chant} />
          ) : (
            <ChantVersions
              slug={chant.slug}
              title={title}
              variants={row.variants}
              linesOf={(id) => chant.variants.find((v) => v.id === id)?.lines}
              coverSrc={chant.cover?.src}
              selected={variant.id}
              onSelect={(id) => {
                setChosen(id);
                setTab("words");
              }}
            />
          )}
        </div>

        <ChantRow id="related" heading={t("chants.related")} rows={related} />
      </div>
    </section>
  );
}
