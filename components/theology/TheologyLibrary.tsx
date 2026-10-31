import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { T } from "@/components/i18n/T";
import { Book } from "@/components/ui/icons/Book";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Cross } from "@/components/ui/icons/Cross";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Shield } from "@/components/ui/icons/Shield";
import { NUMERALS } from "@/lib/councils/page";

/**
 * The library after the path (1.8, round 3 r3-13): the parts of Theology's
 * hub that are the same for every reader, drawn on the server so their words
 * are each registry's and the catalogs', and handed to the hub
 * (components/theology/TheologyHub.tsx), which sets them where the reader's
 * head puts them: after the ninth step under Go deeper, or first, for a
 * practicing reader.
 */

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** The four ways into the study library, each the kind of writing it holds. */
export const WAYS: readonly { key: "doctrine" | "topics" | "heresies" | "apologetics"; label: string; kicker: string; href: string; Icon: Icon }[] = [
  { key: "doctrine", label: "study.doctrine", kicker: "study.theology.kicker.doctrine", href: "/theology/doctrine", Icon: Cross },
  { key: "topics", label: "discover.tile.topics", kicker: "study.theology.kicker.topics", href: "/topics", Icon: Book },
  { key: "heresies", label: "discover.tile.heresies", kicker: "study.theology.kicker.heresies", href: "/heresies", Icon: Scroll },
  { key: "apologetics", label: "discover.tile.apologetics", kicker: "study.theology.kicker.apologetics", href: "/apologetics", Icon: Shield },
];

export type WayCounts = Record<(typeof WAYS)[number]["key"], number>;

/** C's Go deeper: the four ways as rows in one raised tray, each with how many it holds. */
export function WaysRows({ counts }: { counts: WayCounts }) {
  return (
    <ul data-theology-ways="rows" className="theology-tray overflow-hidden rounded-[20px] px-1.5 py-1">
      {WAYS.map((w) => (
        <li key={w.key} className="theology-rule">
          <Link href={w.href} className="theology-row flex min-h-[54px] items-center gap-3 rounded-[14px] px-2 py-2">
            <span className="theology-plate grid size-8 shrink-0 place-items-center rounded-[10px] text-paper/85">
              <w.Icon size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-serif text-[15.5px] font-semibold leading-tight text-paper/92">
                <T k={w.label} />
              </span>
              <span className="mt-0.5 block truncate font-sans text-caption text-paper/52">
                <T k={w.kicker} /> · <span className="tabular-nums">{counts[w.key]}</span>
              </span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-paper/32 rtl:-scale-x-100" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The library first: the four ways as tiles, two by two, their glyphs lit. */
export function WaysTiles({ counts }: { counts: WayCounts }) {
  return (
    <ul data-theology-ways="tiles" className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {WAYS.map((w) => (
        <li key={w.key}>
          <Link href={w.href} className="theology-tile press-card flex h-16 items-center gap-[11px] rounded-[16px] px-3">
            <span className="theology-glyph text-paper">
              <w.Icon size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-serif text-[15.5px] font-bold leading-tight text-paper">
                <T k={w.label} />
              </span>
              <span className="block truncate font-sans text-[11.5px] text-paper/50">
                <T k={w.kicker} /> · <span className="tabular-nums">{counts[w.key]}</span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export type FilmCouncil = {
  slug: string;
  ordinal: number;
  year: number;
  byname: string;
  picture: { src: string; preview?: string; focus: string; credit?: string } | null;
};

/**
 * The Seven Councils by their own pictures (B's "the Seven Councils as a
 * filmstrip of their own pictures"): History's picture of each, its numeral
 * and year, its name; the heading opens the councils.
 */
export function CouncilFilm({ councils }: { councils: FilmCouncil[] }) {
  return (
    <section data-theology-councils="" aria-labelledby="theology-councils" className="mt-6">
      <Link href="/councils" className="tap-press flex items-baseline justify-between gap-3">
        <h3 id="theology-councils" className="font-serif text-[17px] font-bold leading-tight text-paper">
          <T k="study.theology.ecumenicalCouncils" />
        </h3>
        <span className="flex shrink-0 items-center gap-1 font-sans text-[12.5px] tabular-nums text-paper/50">
          {councils.length}
          <ChevronRight size={13} className="rtl:-scale-x-100" />
        </span>
      </Link>
      <ul className="no-scrollbar -mx-5 mt-2.5 flex gap-2.5 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
        {councils.map((c) => (
          <li key={c.slug} className="shrink-0">
            <Link
              href={`/councils/${c.slug}`}
              className="council-film press-card relative block h-[150px] w-[108px] overflow-hidden rounded-[14px] border border-paper/12 bg-night-soft"
            >
              {c.picture?.preview ? (
                <span aria-hidden className="absolute inset-0 scale-110 bg-cover bg-center blur-md" style={{ backgroundImage: `url(${c.picture.preview})` }} />
              ) : null}
              {c.picture ? (
                // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are.
                <img
                  src={c.picture.src}
                  alt=""
                  title={c.picture.credit}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: c.picture.focus }}
                />
              ) : null}
              <span className="absolute inset-x-[9px] bottom-2 z-[1]">
                <span className="block font-serif text-[14.5px] font-bold leading-tight text-paper">
                  {NUMERALS[c.ordinal] ?? ""} · <span className="tabular-nums">{c.year}</span>
                </span>
                <span lang="en" className="mt-0.5 block font-sans text-[10.5px] leading-[1.3] text-paper/72">
                  {c.byname}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
