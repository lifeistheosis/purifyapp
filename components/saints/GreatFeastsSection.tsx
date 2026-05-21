import Link from "next/link";
import type { Saint } from "@/lib/saints/saints";

export function GreatFeastsSection({
  feasts,
}: {
  feasts: NonNullable<Saint["greatFeasts"]>;
}) {
  return (
    <section className="py-12 border-b border-paper/8">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            The Church year
          </p>
          <h2 className="font-sans text-[28px] md:text-[36px] font-bold text-paper tracking-[-0.02em]">
            Her Great Feasts
          </h2>
        </div>
        <Link
          href="/prayers"
          className="font-sans text-[14px] font-medium text-gold hover:text-gold/80 transition-colors"
        >
          Pray the Akathist to the Theotokos →
        </Link>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {feasts.map((f) => {
          const inner = (
            <>
              <span className="font-serif text-[18px] text-paper leading-tight">
                {f.name}
              </span>
              <span className="shrink-0 font-sans text-[12px] font-semibold uppercase tracking-[1.2px] text-gold/85">
                {f.date}
              </span>
            </>
          );
          const cls =
            "flex items-center justify-between gap-4 rounded-lg border border-paper/10 bg-night p-5";
          return (
            <li key={f.name}>
              {f.href ? (
                <Link
                  href={f.href}
                  className={cls + " hover:border-gold/40 hover:-translate-y-0.5 transition-all duration-200"}
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
