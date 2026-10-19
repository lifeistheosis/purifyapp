import Link from "next/link";

import type { Saint } from "@/lib/saints/saints";
import { T } from "@/components/i18n/T";

/**
 * The Mother of God's great feasts, one row each, and the way to her
 * Akathist. The link says where it goes and goes there (it opened the
 * prayers' front page before 1.7).
 */
export function GreatFeastsSection({
  feasts,
  pronoun,
  akathist = false,
}: {
  feasts: NonNullable<Saint["greatFeasts"]>;
  pronoun?: "his" | "her";
  /** The Mother of God's page: the way to her Akathist under her feasts. */
  akathist?: boolean;
}) {
  return (
    <section aria-labelledby="saint-great-feasts">
      <h2 id="saint-great-feasts" className="text-title-sm leading-tight text-paper">
        <T k={pronoun === "her" ? "saints.herGreatFeasts" : "saints.hisGreatFeasts"} />
      </h2>
      <ul className="mt-2 divide-y divide-paper/8">
        {feasts.map((f) => {
          const inner = (
            <>
              <span className="min-w-0 font-serif text-body leading-snug text-paper">{f.name}</span>
              <span className="shrink-0 font-sans text-caption text-paper/55">{f.date}</span>
            </>
          );
          const row = "flex min-h-12 items-center justify-between gap-4 py-2.5";
          return (
            <li key={f.name}>
              {f.href ? (
                <Link href={f.href} className={`press-card ${row}`}>
                  {inner}
                </Link>
              ) : (
                <div className={row}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {akathist ? (
        <Link
          href="/prayers/akathists/theotokos"
          className="hit-44 mt-4 inline-flex font-sans text-detail font-semibold text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-paper"
        >
          <T k="saints.prayAkathist" />
        </Link>
      ) : null}
    </section>
  );
}
