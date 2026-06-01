import Link from "next/link";
import { PrayerIcon } from "@/components/prayers/PrayerIcon";
import { listAkathists } from "@/lib/prayers/akathists";

export const metadata = {
  title: "Akathists",
  description:
    "The Akathists — long-form hymns of praise that stand in their own genre. The Akathist to the Theotokos is the original; others follow.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-20";

export default function AkathistsPage() {
  const items = listAkathists();
  return (
    <section className={`${SECTION} bg-night`}>
      <article className="mx-auto max-w-[960px] w-full">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
          Prayers · akathists
        </p>
        <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          The Akathists.
        </h1>
        <p className="mt-6 font-serif text-body text-paper/85 leading-[1.7]">
          The Akathist is the long-form hymn the Church sings standing
          throughout — &ldquo;not seated&rdquo; (a-kathisma). Each is built
          from thirteen Kontakia (shorter stanzas closing in
          <em> Alleluia</em>) alternating with twelve Ikoi (longer stanzas of
          salutations closing in a refrain). They are sung in full at
          stations along the road of the Church year — and in pieces,
          quietly, in personal rule.
        </p>

        <ul className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/prayers/akathists/${a.slug}`}
                className="group flex gap-4 rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.06] transition-colors p-5 h-full"
              >
                <PrayerIcon slug="theotokos-of-vladimir" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-gold/85 mb-2">
                    Akathist
                  </p>
                  <h2 className="font-serif text-title-sm text-paper leading-tight">
                    {a.title}
                  </h2>
                  {a.subtitle && (
                    <p className="mt-2 font-serif italic text-ui text-paper/65 leading-[1.55]">
                      {a.subtitle}
                    </p>
                  )}
                  <p className="mt-4 font-sans text-detail font-medium text-paper/75 group-hover:text-gold transition-colors">
                    Open →
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-12 font-sans text-caption text-paper/40">
          More akathists are being typeset (Christ, the saints). If you can
          help, write to team@purify.app.
        </p>
      </article>
    </section>
  );
}
