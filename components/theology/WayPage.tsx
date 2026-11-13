import Link from "next/link";
import type { ReactNode } from "react";

import { T } from "@/components/i18n/T";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";

import { WAYS, type WayCounts } from "./TheologyLibrary";
import { WAY_H2, WAY_TITLE, WAY_TRAY } from "./wayStyle";

export type WayKey = (typeof WAYS)[number]["key"];

/**
 * The page behind one of Theology's four buttons (1.9, build 89 note 2): the
 * frame Doctrine, Topics, Heresies and Apologetics share. The owner,
 * 2026-11-10, of these four: "it still looks like the old version, and it
 * still looks AI like vibe coded slop ... revamp it using our style", and of
 * the four buttons on the hub (components/theology/TheologyLibrary.tsx):
 * "those are the revamped version". So each page is drawn from the hub's own
 * parts (docs/1.9-build/notes/theology-fable.md has the plan).
 *
 *   the head   the button, grown: the same glyph, lit, the same name in
 *              Lora, the same kind and count ("Treatise · 14", read from the
 *              hub's own list, WAYS), then the page's one line. A tap on a
 *              button lands on what was tapped. For the move build 89's note
 *              4 plans (every page switch a transition, a card carrying its
 *              picture into its page) the glyph, the name and the kind are
 *              each one element with a name of its own: data-way-glyph,
 *              data-way-name, data-way-kind.
 *   the body   the way's own form, the page's children: shelves, cards, a
 *              record by century.
 *   the note   what the page keeps to, in small type under a hairline, as
 *              the councils page closes: the paragraph that stood under the
 *              old page's headline, the same words.
 *   the rest   the other three ways as the hub's rows in one raised tray, so
 *              a reader moves between the four without the row of pills the
 *              old page had (CLAUDE.md, "Floating pills only where they
 *              belong").
 *
 * The page's file mounts its own bar over this, the way's name, back to
 * Theology and the search turned to Theology: lib/nav/__tests__/
 * backBar.test.ts looks for a bar in pages and layouts only. The floating
 * search pill of round 3 r3-04 is gone from these four, as it went from the
 * hub in r3-13: the bar's magnifier opens the same search.
 *
 * The parts arrive in reading order after the route's own fade (.cascade,
 * opacity only), and are simply there with Purify's motion off.
 */
export function WayPage({
  way,
  counts,
  lead,
  note,
  children,
}: {
  way: WayKey;
  /** How many each way holds (lib/theology/wayCounts.ts), as the hub's buttons say. */
  counts: WayCounts;
  /** The catalog key of the page's one line. */
  lead: string;
  /** What the page keeps to: its closing note. */
  note: ReactNode;
  children: ReactNode;
}) {
  const own = WAYS.find((w) => w.key === way) ?? WAYS[0];
  return (
    <section data-way-page={way} className="bg-night px-5 pb-10 pt-6 md:px-8 md:py-14">
      <div className="cascade cascade-tight mx-auto w-full max-w-[640px]">
        {/* On a computer, the way back up to Theology; a phone has the bar's. */}
        <p className="mb-5 hidden font-sans text-detail font-semibold text-paper/55 md:block native-md-hidden">
          <Link href="/theology" className="hover:text-paper">
            <T k="nav.discoverMenu.theology" />
          </Link>
        </p>

        <header data-way-head="">
          <div className="flex items-center gap-3.5">
            <span aria-hidden data-way-glyph="" data-carry-into={`way:${way}`} className="theology-glyph shrink-0 text-paper">
              <own.Icon size={32} />
            </span>
            <div className="min-w-0">
              <h1 id={WAY_TITLE} data-way-name="" className="font-serif text-title font-bold leading-[1.1] tracking-[-0.01em] text-paper">
                <T k={own.label} />
              </h1>
              <p data-way-kind="" className="mt-1 font-sans text-detail text-paper/55">
                <T k={own.kicker} /> · <span className="tabular-nums">{counts[way]}</span>
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-[58ch] font-serif text-[15px] italic leading-[1.5] text-paper/70">
            <T k={lead} />
          </p>
        </header>

        {children}

        <div data-way-note="" className="mt-10 space-y-3 border-t border-paper/8 pt-5 font-sans text-detail leading-[1.6] text-paper/55">
          {note}
        </div>

        <section data-way-rest="" aria-labelledby="way-rest" className="mt-9">
          <h2 id="way-rest" className={WAY_H2}>
            <T k="study.theology.studyLibrary" />
          </h2>
          <ul className={`${WAY_TRAY} mt-2.5`}>
            {WAYS.filter((w) => w.key !== way).map((w) => (
              <li key={w.key} className="theology-rule">
                <Link href={w.href} className="theology-row flex min-h-[60px] items-center gap-3 rounded-[14px] px-2.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-[17px] font-semibold leading-[1.3] text-paper">
                      <T k={w.label} />
                    </span>
                    <span className="mt-0.5 block truncate font-sans text-detail text-paper/65">
                      <T k={w.kicker} /> · <span className="tabular-nums">{counts[w.key]}</span>
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-paper/55 rtl:-scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
