import Link from "next/link";

import {
  THEOLOGY_GROUP_ORDER,
  THEOLOGY_GROUP_LABEL,
  topicsByGroup,
} from "@/lib/theology/topics";
import { TheologyShell } from "@/components/theology/TheologyShell";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Doctrine",
  description:
    "Long-form patristic studies on the Trinity, Christology, the Theotokos, theosis, ecclesiology, and disputed Scripture, the doctrine traced through the Fathers and the Councils, every citation verbatim and sourced.",
};

export const revalidate = 3600;

// Doctrine, the treatise library. Grouped by doctrinal category, text-first,
// chapter-like. The richest, most formal of the four modes.
export default function DoctrineIndexPage() {
  return (
    <TheologyShell>
      <header>
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-gold/70">
          <T k="study.doctrine" />
        </p>
        <h1 className="mt-3 font-serif text-display-sm md:text-display font-bold leading-[1.08] tracking-[-0.02em] text-paper">
          <T k="study.theology.doctrineLead" />
        </h1>
        <p className="mt-5 font-serif text-body text-paper/80 leading-[1.75] max-w-[62ch]">
          <T k="study.eachStudyLaysOutThe" />
        </p>
      </header>

      <div className="mt-12 md:mt-14 space-y-12">
        {THEOLOGY_GROUP_ORDER.map((group) => {
          const list = topicsByGroup(group);
          if (list.length === 0) return null;
          const label = THEOLOGY_GROUP_LABEL[group];
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
                          href={`/theology/${tp.slug}`}
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
