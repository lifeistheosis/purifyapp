// Visible citations, the release gate made visible. Every published event
// renders its sources in full; facts and citations are always free.

import type { SourceCitation } from "@/lib/history/load";
import { T } from "@/components/i18n/T";

export function EventSources({ sources }: { sources: SourceCitation[] }) {
  if (!sources.length) return null;
  const primary = sources.filter((s) => s.kind === "primary");
  const secondary = sources.filter((s) => s.kind === "secondary");
  return (
    // aria-labelledby, not aria-label: an unnamed <section> is not exposed
    // as a landmark at all, so the citations were unreachable by landmark
    // navigation. Naming it from its own heading keeps the name translated
    // rather than pinning an English string into the markup.
    <section
      aria-labelledby="event-sources-heading"
      className="mt-14 border-t border-paper/10 pt-8"
    >
      <h2
        id="event-sources-heading"
        className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55"
      >
        <T k="study.history.sources" />
      </h2>
      {primary.length > 0 ? (
        <SourceGroup label={<T k="study.history.primarySources" />} sources={primary} />
      ) : null}
      {secondary.length > 0 ? (
        <SourceGroup label={<T k="study.history.furtherReading" />} sources={secondary} />
      ) : null}
    </section>
  );
}

function SourceGroup({
  label,
  sources,
}: {
  label: React.ReactNode;
  sources: SourceCitation[];
}) {
  return (
    <div className="mt-6">
      <p className="font-sans text-caption uppercase tracking-[1.4px] text-paper/55">{label}</p>
      <ul className="mt-3 space-y-4">
        {sources.map((s, i) => (
          <li key={i}>
            <p className="font-serif text-ui text-paper/80 leading-[1.6]">
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-paper/25 underline-offset-4 hover:text-paper hover:decoration-paper/50"
                >
                  {s.label}
                </a>
              ) : (
                s.label
              )}
            </p>
            {s.note ? (
              <p className="mt-1 font-sans text-detail text-paper/60 leading-[1.55]">{s.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
