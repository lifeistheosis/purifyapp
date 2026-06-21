// The cross-section "Related study" block shown at the foot of every article.
// It is what makes the four modes one system: a doctrine article points to the
// controversies, councils, Fathers, and outward defenses around it; an
// apologetics response points back to the deeper doctrine instead of repeating
// it. Driven by the resolved relations from lib/theology/relations.

import Link from "next/link";

import { hasAnyRelated, type RelatedGroups } from "@/lib/theology/relations";

const GROUP_LABEL: Record<keyof RelatedGroups, string> = {
  doctrine: "Doctrine",
  apologetics: "Apologetics",
  heresies: "Heresies",
  topics: "Topics",
  councils: "Councils",
  saints: "Fathers & Saints",
};

const ORDER: (keyof RelatedGroups)[] = [
  "doctrine",
  "apologetics",
  "heresies",
  "topics",
  "councils",
  "saints",
];

export function RelatedRail({
  groups,
  title = "Related study",
}: {
  groups: RelatedGroups;
  title?: string;
}) {
  if (!hasAnyRelated(groups)) return null;

  return (
    <aside className="mt-14 border-t border-paper/10 pt-8">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/45">
        {title}
      </p>
      <div className="mt-5 space-y-5">
        {ORDER.map((g) => {
          const links = groups[g];
          if (!links.length) return null;
          return (
            <div key={g}>
              <p className="font-sans text-caption uppercase tracking-[1.4px] text-paper/40">
                {GROUP_LABEL[g]}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="inline-flex rounded-full border border-paper/12 bg-paper/[0.03] px-3 py-1 font-sans text-detail text-paper/80 hover:border-gold/40 hover:text-paper transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
