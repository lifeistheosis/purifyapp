"use client";

// The You tab: the reader's own screen.
//
// Rebuilt for 1.8 on the owner's word of 2026-10-17: "when you click on you,
// I want the you revamp in terms of like how the verses, paragraphs,
// bookmarks, and notes are ... it just doesn't feel that useful ... I feel
// like the retention is low in terms of those sections ... make the routes
// better, make the design better, give some sections more usefulness."
//
// And its sections redrawn on his note 71 of build 86 (2026-10-31): "now I
// want you to revamp this screens sections". His photo showed one box after
// another at the same weight, the Plus pill and a Purify Premium row going to
// the same place, three names for one subscription (Plus, Premium, Pro), and
// Learn by heart and Share as two loose pills. His pick was A of r3-25, "A,
// the ladder, then the day" (Homebase/boards/purify-master/variants/
// r3-25-you.html), and refinements 3 (one name, Plus) and 4 (the rope for
// the red flame), which he accepted with it.
//
// What is here, top to bottom, each part at its own weight:
//
//   1. The Ladder of Divine Ascent under the clear bar, fading into the page
//      as Prayers' Pantocrator does, and the reader standing on it: their
//      picture, their name, the way to their profile and their badges; signed
//      out, Sign in where the name stands (../you/YouHero, ../you/YouIdentity).
//   2. The prayer rope from Today, where the red flame card was, and under it
//      one quiet line of what this week held (StreakRope, ../you/WeekLine).
//   3. Where you left off: one lit card, the newest place large with its
//      cover and how far in, the two after it small (../you/PickUpCard).
//   4. A verse you kept, in the Light of Today's verse, with Learn by heart
//      and Share as one bar at its foot (../you/KeptVerse).
//   5. What you have kept, as a shelf of covers with their counts, See all
//      with the total (../you/KeptShelf).
//   6. The catechisms seen through, in one quiet line.
//   7. The reader's own rows, the lightest thing on the page: Your rule, and
//      ONE door to Settings, which holds the account and everything else
//      once. See the note at the list below.
//
// Each part is drawn only when there is something in it, so a new reader
// meets the picture with Sign in, the rope to start, one line on how to keep
// a verse, and the rows.
//
// The subscription is named once on this screen, by the pill in the bar,
// which is its one door: the "Purify Premium" row is gone (refinement 3).

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Seal } from "@/components/ui/icons/Seal";
import { SettingsGlyph as Glyph } from "./SettingsGlyph";
import { StreakRope } from "@/components/today/StreakRow";
import { KeptShelf } from "@/components/you/KeptShelf";
import { KeptVerse } from "@/components/you/KeptVerse";
import { PickUpCard } from "@/components/you/PickUpCard";
import { WeekLine } from "@/components/you/WeekLine";
import { YouHero } from "@/components/you/YouHero";
import { YouRows, type YouRow } from "@/components/you/YouRows";
import type { YouWho } from "@/components/you/YouIdentity";
import { readIntentions } from "@/lib/prayers/storage";
import { useCompletedCollections } from "@/lib/catechism/useCollectionProgress";
import { useCompletionCount } from "@/lib/catechism/useCompletionCount";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { useCampaignsOpen } from "@/lib/campaigns/useCampaignsOpen";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { localBookNames } from "@/lib/bible/books";
import { useJournal } from "@/lib/bible/journal";
import { useBookmarks } from "@/lib/bookmarks";
import { useJournalRecords } from "@/lib/journal/entries";
import { journalFeed } from "@/lib/journal/feed";
import { readerName } from "@/lib/profile/myPicture";
import { todayKey } from "@/lib/rhythm/dayKey";
import { inFilter, savedFeed } from "@/lib/saved/feed";
import { useSavedHighlights } from "@/lib/saved/highlights";
import { useSavedPassages, useSavedWords } from "@/lib/saved/passages";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { resolveUser } from "@/lib/supabase/resolveUser";
import { verseOf } from "@/components/saved/SavedRow";
import { verseForDay } from "@/lib/you/you";

/**
 * Who is signed in on this device, read the way Settings reads it: the
 * session the device holds, before the first paint, with no request and no
 * lock; else resolveUser for the rarer cases. "Could not find out" is shown
 * as signed out, which offers Sign in and loses nothing. Until 1.8 this tab
 * asked the network (getUser) every time it opened, and drew a loading
 * screen while it waited.
 */
function useReader(): YouWho {
  const [reader, setReader] = useState<YouWho>({ state: "unknown" });
  useLayoutEffect(() => {
    const local = readLocalSessionUser();
    if (local) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- the
         session lives in the device's own storage, which a server render does
         not have: it is adopted after mount, before the first paint. */
      setReader({ state: "in", id: local.id, name: readerName(local) });
      return;
    }
    let cancelled = false;
    resolveUser().then((auth) => {
      if (cancelled) return;
      setReader(auth.state === "signed-in" ? { state: "in", id: auth.user.id, name: readerName(auth.user) } : { state: "out" });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return reader;
}

export function YouMobile() {
  const { t, tn } = useTranslate();
  // Prayer campaigns have a row here only for a reader they are open for:
  // nobody in a closed build, the testers alone while they are tested, and
  // everyone once they open (lib/campaigns/useCampaignsOpen.ts).
  const campaignsOpen = useCampaignsOpen();
  const reader = useReader();
  const [intentions, setIntentions] = useState(0);

  // What the reader has kept and written, read off the device once for the
  // whole screen: every part below draws from the same lists, so a count on
  // one cover is the count on the screen it opens.
  const { bookmarks } = useBookmarks();
  const highlights = useSavedHighlights();
  const passages = useSavedPassages();
  const marked = useSavedWords();
  const notes = useJournal();
  const records = useJournalRecords();
  const feed = useMemo(() => savedFeed(bookmarks, highlights, passages, marked), [bookmarks, highlights, passages, marked]);
  const journal = useMemo(() => journalFeed(notes, records), [notes, records]);

  const books = useMemo(() => localBookNames(t), [t]);
  const verseLabel = useCallback(
    (book: string, chapter: number, verse: number) => `${books[book] ?? t(`bible.books.${book}`)} ${chapter}:${verse}`,
    [books, t],
  );
  const [today] = useState(() => todayKey());
  const verseToday = useMemo(() => {
    const item = verseForDay(
      feed.filter((i) => inFilter(i, "verses")),
      today,
    );
    const v = item ? verseOf(item) : null;
    return v ? { ...v, reference: verseLabel(v.book, v.chapter, v.verse) } : null;
  }, [feed, today, verseLabel]);

  useEffect(() => {
    // The diptych count, for Your rule's line in the list below.
    function recompute() {
      setIntentions(
        readIntentions("living").length + readIntentions("departed").length,
      );
    }
    recompute();
    window.addEventListener("purify:intentions", recompute);
    window.addEventListener("storage", recompute);
    return () => {
      window.removeEventListener("purify:intentions", recompute);
      window.removeEventListener("storage", recompute);
    };
  }, []);

  const tier = usePremiumTier();
  const catechisms = useCompletionCount();
  const completed = useCompletedCollections();

  // The reader's own rows, and ONE door to everything else: Settings.
  //
  // This list was eleven rows under the heading "Account": Account and
  // security, Purify Premium, Diptychs, Export your library, Settings,
  // Privacy, Support Purify, What's new, About, Developer, Sign out. Three of
  // them led into each other. "Account and security" opened a dashboard of
  // four tabs (Profile, Security, Data, Sessions); "Settings" ended in an
  // "Account" group that linked back into those tabs; and "Export your
  // library" was a row here, a row there, and a card on the Data tab. The
  // owner, of this list on his own phone, 2026-10-13: "there is technically 3
  // sections that all have similar names. profile, settings, account. like it
  // needs to be even more simplified. if you have to delete sections and add
  // them into one then do that".
  //
  // So there are two names. You is the reader's: who they are, their streak,
  // what they have kept, and the rows below, each a thing of theirs. Settings
  // (components/settings/SettingsClient.tsx) is everything else, once: the
  // account first, then how the app reads, then data, then about Purify, then
  // Sign out. The reader's own name at the top opens their Profile, the one
  // account screen that is about who they are, and signed out Sign in stands
  // there in its place (1.8, note 71; it was this list's first row). The
  // subscription's door is the pill in the bar alone: the Purify Premium row
  // that led to the same place went with note 71 (refinement 3).
  // lib/nav/__tests__/oneSettings.test.ts holds both lists.
  const settings: YouRow[] = [];

  // The Pro perk, first among the reader's own rows, so it reads as a
  // membership benefit rather than a stray link. Hidden entirely for
  // everyone else: an unclaimable row is worse than no row.
  if (eikonBoxEnabled() && tier === "pro") {
    settings.push({
      label: t("ui.claimYourEikonBox"),
      href: "/account/eikon-box",
      hint: t("ui.thisMonthsBoxAndWhere"),
      icon: <Glyph kind="box" />,
    });
  }

  settings.push(
    {
      // Your rule (1.7): the reader's own morning and evening rule, with the
      // names they carry under it.
      label: t("prayers.mine.title"),
      href: "/prayers/personal",
      hint:
        intentions === 0
          ? t("prayers.mine.youHint")
          : tn("prayers.intentionCount", intentions),
      icon: <Glyph kind="halo" />,
    },
    // These two used to exist only on the desktop dashboard's settings
    // list. That list no longer renders on a phone, so they live here now
    // rather than nowhere.
    ...(campaignsOpen
      ? [
          {
            label: t("community.prayerCampaigns"),
            href: "/campaigns/mine",
            hint: t("ui.campaignsYouPrayWithThe"),
            icon: <Glyph kind="halo" />,
          } satisfies YouRow,
        ]
      : []),
    // The one door, closing the list. Its mark stood in this screen's bar
    // too until 1.7, when every tab took the same bar (MobileHeader): the
    // owner wanted the same things on the right of it on all five.
    {
      label: t("settings.title"),
      href: "/settings",
      // Light mode leads the hint because it is the thing readers go looking
      // for and could not find: the palette lived behind a toolbar pill inside
      // the Bible reader, and this list is where a phone reader looks first.
      hint: t("ui.lightModeReadingTheCalendar"),
      icon: <Glyph kind="sliders" />,
    },
  );

  // The Ladder and the rope come at once: neither waits on who is here. The
  // reader's name stands on the picture once the device has said, before the
  // first paint when a session is on the device; until then its place is
  // kept, so nothing under it moves.
  const hero = (
    <YouHero who={reader}>
      {/* For everyone: a reader keeps a streak on this device before they
          ever sign in. The week's line says what it held. */}
      <StreakRope className="you-rope" />
      <WeekLine className="mt-2.5" feed={feed} journal={journal} />
    </YouHero>
  );

  // The rest waits for the same moment, and the screen's own parts are read
  // off the device in it, so they arrive together rather than one by one.
  if (reader.state === "unknown") {
    return (
      <MobileShell header={<MobileHeader titleKey="nav.you" />} hero={hero}>
        {/* The lit card, the verse, the shelf, and the rows. */}
        <Skeleton weight="mid" rounded="rounded-[22px]" className="h-[178px] w-full" />
        <Skeleton weight="mid" rounded="rounded-[24px]" className="mt-6 h-[230px] w-full" />
        <div className="mt-6">
          <Skeleton weight="faint" className="h-3 w-28" />
          <Skeleton weight="faint" rounded="rounded-2xl" className="mt-2.5 h-[130px] w-full" />
        </div>
        <Skeleton weight="faint" rounded="rounded-[18px]" className="mt-6 h-[124px] w-full" />
      </MobileShell>
    );
  }

  return (
    <MobileShell header={<MobileHeader titleKey="nav.you" />} hero={hero}>
      <PickUpCard />

      {/* What the reader is learning by heart: the one they chose, else the day's kept verse, else the way in (build 93 note 11). */}
      <KeptVerse className="mt-6 first:mt-0" verse={verseToday} />

      <KeptShelf className="mt-6 first:mt-0" feed={feed} journal={journal} verseLabel={verseLabel} />

      {/* One quiet line, and only once there is something to say. No streak,
          no "today", no count of what was not done. */}
      {catechisms > 0 && (
        <p data-you-catechisms="" className="mt-5 flex items-center gap-[9px] px-1 font-serif text-[13.5px] leading-snug text-paper/60">
          <Seal size={17} className="shrink-0 text-paper/70" />
          {tn("catechism.accountCount", catechisms)}
        </p>
      )}
      {/* And the collections seen through, one line each, for everyone. The
          only place a completion is shown outside the collections page. */}
      {completed.length > 0 && (
        <ul className={catechisms > 0 ? "mt-1 flex flex-col gap-0.5 px-1" : "mt-5 flex flex-col gap-0.5 px-1"}>
          {completed.map((c) => (
            <li key={c.slug} className="font-serif text-detail text-paper/60">
              <Link href="/catechism/collections" className="hover:text-paper transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none">
                {t("catechism.collections.completedLine", { name: c.name })}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* No heading over the list. It said "Account" to a signed-in reader
          and "Settings" to everyone else, over rows that were neither: one
          more name for this screen. The supporter mark's switch that sat
          under it is the account's, and is in Settings with the account. */}
      <div className="mt-6" data-you-rows="">
        <YouRows items={settings} />
      </div>
    </MobileShell>
  );
}
