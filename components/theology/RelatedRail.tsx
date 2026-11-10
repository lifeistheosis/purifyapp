// The cross-section "Related study" block shown at the foot of every article.
// It is what makes the four modes one system: a doctrine article points to the
// controversies, councils, Fathers, and outward defenses around it; an
// apologetics response points back to the deeper doctrine instead of repeating
// it. Driven by the resolved relations from lib/theology/relations.
//
// 1.8, round 3 (r3-04): rows, not a cloud of pills. The owner's note 21 of
// build 80 made it a rule everywhere: "we should stop doing that". Each kind
// is named once, in the reader's language, over its rows.
//
// 1.9: at the foot of a topic, a heresy and an answer (components/theology/
// LeafPage.tsx) it is one part named in Lora over one raised tray, each row
// with its mark and its kind under its name, as the hub's own rows are
// drawn: a way's glyph on its plate, a council's picture, a Father's face.
// A doctrine's page keeps the rows it was approved with (`bare`).

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { T } from "@/components/i18n/T";
import { Book } from "@/components/ui/icons/Book";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Cross } from "@/components/ui/icons/Cross";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Shield } from "@/components/ui/icons/Shield";
import { getSaint } from "@/lib/saints/saints";
import { hasAnyRelated, type RelatedGroups, type RelatedLink } from "@/lib/theology/relations";

import { CouncilMark } from "./CouncilMark";
import { FatherFace } from "./FatherFace";
import { LeafPart } from "./LeafPage";
import { WAY_TRAY } from "./wayStyle";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

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

/** Each of the four ways by the glyph its button wears (components/theology/TheologyLibrary.tsx, WAYS). */
const WAY_GLYPH: Partial<Record<keyof RelatedGroups, Icon>> = {
  doctrine: Cross,
  apologetics: Shield,
  heresies: Scroll,
  topics: Book,
};

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

  if (!bare) {
    const rows = ORDER.flatMap((g) => groups[g].map((link) => ({ g, link })));
    return (
      <LeafPart id="related-title" title={title} count={rows.length} data-related="">
        <ul className={`${WAY_TRAY} mt-2.5`}>
          {rows.map(({ g, link }) => (
            <li key={link.href} className="theology-rule">
              <Link href={link.href} className="theology-row flex min-h-[54px] items-center gap-3 rounded-[14px] px-2 py-2">
                <RelatedMark group={g} link={link} />
                <span className="min-w-0 flex-1">
                  <span lang="en" dir="ltr" className="block font-serif text-[15.5px] font-semibold leading-[1.26] text-paper/92 rtl:text-right">
                    {link.label}
                  </span>
                  <span className="mt-0.5 block font-sans text-caption text-paper/55">
                    <T k={GROUP_LABEL[g]} />
                  </span>
                </span>
                <ChevronRight size={14} className="shrink-0 text-paper/45 rtl:-scale-x-100" />
              </Link>
            </li>
          ))}
        </ul>
      </LeafPart>
    );
  }

  return (
    <aside className="mt-8">
      <div className="space-y-5">
        {ORDER.map((g) => {
          const links = groups[g];
          if (!links.length) return null;
          return (
            <div key={g}>
              <p className="flex items-baseline justify-between px-1 font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-paper/50">
                <T k={GROUP_LABEL[g]} />
                {/* At the label's own share: /40 read 2.31:1 on Light and under 4.5:1 on all five palettes (checkMock, 2026-11-10). */}
                <span className="text-[11.5px] font-semibold normal-case tracking-normal tabular-nums text-paper/50">{links.length}</span>
              </p>
              <ul className="theology-tray mt-2 overflow-hidden rounded-[18px] py-1">
                {links.map((l) => (
                  <li key={l.href} className="theology-rule">
                    <Link
                      href={l.href}
                      className="theology-row mx-1.5 flex min-h-[44px] items-center gap-3 rounded-[14px] px-3 py-2"
                    >
                      {/* A related saint's, council's or study's name is English (build 90 note 4). */}
                      <span lang="en" dir="ltr" className="min-w-0 flex-1 font-serif text-[15px] font-semibold leading-[1.25] text-paper/92 rtl:text-right">
                        {l.label}
                      </span>
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

/** What a related row wears at its start: pictures lead, and a glyph on a plate where there is none. */
function RelatedMark({ group, link }: { group: keyof RelatedGroups; link: RelatedLink }) {
  if (group === "saints") {
    return <FatherFace father={{ slug: link.slug, name: link.label, iconUrl: getSaint(link.slug)?.iconUrl }} size={34} />;
  }
  if (group === "councils") return <CouncilMark slug={link.slug} />;
  const Glyph = WAY_GLYPH[group] ?? Book;
  return (
    <span aria-hidden className="theology-plate grid size-[34px] shrink-0 place-items-center rounded-[10px] text-paper/85">
      <Glyph size={17} />
    </span>
  );
}
