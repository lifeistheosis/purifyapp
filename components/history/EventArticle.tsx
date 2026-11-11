// An event's account, in the four parts every event has (1.7, the owner's
// note 20 of 2026-10-16: every section "barely written", it "needs better
// structure"):
//
//   What happened    the world before, the event, and its steps when it ran
//                    over months or years;
//   Why it matters   what it means to the Orthodox Church, and what flowed
//                    from it;
//   The people       who they were in it;
//   Sources          how sure we are, the sources, and its Scripture.
//
// Our words are DM Sans; the Church's own words, quoted verbatim from a
// public-domain translation (Scripture, the Fathers, the councils), are Lora
// italic with their citation under them, so the two never read alike. No
// ornament between parts, no coloured first letter, no side stripe, no box.
// A server component: every part is in the page's HTML for a search engine,
// and the words around the account come from the catalogs on the device.

import Link from "next/link";

import { T } from "@/components/i18n/T";
import type { HistoryEventMeta } from "@/lib/history/events";
import { certaintyKey, eraKey } from "@/lib/history/labels";
import type { EventPerson, HistoryEventBody, SourceCitation } from "@/lib/history/load";
import { scriptureHref } from "@/lib/history/scripture";
import type { EssayBlock } from "@/lib/theology/load";
import { SourceLine } from "@/components/citations/SourceLine";
import { shownCite } from "@/lib/citations/shown";

import { eventThread } from "@/lib/history/thread";

import { BookmarkEventButton } from "./BookmarkEventButton";
import { EventPartsNav, type EventPart } from "./EventPartsNav";
import { EventPeople } from "./EventPeople";
import { EventThread } from "./EventThread";
import { InEnglishNote } from "./InEnglishNote";
import { ShareButton } from "@/components/ui/ShareButton";
import { ListenHere } from "@/components/reading/ListenHere";
import { listenId } from "@/lib/listen/texts";
import { MarkHost } from "@/components/reading/MarkHost";
import { ReadingMarks } from "@/components/reading/SelectionToolsLazy";
import { SaintNames } from "@/components/saints/SaintNames";

/** The ids of the four parts, which the row of parts and its tests name. */
export const PART_IDS = {
  happened: "event-happened",
  matters: "event-matters",
  people: "event-people",
  sources: "event-sources",
} as const;

/** Where a block of the account stands, for a reader's marks on its words (1.9, components/reading/MarkHost.tsx). */
type BlockAt = { slug: string; title: string; sectionN: number; paragraphIdx: number };

function Block({ block, at }: { block: EssayBlock; at?: BlockAt }) {
  switch (block.kind) {
    case "heading":
      return <h3 className="pt-2 text-lede leading-snug text-paper">{block.text}</h3>;
    case "blockquote": {
      // Where the app carries the words (its Bible, the library, a council's
      // document), the line every quotation has, which opens them (1.8);
      // else the source as the account gives it.
      const cite = block.cite ? shownCite(block.cite) : null;
      return (
        <figure className="ps-4 md:ps-6">
          <blockquote className="font-serif text-body italic leading-[1.7] text-paper/90">
            {at ? (
              // A passage the account quotes can be marked and is lit as it is read (1.9). It is signed
              // with its own source, never Purify: these are another's words.
              <MarkHost
                place={{ kind: "text", text: "history", slug: at.slug, doc: "-", sectionN: at.sectionN, paragraphIdx: at.paragraphIdx }}
                cite={block.source ? `${block.source} (quoted in ${at.title})` : `Quoted in ${at.title}`}
                link={`/history/${at.slug}`}
                name={block.source ?? at.title}
                work={block.source ? `Quoted in ${at.title}` : undefined}
              >
                <p data-mk-text=""><SaintNames text={block.text} /></p>
              </MarkHost>
            ) : (
              <p><SaintNames text={block.text} /></p>
            )}
          </blockquote>
          {cite ? (
            <figcaption className="mt-2 not-italic">
              <SourceLine cite={cite} />
            </figcaption>
          ) : block.source ? (
            <figcaption className="mt-2 font-sans text-caption not-italic text-paper/55">{block.source}</figcaption>
          ) : null}
        </figure>
      );
    }
    case "list": {
      const list = (
        <ul data-mk-text={at ? "" : undefined} className="list-disc space-y-2 ps-6 font-sans text-body leading-[1.7] text-paper/85">
          {block.items.map((item, i) => (
            // A space ends each item, so the list's words read as words where it is marked or read aloud.
            <li key={i}><SaintNames text={item} />{at ? " " : null}</li>
          ))}
        </ul>
      );
      // A list of the account is lit as it is read and can be marked, as a paragraph is (1.9).
      return at ? (
        <MarkHost place={{ kind: "text", text: "history", slug: at.slug, doc: "-", sectionN: at.sectionN, paragraphIdx: at.paragraphIdx }} cite={`${at.title}, Purify`} link={`/history/${at.slug}`} name="Purify" work={at.title}>
          {list}
        </MarkHost>
      ) : (
        list
      );
    }
    default: {
      const words = <p data-mk-text={at ? "" : undefined} className="font-sans text-body leading-[1.75] text-paper/85"><SaintNames text={block.text} /></p>;
      // The account is Purify's own, and a copy or a picture of its words says so.
      return at ? (
        <MarkHost place={{ kind: "text", text: "history", slug: at.slug, doc: "-", sectionN: at.sectionN, paragraphIdx: at.paragraphIdx }} cite={`${at.title}, Purify`} link={`/history/${at.slug}`} name="Purify" work={at.title}>
          {words}
        </MarkHost>
      ) : (
        words
      );
    }
  }
}

function Blocks({ blocks, at }: { blocks?: EssayBlock[]; at?: Omit<BlockAt, "paragraphIdx"> }) {
  if (!blocks?.length) return null;
  // The account is English for every reader, and says so (build 90 note 4);
  // a quotation's source line says the reader's own language on its frame.
  return (
    <div lang="en" dir="ltr" className="space-y-5">
      {blocks.map((b, i) => (
        <Block key={i} block={b} at={at ? { ...at, paragraphIdx: i } : undefined} />
      ))}
    </div>
  );
}

function Part({
  id,
  titleKey,
  children,
}: {
  id: string;
  titleKey: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="history-part mt-12">
      <h2 id={`${id}-title`} className="text-title-sm leading-tight text-paper md:text-title">
        <T k={titleKey} />
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Subhead({ k }: { k: string }) {
  return (
    <h3 className="mt-10 text-lede leading-snug text-paper">
      <T k={k} />
    </h3>
  );
}

function SourceList({ labelKey, sources }: { labelKey: string; sources: SourceCitation[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-8">
      <h3 className="text-ui font-semibold text-paper/85">
        <T k={labelKey} />
      </h3>
      <ul className="mt-3 space-y-4">
        {sources.map((s, i) => (
          <li key={i}>
            <p lang="en" dir="ltr" className="font-sans text-ui leading-[1.6] text-paper/85">
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-paper/25 underline-offset-4 hover:text-paper hover:decoration-paper/60"
                >
                  {s.label}
                </a>
              ) : (
                s.label
              )}
            </p>
            {s.note ? <p lang="en" dir="ltr" className="mt-1 font-sans text-detail leading-[1.55] text-paper/60">{s.note}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Scripture({ refs }: { refs: string[] }) {
  if (!refs.length) return null;
  return (
    <div className="mt-8">
      <h3 className="text-ui font-semibold text-paper/85">
        <T k="study.history.inScripture" />
      </h3>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {refs.map((ref) => {
          const href = scriptureHref(ref);
          return (
            <li key={ref} className="font-sans text-ui">
              {href ? (
                <Link href={href} lang="en" dir="ltr" className="text-link underline-offset-4 hover:underline">
                  {ref}
                </Link>
              ) : (
                <span lang="en" dir="ltr" className="text-paper/75">
                  {ref}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The event's head: its age, date and place, its title (the page's one h1)
 * and its summary. Share and Save are in the page's bar (EventBarActions).
 */
export function EventHeader({ meta }: { meta: HistoryEventMeta }) {
  return (
    <header>
      <p className="font-sans text-caption font-semibold text-paper/60 tabular-nums">
        {/* The era in the reader's words; the date and the place as the account writes them, in English. */}
        <T k={eraKey(meta.era, "short")} /> · <span lang="en" dir="ltr">{meta.displayDate}</span>
        {meta.region ? (
          <span className="font-normal text-paper/55">
            {" · "}
            <span lang="en" dir="ltr">
              {meta.region}
            </span>
          </span>
        ) : null}
      </p>
      <h1
        id="event-title"
        lang="en"
        dir="ltr"
        className="mt-2 text-heading font-bold leading-[1.1] tracking-[-0.01em] text-paper text-balance md:text-display-sm"
      >
        {meta.title}
      </h1>
      <p lang="en" dir="ltr" className="mt-4 font-sans text-lede leading-[1.55] text-paper/80">{meta.summary}</p>
      <InEnglishNote />
    </header>
  );
}

/**
 * Share and Save, a pair of icon buttons at the right of the page's bar,
 * after its search, the way a doctrine's page and a council's carry search
 * and Share there (1.8, the owner's note 67 of build 80: "Optimize the share
 * in the bookmark button... Because they're just floating there", a lone
 * Share pill and a bookmark in a row of their own under the summary). Each
 * the bar's own 44px box and ink, as its search is. Save is handed the four
 * things it names, not the event's whole record.
 */
export function EventBarActions({ meta }: { meta: HistoryEventMeta }) {
  return (
    <>
      <ShareButton
        title={meta.title}
        text={meta.preview}
        round
        className="border-0 bg-transparent text-paper/70 hover:text-paper"
      />
      <BookmarkEventButton
        event={{ slug: meta.slug, title: meta.title, shortTitle: meta.shortTitle, displayDate: meta.displayDate }}
      />
    </>
  );
}

export function EventArticle({
  meta,
  body,
  people,
}: {
  meta: HistoryEventMeta;
  body: HistoryEventBody;
  /** The account's own people, or the registry's saints for an older account. */
  people: EventPerson[];
}) {
  const primary = body.sources.filter((s) => s.kind === "primary");
  const secondary = body.sources.filter((s) => s.kind === "secondary");
  const scripture = meta.rel?.scripture ?? [];
  const here = { slug: meta.slug, title: meta.title };

  const parts: EventPart[] = [
    { id: PART_IDS.happened, labelKey: "study.history.pill.story" },
    ...(body.significance?.length || body.consequences?.length
      ? [{ id: PART_IDS.matters, labelKey: "study.history.pill.meaning" }]
      : []),
    ...(people.length ? [{ id: PART_IDS.people, labelKey: "study.history.pill.people" }] : []),
    { id: PART_IDS.sources, labelKey: "study.history.pill.sources" },
  ];

  return (
    <article className="w-full">
      {/* Any words of the account, selected and marked (1.9). */}
      <ReadingMarks />
      <EventPartsNav parts={parts} />

      <Part id={PART_IDS.happened} titleKey="study.history.whatHappened">
        {/* The account read aloud, where it has a recording (1.9, lib/listen/recordings.ts). */}
        <ListenHere id={listenId("history", meta.slug)} title={meta.title} by="Purify" className="mb-5" />
        <div className="space-y-5">
          <Blocks blocks={body.context} at={{ ...here, sectionN: 1 }} />
          <Blocks blocks={body.narrative} at={{ ...here, sectionN: 2 }} />
        </div>
        {body.chronology?.length ? (
          <>
            <Subhead k="study.history.stepByStep" />
            {/* The plain list for every reader, the Thread with its map for Plus (1.9). */}
            <EventThread thread={eventThread(meta.slug, body.chronology)} />
          </>
        ) : null}
      </Part>

      {body.significance?.length || body.consequences?.length ? (
        <Part id={PART_IDS.matters} titleKey="study.history.part.matters">
          <Blocks blocks={body.significance} at={{ ...here, sectionN: 3 }} />
          {body.consequences?.length ? (
            <>
              <Subhead k="study.history.whatFlowed" />
              <div className="mt-4">
                <Blocks blocks={body.consequences} at={{ ...here, sectionN: 4 }} />
              </div>
            </>
          ) : null}
        </Part>
      ) : null}

      {people.length ? (
        <Part id={PART_IDS.people} titleKey="study.history.part.people">
          <EventPeople people={people} />
        </Part>
      ) : null}

      <Part id={PART_IDS.sources} titleKey="study.history.sources">
        <h3 className="text-ui font-semibold text-paper/85">
          <T k="study.history.howSure" />
        </h3>
        <p className="mt-2 font-sans text-ui leading-[1.6] text-paper/85">
          <span className="font-semibold text-paper">
            <T k={certaintyKey(meta.certainty, "label")} />.
          </span>{" "}
          <T k={certaintyKey(meta.certainty, "gloss")} />
        </p>
        {body.uncertainty ? (
          <p lang="en" dir="ltr" className="mt-3 font-sans text-ui leading-[1.65] text-paper/75">{body.uncertainty}</p>
        ) : null}
        <SourceList labelKey="study.history.primarySources" sources={primary} />
        <SourceList labelKey="study.history.furtherReading" sources={secondary} />
        <Scripture refs={scripture} />
      </Part>
    </article>
  );
}
