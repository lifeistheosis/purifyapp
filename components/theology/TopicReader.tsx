import Link from "next/link";
import type { CSSProperties } from "react";

import type {
  TheologyBody,
  EssayBlock,
} from "@/lib/theology/load";
import { getTopicMeta } from "@/lib/theology/topics";
import {
  doctrineDoors,
  epigraphIndex,
  fatherGroups,
  fatherKey,
  subjectOfStudy,
  type DoctrineDoor,
} from "@/lib/theology/page";
import type { RelatedGroups } from "@/lib/theology/relations";
import { hasAnyRelated } from "@/lib/theology/relations";
import type { HistoryEventMeta } from "@/lib/history/events";
import { getSaint } from "@/lib/saints/saints";
import { SourceLine } from "@/components/citations/SourceLine";
import { T } from "@/components/i18n/T";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { ViewInHistory } from "@/components/history/ViewInHistory";
import type { Cite, ShownCite } from "@/lib/citations/cite";
import { shownCite } from "@/lib/citations/shown";
import { SCHEMES } from "@/lib/saints/divisions";
import { SaintNames } from "@/components/saints/SaintNames";

import { DoctrineDoors, ReadTheStudy } from "./DoctrineDoors";
import { FathersDeck, type DeckFather, type DeckPassage } from "./FathersDeck";
import { RelatedRail } from "./RelatedRail";

/** The cover when a study belongs to no subject: Rublev's Trinity, Theology's own tile. */
const FALLBACK_COVER = { src: "/discover/tiles/theology.v2.webp", focus: "50% 35%" };

/**
 * A doctrine's own page (1.8, round 3 r3-04, part 2): the owner's pick of
 * 2026-10-30, "two, B and C, hybrid" (Homebase/boards/purify-master/variants/
 * r3-04-theology). His note 23 of build 80 asked for the doctrines and the
 * pages they open to be revamped.
 *
 * The two are one page in this order:
 *
 *   C's head      the icon of the study's subject as the cover, under the
 *                 clear bar, fading into the page; the subject's name, the
 *                 title and its line over its foot; then Read the study, the
 *                 page's main button, which opens the long form.
 *   B's doors     The study, The Fathers, Scripture and Related, switching
 *                 what is below them, as a saint's page does.
 *   The Fathers   B's medallions over C's deck of picture cards, each with
 *                 Read where it's from and Share (as a picture); the door the
 *                 page opens on (components/theology/FathersDeck.tsx).
 *   The study     the summary, the essay, what the councils said, and who
 *                 curated it.
 *   Scripture     the verses the study leans on, as rows into the Bible.
 *   Related       the related studies by their titles, the study in Orthodox
 *                 History, and the rest of Theology it touches, as rows.
 *
 * Everything is resolved here, on the server: where each passage stands in
 * the app (lib/citations/shown.ts) and who each Father is. The doors and the
 * deck are the parts that move.
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
  const passages = body.florilegium.map(passageOf);
  const fathers: DeckFather[] = fatherGroups(passages.map((p) => ({ saintSlug: p.saintSlug, author: p.author }))).map((g) => {
    const saint = g.saintSlug ? getSaint(g.saintSlug) : null;
    return {
      key: g.key,
      name: saint?.name ?? g.author,
      count: g.count,
      ...(saint ? { saintSlug: saint.slug, ...(saint.iconUrl ? { iconUrl: saint.iconUrl } : {}) } : {}),
    };
  });
  const related = (body.related ?? []).length + (hasAnyRelated(groups) ? 1 : 0) + events.length;
  const doors = doctrineDoors({ passages: passages.length, scripture: body.scripture?.length ?? 0, related });
  const subject = subjectOfStudy(body.slug);
  const cover = subject ? { src: subject.picture.src, focus: subject.picture.focus ?? "50% 30%" } : FALLBACK_COVER;
  const minutes = getTopicMeta(body.slug)?.estimatedMinutes;

  const panels: Partial<Record<DoctrineDoor, React.ReactNode>> = {
    study: <StudyPart body={body} />,
    fathers: <FathersDeck passages={passages} fathers={fathers} opening={epigraphIndex(passages, body.epigraph)} />,
    scripture: <ScripturePart body={body} />,
    related: <RelatedPart body={body} groups={groups} events={events} />,
  };

  return (
    <article className="mx-auto w-full max-w-[760px]">
      <header className="relative">
        {/* On a computer, the way back up to Theology; a phone has the bar's. */}
        <p className="mb-4 hidden font-sans text-detail font-semibold text-paper/55 md:block native-md-hidden">
          <Link href="/theology" className="hover:text-paper">
            <T k="nav.discoverMenu.theology" />
          </Link>
        </p>
        {/* C: the subject's icon as the cover, under the clear bar on a phone, fading into the page. */}
        <div data-doctrine-cover="" className="doctrine-cover saint-icon-in under-topbar relative -mx-5 overflow-hidden md:mx-0 md:rounded-[18px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
          <img
            src={cover.src}
            alt=""
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: cover.focus }}
          />
          {/* The clock and the bar's plates stay readable over the picture. */}
          <span aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-night/55 to-transparent md:hidden" />
        </div>
        <div className="doctrine-title relative">
          <p className="saint-head-in font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-paper/65" style={{ "--i": 1 } as CSSProperties}>
            {subject?.title ?? <T k="nav.discoverMenu.theology" />}
          </p>
          <h1
            id="doctrine-title"
            className="doctrine-shadow saint-head-in mt-[7px] font-serif text-[27px] font-bold leading-[1.1] tracking-[-0.2px] text-paper text-balance md:text-display-sm"
            style={{ "--i": 1 } as CSSProperties}
          >
            {body.title}
          </h1>
          {body.subtitle ? (
            <p className="doctrine-shadow saint-head-in mt-2 font-serif text-[14.5px] italic leading-[1.45] text-paper/78 md:text-lede" style={{ "--i": 2 } as CSSProperties}>
              {body.subtitle}
            </p>
          ) : null}
        </div>
        <div className="saint-head-in mt-5" style={{ "--i": 2 } as CSSProperties}>
          <ReadTheStudy doors={doors} minutes={minutes} />
        </div>
      </header>

      <div className="mt-5">
        <DoctrineDoors doors={doors} panels={panels} />
      </div>
    </article>
  );
}

/**
 * One passage of the florilegium as its card shows it. Where the library has
 * the words, its line names the work and the place and opens them; a work it
 * numbers as the edition does (lib/saints/divisions.ts) says the place better
 * than the study's caption. Elsewhere the caption keeps the study's place,
 * and Read where it's from opens the public-domain page the words were read
 * on.
 */
function passageOf(q: TheologyBody["florilegium"][number]): DeckPassage {
  const shown = q.cite ? shownCite(q.cite) : null;
  const placed = shown?.kind === "father" ? shown : null;
  const numbered = q.cite?.kind === "work" && Boolean(SCHEMES[`${q.cite.saint}/${q.cite.work}`]);
  const saint = q.saintSlug ? getSaint(q.saintSlug) : null;
  const inApp = whereFrom(shown);
  const [work, place] = workAndPlace(shown, q, numbered);
  return {
    text: q.text,
    // Grouped as the medallions are: by a saint the app has, else by the printed name.
    father: fatherKey({ saintSlug: saint?.slug, author: q.author }),
    name: saint?.name ?? q.author,
    author: q.author,
    ...(saint ? { saintSlug: saint.slug } : {}),
    ...(work ? { work } : {}),
    ...(place ? { place } : {}),
    ...(shown?.kind === "inexact" ? { inexact: true } : {}),
    ...(inApp ? { source: { href: inApp, external: false } } : q.source ? { source: { href: q.source, external: true } } : {}),
    ...(q.gloss ? { gloss: q.gloss } : {}),
    ...(placed ? { gatherHref: placed.href } : q.saintSlug ? { gatherHref: `/saints/${q.saintSlug}` } : {}),
  };
}

/**
 * Where Read where it's from opens in the app: the words where they stand,
 * as the source line under a quotation links them (Today's saint window does
 * the same, lib/today/saintWords.ts, readWhereFrom). Null for a text the
 * library does not carry.
 */
function whereFrom(shown: ShownCite | null): string | null {
  if (!shown) return null;
  if (shown.kind === "father" || shown.kind === "scripture") return shown.href;
  if (shown.kind === "inexact") return shown.of.href;
  return null;
}

/**
 * The work and the place under a passage. The work is the library's name for
 * it where the library has the words, else the study's. The place is the
 * library's in a work it numbers as the edition does, which says it better;
 * elsewhere the study's caption keeps its finer place.
 */
function workAndPlace(
  shown: ShownCite | null,
  caption: { work?: string; reference?: string },
  numbered: boolean,
): [string | undefined, string | undefined] {
  const at = shown?.kind === "inexact" ? shown.of : shown;
  if (at?.kind === "father") {
    const library = [at.place, at.mark].filter(Boolean).join(", ");
    return [at.work || caption.work, (numbered ? library || caption.reference : caption.reference || library) || undefined];
  }
  if (at?.kind === "text") return [at.work, at.place];
  return [caption.work, caption.reference];
}

/** The study: the summary, the long form, the councils, and who curated it. */
function StudyPart({ body }: { body: TheologyBody }) {
  return (
    <div data-doctrine-study="">
      <p className="font-serif text-body text-paper/85 leading-[1.75]">{body.summary}</p>

      {body.essay.length > 0 ? (
        <section className="mt-10 space-y-6">
          {body.essay.map((b, i) => (
            <EssayPart key={i} block={b} />
          ))}
        </section>
      ) : null}

      {body.councils && body.councils.length > 0 ? (
        <section className="mt-14">
          <PartTitle>
            <T k="study.theology.fromTheCouncils" />
          </PartTitle>
          <ul className="mt-6 space-y-4">
            {body.councils.map((c, i) => (
              <li key={i} className="theology-tray rounded-[18px] px-5 py-5">
                <p className="font-sans text-caption text-paper/55">
                  {c.name} · {c.year}
                </p>
                {c.reference ? <p className="mt-1 font-sans text-caption text-paper/45">{c.reference}</p> : null}
                <p className="mt-4 font-serif text-ui text-paper/85 leading-[1.7] italic">{c.text}</p>
                <QuotedLine cite={c.cite} />
                {c.gloss ? <p className="mt-3 font-sans text-detail text-paper/55 leading-[1.6]">{c.gloss}</p> : null}
                {c.councilSlug ? (
                  <p className="mt-3">
                    <Link
                      href={`/councils/${c.councilSlug}`}
                      className="font-sans text-detail text-paper/85 underline decoration-paper/30 underline-offset-4 hover:text-paper"
                    >
                      <T k="study.theology.readTheCouncil" />
                    </Link>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {body.curatedBy || body.origin ? (
        <p className="mt-16 font-sans text-caption text-paper/35 leading-[1.6]">
          {body.curatedBy ? (
            <>
              <T k="study.curatedBy" /> {body.curatedBy}
            </>
          ) : null}
          {body.curatedBy && body.curatedOn ? <> · </> : null}
          {body.curatedOn ?? null}
          {body.origin ? (
            <>
              <br />
              {body.origin}
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

/** Scripture: the verses the study leans on, each a row into the Bible, with why it is cited. */
function ScripturePart({ body }: { body: TheologyBody }) {
  const refs = body.scripture ?? [];
  return (
    <section>
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
  return (
    <div>
      {studies.length > 0 ? (
        <section>
          <PartLabel count={studies.length}>
            <T k="study.doctrine" />
          </PartLabel>
          <ul className="theology-tray mt-2 overflow-hidden rounded-[18px] py-1">
            {studies.map((slug) => (
              <li key={slug} className="theology-rule">
                <Link href={`/theology/${slug}`} className="theology-row mx-1.5 flex min-h-[48px] items-center gap-3 rounded-[14px] px-3 py-2.5">
                  <span className="min-w-0 flex-1 font-serif text-[15px] font-semibold leading-[1.25] text-paper/92">
                    {/* The study's own title. This printed the slug ("council
                        of florence") until build 80. */}
                    {getTopicMeta(slug)?.title ?? slug.replace(/-/g, " ")}
                  </span>
                  {getTopicMeta(slug)?.estimatedMinutes ? (
                    <span className="shrink-0 font-sans text-caption tabular-nums text-paper/52">
                      <T k="bible.minRead" replacements={{ minutes: getTopicMeta(slug)!.estimatedMinutes! }} />
                    </span>
                  ) : null}
                  <ChevronRight size={14} className="shrink-0 text-paper/32 rtl:-scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {/* A study argues from the sources; the account says what happened.
          Rendered only when a curated event actually cites this topic, so
          it can never be an empty shell (same contract as saints). */}
      <ViewInHistory events={events} />
      <RelatedRail groups={rest} bare />
    </div>
  );
}

/** A part's name over its rows, in small capitals, with how many there are. */
function PartLabel({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <h2 className="flex items-baseline justify-between px-1 font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-paper/50">
      {children}
      <span className="text-[11.5px] font-semibold normal-case tracking-normal tabular-nums text-paper/40">{count}</span>
    </h2>
  );
}

function PartTitle({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h2 className="font-sans text-caption text-paper/55">{children}</h2>
      <div aria-hidden className="mt-3 h-px w-12 bg-paper/40" />
    </>
  );
}

function EssayPart({ block }: { block: EssayBlock }) {
  if (block.kind === "heading") {
    const level = block.level ?? 2;
    if (level === 2) {
      return (
        <h2 className="mt-10 font-sans text-title-sm md:text-title font-semibold tracking-[-0.015em] text-paper">
          {block.text}
        </h2>
      );
    }
    return <h3 className="mt-8 font-sans text-lede font-semibold text-paper">{block.text}</h3>;
  }
  if (block.kind === "blockquote") {
    return (
      <blockquote className="border-l border-paper/40 pl-5 font-serif italic text-body text-paper/85 leading-[1.7]">
        {block.text}
        {block.source ? <p className="mt-2 not-italic font-sans text-detail text-paper/50">{block.source}</p> : null}
      </blockquote>
    );
  }
  if (block.kind === "list") {
    return (
      <ul className="list-disc pl-6 space-y-2 font-serif text-body text-paper/85 leading-[1.7]">
        {block.items.map((it, i) => (
          <li key={i}>
            <SaintNames text={it} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="font-serif text-body text-paper/85 leading-[1.75]">
      <SaintNames text={block.text} />
    </p>
  );
}

/**
 * The line under a council's words (1.8, components/citations/SourceLine.tsx):
 * where the words stand in the app, the passage they are close to, or the
 * plain word that they are not yet traced.
 */
function QuotedLine({ cite }: { cite?: Cite }) {
  const shown = cite ? shownCite(cite) : null;
  return shown ? <SourceLine cite={shown} className="mt-3" /> : null;
}
