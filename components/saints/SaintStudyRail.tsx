import Link from "next/link";
import type { Saint } from "@/lib/saints/saints";
import { T } from "@/components/i18n/T";

/**
 * Desktop-only companion to a saint's Life: the at-a-glance facts and the
 * great feasts, drawn straight from the saint record. These also render
 * in-flow on small screens (the hero's fact list and the GreatFeasts
 * section), so the page marks those `lg:hidden` to avoid repetition.
 */
export function SaintStudyRail({ saint }: { saint: Saint }) {
  const facts: { label: string; value: string }[] = [];
  if (saint.born) facts.push({ label: "Born", value: saint.born });
  if (saint.reposed) facts.push({ label: "Reposed", value: saint.reposed });
  if (saint.see) facts.push({ label: "See", value: saint.see });
  if (saint.feastDays?.length)
    facts.push({ label: "Feast", value: saint.feastDays.join(" · ") });

  const greatFeasts = saint.greatFeasts ?? [];

  return (
    <div className="pt-14 space-y-10">
      <section className="rail-section">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/45 mb-4">
          <T k="saints.atAGlance" />
        </p>
        <dl className="space-y-4">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/45">
                {f.label}
              </dt>
              <dd className="mt-1 font-sans text-ui text-paper/90 leading-snug">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {greatFeasts.length > 0 && (
        <section className="rail-section border-t border-paper/8 pt-8">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/45 mb-4">
            <T k="saints.greatFeasts" />
          </p>
          <ul className="space-y-3">
            {greatFeasts.map((feast) => {
              const inner = (
                <>
                  <span className="font-serif text-ui text-paper/90 leading-snug group-hover:text-gold transition-colors">
                    {feast.name}
                  </span>
                  <span className="block font-sans text-caption text-paper/50 mt-0.5">
                    {feast.date}
                  </span>
                </>
              );
              return (
                <li key={feast.name}>
                  {feast.href ? (
                    <Link href={feast.href} className="group block">
                      {inner}
                    </Link>
                  ) : (
                    <div className="group">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
