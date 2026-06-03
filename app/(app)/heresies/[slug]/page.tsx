import Link from "next/link";
import { notFound } from "next/navigation";
import { HERESIES, getHeresy } from "@/lib/heresies/heresies";
import { getCouncil } from "@/lib/councils/councils";
import { loadTopic } from "@/lib/topics/topics";
import { resolveCitations } from "@/lib/citations/resolve";
import { CitationCard } from "@/components/citations/CitationCard";

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

  const relatedTopic = h.relatedTopic ? await loadTopic(h.relatedTopic) : null;

  const relatedHeresies = (h.relatedHeresies ?? [])
    .map((s) => getHeresy(s))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <article className="mx-auto max-w-[820px] w-full">
        {/* Breadcrumb */}
        <p className="font-sans text-caption uppercase tracking-[1.5px] text-paper/45 mb-6">
          <Link href="/heresies" className="hover:text-paper transition-colors">
            The Heresies
          </Link>
        </p>

        {/* Hero */}
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold/80">
          {h.era}
        </p>
        <h1 className="mt-3 font-display-serif text-display-sm md:text-display-lg text-paper leading-[1.05] tracking-[-0.015em]">
          {h.name}
        </h1>
        {h.alsoCalled && h.alsoCalled.length > 0 && (
          <p className="mt-3 font-sans text-ui text-paper/55">
            Also called {h.alsoCalled.join(", ")}
          </p>
        )}
        <p className="mt-4 font-sans text-ui text-paper/65">
          Taught by {h.heresiarch}
        </p>

        {/* Definition + response */}
        <p className="mt-8 font-serif text-body text-paper/85 leading-[1.7]">
          {h.definition}
        </p>
        <p className="mt-4 font-serif text-body text-paper/70 leading-[1.7]">
          {h.response}
        </p>

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

        {/* Cross-links: the orthodox teaching + related heresies */}
        {(relatedTopic || relatedHeresies.length > 0) && (
          <section className="mt-14 pt-8 border-t border-paper/10 space-y-6">
            {relatedTopic && (
              <div>
                <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45 mb-2">
                  The Orthodox teaching
                </p>
                <Link
                  href={`/topics/${relatedTopic.slug}`}
                  className="font-display-serif text-lede text-paper hover:text-gold transition-colors underline underline-offset-4 decoration-gold/40 hover:decoration-gold"
                >
                  {relatedTopic.title} &rarr;
                </Link>
              </div>
            )}
            {relatedHeresies.length > 0 && (
              <div>
                <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45 mb-2">
                  See also
                </p>
                <ul className="flex flex-wrap gap-x-5 gap-y-2">
                  {relatedHeresies.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/heresies/${r.slug}`}
                        className="font-sans text-ui text-paper/75 hover:text-paper transition-colors underline underline-offset-4 decoration-paper/30 hover:decoration-paper"
                      >
                        {r.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

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
