import Link from "next/link";

import type { Cite } from "@/lib/citations/cite";
import { shownCite } from "@/lib/citations/shown";
import type { EssayBlock, TheologyBody } from "@/lib/theology/load";
import { SourceLine } from "@/components/citations/SourceLine";
import { T } from "@/components/i18n/T";
import { SaintNames } from "@/components/saints/SaintNames";

/**
 * A part of a study as it is read (1.8, round 3 r3-13): the study's own
 * words, verbatim as the editors wrote them, each saint it names opening his
 * page. The first part opens with the study's summary, as the study always
 * has; the last closes with what the councils said and who curated it. The
 * part's Fathers follow as a deck (app/(app)/theology/[topic]/read/page.tsx).
 */
export function StudyPartText({ blocks, summary }: { blocks: EssayBlock[]; summary?: string }) {
  return (
    <div lang="en" className="mt-3 space-y-5">
      {summary ? <p className="font-serif text-[17px] leading-[1.65] text-paper/90">{summary}</p> : null}
      {blocks.map((b, i) => (
        <EssayPart key={i} block={b} />
      ))}
    </div>
  );
}

function EssayPart({ block }: { block: EssayBlock }) {
  if (block.kind === "heading") {
    return <h3 className="pt-3 font-sans text-lede font-semibold text-paper">{block.text}</h3>;
  }
  if (block.kind === "blockquote") {
    return (
      <blockquote className="border-s border-paper/40 ps-5 font-serif text-[16.5px] italic leading-[1.7] text-paper/85">
        {block.text}
        {block.source ? <p className="mt-2 font-sans text-detail not-italic text-paper/50">{block.source}</p> : null}
      </blockquote>
    );
  }
  if (block.kind === "list") {
    return (
      <ul className="list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88">
        {block.items.map((it, i) => (
          <li key={i}>
            <SaintNames text={it} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="font-serif text-[16.5px] leading-[1.7] text-paper/88">
      <SaintNames text={block.text} />
    </p>
  );
}

/** What the councils said, at the study's end: each council's words, where they stand, and the way to the council. */
export function StudyCouncils({ councils }: { councils: NonNullable<TheologyBody["councils"]> }) {
  if (councils.length === 0) return null;
  return (
    <section data-study-councils="" className="mt-10">
      <h3 className="font-serif text-[18px] font-bold leading-tight text-paper">
        <T k="study.theology.fromTheCouncils" />
      </h3>
      <ul className="mt-3 space-y-3">
        {councils.map((c, i) => (
          <li key={i} className="theology-tray rounded-[18px] px-5 py-5">
            <p lang="en" className="font-sans text-caption text-paper/55">
              {c.name} · {c.year}
            </p>
            {c.reference ? (
              <p lang="en" className="mt-1 font-sans text-caption text-paper/45">
                {c.reference}
              </p>
            ) : null}
            <p lang="en" className="mt-4 font-serif text-ui italic leading-[1.7] text-paper/85">
              {c.text}
            </p>
            <QuotedLine cite={c.cite} />
            {c.gloss ? (
              <p lang="en" className="mt-3 font-sans text-detail leading-[1.6] text-paper/55">
                {c.gloss}
              </p>
            ) : null}
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
  );
}

/** Who curated the study, and when: at its very end, as it always was. */
export function StudyCurated({ body }: { body: TheologyBody }) {
  if (!body.curatedBy && !body.origin) return null;
  return (
    <p className="mt-12 font-sans text-caption leading-[1.6] text-paper/35">
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
