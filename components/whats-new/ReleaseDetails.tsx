import type { Entry } from "@/lib/whatsNew/entries";
import { groupByCategory } from "@/lib/whatsNew/updateHierarchy";

/**
 * One collapsed release inside the /whats-new changelog.
 *
 * Lifted out of the page so the admin editor's live preview renders the exact
 * markup a reader gets, rather than an approximation of it. No client hooks,
 * no locale: it is a pure function of the entry.
 *
 * From 1.4 a release's lines can be filed under the Update Hierarchy's six
 * categories, and then they read as short sections, in the hierarchy's order,
 * with only the categories that have lines. Every release written before that
 * is a flat list of strings and renders exactly as it always has.
 */
export function ReleaseDetails({ entry: e }: { entry: Entry }) {
  const { uncategorised, groups } = groupByCategory(e.items);

  return (
    <details className="group/rel rounded-md border border-paper/10 bg-night-soft/40 open:bg-night-soft/70 transition-colors">
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-sans text-body font-bold text-paper tracking-[-0.01em]">
            {e.version}
          </span>
          <span className="font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/50">
            {e.kind}
          </span>
          <span
            aria-hidden
            className="ml-auto text-paper/55 group-open/rel:rotate-180 transition-transform duration-200 text-eyebrow"
          >
            ▾
          </span>
        </div>
        <p className="mt-1.5 font-sans text-detail text-paper/65 leading-[1.55] group-open/rel:text-paper/80 transition-colors">
          {e.blurb}
        </p>
      </summary>

      {uncategorised.length > 0 ? (
        <ul className="px-4 pb-4 pt-1 space-y-2 font-sans text-ui text-paper/85 leading-[1.6] list-disc pl-9 marker:text-paper/30">
          {uncategorised.map((it, i) => (
            <li key={`${i}-${it}`}>{it}</li>
          ))}
        </ul>
      ) : null}

      {groups.map(({ category, items }) => (
        <section key={category.id} className="px-4 pb-4 pt-1">
          <h4 className="font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/55">
            <span aria-hidden className="mr-1.5">
              {category.emoji}
            </span>
            {category.label}
          </h4>
          <ul className="mt-2 space-y-2 font-sans text-ui text-paper/85 leading-[1.6] list-disc pl-5 marker:text-paper/30">
            {items.map((it, i) => (
              <li key={`${i}-${it}`}>{it}</li>
            ))}
          </ul>
        </section>
      ))}
    </details>
  );
}
