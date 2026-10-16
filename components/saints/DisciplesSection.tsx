import Link from "next/link";

import type { Disciple, Saint } from "@/lib/saints/saints";
import { getSaint } from "@/lib/saints/saints";
import { T } from "@/components/i18n/T";

/**
 * A saint's disciples and successors, one row each, linking to the disciple's
 * own page where Purify has one. A server component: it looks the disciples
 * up in the registry, which a client component would carry into the page's
 * script.
 */
export function DisciplesSection({ saint, disciples }: { saint: Pick<Saint, "pronoun">; disciples: Disciple[] }) {
  return (
    <section aria-labelledby="saint-disciples">
      <h2 id="saint-disciples" className="text-title-sm leading-tight text-paper">
        <T k={saint.pronoun === "her" ? "saints.herDisciples" : "saints.hisDisciples"} />
      </h2>
      <ul className="mt-2 divide-y divide-paper/8">
        {disciples.map((d) => {
          const target = getSaint(d.slug);
          const inner = (
            <>
              <span className="block font-serif text-body font-semibold leading-snug text-paper">
                {target?.name ?? d.slug}
              </span>
              <span className="mt-0.5 block font-sans text-caption text-paper/60">{d.relation}</span>
              <span className="mt-1.5 block font-sans text-detail leading-relaxed text-paper/70">{d.blurb}</span>
            </>
          );
          return (
            <li key={d.slug}>
              {target ? (
                <Link href={`/saints/${d.slug}`} prefetch={false} className="press-card block py-4">
                  {inner}
                </Link>
              ) : (
                <div className="py-4">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
