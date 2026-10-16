"use client";

// You mobile shell: "the personal dashboard."
//
// Signed-in users get a native mobile experience here, built from three
// concerns:
//
//   1. Identity: the welcome-back hero with the avatar, display name and
//      member-since.
//   2. Reading life: a 2×2 stat grid (verses, paragraphs, notes,
//      bookmarks) plus the most-recent saves.
//   3. The reader's own rows (Premium, Diptychs, My prayers) and one door
//      to Settings, which holds the account and everything else once. See
//      the note at the list below.
//
// The streak card leads the reading life: the red flame, the count and
// the week (components/streak). This screen once kept no streak by
// design; the owner reversed that on 2026-09-28 ("go all in on the streak
// system") and asked for it in red on 2026-10-02.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { MobileHeroCard } from "./MobileHeroCard";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { MobileStatGrid } from "./MobileStatGrid";
import { StreakCard } from "@/components/streak/StreakCard";
import { SectionMasthead } from "./SectionMasthead";
import { BibleMobileContinue } from "./BibleMobileContinue";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { SavedPreview } from "./SavedPreview";
import { SettingsList, type SettingsItem } from "./SettingsList";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { SettingsGlyph as Glyph } from "./SettingsGlyph";
import { readIntentions } from "@/lib/prayers/storage";
import { useReadingStats } from "@/lib/profile/useReadingStats";
import { useCompletedCollections } from "@/lib/catechism/useCollectionProgress";
import { useCompletionCount } from "@/lib/catechism/useCompletionCount";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { deviceDateLocale } from "@/lib/i18n/deviceDates";

type AuthState =
  | { kind: "loading" }
  | { kind: "anon" }
  | {
      kind: "signed-in";
      email: string;
      displayName: string | null;
      joinedAt: string | null;
    };

function formatJoined(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
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
  const [auth, setAuth] = useState<AuthState>({ kind: "loading" });
  const [intentions, setIntentions] = useState(0);
  const reading = useReadingStats();

  useEffect(() => {
    (async () => {
      try {
        const supa = createClient();
        const {
          data: { user },
        } = await supa.auth.getUser();
        if (user) {
          const displayName =
            (user.user_metadata?.display_name as string | undefined) ??
            (user.user_metadata?.full_name as string | undefined) ??
            user.email?.split("@")[0] ??
            null;
          setAuth({
            kind: "signed-in",
            email: user.email ?? "",
            displayName,
            joinedAt: user.created_at ?? null,
          });
        } else {
          setAuth({ kind: "anon" });
        }
      } catch {
        setAuth({ kind: "anon" });
      }
    })();

    // Reading counters live in useReadingStats; this only tracks the
    // diptych count, which nothing else on the surface reads.
    function recompute() {
      setIntentions(
        readIntentions("living").length + readIntentions("departed").length,
      );
    }
    recompute();
    function on() {
      recompute();
    }
    window.addEventListener("purify:intentions", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("purify:intentions", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const signedIn = auth.kind === "signed-in";
  // The session resolves on the device in the native build, so this is the
  // state a reader actually opens the You tab in. It used to render the whole
  // shell with an ellipsis for a name, "Loading..." for an eyebrow and four
  // empty counters, which reads as a broken screen rather than a loading one.
  const loadingAuth = auth.kind === "loading";
  const displayName = signedIn
    ? (auth.displayName ?? t("account.signedIn"))
    : t("account.localProfile");
  const memberSince = signedIn ? formatJoined(auth.joinedAt) : "";
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
  // what they have saved, and the rows below, each a thing of theirs. Settings
  // (components/settings/SettingsClient.tsx) is everything else, once: the
  // account first, then how the app reads, then data, then about Purify, then
  // Sign out. lib/nav/__tests__/oneSettings.test.ts holds both lists.
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

  if (loadingAuth) {
    return (
      <MobileShell
        header={<MobileHeader titleKey="nav.you" />}
      >
        <Skeleton weight="faint" className="h-3 w-48" />
        <Skeleton
          weight="mid"
          rounded="rounded-2xl"
          className="mt-4 aspect-[16/9] w-full"
        />
        {/* The hero card: name, member-since, a line of copy, the avatar. */}
        <Skeleton weight="mid" rounded="rounded-2xl" className="mt-6 h-[164px] w-full" />
        <div className="mt-7">
          <Skeleton weight="strong" className="h-3 w-28" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} weight="faint" rounded="rounded-2xl" className="h-[76px]" />
            ))}
          </div>
        </div>
        <SkeletonList rows={4} className="mt-7" />
      </MobileShell>
    );
  }

  return (
    <MobileShell
      header={<MobileHeader titleKey="nav.you" />}
      eyebrow={
        signedIn ? auth.email : t("ui.privateOnThisDeviceNo")
      }
    >
      {/* The Ladder of Divine Ascent, which the tab bar already nods to with
          its Klimax glyph. The personal page is about one's own ascent, and
          MobileHeroCard's tints are all neutral grey now, so this is the
          only identity the surface carries. */}
      <SectionMasthead section="you" />

      {/* A signed-in reader's own card: name, since when, the picture. A
          reader on this device alone used to get a big card here asking them
          to sign in, the third ask on the screen; from 1.7 Sign in is the
          first row of the list below and the screen opens on their own
          things (the owner's pick of 2026-10-15, "B": the picture stays on
          top, Homebase/boards/purify-master/r17/shots/ask-you-calm.png). */}
      {signedIn ? (
        <MobileHeroCard
          tint="violet"
          eyebrow={t("ui.welcomeBack")}
          kicker={memberSince ? t("ui.memberSinceDate", { date: memberSince }) : undefined}
          headline={<span>{displayName}</span>}
          body={<span>{t("ui.yourHighlightsNotesAndBookmarks")}</span>}
          aside={
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-paper/15 bg-night text-paper/65">
              <UserAvatarSmall />
            </div>
          }
        />
      ) : null}

      {/* For everyone: a reader keeps a streak on this device before they
          ever sign in. */}
      <StreakCard className="mt-5" />

      {/* Where you left off: the chapter the Bible tab would offer, in its
          own row look. Absent until there is somewhere to go back to. */}
      <BibleMobileContinue className="mt-5" heading={t("prayers.today.whereYouLeftOff")} />

      {signedIn ? (
        <div className="mt-6">
          <MobileSectionLabel>{t("ui.yourReading")}</MobileSectionLabel>
          <MobileStatGrid
            cols={2}
            stats={[
              {
                label: t("study.saved.verses"),
                value: reading.verses,
                href: "/saved?kind=verses",
              },
              {
                label: t("ui.paragraphs"),
                value: reading.paragraphs,
                href: "/saved",
              },
              {
                // Notes live in the journal (1.7), not in Saved.
                label: t("saints.notes"),
                value: reading.notes,
                href: "/journal",
              },
              {
                label: t("ui.bookmarks"),
                value: reading.bookmarks,
                href: "/saved",
              },
            ]}
          />
          <div className="mt-4">
            <SavedPreview />
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <SavedPreview />
        </div>
      )}

      {/* One quiet line, and only once there is something to say. No streak,
          no "today", no count of what was not done. */}
      {catechisms > 0 && (
        <p className="mt-4 font-serif text-detail text-paper/60">
          {tn("catechism.accountCount", catechisms)}
        </p>
      )}
      {/* And the collections seen through, one line each, for everyone. The
          only place a completion is shown outside the collections page. */}
      {completed.length > 0 && (
        <ul className={catechisms > 0 ? "mt-1 flex flex-col gap-0.5" : "mt-4 flex flex-col gap-0.5"}>
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

// Small inline icon set so SettingsList rows have a left affordance.
