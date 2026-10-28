import type { ReactNode } from "react";

import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { SearchField } from "@/components/search/SearchField";
import { GalleryBand } from "@/components/ui/GalleryBand";
import { TILE_PREVIEWS } from "@/lib/discover/tilePreviews.generated";
import { shopEnabled } from "@/lib/shop/flags";
import { UnreadDot } from "@/components/community/NotificationsInbox";
import { T } from "@/components/i18n/T";

/** One door of the library, as its band draws it. */
type DiscoverEntry = {
  /** Words to draw, not a string: a <T> island, so they follow the reader's
   *  language in the apps, where a server's string is frozen in English. */
  label: ReactNode;
  href: string;
  /** The app's own line on what is inside, from the place's own words. */
  blurb: ReactNode;
  /** The band's picture, from public/discover/tiles. Each one's work, source
   *  and cut are in docs/licensing/SECTION_MEDIA.md ("Discover's pictures");
   *  a .v2 is the same picture cut again from its Commons original for 1.8,
   *  when the bands made them large enough to look soft on a phone. */
  picture: string;
  /** Where the band's slice of the picture sits, when 50% 30% would cut the faces off. */
  focus?: string;
  /** Set at the corner of the name: Chat's unread dot. */
  badge?: ReactNode;
};

/**
 * Discover mobile shell: the library's front door.
 *
 *   1. A search field that says what it finds (opens the one search).
 *   2. The library as a gallery: each door a wide band with its picture, its
 *      name and the app's own line on what is inside. Saints, Reading,
 *      History, Councils, Theology, Chants, Calendar, Walkthroughs; then the
 *      Shop and Chat; then Start here and Find a parish.
 *   3. Closing colophon.
 *
 * The gallery is the owner's pick of 2026-10-27 (round 7b, D, "each part of
 * the library a wide band with its picture and the app's line on what is
 * inside, like Theology"; Homebase/boards/purify-master/variants/
 * 07b-discover.png). The band is Theology's own (components/ui/GalleryBand),
 * so the two galleries are one pattern. Until then the library was picture
 * tiles two across (1.7, his pick of 2026-10-15 after Hallow's Discover),
 * which showed a name and no line, with the last two as narrow rows; every
 * door the tiles had is a band now, in the same order, and each says what
 * is behind it.
 *
 * "Featured today" (a topic card and a council card) used to sit between the
 * library and the colophon and was removed in 1.7. It cost a loadAllTopics()
 * off disk on every render of this server component to summarise two cards,
 * and the Android export froze the pick at build time anyway, so the "today"
 * in its name was not true in the app.
 *
 * Shop and Chat were tabs until 2026-10-13, when the owner chose a bar of
 * five and You came back to it. They are doors here, after the library and
 * before the two closing ones. MobileTabBar's Discover predicate claims
 * /shop, /community and /campaigns, so this tab stays lit while a reader is
 * in either.
 */
export function DiscoverMobile() {
  // Every word on this surface is a <T> island, never a string the server
  // looked up. This component ships into the apps' export, where the server
  // ran once, in English: until 1.6 a phone set to Greek opened Today in
  // Greek and found this tab in English, though every line of it was already
  // translated. lib/i18n/__tests__/serverWords.test.ts keeps it so.

  // The library. Order reads like a menologion table of contents: people
  // first (saints), then the reading room and the record of the Church (its
  // history, its councils, its theology), then what is sung and kept through
  // the year, then the ways in from outside the library. Every line is the
  // app's own sentence for the place, the one its tile, its hub or its menu
  // already carried.
  const entries: DiscoverEntry[] = [
    {
      // People first, as the ordering note above says.
      label: <T k="discover.tile.saints" />,
      href: "/saints",
      blurb: <T k="discover.tile.saintsBlurb" />,
      // The Three Hierarchs, a Novgorod icon before 1917, the prayer icon.
      // The slice is lifted to their faces.
      picture: "/discover/tiles/saints.webp",
      focus: "50% 20%",
    },
    {
      // The reading room, a tile since 1.7 (a card above the library until
      // then): the open Gospel in Christ's hand, from the Vysotsky range. The
      // Evangelist's plate it wore first had a white bar along its top (the
      // owner, 2026-10-15).
      label: <T k="discover.tile.reading" />,
      href: "/reading",
      blurb: <T k="discover.tile.readingBlurb" />,
      picture: "/discover/tiles/reading.v2.webp",
    },
    {
      // History, a band over the library until 1.7 and a tile in it as well,
      // so the screen named it twice: the Triumph of Orthodoxy icon.
      label: <T k="discover.tile.history" />,
      href: "/history",
      blurb: <T k="discover.tile.historyBlurb" />,
      picture: "/discover/tiles/history.v2.webp",
    },
    {
      // The fathers who kept the councils' faith, assembled: the lower half
      // of the Triumph of Orthodoxy (History shows its top). The free
      // pictures of a council itself are of Florence, and the Nicaea fresco
      // needs a credit line. The slice is lifted to their faces.
      label: <T k="discover.tile.councils" />,
      href: "/councils",
      blurb: <T k="discover.tile.councilsBlurb" />,
      picture: "/discover/tiles/councils.v2.webp",
      focus: "50% 15%",
    },
    {
      // The one Theology umbrella: Doctrine, Topics, Heresies, and
      // Apologetics now live under its hub and shared mode switcher.
      // Rublev's Holy Trinity.
      label: <T k="discover.tile.theology" />,
      href: "/theology",
      blurb: <T k="discover.tile.theologyBlurb" />,
      picture: "/discover/tiles/theology.v2.webp",
    },
    {
      // Chants (1.7), in the Kitchen's place: the owner, 2026-10-16, "Remove
      // the kitchen and switch it out for chants", since readers will use
      // chants far more than recipes, and chants needed an easier way in.
      // Every reader gets it, so no flag. The heavenly host over the cave,
      // from the Nativity icon the shop carries (Byzantine School, Royal
      // Collection RCIN 403381, public domain): the angels' "Glory to God in
      // the highest" (Luke 2:14), the words the Church's Great Doxology
      // begins with. A placeholder pick until the owner chooses the tile's
      // icon (St John of Damascus or St Romanos were proposed).
      label: <T k="chants.title" />,
      href: "/chants",
      blurb: <T k="chants.lead" />,
      picture: "/discover/tiles/chants.webp",
    },
    {
      label: <T k="discover.tile.calendar" />,
      href: "/calendar",
      blurb: <T k="discover.tile.calendarBlurb" />,
      // The Menologion of Basil II, Discover's plate until 1.7.
      picture: "/discover/tiles/calendar.v2.webp",
    },
    {
      // The guided walkthroughs (Job, and more to come) had no standing door
      // on a phone: a tile since 1.7, an addition the owner saw on the
      // picture he chose. The Anastasis, Christ taking Adam by the hand: the
      // owner asked for "a helping hand" (2026-10-15), as the Codex page it
      // wore first was "literally just a manuscript". Its line is the
      // walkthroughs' own opening sentence, held to two lines by the band.
      label: <T k="nav.discoverMenu.walkthroughs" />,
      href: "/walkthroughs",
      blurb: <T k="walk.hubIntro" />,
      picture: "/discover/tiles/walkthroughs.webp",
      focus: "50% 10%",
    },
    // Shop and Chat, tabs until 2026-10-13. After the library, as commerce
    // sat after the study surfaces on the bar, and each under the name its
    // tab had.
    ...(shopEnabled()
      ? [
          {
            label: <T k="nav.shop" />,
            href: "/shop",
            // The shop's own line, under its title on its front page.
            blurb: <T k="shop.curatedOrthodoxIconsFaithfulTo" />,
            // St George, Novgorod, 15th century: an icon the shop carries.
            picture: "/discover/tiles/shop.v2.webp",
            focus: "50% 10%",
          },
        ]
      : []),
    {
      // "Chat", the word its tab wore since 2026-09-28. The screen behind
      // it still heads itself "Community".
      label: <T k="nav.chat" />,
      href: "/community",
      blurb: <T k="community.subtitle" />,
      // Pentecost: the apostles together, given the words to speak.
      picture: "/discover/tiles/chat.webp",
      // The dot left the tab bar's Chat tab for Discover's tab when Chat
      // became a door here, and a reader who follows it has to be shown
      // which door it meant. It only reads what the bar's own badge has
      // already asked for. (On the picture tiles of 1.7 it rode on a glyph
      // the tile never drew.)
      badge: <UnreadDot />,
    },
    {
      // Start here (1.6): seven steps for a reader who is new to Orthodoxy
      // (lib/start/steps.ts). The first of the two closing doors: it and
      // Find a parish are the two doors for the newcomer, in the order a
      // newcomer needs them.
      label: <T k="discover.tile.start" />,
      href: "/start",
      blurb: <T k="discover.tile.startBlurb" />,
      // Christ Pantocrator, Sinai, the slice on his eyes.
      picture: "/discover/tiles/start.v2.webp",
      focus: "50% 22%",
    },
    {
      // Find a parish (1.6): the jurisdictions' own parish directories, as
      // links out. A door for the reader with no parish yet, not the
      // surface's headline, so it closes the list, last.
      label: <T k="discover.tile.parishes" />,
      href: "/parishes",
      blurb: <T k="discover.tile.parishesBlurb" />,
      // St John Chrysostom in Hagia Sophia, the pastor in his church.
      picture: "/discover/tiles/parishes.v2.webp",
    },
  ];

  return (
    // The tab bar every tab wears (1.7): the same search and bell on the
    // right as on the other four, the owner's "same design on all". The
    // field under the title stays too: it says what the search finds.
    <MobileShell header={<MobileHeader titleKey="nav.discover" />}>
      <SearchField className="mb-4" />

      <ul className="flex flex-col gap-2.5">
        {entries.map((e, i) => (
          <li key={e.href}>
            <GalleryBand
              href={e.href}
              title={e.label}
              line={e.blurb}
              badge={e.badge}
              picture={e.picture}
              focus={e.focus}
              // The tile's tiny preview, blurred, at once (1.8): the band is
              // never an empty box while its picture comes.
              preview={TILE_PREVIEWS[e.picture]?.src}
              // The first six are on the first screen of a phone.
              priority={i < 6}
            />
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center font-serif italic text-detail text-paper/45 leading-[1.55]">
        <T k="ui.throughThePrayersOfOur" />
        <br />
        <T k="ui.lordJesusChristOurGod" />
      </p>
    </MobileShell>
  );
}
