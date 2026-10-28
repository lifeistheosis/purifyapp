"use client";

import Link from "next/link";
import { ruleIdForHour } from "@/lib/prayers/ruleForHour";
import { useMounted } from "@/lib/useMounted";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { PrayersHero } from "./PrayersHero";
import { DiptychPreview } from "./DiptychPreview";
import { SoftTile, SoftTileGrid, FeatureBand } from "./SoftTiles";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Lyre } from "@/components/ui/icons/Lyre";
import { Orans } from "@/components/ui/icons/Orans";
import { Hands } from "@/components/ui/icons/Hands";
import { PrayerSearch } from "@/components/prayers/PrayerSearch";
import { PrayNow } from "@/components/prayers/PrayNow";
import { PrayerBookIndex } from "@/components/prayers/PrayerBookIndex";
import { RuleToday } from "@/components/prayers/RuleToday";
import { CARD, CARD_BG, PILL } from "@/components/ui/Graphite";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { cn } from "@/lib/cn";
import { T } from "@/components/i18n/T";

/** The quick ways in, the same five the desktop hero carries. */
const QUICK = [
  { href: "/prayers/morning", k: "prayers.rule.morning.title" },
  { href: "/prayers/evening", k: "prayers.rule.evening.title" },
  { href: "/prayers/hours", k: "prayers.hours" },
  { href: "/prayers/akathists", k: "prayers.akathists" },
  { href: "/prayers/learning", k: "ui.learnToPray" },
] as const;

/** A section's name, as the design sets "All prayers": Lora, no label over it. */
const H2 = "text-lede leading-tight tracking-[-0.005em] text-paper";

/**
 * Prayers on a phone. Redrawn for 1.8 as the owner's merged pick of round 4
 * (2026-10-27, locked): "the Pantocrator and the verse fading in at the top,
 * then your rule as a checklist" (Homebase/boards/purify-master/variants/
 * m04-prayers.png, Merged; round 4 B's picture over C's system).
 *
 *   the head      Christ Pantocrator of Sinai from the top of the screen,
 *                 under the bar, with "Pray without ceasing." on it, both
 *                 fading in (PrayersHero)
 *   your rule     the reader's own rule for today as a checklist, what is
 *                 done and what is next, or the way to make one (RuleToday)
 *   All prayers   the quick ways in, one row that scrolls sideways
 *   Pray now      the prayer to continue, then what fits the hour, the
 *                 season and the fast
 *   the heart     the Jesus Prayer, then the Chants band
 *   Practices     five soft tiles, the last one wide
 *   the book      search, then every rule by category
 *
 * Every door the 1.7 page had is still here, below the rule. What the design
 * took away: the plate the icon stood on (and its credit line), the date over
 * it, the small label over the verse, the hour's line under it, and the small
 * labels that were the sections' names (each is a Lora heading now).
 */
export function PrayersMobile() {
  // The reader's own hour, resolved on the device: a server render bakes the
  // build's hour into the apps' static export.
  const mounted = useMounted();
  const hourPart = mounted ? ruleIdForHour(new Date().getHours()) : "morning";

  return (
    <MobileShell
      header={<MobileHeader titleKey="nav.prayers" />}
      hero={
        <PrayersHero>
          <RuleToday hourPart={hourPart} />
        </PrayersHero>
      }
    >
      {/* All prayers: the quick ways in, one row scrolled sideways and
          bleeding to the screen's edges. A ScrollRail like the shop's rows,
          so the end that has more to show fades into the page. */}
      <section aria-labelledby="prayers-all">
        <h2 id="prayers-all" className={H2}>
          <T k="prayers.allPrayers" />
        </h2>
        <nav aria-labelledby="prayers-all" className="-mx-5 mt-3">
          <ScrollRail as="ul" arrows={false} trackClassName="gap-2 px-5 pb-1">
            {QUICK.map((q) => (
              <li key={q.href}>
                <Link href={q.href} className={cn(PILL, "whitespace-nowrap px-4 text-detail")}>
                  <T k={q.k} />
                </Link>
              </li>
            ))}
          </ScrollRail>
        </nav>
      </section>

      <section className="mt-10">
        <h2 className={H2}>
          <T k="today.prayNow.eyebrow" />
        </h2>
        <div className="mt-3">
          <PrayNow variant="mobile" />
        </div>
      </section>

      {/* The prayer of the heart */}
      <section className="mt-10">
        <h2 className={H2}>
          <T k="prayers.heart.eyebrow" />
        </h2>
        <div className={cn(CARD, "mt-3 p-5 hover:translate-y-0 md:p-5")} style={CARD_BG}>
          <p className="font-heading text-title-sm font-bold leading-[1.4] text-paper">
            <T k="prayers.heart.line1" />
            <br />
            <T k="prayers.heart.line2" />
            <br />
            <T k="prayers.heart.line3" />
          </p>
          <p className="mt-3 font-sans text-detail leading-[1.6] text-paper/65">
            <T k="prayers.heart.note" />
          </p>
          {/* One way on from here: the lesson that teaches the prayer. */}
          <div className="mt-5">
            <Link href="/prayers/learning/jesus-prayer" className={cn(PILL, "px-4 text-detail")}>
              <T k="ui.learnHowToPrayIt" />
            </Link>
          </div>
        </div>
        {/* Chants (1.7): the play band leads to the whole library, the
            Prayer Rope Anthem first among them. The owner, 2026-10-16:
            chants needed an easier way in. */}
        <div className="mt-3">
          <FeatureBand
            href="/chants"
            eyebrow={<T k="chants.door.kicker" />}
            title={<T k="chants.title" />}
            sub={<T k="chants.door.sub" />}
          />
        </div>
      </section>

      {/* Practices: the surfaces with their own screens, as soft tiles. */}
      <section className="mt-10">
        <h2 className={H2}>
          <T k="ui.practices" />
        </h2>
        <SoftTileGrid className="mt-3">
          <SoftTile href="/prayers/today" label={<T k="prayers.tabs.today" />} sub={<T k="prayers.openToday" />} icon={<Calendar size={20} />} tone="a" />
          <SoftTile href="/prayers/hours" label={<T k="ui.theHours" />} sub={<T k="ui.sanctifyTheDay" />} icon={<Lampada size={21} />} tone="b" />
          <SoftTile href="/prayers/akathists" label={<T k="prayers.akathists" />} sub={<T k="ui.hymnsOfPraise" />} icon={<Lyre size={21} />} tone="c" />
          <SoftTile href="/prayers/learning" label={<T k="ui.learnToPray" />} sub={<T k="ui.aBeginnersPath" />} icon={<Orans size={21} />} tone="d" />
          {/* Five tiles in a grid two across: the last takes the whole row
              rather than standing beside an empty slot, as Discover's does. */}
          <SoftTile href="/prayers/personal" label={<T k="prayers.tabs.personal" />} sub={<T k="ui.yourOwnRule" />} icon={<Hands size={21} />} tone="a" wide />
        </SoftTileGrid>
      </section>

      <div className="mt-8">
        <DiptychPreview />
      </div>

      {/* The prayer book: a typed query replaces the index with results. */}
      <section className="mt-10">
        <h2 className={H2}>
          <T k="prayers.bookTitle" />
        </h2>
        <div className="mt-3">
          <PrayerSearch>
            <PrayerBookIndex variant="mobile" />
          </PrayerSearch>
        </div>
      </section>
    </MobileShell>
  );
}
