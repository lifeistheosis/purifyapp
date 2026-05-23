import Link from "next/link";
import type { Disciple, Saint } from "@/lib/saints/saints";
import { getSaint } from "@/lib/saints/saints";

export function DisciplesSection({
  saint,
  disciples,
}: {
  saint: Saint;
  disciples: Disciple[];
}) {
  const pronoun = saint.pronoun === "her" ? "Her" : "His";

  return (
    <section className="py-12 border-b border-paper/8">
      <div className="mb-6">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
          The chain of tradition
        </p>
        <h2 className="font-sans text-[28px] md:text-[36px] font-bold text-paper tracking-[-0.02em]">
          {pronoun} disciples and successors
        </h2>
      </div>
      <ul className="grid grid-cols-1 gap-3">
        {disciples.map((d) => {
          const target = getSaint(d.slug);
          const name = target?.name ?? d.slug;
          const epithet = target?.epithet;
          const href = target ? `/saints/${d.slug}` : null;
          const inner = (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <span className="font-serif text-[18px] text-paper leading-tight">
                  {name}
                </span>
                <span className="shrink-0 font-sans text-[12px] font-semibold uppercase tracking-[1.2px] text-gold/85">
                  {d.relation}
                </span>
              </div>
              {epithet ? (
                <span className="font-sans text-[13px] text-paper/55">
                  {epithet}
                </span>
              ) : null}
              <p className="font-serif text-[15px] text-paper/80 leading-relaxed">
                {d.blurb}
              </p>
            </div>
          );
          const cls =
            "block rounded-lg border border-paper/10 bg-night p-5";
          return (
            <li key={d.slug}>
              {href ? (
                <Link
                  href={href}
                  className={
                    cls +
                    " hover:border-gold/40 hover:-translate-y-0.5 transition-all duration-200"
                  }
                >
                  {inner}
                </Link>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
