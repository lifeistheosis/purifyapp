import Link from "next/link";
import { listHours } from "@/lib/prayers/hours";

export const metadata = {
  title: "The Hours",
  description:
    "The Liturgical Hours — short prayers that sanctify the day. First, Third, Sixth, Ninth, and Compline.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-20";

export default function HoursPage() {
  const hours = listHours();
  return (
    <section className={`${SECTION} bg-night`}>
      <article className="mx-auto max-w-[960px] w-full">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
          Prayers · the hours
        </p>
        <h1 className="font-sans text-[36px] md:text-[46px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          Standing through the day.
        </h1>
        <p className="mt-6 font-serif text-[17px] text-paper/85 leading-[1.7]">
          The Hours sanctify the daylight at its natural breaks. They are
          short by design — five to eight minutes — and held together by
          three appointed Psalms, a Troparion, and a dismissal. They sit
          beneath Vespers, Matins, and the Divine Liturgy in scale but
          carry the same architecture.
        </p>

        <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hours.map((h) => (
            <li key={h.slug}>
              <Link
                href={`/prayers/hours/${h.slug}`}
                className="group rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.06] transition-colors p-5 h-full flex flex-col"
              >
                <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-gold/85 mb-2">
                  {h.approxHour}:00
                </p>
                <h2 className="font-serif text-[22px] text-paper leading-tight">
                  {h.title}
                </h2>
                {h.subtitle && (
                  <p className="mt-2 font-serif italic text-[13.5px] text-paper/65 leading-[1.55] flex-1">
                    {h.subtitle}
                  </p>
                )}
                <p className="mt-4 font-sans text-[12.5px] text-paper/75 group-hover:text-gold transition-colors">
                  Open →
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-12 font-sans text-[12px] text-paper/40">
          Full Psalm and Troparion text is being typeset into each hour;
          the structural shell is correct today. A content patch will fill
          out the Psalmody and the variable troparia. Help wanted —
          team@purify.app.
        </p>
      </article>
    </section>
  );
}
