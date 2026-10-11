import { MobileShell } from "./MobileShell";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { SectionMasthead } from "./SectionMasthead";
import { FeatureBand, SoftTile, SoftTileGrid, type Tone } from "./SoftTiles";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { type DiscoverEntry } from "./DiscoverIndex";
import { OrnamentHeadpiece } from "@/components/calendar/OrnamentHeadpiece";
import { Church } from "@/components/ui/icons/Church";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Compass } from "@/components/ui/icons/Compass";
import { Cross } from "@/components/ui/icons/Cross";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Gear } from "@/components/ui/icons/tab/Gear";
import { Wheat } from "@/components/ui/icons/Wheat";
import { DISCOVER_CLOSING, isClosingRow } from "@/lib/discover/grid";
import { trapezaEnabled } from "@/lib/trapeza/flags";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { T } from "@/components/i18n/T";

// Tone cycle for the library tile grid: graded neutrals, no colour.
const LIBRARY_TONES: Tone[] = ["a", "b", "c", "d"];

// The Find a parish glyph. Church is already the Councils tile in the same
// grid, so the parish tile takes the compass: it is about finding a place.
// Compass was cut for the tab bar at a 2.2 stroke, which reads as bold beside
// the library glyphs at 1.6, so it is thinned here to sit with them.
//
// Not yet seen on a phone beside the Settings gear, which closes the grid in
// the row under it and whose own file says its four teeth read close to a
// compass. If the two rows look alike there, change this glyph and leave the
// gear: readers already know the gear from the tab it used to be.
function ParishCompass(props: React.ComponentProps<typeof Compass>) {
  return <Compass {...props} strokeWidth={1.6} />;
}

/**
 * Discover mobile shell: "the menologion."
 *
 *   1. Masthead: ornament headpiece + "THE WHOLE LIBRARY" / "Discover." /
 *      subtitle, matching the desktop Discover page.
 *   2. Deep-slate hero with the saint icon + DayBadge as `aside`.
 *   3. The library: a menologion list of every library destination
 *      (saints, councils, calendar, topics, daily readings, psalter,
 *      patristic), then Find a parish and Settings. The page's centerpiece.
 *   4. Closing colophon.
 *
 * "Featured today" (a topic card and a council card) used to sit between the
 * library and the colophon and was removed. It cost a loadAllTopics() off
 * disk on every render of this server component to summarise two cards, and
 * the Android export froze the pick at build time anyway, so the "today" in
 * its name was not true in the app.
 *
 * The Settings tile is the retired You tab. The bar was seven tabs at ~58px a
 * cell; the account moved here rather than off the map. It keeps tab/Gear so
 * readers meet the glyph they already knew, and MobileTabBar's Discover
 * predicate claims /account, /saved and /settings so this tab still lights
 * while the reader is in there.
 */
export async function DiscoverMobile() {
  const locale = await getServerLocale();
  const m = getMessages(locale);

  // The library index. Order reads like a menologion table of contents:
  // people first (saints), then the doctrinal record together (the councils,
  // the topics they confessed, the heresies they condemned), then the year,
  // the daily readings, the Psalter, and the patristic commentary that ties
  // it together. Saints + Calendar carry a live blurb; the rest reuse the
  // shared `discover.tile.*` strings.
  const entries: DiscoverEntry[] = [
    {
      // People first, as the ordering note above says. The Saints row was
      // missing from this list even though its strings already shipped.
      label: t(m, "discover.tile.saints"),
      href: "/saints",
      blurb: t(m, "discover.tile.saintsBlurb"),
      Icon: HaloedHead,
    },
    {
      label: t(m, "discover.tile.councils"),
      href: "/councils",
      blurb: t(m, "discover.tile.councilsBlurb"),
      Icon: Church,
    },
    {
      // The one Theology umbrella: Doctrine, Topics, Heresies, and
      // Apologetics now live under its hub and shared mode switcher.
      label: t(m, "discover.tile.theology"),
      href: "/theology",
      blurb: t(m, "discover.tile.theologyBlurb"),
      Icon: Cross,
    },
    {
      label: t(m, "discover.tile.history"),
      href: "/history",
      blurb: t(m, "discover.tile.historyBlurb"),
      Icon: Hourglass,
    },
    // The Kitchen: recipes for every kind of fast day. It had no way in on a
    // phone at all while it was the Trapeza, only the desktop Discover menu.
    ...(trapezaEnabled()
      ? [
          {
            label: t(m, "kitchen.name"),
            href: "/kitchen",
            blurb: t(m, "kitchen.lead"),
            Icon: Wheat,
          },
        ]
      : []),
    {
      label: t(m, "discover.tile.calendar"),
      href: "/calendar",
      // Was an interpolated "<fast>. Pascha in N days." built from a
      // server-computed date. SoftTile does not render `blurb` at all, so
      // it was dead string-building over a date that the Android export
      // froze at build time. The static blurb matches its siblings.
      blurb: t(m, "discover.tile.calendarBlurb"),
      Icon: Calendar,
    },
    {
      // Find a parish (1.6): the jurisdictions' own parish directories, as
      // links out. A quiet row under the library and not a band above it: it
      // is a door for the reader with no parish yet, not the surface's
      // headline. After the calendar, so the library still reads as one
      // sequence, and before Settings, which stays last. One of the two
      // closing entries (DISCOVER_CLOSING in lib/discover/grid.ts, which
      // counts from the end of this list), so its blurb is read whenever it
      // is drawn as a row.
      label: t(m, "discover.tile.parishes"),
      href: "/parishes",
      blurb: t(m, "discover.tile.parishesBlurb"),
      Icon: ParishCompass,
    },
    {
      // The retired You tab. Last in the list on purpose: the tiles above are
      // the library and the way to a parish, and read as one sequence, and
      // the account is not part of it. tab/Gear is the same glyph the tab
      // wore, so this reads as a move rather than a new thing.
      label: t(m, "nav.settings"),
      href: "/account",
      // Read, unlike the library's blurbs: Settings closes the grid as a row
      // (DISCOVER_CLOSING), and a row's second line is its blurb. So it says
      // what is behind the row rather than repeating the label.
      blurb: t(m, "nav.yourAccount"),
      Icon: Gear,
    },
  ];

  return (
    <MobileShell
      header={<MobileHeader titleKey="nav.discover" trailing={<UserAvatarSmall />} />}
    >
      {/* Masthead: the Menologion of Basil II, since this surface is the
          app's menologion. The ornament stays underneath as the rule between
          the plate and the subtitle. */}
      {/* No `title`: MobileHeader above is the surface's h1. The plate
          keeps its eyebrow and its credit. */}
      <SectionMasthead section="discover" eyebrow={t(m, "discover.eyebrow")} />
      <header className="text-center mb-7">
        <OrnamentHeadpiece className="mx-auto mb-4 max-w-[320px]" />
        <p className="font-sans text-ui text-paper/70 max-w-[420px] mx-auto leading-[1.6]">
          {t(m, "discover.subtitle")}
        </p>
      </header>

      {/* History leads, as it does on the desktop page since the 2026-09-26
          redo: the newest wing of the library, one timeline of two thousand
          years. The CTA string carries its own arrow on the desktop card;
          the band draws a chevron, so the arrow comes off here. */}
      <div className="mb-4">
        <FeatureBand
          href="/history"
          eyebrow={t(m, "calendar.styleNew")}
          title={t(m, "discover.tile.history")}
          sub={t(m, "discover.tile.historyBlurb")}
          cta={t(m, "study.exploreTheInteractiveTimeline").replace(/\s*→\s*$/, "")}
          icon={<Hourglass size={22} />}
        />
      </div>

      {/* Reading hub: prominent entry to the new reading room, above the
          commemoration so "sitting down to read" leads the surface. */}
      <MobileCard
        eyebrow={t(m, "reading.eyebrow")}
        title={t(m, "reading.h1").replace(/\.$/, "")}
        href="/reading"
        tint="gold"
      >
        <p className="mt-2 font-serif italic text-ui text-paper/75 leading-[1.5]">
          {t(m, "reading.subtitle")}
        </p>
        <p className="mt-3 font-sans text-detail font-medium text-paper/75">
          {t(m, "reading.enterReadingRoom")} →
        </p>
      </MobileCard>

      <div className="mt-7">
        <MobileSectionLabel><T k="ui.theLibrary" /></MobileSectionLabel>
        <SoftTileGrid className="mt-1">
          {entries.map((e, i) => {
            // The grid is two across. The library's entries are tiles; the
            // closing ones, Find a parish and Settings, each take a whole row
            // and say what is behind them. The rule, and the one case where
            // Find a parish is a tile after all, is in lib/discover/grid.ts.
            const row = isClosingRow(i, entries.length, DISCOVER_CLOSING);
            return (
              <SoftTile
                key={e.href}
                href={e.href}
                label={e.label}
                sub={row ? e.blurb : undefined}
                wide={row}
                icon={<e.Icon size={21} />}
                tone={LIBRARY_TONES[i % LIBRARY_TONES.length]}
              />
            );
          })}
          {/* The marketplace now has its own bottom-bar tab (Beta 1.9), so the
              Discover tile was retired. */}
        </SoftTileGrid>
      </div>

      <p className="mt-10 text-center font-serif italic text-detail text-paper/45 leading-[1.55]">
        <T k="ui.throughThePrayersOfOur" />
        <br />
        <T k="ui.lordJesusChristOurGod" />
      </p>
    </MobileShell>
  );
}
