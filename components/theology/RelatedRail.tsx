// The cross-section "Related study" block shown at the foot of every article.
// It is what makes the four modes one system: a doctrine article points to the
// controversies, councils, Fathers, and outward defenses around it; an
// apologetics response points back to the deeper doctrine instead of repeating
// it. Driven by the resolved relations from lib/theology/relations.
//
// 1.8, round 3 (r3-04): rows, not a cloud of pills. The owner's note 21 of
// build 80 made it a rule everywhere: "we should stop doing that". Each kind
// is named once, in the reader's language, over its rows.

import Link from "next/link";

import { T } from "@/components/i18n/T";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { hasAnyRelated, type RelatedGroups } from "@/lib/theology/relations";

const GROUP_LABEL: Record<keyof RelatedGroups, string> = {
  doctrine: "study.doctrine",
  apologetics: "discover.tile.apologetics",
  heresies: "discover.tile.heresies",
  topics: "discover.tile.topics",
  councils: "nav.councils",
  saints: "footer.theFathers",
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
  title = <T k="study.related" />,
  bare = false,
}: {
  groups: RelatedGroups;
  title?: React.ReactNode;
  /** Inside a part already named Related (a doctrine's Related door): the rows alone, with no rule or title over them. */
  bare?: boolean;
}) {
  if (!hasAnyRelated(groups)) return null;

  return (
    <aside className={bare ? "mt-8" : "mt-14 border-t border-paper/10 pt-8"}>
      {bare ? null : (
        <p className="font-sans text-caption font-semibold text-paper/45">
          {title}
        </p>
      )}
      <div className={bare ? "space-y-5" : "mt-5 space-y-5"}>
        {ORDER.map((g) => {
          const links = groups[g];
          if (!links.length) return null;
          return (
            <div key={g}>
              <p className="flex items-baseline justify-between px-1 font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-paper/50">
                <T k={GROUP_LABEL[g]} />
                <span className="text-[11.5px] font-semibold normal-case tracking-normal tabular-nums text-paper/40">{links.length}</span>
              </p>
              <ul className="theology-tray mt-2 overflow-hidden rounded-[18px] py-1">
                {links.map((l) => (
                  <li key={l.href} className="theology-rule">
                    <Link
                      href={l.href}
                      className="theology-row mx-1.5 flex min-h-[44px] items-center gap-3 rounded-[14px] px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 font-serif text-[15px] font-semibold leading-[1.25] text-paper/92">{l.label}</span>
                      <ChevronRight size={14} className="shrink-0 text-paper/32 rtl:-scale-x-100" />
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
