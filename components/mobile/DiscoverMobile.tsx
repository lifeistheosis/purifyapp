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
import { Orans } from "@/components/ui/icons/Orans";
import { Cart } from "@/components/ui/icons/tab/Cart";
import { ChatBubble } from "@/components/ui/icons/ChatBubble";
import { Wheat } from "@/components/ui/icons/Wheat";
import { DISCOVER_CLOSING, isClosingRow } from "@/lib/discover/grid";
import { trapezaEnabled } from "@/lib/trapeza/flags";
import { shopEnabled } from "@/lib/shop/flags";
import { UnreadDot } from "@/components/community/NotificationsInbox";
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

// The Chat tile's glyph, with Chat's unread dot on it. The dot left the tab
// bar's Chat tab for Discover's tab when Chat became this tile, and a reader
// who follows it here has to be shown which tile it meant. The dot only
// reads what the bar's own badge has already asked for.
function ChatGlyph(props: React.ComponentProps<typeof ChatBubble>) {
  return (
    <span className="relative inline-flex">
      <ChatBubble {...props} />
      <UnreadDot />
    </span>
  );
}

/**
 * Discover mobile shell: "the menologion."
 *
 *   1. Masthead: ornament headpiece + "THE WHOLE LIBRARY" / "Discover." /
 *      subtitle, matching the desktop Discover page.
 *   2. Deep-slate hero with the saint icon + DayBadge as `aside`.
 *   3. The library: a menologion list of every library destination
 *      (saints, councils, calendar, topics, daily readings, psalter,
 *      patristic), then the Shop and Chat, then Start here and Find a
 *      parish. The page's centerpiece.
 *   4. Closing colophon.
 *
 * "Featured today" (a topic card and a council card) used to sit between the
 * library and the colophon and was removed. It cost a loadAllTopics() off
 * disk on every render of this server component to summarise two cards, and
 * the Android export froze the pick at build time anyway, so the "today" in
 * its name was not true in the app.
 *
 * Shop and Chat were tabs until 2026-10-13, when the owner chose a bar of
 * five and You came back to it. They are tiles here now, after the library
 * and before the two closing rows. The Shop keeps the cart its tab wore, so
 * the move reads as a move. MobileTabBar's Discover predicate claims /shop,
 * /community and /campaigns, so this tab stays lit while a reader is in
 * either. The Settings row that stood last here was the You tab in exile,
 * and went back to the bar with it.
 */
export function DiscoverMobile() {
  // Every word on this surface is a <T> island, never a string the server
  // looked up. This component ships into the apps' export, where the server
  // ran once, in English: until 1.6 a phone set to Greek opened Today in
  // Greek and found this tab in English, though every line of it was already
  // translated. lib/i18n/__tests__/serverWords.test.ts keeps it so.

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
      label: <T k="discover.tile.saints" />,
      href: "/saints",
      blurb: <T k="discover.tile.saintsBlurb" />,
      Icon: HaloedHead,
    },
    {
      label: <T k="discover.tile.councils" />,
      href: "/councils",
      blurb: <T k="discover.tile.councilsBlurb" />,
      Icon: Church,
    },
    {
      // The one Theology umbrella: Doctrine, Topics, Heresies, and
      // Apologetics now live under its hub and shared mode switcher.
      label: <T k="discover.tile.theology" />,
      href: "/theology",
      blurb: <T k="discover.tile.theologyBlurb" />,
      Icon: Cross,
    },
    {
      label: <T k="discover.tile.history" />,
      href: "/history",
      blurb: <T k="discover.tile.historyBlurb" />,
      Icon: Hourglass,
    },
    // The Kitchen: recipes for every kind of fast day. It had no way in on a
    // phone at all while it was the Trapeza, only the desktop Discover menu.
    ...(trapezaEnabled()
      ? [
          {
            label: <T k="kitchen.name" />,
            href: "/kitchen",
            blurb: <T k="kitchen.lead" />,
            Icon: Wheat,
          },
        ]
      : []),
    {
      label: <T k="discover.tile.calendar" />,
      href: "/calendar",
      // Was an interpolated "<fast>. Pascha in N days." built from a
      // server-computed date. SoftTile does not render `blurb` at all, so
      // it was dead string-building over a date that the Android export
      // froze at build time. The static blurb matches its siblings.
      blurb: <T k="discover.tile.calendarBlurb" />,
      Icon: Calendar,
    },
    // Shop and Chat, tabs until 2026-10-13. After the library, as commerce
    // sat after the study surfaces on the bar, and each under the name its
    // tab had. Tiles, not rows: a tile shows no second line, so the blurbs
    // here are only what a row would say if one were ever drawn as a row.
    ...(shopEnabled()
      ? [
          {
            label: <T k="nav.shop" />,
            href: "/shop",
            blurb: <T k="nav.shop" />,
            Icon: Cart,
          },
        ]
      : []),
    {
      // "Chat", the word its tab wore since 2026-09-28. The screen behind
      // it still heads itself "Community".
      label: <T k="nav.chat" />,
      href: "/community",
      blurb: <T k="community.subtitle" />,
      Icon: ChatGlyph,
    },
    {
      // Start here (1.6): seven steps for a reader who is new to Orthodoxy
      // (lib/start/steps.ts). The first of the two closing entries: it and
      // Find a parish are the two doors for the newcomer, in the order a
      // newcomer needs them. The figure at prayer is the glyph, since the
      // path begins with a prayer.
      label: <T k="discover.tile.start" />,
      href: "/start",
      blurb: <T k="discover.tile.startBlurb" />,
      Icon: Orans,
    },
    {
      // Find a parish (1.6): the jurisdictions' own parish directories, as
      // links out. A quiet row under the library and not a band above it: it
      // is a door for the reader with no parish yet, not the surface's
      // headline. After the library and the two tiles under it, and last.
      // One of the two closing entries (DISCOVER_CLOSING in
      // lib/discover/grid.ts, which counts from the end of this list), so
      // its blurb is read whenever it is drawn as a row.
      label: <T k="discover.tile.parishes" />,
      href: "/parishes",
      blurb: <T k="discover.tile.parishesBlurb" />,
      Icon: ParishCompass,
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
      <SectionMasthead section="discover" eyebrow={<T k="discover.eyebrow" />} />
      <header className="text-center mb-7">
        <OrnamentHeadpiece className="mx-auto mb-4 max-w-[320px]" />
        <p className="font-sans text-ui text-paper/70 max-w-[420px] mx-auto leading-[1.6]">
          <T k="discover.subtitle" />
        </p>
      </header>

      {/* History leads, as it does on the desktop page since the 2026-09-26
          redo: the newest wing of the library, one timeline of two thousand
          years. The CTA string carries its own arrow on the desktop card;
          the band draws a chevron, so the arrow comes off here. */}
      <div className="mb-4">
        <FeatureBand
          href="/history"
          eyebrow={<T k="calendar.styleNew" />}
          title={<T k="discover.tile.history" />}
          sub={<T k="discover.tile.historyBlurb" />}
          cta={<T k="study.exploreTheInteractiveTimeline" dropTrailing="→" />}
          icon={<Hourglass size={22} />}
        />
      </div>

      {/* Reading hub: prominent entry to the new reading room, above the
          commemoration so "sitting down to read" leads the surface. */}
      <MobileCard
        eyebrow={<T k="reading.eyebrow" />}
        title={<T k="reading.h1" dropTrailing="." />}
        href="/reading"
        tint="gold"
      >
        <p className="mt-2 font-serif italic text-ui text-paper/75 leading-[1.5]">
          <T k="reading.subtitle" />
        </p>
        <p className="mt-3 font-sans text-detail font-medium text-paper/75">
          <T k="reading.enterReadingRoom" /> →
        </p>
      </MobileCard>

      <div className="mt-7">
        <MobileSectionLabel><T k="ui.theLibrary" /></MobileSectionLabel>
        <SoftTileGrid className="mt-1">
          {entries.map((e, i) => {
            // The grid is two across. The library's entries, and the Shop
            // and Chat after them, are tiles; the closing ones, Start here
            // and Find a parish, each take
            // a whole row and say what is behind them. The rule, and the one
            // case where the first of them is a tile after all, is in
            // lib/discover/grid.ts.
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
          {/* The marketplace had its own bottom-bar tab from Beta 1.9 to 1.5,
              and is a tile here again from 1.6: see the list above. */}
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
