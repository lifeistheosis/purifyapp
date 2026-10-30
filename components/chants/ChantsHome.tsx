"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { ChipScroller } from "@/components/ui/ChipScroller";
import { cn } from "@/lib/cn";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";
import { chantLineKey, chantTitleKey, traditionKey } from "@/lib/chants/names";
import { warmTiming } from "@/lib/chants/play";
import { chantsHome, inTradition, restingChant, traditionsIn, type HomeSection } from "@/lib/chants/select";
import type { ChantIndexRow, ChantIndexVariant, ChantTradition } from "@/lib/chants/types";

import { ChantCover, languagesOf } from "./ChantCover";
import { AvailabilityLine, PlayPill, useChantPlay } from "./ChantPlay";
import { ChantListItem, ChantRow, metaOf } from "./ChantRow";
import { ChantVersions } from "./ChantVersions";

/**
 * Chants (1.7), where the Kitchen was. The owner, 2026-10-16: "Remove the
 * kitchen and switch it out for chants ... make it its own UI for that",
 * with a home of rows (this week's tone, the feast, by tradition, short
 * chants, and the Psalms as a section of their own).
 *
 * Phone first, one tree for every width (a centred column on a tablet and a
 * computer). The chant to open on is chosen on the device, for the reader's
 * own day and calendar (lib/chants/select.ts); before the day is known the
 * newest chant with a cover stands there, and no row is drawn.
 *
 * Built to read as finished with one chant, which is the library on the day
 * it opens: the chant, its versions to play, and one quiet line that more are
 * coming. A row, a chip or a list appears only once there are chants to put
 * in it.
 */
export function ChantsHome({ index }: { index: ChantIndexRow[] }) {
  const { t } = useTranslate();
  const today = useToday();
  const [style] = useCalendarStyleDefault();
  const [tradition, setTradition] = useState<ChantTradition | null>(null);

  const home = useMemo(() => (today ? chantsHome(index, today, style) : null), [index, today, style]);
  // Before the day is known, the chant the home rests on: the newest with a cover.
  const featured = home?.featured ?? restingChant(index);
  const sections = home?.sections ?? [];
  const traditions = traditionsIn(index);
  const one = index.length === 1;
  const all = index.length >= 2 ? [...inTradition(index, tradition)].sort((a, b) => a.title.localeCompare(b.title)) : null;

  return (
    <section className="bg-night px-5 pb-16 pt-6 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-[720px]">
        <header>
          <h1 className="text-title font-bold leading-tight tracking-[-0.01em] text-paper md:text-heading">{t("chants.title")}</h1>
          <p className="mt-2 max-w-[52ch] font-sans text-ui leading-[1.55] text-paper/60">{t("chants.lead")}</p>
        </header>

        {featured ? <Featured row={featured} withVersions={one} /> : null}

        {sections.map((s) => (
          <ChantRow key={s.id} id={s.id} heading={sectionHeading(s, t)} rows={s.rows} />
        ))}

        {all ? (
          <section aria-labelledby="chants-all" className="mt-10">
            <p id="chants-all" role="heading" aria-level={2} className="font-sans text-ui font-semibold text-paper">
              {t("chants.row.all")}
            </p>
            {traditions.length >= 2 ? (
              <ChipScroller label={t("chants.byTradition")} className="mt-3">
                <Chip active={tradition == null} onClick={() => setTradition(null)}>
                  {t("common.all")}
                </Chip>
                {traditions.map((tr) => (
                  <Chip key={tr} active={tradition === tr} onClick={() => setTradition((cur) => (cur === tr ? null : tr))}>
                    {t(traditionKey(tr))}
                  </Chip>
                ))}
              </ChipScroller>
            ) : null}
            <ul className="mt-2">
              {all.map((r) => (
                <li key={r.slug}>
                  <ChantListItem row={r} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {one ? <p className="mt-10 text-center font-sans text-detail text-paper/45">{t("chants.moreComing")}</p> : null}
      </div>
    </section>
  );
}

function sectionHeading(s: HomeSection, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (s.id === "tone") return t("chants.row.tone", { n: s.tone });
  if (s.id === "feast") return t("chants.row.feast");
  if (s.id === "psalms") return t("chants.row.psalms");
  return t("chants.row.short");
}

/** The version a reader is offered first: one in their own language, else the first. */
export function firstVersion<V extends Pick<ChantIndexVariant, "language">>(variants: V[], locale: string): V {
  return variants.find((v) => v.language.split("-")[0] === locale.split("-")[0]) ?? variants[0];
}

/**
 * The chant at the top: its cover, its name, its one line, what it is, and
 * Play. With the library at one chant, its versions follow as rows to play;
 * with more, the versions are a row of pills that choose what Play plays.
 */
function Featured({ row, withVersions }: { row: ChantIndexRow; withVersions: boolean }) {
  const { t, locale } = useTranslate();
  const title = t(chantTitleKey(row.key));
  const [chosen, setChosen] = useState<string | null>(null);
  const variant = row.variants.find((v) => v.id === chosen) ?? firstVersion(row.variants, locale);
  const { availability, playing, toggle } = useChantPlay({ slug: row.slug, title, variant, coverSrc: row.cover?.src });
  const href = `/chants/${row.slug}`;
  // The timed words, asked for before the tap, so Now Playing opens on them.
  useEffect(() => warmTiming(variant), [variant]);

  return (
    <section aria-labelledby="chants-featured" className="mt-8">
      <Link href={href} className="press-card mx-auto block w-[min(300px,76vw)]" tabIndex={-1} aria-hidden>
        <ChantCover
          cover={row.cover}
          languages={languagesOf(row.variants)}
          size="hero"
          className="w-full rounded-[14px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
        />
      </Link>
      <div className="mt-6 text-center">
        <h2 id="chants-featured" className="text-title-sm font-bold leading-tight text-paper">
          <Link href={href} className="hover:underline hover:underline-offset-4">
            {title}
          </Link>
        </h2>
        {row.originalTitle ? (
          <p dir="auto" className="mt-1 font-serif text-ui text-paper/60">
            {row.originalTitle}
          </p>
        ) : null}
        <p className="mx-auto mt-2 max-w-[44ch] font-sans text-detail leading-[1.55] text-paper/65">{t(chantLineKey(row.key))}</p>
        <p className="mt-1.5 font-sans text-caption text-paper/45">{metaOf(row, t).join(" · ")}</p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <PlayPill playing={playing} availability={availability} onToggle={toggle} />
          <Link
            href={href}
            className="tap-press inline-flex h-12 items-center gap-1 rounded-pill border border-paper/15 px-5 font-sans text-ui font-medium text-paper/85 motion-safe:transition-colors hover:border-paper/35 hover:text-paper"
          >
            {t("chants.openPage")}
            <ChevronRight size={15} className="text-paper/50 rtl:-scale-x-100" />
          </Link>
        </div>
        <AvailabilityLine availability={availability} reserve className="mt-2" />

        {!withVersions && row.variants.length > 1 ? (
          <ChipScroller label={t("chants.tab.versions")} className="mt-3">
            {row.variants.map((v) => (
              <Chip key={v.id} active={v.id === variant.id} onClick={() => setChosen(v.id)} dir="auto">
                {v.label}
              </Chip>
            ))}
          </ChipScroller>
        ) : null}
      </div>

      {withVersions ? (
        <div className="mt-9">
          <p role="heading" aria-level={3} className="font-sans text-ui font-semibold text-paper">
            {t("chants.tab.versions")}
          </p>
          <div className="mt-1">
            <ChantVersions slug={row.slug} title={title} variants={row.variants} coverSrc={row.cover?.src} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
  dir,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dir?: "auto";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      dir={dir}
      className={cn(
        "tap-press hit-44 inline-flex min-h-9 items-center rounded-pill border px-4 font-sans text-detail font-semibold motion-safe:transition-colors",
        active ? "border-paper bg-paper text-night" : "border-paper/15 text-paper/70 hover:border-paper/35 hover:text-paper",
      )}
    >
      {children}
    </button>
  );
}
