import Link from "next/link";
import { HERESIES } from "@/lib/heresies/heresies";
import { COUNCILS } from "@/lib/councils/councils";
import { TheologyShell } from "@/components/theology/TheologyShell";

export const metadata = {
  title: "Heresies",
  description:
    "The chief errors condemned by the seven Ecumenical Councils, each defined in plain English, cross-linked to the council that condemned it, the orthodox teaching it denied, and the Fathers who refuted it.",
};

export const revalidate = 3600;

const councilByname = (slug: string) =>
  COUNCILS.find((c) => c.slug === slug)?.byname;

// Heresies, the dossier mode. A chronological record, grouped by era, each
// entry showing the proponent and the council that condemned it. Compact,
// archival, fact-first, no card grid.
export default function HeresiesIndexPage() {
  // Group by era in first-appearance order (the registry is already roughly
  // chronological, one heresy per Ecumenical Council).
  const eras: { era: string; items: typeof HERESIES }[] = [];
  for (const h of HERESIES) {
    const bucket = eras.find((e) => e.era === h.era);
    if (bucket) bucket.items.push(h);
    else eras.push({ era: h.era, items: [h] });
  }

  return (
    <TheologyShell>
      <header>
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-gold/70">
          Heresies
        </p>
        <h1 className="mt-3 font-serif text-display-sm md:text-display font-bold leading-[1.08] tracking-[-0.02em] text-paper">
          The errors the Church condemned.
        </h1>
        <p className="mt-5 font-serif text-body text-paper/80 leading-[1.75] max-w-[64ch]">
          Every Ecumenical Council is defined as much by the error it condemned
          as by the doctrine it confessed. Each profile sets out what the
          teaching claimed, why the Church rejected it, and the council, saints,
          and condemnation tied to it. No heretical text is hosted; every
          quotation is a deep-link into a Father&rsquo;s verbatim refutation.
        </p>
      </header>

      <div className="mt-12 space-y-10">
        {eras.map(({ era, items }) => (
          <section key={era}>
            <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/40 border-b border-paper/[0.08] pb-2">
              {era}
            </p>
            <ul className="mt-3 divide-y divide-paper/[0.07]">
              {items.map((h) => {
                const council = h.condemnedBy.map(councilByname).filter(Boolean)[0];
                return (
                  <li key={h.slug}>
                    <Link href={`/heresies/${h.slug}`} className="group block py-5">
                      <div className="flex items-baseline justify-between gap-4">
                        <h2 className="font-serif text-lede font-semibold text-paper leading-tight group-hover:text-gold transition-colors">
                          {h.name}
                        </h2>
                        {council ? (
                          <span className="shrink-0 font-sans text-caption text-paper/40 text-right leading-tight">
                            Condemned at
                            <br className="hidden sm:block" /> {council}
                          </span>
                        ) : null}
                      </div>
                      {/* Metadata line: the dossier header. */}
                      <p className="mt-1.5 font-sans text-caption text-paper/55">
                        {h.heresiarch}
                        {h.alsoCalled?.length
                          ? ` · also called ${h.alsoCalled.join(", ")}`
                          : ""}
                      </p>
                      <p className="mt-2.5 font-serif text-ui text-paper/75 leading-[1.65]">
                        {h.shortBio}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-paper/[0.08] pt-6 font-sans text-detail text-paper/50 leading-[1.6]">
        See{" "}
        <Link
          href="/councils"
          className="underline decoration-paper/30 underline-offset-4 hover:text-paper"
        >
          the Councils
        </Link>{" "}
        for the doctrine each error called forth.
      </p>
    </TheologyShell>
  );
}
