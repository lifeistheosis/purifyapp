"use client";

// You / Account mobile shell — "the personal dashboard."
//
//   1. Violet profile hero (avatar + display name + member-since).
//   2. 3-tile MobileStatGrid (Morning 14d / Evening 14d / Knots YTD).
//      Bookmarks moved into the SavedPreview block below so the stat
//      grid stays focused on the prayer life.
//   3. RhythmHeatmap — 30 cells, one per day, lit when prayed.
//   4. SavedPreview — three most-recent bookmarks with kind chips.
//   5. SettingsList — iOS-style row list (Account, Notifications,
//      Language, Privacy, Support, What's new, About, Sign out).

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MobileShell } from "./MobileShell";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { MobileHeroCard } from "./MobileHeroCard";
import { MobileStatGrid } from "./MobileStatGrid";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { RhythmHeatmap } from "./RhythmHeatmap";
import { SavedPreview } from "./SavedPreview";
import { SettingsList, type SettingsItem } from "./SettingsList";
import {
  readPrayedDates,
  readIntentions,
  readRopeSessions,
} from "@/lib/prayers/storage";

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
  const [auth, setAuth] = useState<AuthState>({ kind: "loading" });
  const [counts, setCounts] = useState({
    morningLast14: 0,
    eveningLast14: 0,
    intentions: 0,
    ropeKnotsYTD: 0,
  });

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

    function recompute() {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const within = (d: string) => new Date(d + "T00:00:00") >= cutoff;
      const morningLast14 = readPrayedDates("morning").filter(within).length;
      const eveningLast14 = readPrayedDates("evening").filter(within).length;
      const intentions =
        readIntentions("living").length + readIntentions("departed").length;
      const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
      const ropeKnotsYTD = readRopeSessions()
        .filter((s) => Date.parse(s.startedAt) >= yearStart)
        .reduce((a, s) => a + s.knots, 0);
      setCounts({
        morningLast14,
        eveningLast14,
        intentions,
        ropeKnotsYTD,
      });
    }
    recompute();
    function on() {
      recompute();
    }
    window.addEventListener("purify:prayer-completed", on);
    window.addEventListener("purify:intentions", on);
    window.addEventListener("purify:rope", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("purify:prayer-completed", on);
      window.removeEventListener("purify:intentions", on);
      window.removeEventListener("purify:rope", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const signedIn = auth.kind === "signed-in";
  const displayName = signedIn ? auth.displayName : "Local profile";
  const memberSince = signedIn ? formatJoined(auth.joinedAt) : "";

  const settings: SettingsItem[] = [
    {
      label: signedIn ? "Account" : "Sign in",
      href: signedIn ? "/account" : "/signin?next=/account",
      hint: signedIn ? "Email, password, sessions, data export" : "Sync across devices (optional)",
      icon: <Glyph kind="user" />,
    },
    {
      label: "Diptychs",
      href: "/prayers/personal",
      hint: `${counts.intentions} names you carry`,
      icon: <Glyph kind="halo" />,
    },
    {
      label: "Notifications",
      href: "/account/(signed)/data",
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
      label: "Support",
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
  ];

  if (signedIn) {
    settings.push({
      label: "Sign out",
      href: "/auth/signout",
      destructive: true,
      icon: <Glyph kind="signout" />,
    });
  }

  return (
    <MobileShell
      header={<MobileHeader title="You" trailing={<UserAvatarSmall />} />}
      eyebrow={
        signedIn
          ? auth.email
          : auth.kind === "anon"
            ? "Local profile · no account"
            : "Loading…"
      }
    >
      <MobileHeroCard
        tint="violet"
        eyebrow={signedIn ? "Signed in" : "Sign in to sync"}
        kicker={signedIn && memberSince ? `Member since ${memberSince}` : undefined}
        headline={
          signedIn ? (
            <span>{displayName}</span>
          ) : auth.kind === "anon" ? (
            <span>Your reading life, on this device.</span>
          ) : (
            <span className="italic text-paper/55">…</span>
          )
        }
        body={
          signedIn ? (
            <span>
              Your bookmarks, highlights, prayer rhythm, and bumps stay with
              your account, synced across every device you sign in on.
            </span>
          ) : auth.kind === "anon" ? (
            <span>
              Everything you save lives in this browser. Sign in to carry it
              across devices, or keep it local; both paths are honoured.
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
                className="block w-full text-center rounded-full bg-paper text-night px-4 py-2.5 font-sans text-[14px] font-semibold"
              >
                Sign in
              </Link>
            </div>
          ) : undefined
        }
        href={signedIn ? "/account" : undefined}
      />

      <div className="mt-5">
        <MobileStatGrid
          stats={[
            {
              label: "Morning · 14d",
              value: counts.morningLast14,
              href: "/prayers/morning",
              accent: counts.morningLast14 >= 10,
            },
            {
              label: "Evening · 14d",
              value: counts.eveningLast14,
              href: "/prayers/evening",
              accent: counts.eveningLast14 >= 10,
            },
            {
              label: "Knots · YTD",
              value: counts.ropeKnotsYTD.toLocaleString(),
              href: "/prayers/rope",
            },
          ]}
        />
      </div>

      <div className="mt-5">
        <RhythmHeatmap />
      </div>

      <div className="mt-5">
        <SavedPreview />
      </div>

      <div className="mt-7">
        <MobileSectionLabel>Settings</MobileSectionLabel>
        <SettingsList items={settings} />
      </div>

      <div className="mt-7">
        <MobileCard
          eyebrow="Diptychs"
          title="The names you carry"
          href="/prayers/personal"
          tint="gold"
        >
          <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.5]">
            {counts.intentions === 0
              ? "Add the people you pray for, living and reposed."
              : `${counts.intentions} names. Anniversaries and namedays surface on /prayers/today.`}
          </p>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

// Small inline icon set so SettingsList rows have a left affordance.
function Glyph({
  kind,
}: {
  kind: "user" | "halo" | "bell" | "lock" | "heart" | "bolt" | "cross" | "signout";
}) {
  const props = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "user":
      return (
        <svg {...props}>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "halo":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "lock":
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "heart":
      return (
        <svg {...props}>
          <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...props}>
          <path d="M13 2 3 14h8l-1 8 10-12h-8z" />
        </svg>
      );
    case "cross":
      return (
        <svg {...props}>
          <path d="M12 3v18" />
          <path d="M5 8h14" />
        </svg>
      );
    case "signout":
      return (
        <svg {...props}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
  }
}
