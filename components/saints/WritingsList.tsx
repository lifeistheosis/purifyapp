import Link from "next/link";
import type { Saint, Work } from "@/lib/saints/saints";

export function WritingsList({ saint }: { saint: Saint }) {
  return (
    <section className="py-14">
      <div className="flex items-baseline justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            Writings
          </p>
          <h2 className="font-sans text-[28px] md:text-[36px] font-bold text-paper tracking-[-0.02em]">
            Read his works
          </h2>
        </div>
        <span className="font-sans text-[13px] text-paper/45">
          {saint.works.length}{" "}
          {saint.works.length === 1 ? "work" : "works"} available
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
        className="group block h-full rounded-lg bg-night border border-paper/8 p-6 hover:border-paper/25 hover:-translate-y-0.5 transition-all duration-200"
      >
        {work.year && (
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.2px] text-paper/45 mb-3">
            {work.year}
          </p>
        )}
        <h3 className="font-serif text-[22px] text-paper leading-[1.2]">
          {work.title}
        </h3>
        {work.subtitle && (
          <p className="font-sans text-[13px] text-paper/60 mt-1.5 italic">
            {work.subtitle}
          </p>
        )}
        <p className="mt-4 font-sans text-[14px] text-paper/70 leading-relaxed">
          {work.blurb}
        </p>
        <p className="mt-6 font-sans text-[14px] font-medium text-paper/75 group-hover:text-paper transition-colors duration-150">
          Open work →
        </p>
      </Link>
    </li>
  );
}
