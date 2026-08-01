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
import { SettingsGlyph as Glyph } from "./SettingsGlyph";
import { readIntentions } from "@/lib/prayers/storage";
import { useReadingStats } from "@/lib/profile/useReadingStats";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";

type AuthState =
  | { kind: "loading" }
  | { kind: "anon" }
  | {
      kind: "signed-in";
      email: string;
      displayName: string;
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
  const { t } = useTranslate();
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
            "Signed in";
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
  const displayName = signedIn ? auth.displayName : "On this device";
  const memberSince = signedIn ? formatJoined(auth.joinedAt) : "";
  const tier = usePremiumTier();

  const settings: SettingsItem[] = [];

  if (signedIn) {
    settings.push({
      label: "Account & security",
      href: "/account/profile",
      hint: "Profile, password, sessions, data export",
      icon: <Glyph kind="user" />,
    });
  } else {
    settings.push({
      label: "Sign in",
      href: "/signin?next=/account",
      hint: "Sync across devices (optional)",
      icon: <Glyph kind="user" />,
    });
  }

  settings.push({
    label: "Purify Premium",
    href: "/pricing",
    hint: "Plus and Pro: sync, collections, the members' layer",
    icon: <Glyph kind="sparkle" />,
  });

  // The Pro perk, directly under the tier it belongs to, so it reads as a
  // membership benefit rather than a stray link. Hidden entirely for
  // everyone else: an unclaimable row is worse than no row.
  if (eikonBoxEnabled() && tier === "pro") {
    settings.push({
      label: "Claim your EIKON Box",
      href: "/account/eikon-box",
      hint: "This month's box, and where it ships",
      icon: <Glyph kind="box" />,
    });
  }

  settings.push(
    {
      label: "Diptychs",
      href: "/prayers/personal",
      hint:
        intentions === 0
          ? "The names you carry, living and reposed"
          : `${intentions} names you carry`,
      icon: <Glyph kind="halo" />,
    },
    // These two used to exist only on the desktop dashboard's settings
    // list. That list no longer renders on a phone, so they live here now
    // rather than nowhere.
    ...(campaignsEnabled()
      ? [
          {
            label: "My prayers",
            href: "/campaigns/mine",
            hint: "Campaigns you pray with the community",
            icon: <Glyph kind="halo" />,
          } satisfies SettingsItem,
        ]
      : []),
    {
      label: "Export your library",
      href: "/account/export",
      hint: "Download everything you have gathered",
      icon: <Glyph kind="bolt" />,
    },
    {
      label: "Notifications",
      href: "/account/data",
      hint: "Prayer reminders, off by default",
      icon: <Glyph kind="bell" />,
    },
    {
      label: "Privacy",
      href: "/privacy",
      hint: "What we record and what we don't",
      icon: <Glyph kind="lock" />,
    },
    {
      label: "Support Purify",
      href: "/support",
      hint: "Help keep the work going",
      icon: <Glyph kind="heart" />,
    },
    {
      label: "What's new",
      href: "/whats-new",
      hint: "Release notes",
      icon: <Glyph kind="bolt" />,
    },
    {
      label: "About",
      href: "/about",
      hint: "What Purify is, and why",
      icon: <Glyph kind="cross" />,
    },
  );

  if (signedIn) {
    settings.push({
      label: "Sign out",
      href: "/signout",
      destructive: true,
      icon: <Glyph kind="signout" />,
    });
  }

  return (
    <MobileShell
      header={<MobileHeader title={t("nav.you")} trailing={<UserAvatarSmall />} />}
      eyebrow={
        signedIn
          ? auth.email
          : auth.kind === "anon"
            ? "Private on this device · no account needed"
            : "Loading…"
      }
    >
      {/* The Ladder of Divine Ascent, which the tab bar already nods to with
          its Klimax glyph. The personal page is about one's own ascent, and
          MobileHeroCard's tints are all neutral grey now, so this is the
          only identity the surface carries. */}
      <SectionMasthead section="you" />

      <MobileHeroCard
        tint="violet"
        eyebrow={signedIn ? "Welcome back" : "Sign in to sync"}
        kicker={
          signedIn && memberSince ? `Member since ${memberSince}` : undefined
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
              { label: "Verses", value: reading.verses, href: "/saved" },
              {
                label: "Paragraphs",
                value: reading.paragraphs,
                href: "/saved",
              },
              { label: "Notes", value: reading.notes, href: "/saved" },
              { label: "Bookmarks", value: reading.bookmarks, href: "/saved" },
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

      <div className="mt-7">
        <MobileSectionLabel>
          {signedIn ? "Account" : "Settings"}
        </MobileSectionLabel>
        <SettingsList items={settings} />
      </div>
    </MobileShell>
  );
}

// Small inline icon set so SettingsList rows have a left affordance.
