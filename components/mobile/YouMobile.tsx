"use client";

// You / Account mobile shell — "the personal dashboard."
//
// Signed-in users get a native mobile experience here (the desktop
// dashboard at /account/profile is reachable via the "Account &
// security" row), built from three concerns:
//
//   1. Identity — violet welcome-back hero: avatar, display name,
//      member-since.
//   2. Reading life — a 2×2 stat grid (verses, paragraphs, notes,
//      bookmarks) plus the most-recent saves.
//   3. Account & sync — a settings list led by Account & security,
//      then the rest (notifications, privacy, support, sign out).
//
// No streak counters or rhythm grids: the rule is the rule, the day is
// the day. Prayer life is not scored back to the user.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { MobileHeroCard } from "./MobileHeroCard";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { MobileStatGrid } from "./MobileStatGrid";
import { SectionMasthead } from "./SectionMasthead";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { SavedPreview } from "./SavedPreview";
import { SettingsList, type SettingsItem } from "./SettingsList";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { SettingsGlyph as Glyph } from "./SettingsGlyph";
import { readIntentions } from "@/lib/prayers/storage";
import { useReadingStats } from "@/lib/profile/useReadingStats";
import { useShowSupporterMark } from "@/lib/profile/useShowSupporterMark";
import { useCompletionCount } from "@/lib/catechism/useCompletionCount";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { isDeveloperEmail } from "@/lib/dev/developer";

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
    return d.toLocaleDateString(undefined, {
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
  // The community supporter mark's opt-out. Lives on the account row, so it
  // is offered only to a signed-in reader; the same toggle sits on the
  // desktop dashboard's Data tab.
  const [showMark, toggleShowMark] = useShowSupporterMark();
  const catechisms = useCompletionCount();

  const settings: SettingsItem[] = [];

  if (signedIn) {
    settings.push({
      label: t("settings.accountSecurity"),
      href: "/account/profile",
      hint: t("ui.profilePasswordSessionsDataExport"),
      icon: <Glyph kind="user" />,
    });
  } else {
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
      label: t("prayers.personal"),
      href: "/prayers/personal",
      hint:
        intentions === 0
          ? t("ui.theNamesYouCarryLiving")
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
    {
      label: t("settings.export"),
      href: "/account/export",
      hint: t("settings.exportHint"),
      icon: <Glyph kind="bolt" />,
    },
    // Was "Notifications" pointing at a tab called "Data" that held the
    // reader font, the calendar reckoning, export and delete account. The
    // notifications themselves are still there and reachable from /settings.
    {
      label: t("settings.title"),
      href: "/settings",
      // Light mode leads the hint because it is the thing readers go looking
      // for and could not find: the palette lived behind a toolbar pill inside
      // the Bible reader, and this list is where a phone reader looks first.
      hint: t("ui.lightModeReadingTheCalendar"),
      icon: <Glyph kind="bolt" />,
    },
    {
      label: t("footer.privacy"),
      href: "/privacy",
      hint: t("ui.whatWeRecordAndWhat"),
      icon: <Glyph kind="lock" />,
    },
    {
      label: t("nav.supportPurify"),
      href: "/support",
      hint: t("ui.helpKeepTheWorkGoing"),
      icon: <Glyph kind="heart" />,
    },
    {
      label: t("nav.whatsNew"),
      href: "/whats-new",
      hint: t("whatsnew.releaseNotes"),
      icon: <Glyph kind="bolt" />,
    },
    {
      label: t("nav.about"),
      href: "/about",
      hint: t("ui.whatPurifyIsAndWhy"),
      icon: <Glyph kind="cross" />,
    },
  );

  if (signedIn && isDeveloperEmail(auth.email)) {
    settings.push({
      label: t("ui.developer"),
      href: "/account/developer",
      hint: t("ui.testPremiumFeatureFlagsThemes"),
      icon: <Glyph kind="bolt" />,
    });
  }

  if (signedIn) {
    settings.push({
      label: t("common.signOut"),
      href: "/signout",
      destructive: true,
      icon: <Glyph kind="signout" />,
    });
  }

  if (loadingAuth) {
    return (
      <MobileShell
        header={<MobileHeader title={t("nav.you")} trailing={<UserAvatarSmall />} />}
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
      header={<MobileHeader title={t("nav.you")} trailing={<UserAvatarSmall />} />}
      eyebrow={
        signedIn ? auth.email : t("ui.privateOnThisDeviceNo")
      }
    >
      {/* The Ladder of Divine Ascent, which the tab bar already nods to with
          its Klimax glyph. The personal page is about one's own ascent, and
          MobileHeroCard's tints are all neutral grey now, so this is the
          only identity the surface carries. */}
      <SectionMasthead section="you" />

      <MobileHeroCard
        tint="violet"
        eyebrow={
          signedIn ? t("ui.welcomeBack") : t("account.publicAccount")
        }
        kicker={
          signedIn && memberSince
            ? t("ui.memberSinceDate", { date: memberSince })
            : undefined
        }
        headline={
          signedIn ? (
            <span>{displayName}</span>
          ) : auth.kind === "anon" ? (
            <span>{t("ui.yourReadingLifeOnThis")}</span>
          ) : (
            <span className="italic text-paper/55">…</span>
          )
        }
        body={
          signedIn ? (
            <span>
              {t("ui.yourHighlightsNotesAndBookmarks")}
            </span>
          ) : auth.kind === "anon" ? (
            <span>
              {t("ui.everythingYouSaveLivesIn")}
            </span>
          ) : null
        }
        aside={
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-paper/15 bg-night text-paper/65">
            <UserAvatarSmall />
          </div>
        }
        actions={
          !signedIn && auth.kind === "anon" ? (
            <div className="mt-4 pt-4 border-t border-paper/8">
              <Link
                href="/signin?next=/account"
                className="block w-full text-center rounded-full bg-paper text-night px-4 py-2.5 font-sans text-ui font-semibold"
              >
                {t("common.signIn")}
              </Link>
            </div>
          ) : undefined
        }
      />

      {signedIn ? (
        <div className="mt-6">
          <MobileSectionLabel>{t("ui.yourReading")}</MobileSectionLabel>
          <MobileStatGrid
            cols={2}
            stats={[
              {
                label: t("study.saved.verses"),
                value: reading.verses,
                href: "/saved",
              },
              {
                label: t("ui.paragraphs"),
                value: reading.paragraphs,
                href: "/saved",
              },
              {
                label: t("saints.notes"),
                value: reading.notes,
                href: "/saved",
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

      <div className="mt-7">
        <MobileSectionLabel>
          {signedIn ? t("nav.account") : t("settings.title")}
        </MobileSectionLabel>
        <SettingsList items={settings} />
        {signedIn ? (
          <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-paper/10 bg-paper/[0.03] px-4 py-3.5">
            <div className="min-w-0">
              <p className="font-sans text-ui leading-tight text-paper">
                {t("settings.showSupporterMark")}
              </p>
              <p className="mt-0.5 font-sans text-caption leading-tight text-paper/55">
                {t("settings.showSupporterMarkHint")}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleShowMark}
              aria-pressed={showMark}
              className={
                "inline-flex h-[36px] shrink-0 items-center gap-2 rounded-pill border px-4 font-sans text-detail font-medium transition-colors " +
                (showMark
                  ? "border-gold bg-gold text-night"
                  : "border-paper/15 bg-paper/[0.04] text-paper/85")
              }
            >
              <span
                aria-hidden
                className={
                  "inline-block h-2 w-2 rounded-full " +
                  (showMark ? "bg-night" : "bg-paper/30")
                }
              />
              {showMark ? t("common.on") : t("common.off")}
            </button>
          </div>
        ) : null}
      </div>
    </MobileShell>
  );
}

// Small inline icon set so SettingsList rows have a left affordance.
