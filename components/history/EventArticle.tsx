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
import type { ChronologyEntry, EventPerson, HistoryEventBody, SourceCitation } from "@/lib/history/load";
import { scriptureHref } from "@/lib/history/scripture";
import type { EssayBlock } from "@/lib/theology/load";
import { cn } from "@/lib/cn";

import { BookmarkEventButton } from "./BookmarkEventButton";
import { EventPartsNav, type EventPart } from "./EventPartsNav";
import { EventPeople } from "./EventPeople";
import { InEnglishNote } from "./InEnglishNote";
import { ShareButton } from "@/components/ui/ShareButton";

/** The ids of the four parts, which the row of parts and its tests name. */
export const PART_IDS = {
  happened: "event-happened",
  matters: "event-matters",
  people: "event-people",
  sources: "event-sources",
} as const;

function Block({ block }: { block: EssayBlock }) {
  switch (block.kind) {
    case "heading":
      return <h3 className="pt-2 text-lede leading-snug text-paper">{block.text}</h3>;
    case "blockquote":
      return (
        <figure className="ps-4 md:ps-6">
          <blockquote className="font-serif text-body italic leading-[1.7] text-paper/90">
            <p>{block.text}</p>
          </blockquote>
          {block.source ? (
            <figcaption className="mt-2 font-sans text-caption not-italic text-paper/55">{block.source}</figcaption>
          ) : null}
        </figure>
      );
    case "list":
      return (
        <ul className="list-disc space-y-2 ps-6 font-sans text-body leading-[1.7] text-paper/85">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    default:
      return <p className="font-sans text-body leading-[1.75] text-paper/85">{block.text}</p>;
  }
}

function Blocks({ blocks }: { blocks?: EssayBlock[] }) {
  if (!blocks?.length) return null;
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
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

/** The steps of an event that ran for months or years: a plain dated list. */
function Chronology({ entries }: { entries?: ChronologyEntry[] }) {
  if (!entries?.length) return null;
  return (
    <>
      <Subhead k="study.history.stepByStep" />
      <ol className="mt-4 space-y-4">
        {entries.map((e, i) => (
          <li key={i} className="md:grid md:grid-cols-[9.5rem_minmax(0,1fr)] md:gap-4">
            <p className={cn("font-sans text-caption font-semibold tabular-nums", e.pivotal ? "text-paper/85" : "text-paper/55")}>
              {e.date}
            </p>
            <p
              className={cn(
                "mt-0.5 font-sans text-ui leading-[1.65] md:mt-0",
                e.pivotal ? "font-medium text-paper/95" : "text-paper/75",
              )}
            >
              {e.text}
            </p>
          </li>
        ))}
      </ol>
    </>
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
            <p className="font-sans text-ui leading-[1.6] text-paper/85">
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
            {s.note ? <p className="mt-1 font-sans text-detail leading-[1.55] text-paper/60">{s.note}</p> : null}
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
                <Link href={href} className="text-link underline-offset-4 hover:underline">
                  {ref}
                </Link>
              ) : (
                <span className="text-paper/75">{ref}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The event's head: its age, date and place, its title (the page's one h1), its summary, Share and Save. */
export function EventHeader({ meta }: { meta: HistoryEventMeta }) {
  return (
    <header>
      <p className="font-sans text-caption font-semibold text-paper/60 tabular-nums">
        <T k={eraKey(meta.era, "short")} /> · {meta.displayDate}
        {meta.region ? <span className="font-normal text-paper/55"> · {meta.region}</span> : null}
      </p>
      <h1
        id="event-title"
        className="mt-2 text-heading font-bold leading-[1.1] tracking-[-0.01em] text-paper text-balance md:text-display-sm"
      >
        {meta.title}
      </h1>
      <p className="mt-4 font-sans text-lede leading-[1.55] text-paper/80">{meta.summary}</p>
      <InEnglishNote />
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <ShareButton title={meta.title} text={meta.preview} className="min-h-11 px-4" />
        <BookmarkEventButton event={meta} />
      </div>
    </header>
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
      <EventPartsNav parts={parts} />

      <Part id={PART_IDS.happened} titleKey="study.history.whatHappened">
        <div className="space-y-5">
          <Blocks blocks={body.context} />
          <Blocks blocks={body.narrative} />
        </div>
        <Chronology entries={body.chronology} />
      </Part>

      {body.significance?.length || body.consequences?.length ? (
        <Part id={PART_IDS.matters} titleKey="study.history.part.matters">
          <Blocks blocks={body.significance} />
          {body.consequences?.length ? (
            <>
              <Subhead k="study.history.whatFlowed" />
              <div className="mt-4">
                <Blocks blocks={body.consequences} />
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
          <p className="mt-3 font-sans text-ui leading-[1.65] text-paper/75">{body.uncertainty}</p>
        ) : null}
        <SourceList labelKey="study.history.primarySources" sources={primary} />
        <SourceList labelKey="study.history.furtherReading" sources={secondary} />
        <Scripture refs={scripture} />
      </Part>
    </article>
  );
}
