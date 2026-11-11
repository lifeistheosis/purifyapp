"use client";

import Link from "next/link";
import { currentHourSlug } from "@/lib/prayers/hourNow";
import { tileCrop } from "@/lib/prayers/iconCrops";
import { ruleIdForHour } from "@/lib/prayers/ruleForHour";
import { openingPart } from "@/lib/prayers/myRule";
import { ruleCarry, ruleTileArt, serviceArt } from "@/lib/prayers/serviceArt";
import { useMyRule } from "@/lib/prayers/useMyRule";
import { useMounted } from "@/lib/useMounted";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { PrayersHero } from "./PrayersHero";
import { PictureTile, SoftTileGrid, FeatureBand } from "./SoftTiles";
import { PrayNow } from "@/components/prayers/PrayNow";
import { PrayerBookContents } from "@/components/prayers/PrayerBookContents";
import { PrayerPieces } from "@/components/prayers/PrayerPieces";
import { RuleToday } from "@/components/prayers/RuleToday";
import { CARD, CARD_BG, PILL } from "@/components/ui/Graphite";
import { cn } from "@/lib/cn";
import { T } from "@/components/i18n/T";

/** The quick ways in, the same five the desktop hero carries. */
/** A section's name, as the design sets "All prayers": Lora, no label over it. */
const H2 = "text-lede leading-tight tracking-[-0.005em] text-paper";

/** The icons Practices wear, the ones the app pairs with each (lib/prayers/serviceArt.ts). */
const AKATHISTS = serviceArt("akathist-theotokos");
const LEARNING = serviceArt("learning");

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
 *   Practices     four tiles in their icons, two across, the Hours lit
 *   the book      one prayer book, its chapters opening one at a time
 *
 * Practices and the book are the owner's pick of r3-26 for this part (note
 * 72, 2026-10-31): "A, the icon tiles. C, one prayer book." (Homebase/
 * boards/purify-master/variants/r3-26-prayers-practices). What that took
 * away: Today's tile (its door is a row of the daily rule now), the prayer
 * book's own search field (the bar's magnifier opens on Prayers, the one
 * search; the computer's /prayers keeps its field), and the names strip
 * under Practices (Your rule's tile names them: "Your own prayers, and the
 * names you carry"). Personal is Your rule, as on the You tab.
 *
 * Every other door the 1.7 page had is still here, below the rule. What the
 * round 4 design took away: the plate the icon stood on (and its credit
 * line), the date over it, the small label over the verse, the hour's line
 * under it, and the small labels that were the sections' names (each is a
 * Lora heading now).
 */
export function PrayersMobile() {
  // The reader's own hour, resolved on the device: a server render bakes the
  // build's hour into the apps' static export. Until the page wakes, no Hour
  // is lit and the Hours wear no icon yet.
  const mounted = useMounted();
  const hour = mounted ? new Date().getHours() : null;
  const hourPart = hour === null ? "morning" : ruleIdForHour(hour);
  const hourNow = hour === null ? null : currentHourSlug(hour);
  const hourArt = hourNow ? serviceArt(hourNow) : null;
  // Your rule's tile wears the half its page will open on, chosen by the page's own rule (lib/prayers/myRule.ts,
  // openingPart), so the tile's picture is the one at the page's head and travels into it (1.9). The rule and the hour
  // are the device's: until the page wakes the tile wears no icon yet, as the Hours' does not.
  const myRule = useMyRule();
  const rulePart = hour === null ? null : openingPart(myRule, hourPart);
  const ruleArt = rulePart ? ruleTileArt(rulePart) : null;

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
          bleeding to the screen's edges, each a small piece with its icon
          (components/prayers/PrayerPieces.tsx), in a ScrollRail like the
          shop's rows, so the end that has more to show fades into the page. */}
      <section aria-labelledby="prayers-all">
        <h2 id="prayers-all" className={H2}>
          <T k="prayers.allPrayers" />
        </h2>
        <nav aria-labelledby="prayers-all" className="-mx-5 mt-3">
          {/* Small pieces, not pills (1.9, build 89 note 10). */}
          <PrayerPieces hourNow={hourNow} />
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

      {/* Practices: the four with a screen of their own, each in the icon
          the app pairs with it (lib/prayers/serviceArt.ts), two across as
          Discover's tiles were (r3-26 A). The Hours wear the icon of the
          Hour the clock is in, lit and named once the page knows the hour.
          On a tablet in the apps, four across, each the size it is on a
          phone, so no icon is drawn past its own pixels. */}
      <section data-practices="" aria-labelledby="prayers-practices" className="mt-10">
        <h2 id="prayers-practices" className={H2}>
          <T k="ui.practices" />
        </h2>
        <SoftTileGrid className="mt-3 md:grid-cols-4">
          <PictureTile
            href="/prayers/hours"
            heading="h3"
            label={<T k="ui.theHours" />}
            sub={
              hourNow ? (
                <>
                  <span aria-hidden className="tile-dot" />
                  <T k="prayers.timeline.now" /> · <T k={`prayers.rule.${hourNow}.title`} />
                </>
              ) : (
                <T k="ui.sanctifyTheDay" />
              )
            }
            picture={hourArt?.src ?? null}
            crop={hourArt ? tileCrop(hourArt.slug) : undefined}
            lit={hourNow !== null}
          />
          <PictureTile
            href="/prayers/akathists"
            heading="h3"
            label={<T k="prayers.akathists" />}
            sub={<T k="ui.hymnsOfPraise" />}
            picture={AKATHISTS.src}
            crop={tileCrop(AKATHISTS.slug)}
          />
          <PictureTile
            href="/prayers/learning"
            heading="h3"
            label={<T k="ui.learnToPray" />}
            sub={<T k="ui.aBeginnersPath" />}
            picture={LEARNING.src}
            crop={tileCrop(LEARNING.slug)}
          />
          {/* Personal is Your rule, its name on the You tab and on its own
              page, with the You tab's line. */}
          <PictureTile
            href="/prayers/personal"
            heading="h3"
            label={<T k="prayers.mine.title" />}
            sub={<T k="prayers.mine.youHint" />}
            picture={ruleArt?.src ?? null}
            crop={ruleArt ? tileCrop(ruleArt.slug) : undefined}
            carry={rulePart ? ruleCarry(rulePart) : undefined}
          />
        </SoftTileGrid>
      </section>

      {/* The prayer book: one book, its chapters I to IV opening one at a
          time (r3-26 C). No field of its own: the bar's magnifier opens the
          one search on Prayers. */}
      <section aria-labelledby="prayers-book" className="mt-10">
        <h2 id="prayers-book" className={H2}>
          <T k="prayers.bookTitle" />
        </h2>
        <div className="mt-3">
          <PrayerBookContents hourNow={hourNow} />
        </div>
      </section>
    </MobileShell>
  );
}
