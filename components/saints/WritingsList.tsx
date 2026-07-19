import Link from "next/link";
import type { Saint, Work } from "@/lib/saints/saints";
import { T } from "@/components/i18n/T";

export function WritingsList({ saint }: { saint: Saint }) {
  return (
    <section className="py-14">
      <div className="flex items-baseline justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            <T k="saints.writings" />
          </p>
          <h2 className="font-sans text-title md:text-display-sm font-bold text-paper tracking-[-0.02em]">
            <T k="saints.readHisWorks" />
          </h2>
        </div>
        <span className="font-sans text-detail text-paper/45">
          <T k="saints.worksAvailable" count={saint.works.length} />
        </span>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {saint.works.map((w) => (
          <WritingTile key={w.slug} saintSlug={saint.slug} work={w} />
        ))}
      </ul>
    </section>
  );
}

function WritingTile({ saintSlug, work }: { saintSlug: string; work: Work }) {
  return (
    <li>
      <Link
        href={`/saints/${saintSlug}/${work.slug}`}
        className="group block h-full rounded-lg bg-night border border-paper/8 p-6 hover:border-paper/25 transition-all duration-200"
      >
        {work.year && (
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/45 mb-3">
            {work.year}
          </p>
        )}
        <h3 className="font-serif text-title-sm text-paper leading-[1.2]">
          {work.title}
        </h3>
        {work.subtitle && (
          <p className="font-sans text-detail text-paper/60 mt-1.5 italic">
            {work.subtitle}
          </p>
        )}
        <p className="mt-4 font-sans text-ui text-paper/70 leading-relaxed">
          {work.blurb}
        </p>
        <p className="mt-6 font-sans text-ui font-medium text-paper/75 group-hover:text-paper transition-colors duration-150">
          <T k="saints.openWork" /> →
        </p>
      </Link>
    </li>
  );
}
