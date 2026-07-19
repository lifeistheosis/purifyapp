import Link from "next/link";

import {
  APOLOGETICS_GROUP_ORDER,
  APOLOGETICS_GROUP_LABEL,
  apologeticsByGroup,
} from "@/lib/apologetics/topics";
import { TheologyShell } from "@/components/theology/TheologyShell";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Apologetics",
  description:
    "A reasoned Orthodox defense of the faith: the existence of God against atheism and deism, and the place of Scripture, Tradition, and the Church against sola scriptura.",
};

export const revalidate = 3600;

// Apologetics, the argument-driven mode. Grouped by the objection it answers,
// each entry framed as a question taken up and replied to, with a clear path
// to the deeper Doctrine study.
export default function ApologeticsIndexPage() {
  return (
    <TheologyShell>
      <header>
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-gold/70">
          <T k="study.apologetics.title" />
        </p>
        <h1 className="mt-3 font-serif text-display-sm md:text-display font-bold leading-[1.08] tracking-[-0.02em] text-paper">
          <T k="study.apologetics.lead" />
        </h1>
        <p className="mt-5 font-serif text-body text-paper/80 leading-[1.75] max-w-[64ch]">
          <T k="study.whereDoctrineAndTopicsArgue" />
        </p>
      </header>

      <div className="mt-12 space-y-12">
        {APOLOGETICS_GROUP_ORDER.map((group) => {
          const list = apologeticsByGroup(group);
          if (list.length === 0) return null;
          const label = APOLOGETICS_GROUP_LABEL[group];
          return (
            <section key={group}>
              <div className="border-b border-paper/10 pb-3">
                <h2 className="font-serif text-title-sm text-paper leading-tight">
                  {label.en}
                </h2>
                <p className="mt-1 font-serif italic text-detail text-paper/55 leading-[1.6]">
                  {label.subtitle}
                </p>
              </div>

              <ul className="mt-5 divide-y divide-paper/[0.07]">
                {list.map((tp) => {
                  const inner = (
                    <>
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="font-serif text-lede font-semibold text-paper leading-tight">
                          {tp.title}
                        </p>
                        {tp.planned ? (
                          <span className="shrink-0 font-sans text-caption uppercase tracking-[1.2px] text-paper/40">
                            <T k="study.planned" />
                          </span>
                        ) : tp.estimatedMinutes ? (
                          <span className="shrink-0 font-sans text-caption text-paper/40 tabular-nums">
                            ~{tp.estimatedMinutes} <T k="study.min" />
                          </span>
                        ) : null}
                      </div>
                      {tp.subtitle ? (
                        <p className="mt-1 font-serif italic text-detail text-paper/55 leading-[1.5]">
                          {tp.subtitle}
                        </p>
                      ) : null}
                      <p className="mt-2.5 font-serif text-ui text-paper/72 leading-[1.7] line-clamp-3">
                        {tp.summary}
                      </p>
                    </>
                  );
                  return (
                    <li key={tp.slug}>
                      {tp.planned ? (
                        <div className="block py-5 opacity-60">{inner}</div>
                      ) : (
                        <Link
                          href={`/apologetics/${tp.slug}`}
                          className="block py-5 transition-colors hover:bg-paper/[0.02]"
                        >
                          {inner}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </TheologyShell>
  );
}
