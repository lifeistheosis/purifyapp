// Visible citations — the release gate made visible. Every published event
// renders its sources in full; facts and citations are always free.

import type { SourceCitation } from "@/lib/history/load";

export function EventSources({ sources }: { sources: SourceCitation[] }) {
  if (!sources.length) return null;
  const primary = sources.filter((s) => s.kind === "primary");
  const secondary = sources.filter((s) => s.kind === "secondary");
  return (
    <section className="mt-14 border-t border-paper/10 pt-8" aria-label="Sources">
      <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/45">
        Sources
      </h2>
      {primary.length > 0 ? (
        <SourceGroup label="Primary sources" sources={primary} />
      ) : null}
      {secondary.length > 0 ? (
        <SourceGroup label="Further reading" sources={secondary} />
      ) : null}
    </section>
  );
}

function SourceGroup({
  label,
  sources,
}: {
  label: string;
  sources: SourceCitation[];
}) {
  return (
    <div className="mt-6">
      <p className="font-sans text-caption uppercase tracking-[1.4px] text-paper/40">{label}</p>
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
              <p className="mt-1 font-sans text-detail text-paper/50 leading-[1.55]">{s.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
