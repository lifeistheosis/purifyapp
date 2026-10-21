import Link from "next/link";
import { notFound } from "next/navigation";
import { HERESIES, getHeresy } from "@/lib/heresies/heresies";
import { getCouncil } from "@/lib/councils/councils";
import { resolveCitations } from "@/lib/citations/resolve";
import { CitationCard } from "@/components/citations/CitationCard";
import { SourceList, findWords, marked, type ListedSource } from "@/components/citations/Marked";
import { shownCite } from "@/lib/citations/shown";
import { HERESY_QUOTES } from "@/lib/heresies/accountQuotes";
import { CONCILIAR_HERESIES, CONDEMNATIONS, OTHER_COUNCILS } from "@/lib/heresies/conciliar";

/** Where a mark in the claim or the response leads: its source, under them. */
const HERESY_SOURCE = "heresy-source-";
import { TheologyArticleNav } from "@/components/theology/TheologyArticleNav";
import { RelatedRail } from "@/components/theology/RelatedRail";
import { buildRelated } from "@/lib/theology/relations";
import { T } from "@/components/i18n/T";

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

  return (
    <section className="bg-night px-5 md:px-8 py-10 md:py-16">
      <article className="mx-auto max-w-[820px] w-full">
        <TheologyArticleNav className="mb-8" />

        {/* Hero */}
        <p className="font-sans text-caption font-semibold text-gold/80">
          {h.era}
        </p>
        <h1 className="mt-3 font-display-serif text-display-sm md:text-display-lg text-paper leading-[1.05] tracking-[-0.015em]">
          {h.name}
        </h1>

        {/* Dossier metadata header, compact record at the top. */}
        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-x-5 gap-y-2 border-y border-paper/[0.08] py-4">
          <dt className="font-sans text-caption text-paper/40">
            <T k="study.period" />
          </dt>
          <dd className="font-sans text-ui text-paper/80">{h.era}</dd>
          <dt className="font-sans text-caption text-paper/40">
            <T k="study.proponent" />
          </dt>
          <dd className="font-sans text-ui text-paper/80">{h.heresiarch}</dd>
          {h.alsoCalled?.length ? (
            <>
              <dt className="font-sans text-caption text-paper/40">
                <T k="study.heresies.alsoCalled" />
              </dt>
              <dd className="font-sans text-ui text-paper/80">
                {h.alsoCalled.join(", ")}
              </dd>
            </>
          ) : null}
          {councils.length || otherCouncils.length ? (
            <>
              <dt className="font-sans text-caption text-paper/40">
                <T k="study.heresies.condemnedAt" />
              </dt>
              <dd className="font-sans text-ui text-paper/80">
                {[
                  ...councils.map((c) => `${c.byname} (${c.year})`),
                  ...otherCouncils.map((c) => `${c.name} (${c.year})`),
                ].join(" · ")}
              </dd>
            </>
          ) : null}
        </dl>

        {/* Claim / Orthodox Response, the dossier's comparison block, the
            historical claim set clearly against the Church's answer. */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-px overflow-hidden rounded-lg border border-paper/[0.08] bg-paper/[0.06]">
          <div className="bg-night p-5">
            <p className="font-sans text-caption font-semibold text-paper/45">
              <T k="study.heresies.theClaim" />
            </p>
            <p className="mt-3 font-serif text-ui text-paper/85 leading-[1.7]">
              {marked(h.definition, sources, HERESY_SOURCE)}
            </p>
          </div>
          <div className="bg-night p-5">
            <p
              className="font-sans text-caption font-semibold"
              style={{ color: "var(--ink-rubric, #c1272d)" }}
            >
              <T k="study.heresies.orthodoxResponse" />
            </p>
            <p className="mt-3 font-serif text-ui text-paper/85 leading-[1.7]">
              {marked(h.response, sources, HERESY_SOURCE)}
            </p>
          </div>
        </div>
        <SourceList id="heresy-sources" idPrefix={HERESY_SOURCE} sources={sources} lang="en" className="mt-6" />
        {ours ? (
          <p className="mt-4 font-sans text-caption text-paper/45">
            <T k="study.heresies.oursAwaitingReview" />
          </p>
        ) : null}

        {/* In the council's own words (1.8): the line of the canon, letter
            or tome that names the error, in its public-domain English, each
            opening the document where it stands. */}
        {condemnations.length > 0 && (
          <section className="mt-12">
            <h2 className="font-sans text-caption font-semibold text-paper/55 mb-4">
              <T k="study.heresies.inTheirWords" />
            </h2>
            <ul className="space-y-5">
              {condemnations.map((c, i) => (
                <li key={i}>
                  <blockquote className="border-s-2 border-paper/25 ps-4 font-serif text-ui italic text-paper/85 leading-[1.7]">
                    {/* A line taken from inside a sentence says so. */}
                    {/^[a-z]/.test(c.words) ? "… " : ""}
                    {c.words}
                    {/[.;:!?]$/.test(c.words) ? "" : " …"}
                  </blockquote>
                  <p className="mt-2 ps-4 font-sans text-caption text-paper/50">
                    {c.kind === "council" ? (
                      <Link href={`/councils/${c.council}/${c.document}#s${c.section}`} className="underline decoration-paper/25 underline-offset-4 hover:text-paper">
                        {c.label}
                      </Link>
                    ) : (
                      <>
                        <Link href={`/history/${c.event}`} className="underline decoration-paper/25 underline-offset-4 hover:text-paper">
                          {c.label}
                        </Link>
                        {`, ${c.source}`}
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Condemned by the Church */}
        {(councils.length > 0 || otherCouncils.length > 0) && (
          <section className="mt-12">
            <h2 className="font-sans text-caption font-semibold text-paper/55 mb-4">
              <T k="study.heresies.condemnedByChurch" />
            </h2>
            <ul className="space-y-3">
              {councils.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/councils/${c.slug}`}
                    className="group block rounded-md border border-paper/12 bg-paper/[0.03] hover:border-gold/45 hover:bg-gold/[0.04] transition-colors px-5 py-4"
                  >
                    <p className="font-display-serif text-lede text-paper">
                      {c.byname}
                    </p>
                    <p className="mt-1 font-sans text-caption text-paper/55">
                      {c.year} &middot; {c.location}
                    </p>
                  </Link>
                </li>
              ))}
              {otherCouncils.map((c) => (
                <li key={c.history}>
                  <Link
                    href={`/history/${c.history}`}
                    className="group block rounded-md border border-paper/12 bg-paper/[0.03] hover:border-paper/40 hover:bg-paper/[0.05] transition-colors px-5 py-4"
                  >
                    <p className="font-serif text-lede text-paper">{c.name}</p>
                    <p className="mt-1 font-sans text-caption text-paper/55">{c.year}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Refuted by the Fathers: only when the corpus holds a refutation. */}
        {resolvedRefutations.length > 0 && (
          <section className="mt-12">
            <p
              className="font-sans text-caption font-semibold mb-5"
              style={{ color: "var(--ink-rubric, #c1272d)" }}
            >
              <T k="study.heresies.refutedByFathers" />
            </p>
            <ul className="space-y-4">
              {resolvedRefutations.map((c, i) => (
                <li key={`r-${i}`}>
                  <CitationCard c={c} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <RelatedRail groups={groups} />

        {h.curatedBy && (
          <p className="mt-14 pt-8 border-t border-paper/10 font-sans text-caption text-paper/40">
            <T k="study.curatedBy" /> {h.curatedBy}
            {h.curatedOn ? ` · ${h.curatedOn}` : ""}.
          </p>
        )}
      </article>
    </section>
  );
}
