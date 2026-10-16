import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { SoftTile, SoftTileGrid, type Tone } from "./SoftTiles";
import { SearchField } from "@/components/search/SearchField";
import { type DiscoverEntry } from "./DiscoverIndex";
import { Book } from "@/components/ui/icons/Book";
import { Church } from "@/components/ui/icons/Church";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Compass } from "@/components/ui/icons/Compass";
import { Cross } from "@/components/ui/icons/Cross";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Orans } from "@/components/ui/icons/Orans";
import { Cart } from "@/components/ui/icons/tab/Cart";
import { ChatBubble } from "@/components/ui/icons/ChatBubble";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Note } from "@/components/ui/icons/Note";
import { DISCOVER_CLOSING, isClosingRow } from "@/lib/discover/grid";
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
 * Discover mobile shell: the library's front door.
 *
 *   1. A search field that says what it finds (opens the one search).
 *   2. The library as tiles, a picture on each where we hold one: Saints,
 *      Reading, History, Councils, Theology, Chants, Calendar,
 *      Walkthroughs; then the Shop and Chat; then Start here and Find a
 *      parish as rows.
 *   3. Closing colophon.
 *
 * That is the 1.7 layout, the owner's pick of 2026-10-15 ("A", after
 * Hallow's Discover: a title, a search field, picture tiles). Until then the
 * screen opened on the Menologion plate, a sentence, a History band and the
 * reading-room card, and no tile showed on the first screen.
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
      // The Three Hierarchs, a Novgorod icon before 1917, the prayer icon.
      picture: "/discover/tiles/saints.webp",
    },
    {
      // The reading room, a tile since 1.7 (a card above the library until
      // then): the open Gospel in Christ's hand, from the Vysotsky range. The
      // Evangelist's plate it wore first had a white bar along its top (the
      // owner, 2026-10-15).
      label: <T k="discover.tile.reading" />,
      href: "/reading",
      blurb: <T k="discover.tile.readingBlurb" />,
      Icon: Book,
      picture: "/discover/tiles/reading.webp",
    },
    {
      // History, a band over the library until 1.7 and a tile in it as well,
      // so the screen named it twice: the Triumph of Orthodoxy icon.
      label: <T k="discover.tile.history" />,
      href: "/history",
      blurb: <T k="discover.tile.historyBlurb" />,
      Icon: Hourglass,
      picture: "/discover/tiles/history.webp",
    },
    {
      // The fathers who kept the councils' faith, assembled: the lower half
      // of the Triumph of Orthodoxy (History shows its top). The free
      // pictures of a council itself are of Florence, and the Nicaea fresco
      // needs a credit line. Every library tile has a picture since the
      // owner's word of 2026-10-15.
      label: <T k="discover.tile.councils" />,
      href: "/councils",
      blurb: <T k="discover.tile.councilsBlurb" />,
      Icon: Church,
      picture: "/discover/tiles/councils.webp",
    },
    {
      // The one Theology umbrella: Doctrine, Topics, Heresies, and
      // Apologetics now live under its hub and shared mode switcher.
      // Rublev's Holy Trinity.
      label: <T k="discover.tile.theology" />,
      href: "/theology",
      blurb: <T k="discover.tile.theologyBlurb" />,
      Icon: Cross,
      picture: "/discover/tiles/theology.webp",
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
      Icon: Note,
      picture: "/discover/tiles/chants.webp",
    },
    {
      label: <T k="discover.tile.calendar" />,
      href: "/calendar",
      // Was an interpolated "<fast>. Pascha in N days." built from a
      // server-computed date. SoftTile does not render `blurb` at all, so
      // it was dead string-building over a date that the Android export
      // froze at build time. The static blurb matches its siblings.
      blurb: <T k="discover.tile.calendarBlurb" />,
      Icon: Calendar,
      // The Menologion of Basil II, Discover's plate until 1.7.
      picture: "/discover/tiles/calendar.webp",
    },
    {
      // The guided walkthroughs (Job, and more to come) had no standing door
      // on a phone: a tile since 1.7, an addition the owner saw on the
      // picture he chose. The Anastasis, Christ taking Adam by the hand: the
      // owner asked for "a helping hand" (2026-10-15), as the Codex page it
      // wore first was "literally just a manuscript".
      label: <T k="nav.discoverMenu.walkthroughs" />,
      href: "/walkthroughs",
      blurb: <T k="nav.discoverMenu.walkthroughs" />,
      Icon: Scroll,
      picture: "/discover/tiles/walkthroughs.webp",
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
            // St George, Novgorod, 15th century: an icon the shop carries.
            picture: "/discover/tiles/shop.webp",
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
      // Pentecost: the apostles together, given the words to speak.
      picture: "/discover/tiles/chat.webp",
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
      // Christ Pantocrator, Sinai: drawn small at the row's head.
      picture: "/discover/tiles/start.webp",
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
      // St John Chrysostom in Hagia Sophia, the pastor in his church.
      picture: "/discover/tiles/parishes.webp",
    },
  ];

  return (
    // The tab bar every tab wears (1.7): the same search and bell on the
    // right as on the other four, the owner's "same design on all". The
    // field under the title stays too: it says what the search finds.
    <MobileShell header={<MobileHeader titleKey="nav.discover" />}>
      {/* 1.7, the owner's pick of 2026-10-15 ("A"): the library first. A
          search field under the title that says what it finds, then the
          tiles on the first screen, each with a picture where we hold one.
          The Menologion plate, its sentence, the History band and the
          reading-room card gave way: History and Reading are tiles among the
          rest (History was on the screen twice). The picture he chose from
          is Homebase/boards/purify-master/r17/shots/ask-discover-calm.png. */}
      <SearchField className="mb-4" />

      <div>
        <SoftTileGrid>
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
                picture={e.picture}
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
