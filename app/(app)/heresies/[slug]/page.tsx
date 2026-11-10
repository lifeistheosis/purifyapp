import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CitationCard } from "@/components/citations/CitationCard";
import { SourceList, findWords, marked, type ListedSource } from "@/components/citations/Marked";
import { VERBATIM } from "@/components/citations/verbatim";
import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { named } from "@/components/saints/SaintNames";
import { CouncilMark } from "@/components/theology/CouncilMark";
import { LeafGlyph, LeafNote, LeafPage, LeafPart } from "@/components/theology/LeafPage";
import { RelatedRail } from "@/components/theology/RelatedRail";
import { LEAF_CARD, LEAF_TEXT, LEAF_TITLE, LEAF_WORDS, WAY_TRAY } from "@/components/theology/wayStyle";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Scroll } from "@/components/ui/icons/Scroll";
import { resolveCitations } from "@/lib/citations/resolve";
import { shownCite } from "@/lib/citations/shown";
import { getCouncil } from "@/lib/councils/councils";
import { HERESY_QUOTES } from "@/lib/heresies/accountQuotes";
import { CONCILIAR_HERESIES, CONDEMNATIONS, OTHER_COUNCILS } from "@/lib/heresies/conciliar";
import { HERESIES, getHeresy } from "@/lib/heresies/heresies";
import { buildRelated } from "@/lib/theology/relations";

/** Where a mark in the claim or the response leads: its source, under them. */
const HERESY_SOURCE = "heresy-source-";

/** A row of a tray: a council that condemned the error. */
const ROW = "theology-row flex min-h-[54px] items-center gap-3 rounded-[14px] px-2 py-2";

/** Where a council's words stand, as the line under every quotation is drawn (components/citations/SourceLine.tsx). */
const PLACE = "tap-press hit-44 inline-flex max-w-full items-start gap-1.5 font-sans text-detail leading-[1.45] text-paper/60 hover:text-paper";

/** A source's edition after its name, as the line under a quotation joins them. */
const afterName = (source: string) => `, ${source}`;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return HERESIES.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const h = getHeresy(slug);
  if (!h) return { title: "Heresy not found" };
  return {
    title: h.name,
    description: h.definition.slice(0, 220),
  };
}

/**
 * An error the Church named: its record (1.9, in the house style with the
 * list that opens it; components/theology/LeafPage.tsx has the frame and
 * docs/1.9-build/notes/theology-fable.md the plan).
 *
 * The head is the list's row, grown: the scroll, lit, which the row's own
 * travels into; the error's name in Lora; and its century, as the list
 * files it and the path says it. Then its record at a glance (who taught
 * it, its other names, where it was condemned), on one raised surface as a
 * council's facts are; the claim and the Orthodox response, each a part
 * named in Lora and set at the size a study is read at, with the sources of
 * the words they quote under them; the council's own words against it, each
 * on a raised surface and opening where it stands; the councils that
 * condemned it as rows, each with its picture; the Fathers who refuted it,
 * each with his face (components/citations/CitationCard.tsx); what it leads
 * to; and who curated it.
 *
 * Until 1.9: a back bar with no name, the "Theology" label over four pills,
 * the century over a giant headline and said again in a list beneath it, the
 * claim and the response in an outlined box of two cells, two labels in a
 * red typed into the file, outlined cards, and the search pill floating over
 * the words. No word of the page's own changed; the century is said once.
 */
export default async function HeresyProfilePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const h = getHeresy(slug);
  if (!h) notFound();

  const councils = h.condemnedBy
    .map((s) => getCouncil(s))
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const resolvedRefutations = await resolveCitations(h.refutedBy);
  // The council's own words against it (1.8), each opening where it stands.
  const condemnations = CONDEMNATIONS[h.slug] ?? [];
  const otherCouncils = OTHER_COUNCILS[h.slug] ?? [];
  const ours = CONCILIAR_HERESIES.some((x) => x.slug === h.slug);

  // The quotations in the claim and the response, numbered in the order they
  // stand, each with its line, listed under the two (1.8, lib/heresies/accountQuotes.ts).
  const claimAndResponse = `${h.definition}\n${h.response}`;
  const sources: ListedSource[] = (HERESY_QUOTES[h.slug] ?? [])
    .map((q) => ({ q, at: findWords(claimAndResponse, q.words) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ q }, i) => ({ words: q.words, n: i + 1, shown: shownCite(q.cite) }));

  const groups = buildRelated("heresies", h.slug, {
    councils: h.condemnedBy,
    saints: h.refutedBy
      .map((c) => c.saintSlug)
      .filter((s): s is string => Boolean(s)),
    topics: h.relatedTopic ? [h.relatedTopic] : [],
    heresies: h.relatedHeresies ?? [],
  });

  // Its record at a glance. The century is the head's own line.
  const condemnedAt = [
    ...councils.map((c) => `${c.byname} (${c.year})`),
    ...otherCouncils.map((c) => `${c.name} (${c.year})`),
  ].join(" · ");
  const facts: { key: string; value: string }[] = [
    { key: "study.proponent", value: h.heresiarch },
    ...(h.alsoCalled?.length ? [{ key: "study.heresies.alsoCalled", value: h.alsoCalled.join(", ") }] : []),
    ...(condemnedAt ? [{ key: "study.heresies.condemnedAt", value: condemnedAt }] : []),
  ];

  return (
    <>
      <MobileTopBar title={h.name} back backFallback="/heresies" revealTitleOn={LEAF_TITLE} searchPlace="theology" />
      <LeafPage
        kind="heresy"
        up={{ href: "/heresies", label: "discover.tile.heresies" }}
        mark={<LeafGlyph icon={Scroll} carry={`heresy:${h.slug}`} />}
        name={h.name}
        nameLang="en"
        line={h.era}
        lineLang="en"
      >
        {/* Its record at a glance, as a council's facts are set. */}
        <dl data-heresy-facts="" className="theology-tray mt-6 grid grid-cols-1 divide-y divide-paper/8 rounded-[16px] font-sans">
          {facts.map((f) => (
            <div key={f.key} className="min-w-0 px-3.5 py-2.5">
              <dt className="text-[11.5px] font-semibold text-paper/55">
                <T k={f.key} />
              </dt>
              <dd lang="en" dir="ltr" className="mt-0.5 text-[13.5px] font-semibold leading-snug text-paper">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* The claim, then the Church's answer to it. */}
        <LeafPart id="heresy-claim" title={<T k="study.heresies.theClaim" />} data-heresy-part="claim">
          <p lang="en" dir="ltr" className={`mt-2.5 ${LEAF_TEXT}`}>
            {named(marked(h.definition, sources, HERESY_SOURCE))}
          </p>
        </LeafPart>
        <LeafPart id="heresy-response" title={<T k="study.heresies.orthodoxResponse" />} data-heresy-part="response">
          <p lang="en" dir="ltr" className={`mt-2.5 ${LEAF_TEXT}`}>
            {named(marked(h.response, sources, HERESY_SOURCE))}
          </p>
        </LeafPart>
        <SourceList id="heresy-sources" idPrefix={HERESY_SOURCE} sources={sources} lang="en" className="mt-7" />
        {ours ? (
          <p className="mt-4 font-sans text-caption leading-[1.5] text-paper/55">
            <T k="study.heresies.oursAwaitingReview" />
          </p>
        ) : null}

        {/* In the council's own words (1.8): the line of the canon, letter
            or tome that names the error, in its public-domain English, each
            opening the document where it stands. On their own type, with no
            rule beside them (CLAUDE.md, "No side stripes"). */}
        {condemnations.length > 0 ? (
          <LeafPart id="heresy-words" title={<T k="study.heresies.inTheirWords" />} count={condemnations.length} data-heresy-part="words">
            <ul className="mt-3 space-y-3">
              {condemnations.map((c, i) => (
                <li key={i} data-council-words="" className={LEAF_CARD}>
                  <blockquote lang="en" dir="ltr" {...VERBATIM} className={LEAF_WORDS}>
                    {/* A line taken from inside a sentence says so. */}
                    {/^[a-z]/.test(c.words) ? "… " : ""}
                    {c.words}
                    {/[.;:!?]$/.test(c.words) ? "" : " …"}
                  </blockquote>
                  <p className="mt-2.5">
                    {c.kind === "council" ? (
                      <Place href={`/councils/${c.council}/${c.document}#s${c.section}`}>
                        <span className="font-medium text-paper/80">{c.label}</span>
                      </Place>
                    ) : (
                      <Place href={`/history/${c.event}`}>
                        <span className="font-medium text-paper/80">{c.label}</span>
                        {afterName(c.source)}
                      </Place>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </LeafPart>
        ) : null}

        {/* Condemned by the Church: the councils, as rows. */}
        {councils.length > 0 || otherCouncils.length > 0 ? (
          <LeafPart
            id="heresy-condemned"
            title={<T k="study.heresies.condemnedByChurch" />}
            count={councils.length + otherCouncils.length}
            data-heresy-part="condemned"
          >
            <ul className={`${WAY_TRAY} mt-2.5`}>
              {councils.map((c) => (
                <li key={c.slug} className="theology-rule">
                  <Link href={`/councils/${c.slug}`} className={ROW}>
                    <CouncilMark slug={c.slug} />
                    <span className="min-w-0 flex-1">
                      <span lang="en" dir="ltr" className="block font-serif text-[15.5px] font-semibold leading-[1.26] text-paper/92">
                        {c.byname}
                      </span>
                      <span lang="en" dir="ltr" className="mt-0.5 block font-sans text-caption leading-[1.4] text-paper/55">
                        {c.year} &middot; {c.location}
                      </span>
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-paper/45 rtl:-scale-x-100" />
                  </Link>
                </li>
              ))}
              {otherCouncils.map((c) => (
                <li key={c.history ?? c.href} className="theology-rule">
                  <Link href={c.href ?? `/history/${c.history}`} className={ROW}>
                    <CouncilMark />
                    <span className="min-w-0 flex-1">
                      <span lang="en" dir="ltr" className="block font-serif text-[15.5px] font-semibold leading-[1.26] text-paper/92">
                        {c.name}
                      </span>
                      <span lang="en" dir="ltr" className="mt-0.5 block font-sans text-caption leading-[1.4] text-paper/55">
                        {c.year}
                      </span>
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-paper/45 rtl:-scale-x-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </LeafPart>
        ) : null}

        {/* Refuted by the Fathers: only when the corpus holds a refutation. */}
        {resolvedRefutations.length > 0 ? (
          <LeafPart id="heresy-refuted" title={<T k="study.heresies.refutedByFathers" />} count={resolvedRefutations.length} data-heresy-part="refuted">
            <ul className="mt-3 space-y-3">
              {resolvedRefutations.map((c, i) => (
                <li key={`r-${i}`}>
                  <CitationCard c={c} />
                </li>
              ))}
            </ul>
          </LeafPart>
        ) : null}

        <RelatedRail groups={groups} />

        {h.curatedBy ? (
          <LeafNote>
            <p>
              <T k="study.curatedBy" /> {h.curatedBy}
              {h.curatedOn ? ` · ${h.curatedOn}` : ""}.
            </p>
          </LeafNote>
        ) : null}
      </LeafPage>
    </>
  );
}

/** The place a council's words stand, which opens it: the line under them. */
function Place({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} prefetch={false} className={PLACE}>
      {/* The words say their language and their direction; the link and its chevron run with the page. */}
      <span lang="en" dir="ltr" className="min-w-0">
        {children}
      </span>
      <ChevronRight size={14} className="mt-[3px] shrink-0 rtl:-scale-x-100" />
    </Link>
  );
}
