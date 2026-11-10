import Link from "next/link";

import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { WayPage } from "@/components/theology/WayPage";
import { WAY_FACT, WAY_H2, WAY_TITLE, WAY_TRAY } from "@/components/theology/wayStyle";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Scroll } from "@/components/ui/icons/Scroll";
import { HERESIES } from "@/lib/heresies/heresies";
import { wayCounts } from "@/lib/theology/wayCounts";

export const metadata = {
  title: "Heresies",
  description:
    "Every error a council of the Orthodox Church condemned by name, each defined in plain English, with the council's own words against it, the orthodox teaching it denied, and the Fathers who refuted it.",
};

export const revalidate = 3600;

/**
 * Heresies, the record (1.9, build 89 note 2: the page behind the third of
 * Theology's four buttons, revamped in the house style;
 * docs/1.9-build/notes/theology-fable.md has the plan).
 *
 * The page's own bar, then the frame the four ways share
 * (components/theology/WayPage.tsx), and in it the centuries in order, each
 * a raised tray of the errors that arose in it (the registry is in that
 * order, lib/heresies/heresies.ts): the scroll on its plate, as an error
 * wears it on the path (components/theology/PathRead.tsx), the error's name,
 * and the registry's own one line on it, which says what it claimed and, for
 * most, which council named it. Who taught it, its other names and the
 * council's own words are on its own page, whose head the row's scroll
 * travels to (data-carry; components/theology/LeafPage.tsx).
 *
 * Until 1.9 each error was four lines of text under a hairline, with no
 * surface and no mark.
 */
export default async function HeresiesIndexPage() {
  const counts = await wayCounts();
  // By the century each arose in, in the registry's order.
  const centuries: { era: string; errors: typeof HERESIES }[] = [];
  for (const h of HERESIES) {
    const last = centuries.find((c) => c.era === h.era);
    if (last) last.errors.push(h);
    else centuries.push({ era: h.era, errors: [h] });
  }

  return (
    <>
      <MobileTopBar titleKey="discover.tile.heresies" back backFallback="/theology" revealTitleOn={WAY_TITLE} searchPlace="theology" />
      <WayPage
        way="heresies"
        counts={counts}
        lead="study.heresies.lead"
        note={
          <>
            <p>
              <T k="study.everyEcumenicalCouncilIsDefined" />
            </p>
            <p>
              <T k="saints.see" />{" "}
              <Link href="/councils" className="underline decoration-paper/30 underline-offset-4 hover:text-paper">
                <T k="study.heresies.theCouncilsLink" />
              </Link>{" "}
              <T k="study.forTheDoctrineEachError" />
            </p>
          </>
        }
      >
        {centuries.map(({ era, errors }, at) => (
          <section key={era} data-century={era} aria-labelledby={`century-${at}`} className={at === 0 ? "mt-7" : "mt-8"}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`century-${at}`} lang="en" dir="ltr" className={WAY_H2}>
                {era}
              </h2>
              <span className={WAY_FACT}>{errors.length}</span>
            </div>
            <ul className={`${WAY_TRAY} mt-2.5`}>
              {errors.map((h) => (
                <li key={h.slug} className="theology-rule">
                  <Link href={`/heresies/${h.slug}`} className="theology-row flex min-h-[56px] items-start gap-3 rounded-[14px] px-2 py-2.5">
                    <span aria-hidden data-carry={`heresy:${h.slug}`} className="theology-plate mt-px grid size-8 shrink-0 place-items-center rounded-[10px] text-paper/85">
                      <Scroll size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span lang="en" dir="ltr" className="block font-serif text-[15.5px] font-semibold leading-[1.26] text-paper/92">
                        {h.name}
                      </span>
                      <span lang="en" dir="ltr" className="mt-[3px] block font-sans text-detail leading-[1.45] text-paper/60">
                        {h.shortBio}
                      </span>
                    </span>
                    <ChevronRight size={14} className="mt-[9px] shrink-0 text-paper/45 rtl:-scale-x-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </WayPage>
    </>
  );
}
