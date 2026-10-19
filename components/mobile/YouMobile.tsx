"use client";

// The You tab: the reader's own screen.
//
// Rebuilt for 1.8 on the owner's word of 2026-10-17: "when you click on you,
// I want the you revamp in terms of like how the verses, paragraphs,
// bookmarks, and notes are ... it just doesn't feel that useful ... I feel
// like the retention is low in terms of those sections ... make the routes
// better, make the design better, give some sections more usefulness."
//
// What was here: the picture, a card that said "Welcome back", the streak,
// one "where you left off" row, four numbers on four tiles (verses,
// paragraphs, notes, bookmarks), the three newest things saved, and the
// reader's rows. The numbers opened the wrong things or nothing of theirs
// (lib/you/you.ts says how each went wrong), and the newest three were
// /saved's own first three, shown again.
//
// What is here, top to bottom, each part a reason to come back:
//
//   1. The picture (the Ladder of Divine Ascent; the owner's pick of
//      2026-10-15, "B": the picture stays on top), then, signed in, the
//      reader's own name and picture, which open their Profile.
//   2. The streak, and under it one quiet line of what this week held.
//   3. Where you left off: the chapter, the work of the Fathers, the prayer
//      and the reading plan last open, three at most (./../you/PickUpRows).
//   4. A verse you kept: one of their own verses each day, to read in its
//      chapter, learn by heart or send as a picture (../you/KeptVerse).
//   5. What you have kept, by what it is, each group with its count and its
//      newest thing, opening Saved on that group; then the journal; then all
//      of it (../you/KeptRows).
//   6. The reader's own rows (Premium, Your rule, My prayers) and ONE door to
//      Settings, which holds the account and everything else once. See the
//      note at the list below.
//
// Each part is drawn only when there is something in it, so a new reader
// meets the picture, the streak to start, one line on how to keep a verse,
// and the rows.
//
// The streak leads the reading life: the red flame, the count and the week
// (components/streak). This screen once kept no streak by design; the owner
// reversed that on 2026-09-28 ("go all in on the streak system") and asked
// for it in red on 2026-10-02.

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { StreakCard } from "@/components/streak/StreakCard";
import { SectionMasthead } from "./SectionMasthead";
import { SettingsList, type SettingsItem } from "./SettingsList";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { SettingsGlyph as Glyph } from "./SettingsGlyph";
import { KeptRows } from "@/components/you/KeptRows";
import { KeptVerse } from "@/components/you/KeptVerse";
import { PickUpRows } from "@/components/you/PickUpRows";
import { WeekLine } from "@/components/you/WeekLine";
import { YouIdentity } from "@/components/you/YouIdentity";
import { readIntentions } from "@/lib/prayers/storage";
import { useCompletedCollections } from "@/lib/catechism/useCollectionProgress";
import { useCompletionCount } from "@/lib/catechism/useCompletionCount";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { deviceDateLocale } from "@/lib/i18n/deviceDates";
import { localBookNames } from "@/lib/bible/books";
import { useJournal } from "@/lib/bible/journal";
import { useBookmarks } from "@/lib/bookmarks";
import { useJournalRecords } from "@/lib/journal/entries";
import { journalFeed } from "@/lib/journal/feed";
import { readerName } from "@/lib/profile/myPicture";
import { todayKey } from "@/lib/rhythm/dayKey";
import { inFilter, savedFeed } from "@/lib/saved/feed";
import { useSavedHighlights } from "@/lib/saved/highlights";
import { useSavedPassages } from "@/lib/saved/passages";
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
type Reader = { known: false } | { known: true; user: { name: string; joinedAt: string | null } | null };

function useReader(): Reader {
  const [reader, setReader] = useState<Reader>({ known: false });
  useLayoutEffect(() => {
    const local = readLocalSessionUser();
    if (local) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- the
         session lives in the device's own storage, which a server render does
         not have: it is adopted after mount, before the first paint. */
      setReader({ known: true, user: { name: readerName(local), joinedAt: local.created_at ?? null } });
      return;
    }
    let cancelled = false;
    resolveUser().then((auth) => {
      if (cancelled) return;
      setReader({
        known: true,
        user: auth.state === "signed-in" ? { name: readerName(auth.user), joinedAt: auth.user.created_at ?? null } : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return reader;
}

function formatJoined(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleDateString(deviceDateLocale(), {
      year: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

export function YouMobile() {
  const { t, tn } = useTranslate();
  const reader = useReader();
  const [intentions, setIntentions] = useState(0);

  // What the reader has kept and written, read off the device once for the
  // whole screen: every part below draws from the same lists, so a count on
  // one row is the count on the screen it opens.
  const { bookmarks } = useBookmarks();
  const highlights = useSavedHighlights();
  const passages = useSavedPassages();
  const notes = useJournal();
  const records = useJournalRecords();
  const feed = useMemo(() => savedFeed(bookmarks, highlights, passages), [bookmarks, highlights, passages]);
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

  const signedIn = reader.known && reader.user !== null;
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
  // Sign out. From 1.8 the reader's own name at the top opens their Profile
  // as well, the one account screen that is about who they are.
  // lib/nav/__tests__/oneSettings.test.ts holds both lists.
  const settings: SettingsItem[] = [];

  if (!signedIn) {
    settings.push({
      label: t("common.signIn"),
      href: "/signin?next=/account",
      hint: t("ui.syncAcrossDevicesOptional"),
      icon: <Glyph kind="user" />,
    });
  }

  settings.push({
    label: "Purify Premium",
    href: "/pricing",
    hint: t("ui.plusAndProSyncCollections"),
    icon: <Glyph kind="sparkle" />,
  });

  // The Pro perk, directly under the tier it belongs to, so it reads as a
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
    ...(campaignsEnabled()
      ? [
          {
            label: t("shop.myPrayers"),
            href: "/campaigns/mine",
            hint: t("ui.campaignsYouPrayWithThe"),
            icon: <Glyph kind="halo" />,
          } satisfies SettingsItem,
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

  // Until the device has said who is here. With a session on the device that
  // is before the first paint; it is a moment longer only when the session
  // has to be looked for, and the screen's own parts are read off the device
  // in the same moment, so they arrive together rather than one by one.
  if (!reader.known) {
    return (
      <MobileShell
        header={<MobileHeader titleKey="nav.you" />}
      >
        {/* The picture, the streak, a list, and the rows. */}
        <Skeleton weight="mid" rounded="rounded-2xl" className="aspect-[16/9] w-full" />
        <Skeleton weight="mid" rounded="rounded-2xl" className="mt-5 h-[168px] w-full" />
        <div className="mt-7">
          <Skeleton weight="faint" className="h-3 w-28" />
          <Skeleton weight="faint" rounded="rounded-2xl" className="mt-2 h-[132px] w-full" />
        </div>
        <SkeletonList rows={3} className="mt-7" />
      </MobileShell>
    );
  }

  return (
    <MobileShell
      header={<MobileHeader titleKey="nav.you" />}
      // Signed out, one line on where this reader's things are kept. Signed
      // in, their name says whose screen it is, under the picture.
      eyebrow={signedIn ? undefined : t("ui.privateOnThisDeviceNo")}
    >
      {/* The Ladder of Divine Ascent. The personal page is about one's own
          ascent, and it is the only picture the surface carries. */}
      <SectionMasthead section="you" />

      {/* A signed-in reader's own name and picture, which open their Profile.
          A reader on this device alone used to get a big card here asking
          them to sign in, the third ask on the screen; from 1.7 Sign in is
          the first row of the list below and the screen opens on their own
          things (the owner's pick of 2026-10-15, "B": the picture stays on
          top, Homebase/boards/purify-master/r17/shots/ask-you-calm.png). */}
      {reader.known && reader.user ? (
        <YouIdentity className="mt-4" name={reader.user.name} since={formatJoined(reader.user.joinedAt)} />
      ) : null}

      {/* For everyone: a reader keeps a streak on this device before they
          ever sign in. The week's line says what it held. */}
      <div className="mt-5">
        <StreakCard />
        <WeekLine className="mt-2.5" feed={feed} journal={journal} />
      </div>

      <PickUpRows className="mt-7" />

      {verseToday ? <KeptVerse className="mt-7" verse={verseToday} /> : null}

      <KeptRows className="mt-7" feed={feed} journal={journal} verseLabel={verseLabel} />

      {/* One quiet line, and only once there is something to say. No streak,
          no "today", no count of what was not done. */}
      {catechisms > 0 && (
        <p className="mt-4 px-1 font-serif text-detail text-paper/60">
          {tn("catechism.accountCount", catechisms)}
        </p>
      )}
      {/* And the collections seen through, one line each, for everyone. The
          only place a completion is shown outside the collections page. */}
      {completed.length > 0 && (
        <ul className={catechisms > 0 ? "mt-1 flex flex-col gap-0.5 px-1" : "mt-4 flex flex-col gap-0.5 px-1"}>
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
      <div className="mt-7" data-you-rows="">
        <SettingsList items={settings} />
      </div>
    </MobileShell>
  );
}
