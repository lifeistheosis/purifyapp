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
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { SavedPreview } from "./SavedPreview";
import { SettingsList, type SettingsItem } from "./SettingsList";
import { readIntentions } from "@/lib/prayers/storage";

type AuthState =
  | { kind: "loading" }
  | { kind: "anon" }
  | {
      kind: "signed-in";
      email: string;
      displayName: string;
      joinedAt: string | null;
    };

type ReadingStats = {
  verses: number;
  paragraphs: number;
  notes: number;
  bookmarks: number;
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

/** Scan localStorage for the same reading counters the desktop dashboard shows. */
function readReadingStats(): ReadingStats {
  let verses = 0;
  let paragraphs = 0;
  let notes = 0;
  let bookmarks = 0;
  if (typeof window === "undefined")
    return { verses, paragraphs, notes, bookmarks };
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      try {
        if (k.startsWith("purify:bible:")) {
          const v = JSON.parse(window.localStorage.getItem(k) ?? "{}");
          if (v.highlighted) verses++;
          if (typeof v.note === "string" && v.note.trim().length > 0) notes++;
        } else if (k.startsWith("purify:saint:")) {
          const v = JSON.parse(window.localStorage.getItem(k) ?? "{}");
          if (v.highlighted) paragraphs++;
          if (typeof v.note === "string" && v.note.trim().length > 0) notes++;
        }
      } catch {
        /* skip malformed key */
      }
    }
    const raw = window.localStorage.getItem("purify:bookmarks");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) bookmarks = arr.length;
    }
  } catch {
    /* storage blocked */
  }
  return { verses, paragraphs, notes, bookmarks };
}

export function YouMobile() {
  const [auth, setAuth] = useState<AuthState>({ kind: "loading" });
  const [intentions, setIntentions] = useState(0);
  const [reading, setReading] = useState<ReadingStats>({
    verses: 0,
    paragraphs: 0,
    notes: 0,
    bookmarks: 0,
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
      setIntentions(
        readIntentions("living").length + readIntentions("departed").length,
      );
      setReading(readReadingStats());
    }
    recompute();
    function on() {
      recompute();
    }
    window.addEventListener("purify:intentions", on);
    window.addEventListener("purify:annotation", on);
    window.addEventListener("purify:bookmark", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("purify:intentions", on);
      window.removeEventListener("purify:annotation", on);
      window.removeEventListener("purify:bookmark", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const signedIn = auth.kind === "signed-in";
  const displayName = signedIn ? auth.displayName : "Local profile";
  const memberSince = signedIn ? formatJoined(auth.joinedAt) : "";

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
        eyebrow={signedIn ? "Welcome back" : "Sign in to sync"}
        kicker={
          signedIn && memberSince ? `Member since ${memberSince}` : undefined
        }
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
              Your highlights, notes, and bookmarks sync to every device you
              sign in on. Manage your profile, password, and sessions below.
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
                className="block w-full text-center rounded-full bg-paper text-night px-4 py-2.5 font-sans text-ui font-semibold"
              >
                Sign in
              </Link>
            </div>
          ) : undefined
        }
      />

      {signedIn ? (
        <div className="mt-6">
          <MobileSectionLabel>Your reading</MobileSectionLabel>
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
