import Link from "next/link";
import type { CSSProperties } from "react";

import type { TheologyBody } from "@/lib/theology/load";
import { getTopicMeta } from "@/lib/theology/topics";
import { epigraphIndex, fatherGroups, subjectOfStudy, type DeckPassage } from "@/lib/theology/page";
import { stepNumeral } from "@/lib/theology/path";
import { studyPassages } from "@/lib/theology/passages";
import { THEOLOGY_SUBJECTS } from "@/lib/theology/subjects";
import type { RelatedGroups } from "@/lib/theology/relations";
import { hasAnyRelated } from "@/lib/theology/relations";
import type { HistoryEventMeta } from "@/lib/history/events";
import { T } from "@/components/i18n/T";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Timer } from "@/components/ui/icons/Timer";
import { TimelineList } from "@/components/ui/icons/TimelineList";
import { ViewInHistory } from "@/components/history/ViewInHistory";

import { RelatedRail } from "./RelatedRail";
import { StudyContents, type ContentsFather } from "./StudyContents";
import { StudyCover } from "./StudyCover";

/** The light behind a study that belongs to no subject: Rublev's Trinity, Theology's own tile. */
const FALLBACK_COVER = { src: "/discover/tiles/theology.v2.webp" };

/**
 * A doctrine's own page (1.8, round 3 r3-13): the owner's pick of
 * 2026-10-30, a hybrid of B and C, "I like the images that are on B, but I
 * like C's design" (Homebase/boards/purify-master/variants/
 * r3-13-theology-revamp, row 4).
 *
 *   B's cover     a Father's words over his portrait, the study's epigraph,
 *                 with Read where it's from and Share as a picture
 *                 (components/theology/StudyCover.tsx).
 *   C's head      the study's subject and its step on the path, the title
 *                 and its line, then how long it is, how many parts it has
 *                 and how many Fathers it quotes.
 *   C's contents  its parts, and the Fathers each brings by face as they
 *                 stand in the text, then Begin, which reads it one part at a
 *                 time (/theology/<slug>/read, components/theology/
 *                 StudyReader.tsx).
 *   Scripture     the verses the study leans on, as rows into the Bible.
 *   Related       the related studies by their titles, the study in Orthodox
 *                 History, and the rest of Theology it touches, as rows.
 *
 * Round 3's doors (The study, The Fathers, Scripture, Related) and the deck
 * of the Fathers as a place to browse are gone, as C draws the page: the
 * study and the Fathers' words are read together now, each passage where the
 * study rests on it (lib/theology/parts.ts). Scripture and Related, which
 * stood behind two of the doors, are kept as the page's foot.
 */
export function TopicReader({
  body,
  groups,
  events,
}: {
  body: TheologyBody;
  /** The rest of Theology the study touches (lib/theology/relations.ts). */
  groups: RelatedGroups;
  /** Orthodox History's events that cite the study. */
  events: HistoryEventMeta[];
}) {
  const { passages, placed } = studyPassages(body);
  const epigraph = passages[epigraphIndex(passages, body.epigraph)] ?? null;
  const subject = subjectOfStudy(body.slug);
  const n = subject ? THEOLOGY_SUBJECTS.indexOf(subject) + 1 : 0;
  const minutes = getTopicMeta(body.slug)?.estimatedMinutes;
  const fathers = fatherGroups(passages.map((p) => ({ saintSlug: p.saintSlug, author: p.author })));
  const parts = placed.parts.map((part) => ({ heading: part.heading, fathers: facesOf(part.passages, passages), passages: part.passages.length }));

  return (
    <article className="mx-auto w-full max-w-[760px]">
      <header className="relative">
        {/* On a computer, the way back up to Theology; a phone has the bar's. */}
        <p className="mb-4 hidden font-sans text-detail font-semibold text-paper/55 md:block native-md-hidden">
          <Link href="/theology" className="hover:text-paper">
            <T k="nav.discoverMenu.theology" />
          </Link>
        </p>

        <StudyCover subject={subject ? { src: subject.picture.src } : FALLBACK_COVER} passage={epigraph} />

        <div className="saint-head-in mt-7" style={{ "--i": 1 } as CSSProperties}>
          {subject ? (
            <Link
              href={`/theology/path/${subject.id}`}
              data-study-step=""
              className="tap-press inline-flex max-w-full items-center gap-[9px] font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-paper/55 hover:text-paper"
            >
              <span aria-hidden className="block size-6 shrink-0 overflow-hidden rounded-full ring-1 ring-paper/20">
                {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
                <img src={subject.picture.src} alt="" className="h-full w-full object-cover" style={{ objectPosition: subject.picture.focus ?? "50% 30%" }} />
              </span>
              <span className="truncate">
                {stepNumeral(n)} · {subject.title} · <T k="readingsFlow.of" replacements={{ n, total: THEOLOGY_SUBJECTS.length }} />
              </span>
            </Link>
          ) : null}
          <h1
            id="doctrine-title"
            className="mt-3 font-serif text-[27px] font-bold leading-[1.12] tracking-[-0.2px] text-balance text-paper md:text-display-sm"
          >
            {body.title}
          </h1>
          {body.subtitle ? (
            <p className="mt-2 font-serif text-[14.5px] italic leading-[1.45] text-paper/70 md:text-lede">{body.subtitle}</p>
          ) : null}
        </div>

        {/* How long it is, how many parts, how many Fathers. */}
        <div
          data-study-stats=""
          className="theology-tray saint-head-in mt-5 flex items-stretch rounded-[16px]"
          style={{ "--i": 2 } as CSSProperties}
        >
          {minutes ? (
            <span className="flex min-h-[54px] min-w-0 flex-1 items-center justify-center gap-2 px-2 text-center font-sans text-[13.5px] font-semibold leading-tight text-paper">
              <Timer size={17} className="shrink-0 text-paper/60" />
              <T k="bible.minRead" replacements={{ minutes }} />
            </span>
          ) : null}
          <span className="flex min-h-[54px] min-w-0 flex-1 items-center justify-center gap-2 border-s border-paper/7 px-2 text-center font-sans text-[13.5px] font-semibold leading-tight text-paper first:border-s-0">
            <TimelineList size={17} className="shrink-0 text-paper/60" />
            <T k="study.theology.partCount" count={parts.length} />
          </span>
          {fathers.length > 0 ? (
            <span className="flex min-h-[54px] min-w-0 flex-1 items-center justify-center gap-2 border-s border-paper/7 px-2 text-center font-sans text-[13.5px] font-semibold leading-tight text-paper">
              <HaloedHead size={17} className="shrink-0 text-paper/60" />
              <T k="study.theology.fatherCount" count={fathers.length} />
            </span>
          ) : null}
        </div>
      </header>

      <StudyContents slug={body.slug} parts={parts} end={{ fathers: facesOf(placed.end, passages), passages: placed.end.length }} />

      <ScripturePart body={body} />
      <RelatedPart body={body} groups={groups} events={events} />
    </article>
  );
}

/** The Fathers of some passages, each once, in the order they speak. */
function facesOf(indexes: readonly number[], passages: readonly DeckPassage[]): ContentsFather[] {
  const seen = new Map<string, ContentsFather>();
  for (const i of indexes) {
    const p = passages[i];
    if (!p || seen.has(p.father)) continue;
    seen.set(p.father, { key: p.father, name: p.name, ...(p.saintSlug ? { slug: p.saintSlug } : {}), ...(p.iconUrl ? { iconUrl: p.iconUrl } : {}) });
  }
  return [...seen.values()];
}

/** Scripture: the verses the study leans on, each a row into the Bible, with why it is cited. */
function ScripturePart({ body }: { body: TheologyBody }) {
  const refs = body.scripture ?? [];
  if (refs.length === 0) return null;
  return (
    <section data-study-scripture="" className="mt-10">
      <PartLabel count={refs.length}>
        <T k="study.theology.scriptureCrossRefs" />
      </PartLabel>
      <ul className="theology-tray mt-2 overflow-hidden rounded-[18px] py-1">
        {refs.map((s, i) => (
          <li key={i} className="theology-rule">
            <Link
              href={`/bible?q=${encodeURIComponent(s.bibleRef ?? s.ref)}`}
              className="theology-row mx-1.5 flex items-start gap-3 rounded-[14px] px-3 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-sans text-ui font-semibold text-paper">{s.ref}</span>
                {s.note ? <span className="mt-1 block font-serif text-detail leading-[1.55] text-paper/65">{s.note}</span> : null}
              </span>
              <ChevronRight size={14} className="mt-1 shrink-0 text-paper/32 rtl:-scale-x-100" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Related: the studies it leads to by their titles, the study in Orthodox
 * History, and the rest of Theology it touches, each kind named once over
 * its rows. A study the curated relations name as well is listed once.
 */
function RelatedPart({ body, groups, events }: { body: TheologyBody; groups: RelatedGroups; events: HistoryEventMeta[] }) {
  const studies = body.related ?? [];
  const rest: RelatedGroups = { ...groups, doctrine: groups.doctrine.filter((l) => !studies.includes(l.slug)) };
  if (studies.length === 0 && events.length === 0 && !hasAnyRelated(rest)) return null;
  return (
    <section data-study-related="" className="mt-10">
      <PartLabel count={null}>
        <T k="study.related" />
      </PartLabel>
      {studies.length > 0 ? (
        <div className="mt-2">
          <PartLabel count={studies.length} quiet>
            <T k="study.doctrine" />
          </PartLabel>
          <ul className="theology-tray mt-2 overflow-hidden rounded-[18px] py-1">
            {studies.map((slug) => {
              const minutes = getTopicMeta(slug)?.estimatedMinutes;
              return (
                <li key={slug} className="theology-rule">
                  <Link href={`/theology/${slug}`} className="theology-row mx-1.5 flex min-h-[48px] items-center gap-3 rounded-[14px] px-3 py-2.5">
                    <span className="min-w-0 flex-1 font-serif text-[15px] font-semibold leading-[1.25] text-paper/92">
                      {/* The study's own title. This printed the slug ("council
                          of florence") until build 80. */}
                      {getTopicMeta(slug)?.title ?? slug.replace(/-/g, " ")}
                    </span>
                    {minutes ? (
                      <span className="shrink-0 font-sans text-caption tabular-nums text-paper/52">
                        <T k="bible.minRead" replacements={{ minutes }} />
                      </span>
                    ) : null}
                    <ChevronRight size={14} className="shrink-0 text-paper/32 rtl:-scale-x-100" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {/* A study argues from the sources; the account says what happened.
          Rendered only when a curated event actually cites this topic, so
          it can never be an empty shell (same contract as saints). */}
      <ViewInHistory events={events} />
      <RelatedRail groups={rest} bare />
    </section>
  );
}

/** A part's name over its rows, in small capitals, with how many there are. */
function PartLabel({ children, count, quiet = false }: { children: React.ReactNode; count: number | null; quiet?: boolean }) {
  return (
    <h2
      className={`flex items-baseline justify-between px-1 font-sans font-bold uppercase tracking-[0.12em] ${
        quiet ? "text-[10px] text-paper/40" : "text-[10.5px] text-paper/50"
      }`}
    >
      {children}
      {count !== null ? <span className="text-[11.5px] font-semibold normal-case tracking-normal tabular-nums text-paper/40">{count}</span> : null}
    </h2>
  );
}
