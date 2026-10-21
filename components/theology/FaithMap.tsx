import Link from "next/link";

import { T } from "@/components/i18n/T";

import { COUNCILS } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";
import { THEOLOGY_SUBJECTS } from "@/lib/theology/subjects";
import { getTopicMeta } from "@/lib/theology/topics";
import { loadAllTopics } from "@/lib/topics/topics";

/**
 * The faith, by subject (1.8, lib/theology/subjects.ts): one row per subject
 * in the order of the Creed, its icon beside it, and under it everything the
 * app holds on it, the question, the studies, the errors and the councils.
 * Server-drawn: every label comes from its registry as the page builds.
 */
export async function FaithMap({ className }: { className?: string }) {
  const topics = await loadAllTopics();
  const topicTitle = (slug: string) => topics.find((t) => t.slug === slug)?.title;

  return (
    <section className={className} aria-labelledby="faith-map-title">
      <h2 id="faith-map-title" className="font-serif text-title-sm font-semibold text-paper">
        <T k="study.theology.byFaith" />
      </h2>
      <p className="mt-1.5 max-w-[60ch] font-sans text-detail text-paper/55">
        <T k="study.theology.byFaithLead" />
      </p>

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {THEOLOGY_SUBJECTS.map((s) => {
          const links = [
            ...s.topics.map((slug) => ({ href: `/topics/${slug}`, label: topicTitle(slug), kind: "Question" })),
            ...s.studies.map((slug) => ({ href: `/theology/${slug}`, label: getTopicMeta(slug)?.title, kind: "Study" })),
            ...s.heresies.map((slug) => ({
              href: `/heresies/${slug}`,
              label: HERESIES.find((h) => h.slug === slug)?.name,
              kind: "Error",
            })),
            ...s.councils.map((slug) => ({
              href: `/councils/${slug}`,
              label: COUNCILS.find((c) => c.slug === slug)?.byname,
              kind: "Council",
            })),
          ]
            .filter((l): l is { href: string; label: string; kind: string } => Boolean(l.label))
            // A question and a study can share a name (The Theotokos): the
            // second says which it is.
            .map((l, i, all) =>
              all.findIndex((x) => x.label === l.label) < i ? { ...l, label: `${l.label} (${l.kind.toLowerCase()})` } : l,
            );

          return (
            <li key={s.id} className="overflow-hidden rounded-xl border border-paper/10 bg-paper/[0.03] p-3">
              <div className="flex gap-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.picture.src}
                  alt={s.picture.alt}
                  title={s.picture.credit}
                  loading="lazy"
                  decoding="async"
                  className="h-24 w-[72px] shrink-0 rounded-lg object-cover object-top md:h-28 md:w-[84px]"
                />
                <div className="min-w-0 flex-1 py-0.5">
                  <h3 className="font-serif text-ui font-semibold leading-snug text-paper">{s.title}</h3>
                  <p className="mt-1 font-sans text-caption leading-relaxed text-paper/60">{s.line}</p>
                </div>
              </div>
              <div>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="tap-press inline-flex min-h-[32px] items-center rounded-full border border-paper/15 px-2.5 font-sans text-caption text-paper/80 transition-colors hover:border-paper/40 hover:text-paper"
                      >
                        <span className="sr-only">{l.kind}: </span>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
