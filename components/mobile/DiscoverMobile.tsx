import { MobileShell } from "./MobileShell";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { SectionMasthead } from "./SectionMasthead";
import { SoftTile, SoftTileGrid, type Tone } from "./SoftTiles";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { type DiscoverEntry } from "./DiscoverIndex";
import { OrnamentHeadpiece } from "@/components/calendar/OrnamentHeadpiece";
import { Church } from "@/components/ui/icons/Church";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Cross } from "@/components/ui/icons/Cross";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Gear } from "@/components/ui/icons/tab/Gear";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { T } from "@/components/i18n/T";

// Tone cycle for the library tile grid — graded neutrals, no colour.
const LIBRARY_TONES: Tone[] = ["a", "b", "c", "d"];

/**
 * Discover mobile shell — "the menologion."
 *
 *   1. Masthead — ornament headpiece + "THE WHOLE LIBRARY" / "Discover." /
 *      subtitle, matching the desktop Discover page.
 *   2. Deep-slate hero with the saint icon + DayBadge as `aside`.
 *   3. The library — a menologion list of every library destination
 *      (saints, councils, calendar, topics, daily readings, psalter,
 *      patristic), and Settings. The page's centerpiece.
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
      // The retired You tab. Last in the list on purpose: the five above are
      // the library and read as one sequence, and the account is not part of
      // it. tab/Gear is the same glyph the tab wore, so this reads as a move
      // rather than a new thing.
      label: t(m, "nav.settings"),
      href: "/account",
      // Required by DiscoverEntry and unread by SoftTile, which renders no
      // blurb (see the calendar entry above). Kept meaningful rather than a
      // repeat of the label, so it is correct if this list is ever handed to
      // DiscoverIndex, which does render it.
      blurb: t(m, "nav.yourAccount"),
      Icon: Gear,
    },
  ];

  return (
    <MobileShell
      header={<MobileHeader titleKey="nav.discover" trailing={<UserAvatarSmall />} />}
    >
      {/* Masthead — the Menologion of Basil II, since this surface is the
          app's menologion. The ornament stays underneath as the rule between
          the plate and the subtitle. */}
      {/* No `title`: MobileHeader above is the surface's h1. The plate
          keeps its eyebrow and its credit. */}
      <SectionMasthead section="discover" eyebrow={t(m, "discover.eyebrow")} />
      <header className="text-center mb-7">
        <OrnamentHeadpiece className="mx-auto mb-4 max-w-[320px]" />
        <p className="font-serif italic text-ui text-paper/70 max-w-[420px] mx-auto leading-[1.6]">
          {t(m, "discover.subtitle")}
        </p>
      </header>

      {/* Reading hub — prominent entry to the new reading room, above the
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
          {entries.map((e, i) => (
            <SoftTile
              key={e.href}
              href={e.href}
              label={e.label}
              icon={<e.Icon size={21} />}
              tone={LIBRARY_TONES[i % LIBRARY_TONES.length]}
            />
          ))}
          {/* The marketplace now has its own bottom-bar tab (Beta 1.9), so the
              Discover tile was retired. */}
        </SoftTileGrid>
      </div>

      <p className="mt-10 text-center font-display-serif italic text-detail text-paper/45 leading-[1.55]">
        <T k="ui.throughThePrayersOfOur" />
        <br />
        <T k="ui.lordJesusChristOurGod" />
      </p>
    </MobileShell>
  );
}
