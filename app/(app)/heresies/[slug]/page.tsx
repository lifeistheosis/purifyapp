import Link from "next/link";
import { notFound } from "next/navigation";
import { HERESIES, getHeresy } from "@/lib/heresies/heresies";
import { getCouncil } from "@/lib/councils/councils";
import { resolveCitations } from "@/lib/citations/resolve";
import { CitationCard } from "@/components/citations/CitationCard";
import { TheologyArticleNav } from "@/components/theology/TheologyArticleNav";
import { RelatedRail } from "@/components/theology/RelatedRail";
import { buildRelated } from "@/lib/theology/relations";

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
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold/80">
          {h.era}
        </p>
        <h1 className="mt-3 font-display-serif text-display-sm md:text-display-lg text-paper leading-[1.05] tracking-[-0.015em]">
          {h.name}
        </h1>

        {/* Dossier metadata header — compact record at the top. */}
        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-x-5 gap-y-2 border-y border-paper/[0.08] py-4">
          <dt className="font-sans text-caption uppercase tracking-[1.4px] text-paper/40">
            Period
          </dt>
          <dd className="font-sans text-ui text-paper/80">{h.era}</dd>
          <dt className="font-sans text-caption uppercase tracking-[1.4px] text-paper/40">
            Proponent
          </dt>
          <dd className="font-sans text-ui text-paper/80">{h.heresiarch}</dd>
          {h.alsoCalled?.length ? (
            <>
              <dt className="font-sans text-caption uppercase tracking-[1.4px] text-paper/40">
                Also called
              </dt>
              <dd className="font-sans text-ui text-paper/80">
                {h.alsoCalled.join(", ")}
              </dd>
            </>
          ) : null}
          {councils.length ? (
            <>
              <dt className="font-sans text-caption uppercase tracking-[1.4px] text-paper/40">
                Condemned at
              </dt>
              <dd className="font-sans text-ui text-paper/80">
                {councils.map((c) => `${c.byname} (${c.year})`).join(" · ")}
              </dd>
            </>
          ) : null}
        </dl>

        {/* Claim / Orthodox Response — the dossier's comparison block, the
            historical claim set clearly against the Church's answer. */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-px overflow-hidden rounded-lg border border-paper/[0.08] bg-paper/[0.06]">
          <div className="bg-night p-5">
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
              The claim
            </p>
            <p className="mt-3 font-serif text-ui text-paper/85 leading-[1.7]">
              {h.definition}
            </p>
          </div>
          <div className="bg-night p-5">
            <p
              className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px]"
              style={{ color: "var(--ink-rubric, #c1272d)" }}
            >
              The Orthodox response
            </p>
            <p className="mt-3 font-serif text-ui text-paper/85 leading-[1.7]">
              {h.response}
            </p>
          </div>
        </div>

        {/* Condemned by the Church */}
        {councils.length > 0 && (
          <section className="mt-12">
            <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
              Condemned by the Church
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
            </ul>
          </section>
        )}

        {/* Refuted by the Fathers: only when the corpus holds a refutation. */}
        {resolvedRefutations.length > 0 && (
          <section className="mt-12">
            <p
              className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] mb-5"
              style={{ color: "var(--ink-rubric, #c1272d)" }}
            >
              Refuted by the Fathers
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
            Curated by {h.curatedBy}
            {h.curatedOn ? ` · ${h.curatedOn}` : ""}.
          </p>
        )}
      </article>
    </section>
  );
}
