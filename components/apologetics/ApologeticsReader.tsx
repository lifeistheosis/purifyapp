import Link from "next/link";

import type {
  ApologeticsBody,
  EssayBlock,
  Quotation,
} from "@/lib/apologetics/load";
import { getSaint } from "@/lib/saints/saints";
import { SourceLine } from "@/components/citations/SourceLine";
import { VERBATIM } from "@/components/citations/verbatim";
import { T } from "@/components/i18n/T";
import { FatherFace } from "@/components/theology/FatherFace";
import { LeafGlyph, LeafNote, LeafPage, LeafPart } from "@/components/theology/LeafPage";
import { RelatedRail } from "@/components/theology/RelatedRail";
import { LEAF_CARD, LEAF_LEAD, LEAF_TEXT, LEAF_WORDS, WAY_H2, WAY_TRAY } from "@/components/theology/wayStyle";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Shield } from "@/components/ui/icons/Shield";
import { shownCite } from "@/lib/citations/shown";
import { SCHEMES } from "@/lib/saints/divisions";
import type { RelatedGroups } from "@/lib/theology/relations";

/**
 * An answer: an objection taken up (1.9, in the house style with the list
 * that opens it; components/theology/LeafPage.tsx has the frame and
 * docs/1.9-build/notes/theology-fable.md the plan).
 *
 * The head is the list's card, grown: the shield, lit, which the card's own
 * travels into; the answer's name in Lora; and its length, as the card says
 * it. Then its line and its summary, as the card has them; the essay at the
 * size a study is read at, its headings in Lora; the Fathers it rests on,
 * each passage on a raised surface with his face, his words on their own
 * type and the line that opens them where they stand; the Scriptures it
 * cites as rows into the Bible; and one list of what it leads to, as rows:
 * the studies behind it, the answers beside it, the councils, and the
 * Fathers it quotes.
 *
 * Until 1.9: a back bar with no name, the "Theology" label over four pills,
 * a giant headline, its headings and labels written in English in this file
 * with a gold tick under each, the saints it cites as a row of pills and
 * again as rows beneath, the answers beside it as pills that printed their
 * addresses ("sola scriptura"), and the search pill floating over the words.
 * The headings are the catalog's now, in every language; the saints and the
 * answers beside it are listed once, by their names. No word of the answer's
 * own changed.
 *
 * Two things a reader saw here were written for editors, and are gone (the
 * arbiter's word of 2026-11-10, "readers seeing words written for editors,
 * the same fault as the First Hour's stand-ins"): the line that stood where
 * an answer has no passages from the Fathers yet ("... is being assembled
 * and will be added here"), and the file's own note of how the answer came
 * to be (`origin`), under who curated it. An answer with no passages simply
 * has no such part, as a topic has no empty one.
 * lib/prayers/__tests__/noStandIns.test.ts holds both.
 */
export function ApologeticsReader({
  body,
  minutes,
  groups,
}: {
  body: ApologeticsBody;
  /** How long it is to read, as its card says (lib/apologetics/topics.ts). */
  minutes?: number;
  /** What it leads to (lib/theology/relations.ts), the Fathers it quotes and the answers beside it among them. */
  groups: RelatedGroups;
}) {
  return (
    <LeafPage
      kind="answer"
      up={{ href: "/apologetics", label: "discover.tile.apologetics" }}
      mark={<LeafGlyph icon={Shield} carry={`answer:${body.slug}`} />}
      name={body.title}
      nameLang="en"
      line={minutes ? <T k="bible.minRead" replacements={{ minutes }} /> : undefined}
    >
      {body.subtitle ? (
        <p lang="en" dir="ltr" data-answer-line="" className="mt-4 max-w-[58ch] font-serif text-[15px] italic leading-[1.5] text-paper/70">
          {body.subtitle}
        </p>
      ) : null}

      <p lang="en" dir="ltr" data-leaf-lead="" className={`mt-5 ${LEAF_LEAD}`}>
        {body.summary}
      </p>

      {body.essay.length > 0 ? (
        <div lang="en" dir="ltr" data-answer-essay="" className="mt-5 space-y-5">
          {body.essay.map((b, i) => (
            <EssayPart key={i} block={b} />
          ))}
        </div>
      ) : null}

      {body.florilegium.length > 0 ? (
        <LeafPart id="answer-fathers" title={<T k="study.theology.fromTheFathers" />} count={body.florilegium.length} data-answer-part="fathers">
          <ul className="mt-3 space-y-3">
            {body.florilegium.map((q, i) => (
              <li key={i}>
                <QuotationCard q={q} />
              </li>
            ))}
          </ul>
        </LeafPart>
      ) : null}

      {body.scripture && body.scripture.length > 0 ? (
        <LeafPart
          id="answer-scripture"
          title={<T k="study.theology.scriptureCrossRefs" />}
          count={body.scripture.length}
          data-answer-part="scripture"
        >
          <ul className={`${WAY_TRAY} mt-2.5`}>
            {body.scripture.map((s, i) => (
              <li key={i} className="theology-rule">
                <Link
                  href={`/bible?q=${encodeURIComponent(s.bibleRef ?? s.ref)}`}
                  className="theology-row flex min-h-[54px] items-start gap-3 rounded-[14px] px-2.5 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span lang="en" dir="ltr" className="block font-sans text-ui font-semibold text-paper rtl:text-right">
                      {s.ref}
                    </span>
                    {s.note ? (
                      <span lang="en" dir="ltr" className="mt-1 block font-serif text-detail leading-[1.55] text-paper/70 rtl:text-right">
                        {s.note}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight size={14} className="mt-1 shrink-0 text-paper/45 rtl:-scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        </LeafPart>
      ) : null}

      <RelatedRail groups={groups} title={<T k="study.apologetics.goDeeper" />} />

      {/* Who curated it, and when. The file's `origin` is the editors' own
          record of how the answer came to be ("Opened in v9.9 as a foundation
          entry ...") and is never drawn: a reader was shown it until 1.9. */}
      {body.curatedBy ? (
        <LeafNote>
          <p>
            <T k="study.curatedBy" /> {body.curatedBy}
            {body.curatedOn ? <> · {body.curatedOn}</> : null}
          </p>
        </LeafNote>
      ) : null}
    </LeafPage>
  );
}

function EssayPart({ block }: { block: EssayBlock }) {
  if (block.kind === "heading") {
    const level = block.level ?? 2;
    if (level === 2) return <h2 className={`pt-4 ${WAY_H2}`}>{block.text}</h2>;
    return <h3 className="pt-2 font-serif text-[15.5px] font-semibold leading-tight text-paper">{block.text}</h3>;
  }
  if (block.kind === "blockquote") {
    // On its own type, with no rule beside it (CLAUDE.md, "No side stripes").
    return (
      <blockquote className={`ps-5 ${LEAF_WORDS}`}>
        {block.text}
        {block.source ? <p className="mt-2 font-sans text-detail not-italic text-paper/55">{block.source}</p> : null}
      </blockquote>
    );
  }
  if (block.kind === "list") {
    return (
      <ul className={`list-disc space-y-2 ps-6 ${LEAF_TEXT}`}>
        {block.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
  }
  return <p className={LEAF_TEXT}>{block.text}</p>;
}

function QuotationCard({ q }: { q: Quotation }) {
  // Where the words stand (1.8, components/citations/SourceLine.tsx): the
  // library's paragraph, or the passage they are close to. In a work the
  // library numbers as the edition does (lib/saints/divisions.ts) the line
  // says the place better than the study's caption, which is then not
  // repeated; elsewhere the caption keeps the study's finer place.
  const shown = q.cite ? shownCite(q.cite) : null;
  const placed = shown?.kind === "father" && q.cite?.kind === "work" && Boolean(SCHEMES[`${q.cite.saint}/${q.cite.work}`]);
  const saint = q.saintSlug ? getSaint(q.saintSlug) : null;
  return (
    <figure data-answer-quote="" className={LEAF_CARD}>
      {/* Who speaks: his face, his name, and the study's own caption of the place. */}
      <div className="flex items-center gap-3">
        <FatherFace father={{ slug: saint?.slug, name: q.author, iconUrl: saint?.iconUrl }} size={34} />
        <div lang="en" dir="ltr" className="min-w-0 flex-1">
          <p className="font-serif text-[15px] font-semibold leading-[1.25] text-paper/92">{q.author}</p>
          {!placed && (q.work || q.reference) ? (
            <p className="mt-0.5 font-sans text-caption italic leading-[1.4] text-paper/55">
              {q.work}
              {q.work && q.reference ? <> · </> : null}
              {q.reference ?? null}
            </p>
          ) : null}
        </div>
      </div>
      <blockquote lang="en" dir="ltr" {...VERBATIM} className={`mt-3 ${LEAF_WORDS}`}>
        {q.text}
      </blockquote>
      {shown ? (
        <figcaption className="mt-2.5">
          <SourceLine cite={shown} />
        </figcaption>
      ) : null}
      {q.gloss ? (
        <p lang="en" dir="ltr" className="mt-2.5 font-sans text-detail leading-[1.6] text-paper/60">
          {q.gloss}
        </p>
      ) : null}
      {q.source ? (
        <p className="mt-2.5 font-sans text-detail text-paper/60">
          <a
            href={q.source}
            target="_blank"
            rel="noopener noreferrer"
            className="hit-44 underline decoration-paper/30 underline-offset-4 hover:text-paper"
          >
            <T k="study.source" />
          </a>
        </p>
      ) : null}
    </figure>
  );
}
