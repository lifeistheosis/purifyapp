"use client";

// You / Account mobile shell. Renders client-side so it can read
// localStorage (rule rhythm, bookmark counts) and surface the signed-in
// state from Supabase auth.
//
// Reworked with a profile-led hero card (avatar + display name +
// member-since) and a 2x2 stat grid below, matching the Today / Bible /
// Discover / Prayers vocabulary while giving /you its own colour
// identity (violet tint).

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MobileShell } from "./MobileShell";
import { MobileTimeline } from "./MobileTimeline";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { MobileHeroCard } from "./MobileHeroCard";
import { MobileStatGrid } from "./MobileStatGrid";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import {
  readPrayedDates,
  readIntentions,
  readRopeSessions,
} from "@/lib/prayers/storage";

type AuthState =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "signed-in"; email: string; displayName: string; joinedAt: string | null };

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
    bookmarks: 0,
    intentions: 0,
    ropeKnotsYTD: 0,
  });
  const [savedPreview, setSavedPreview] = useState<
    { id: string; label?: string }[]
  >([]);

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
      let bookmarks = 0;
      let preview: { id: string; label?: string }[] = [];
      try {
        const raw = localStorage.getItem("purify:bookmarks");
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          bookmarks = parsed.length;
          preview = parsed.slice(0, 3) as { id: string; label?: string }[];
        }
      } catch {
        /* ignore */
      }
      const intentions =
        readIntentions("living").length + readIntentions("departed").length;
      const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
      const ropeKnotsYTD = readRopeSessions()
        .filter((s) => Date.parse(s.startedAt) >= yearStart)
        .reduce((a, s) => a + s.knots, 0);
      setCounts({
        morningLast14,
        eveningLast14,
        bookmarks,
        intentions,
        ropeKnotsYTD,
      });
      setSavedPreview(preview);
    }
    recompute();
    function on() {
      recompute();
    }
    window.addEventListener("purify:prayer-completed", on);
    window.addEventListener("purify:bookmark", on);
    window.addEventListener("purify:intentions", on);
    window.addEventListener("purify:rope", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("purify:prayer-completed", on);
      window.removeEventListener("purify:bookmark", on);
      window.removeEventListener("purify:intentions", on);
      window.removeEventListener("purify:rope", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const signedIn = auth.kind === "signed-in";
  const displayName = signedIn ? auth.displayName : "Local profile";
  const memberSince = signedIn ? formatJoined(auth.joinedAt) : "";

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
              Your bookmarks, highlights, prayer rhythm, and bumps are kept
              with your account and synced across every device you sign in on.
            </span>
          ) : auth.kind === "anon" ? (
            <span>
              Everything you save lives in this browser. Sign in to carry it
              across devices &mdash; or keep it local; both paths are honoured.
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
              label: "Bookmarks",
              value: counts.bookmarks,
              href: "/saved",
            },
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

      <div className="mt-7">
        <MobileSectionLabel>Saved &amp; settings</MobileSectionLabel>
        <MobileTimeline>
          {[
            <MobileCard
              key="saved"
              eyebrow={`Saved · ${counts.bookmarks}`}
              title="Verses, chapters, writing sections"
              href="/saved"
            >
              {savedPreview.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {savedPreview.map((b) => (
                    <li
                      key={b.id}
                      className="font-sans text-[13px] text-paper/75 truncate"
                    >
                      {b.label ?? "Bookmark"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 font-sans text-[13.5px] text-paper/55 italic">
                  Nothing saved yet. Tap the heart on any verse to bookmark it.
                </p>
              )}
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open saved &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="diptychs"
              eyebrow="Diptychs"
              title={`${counts.intentions} names`}
              href="/prayers/personal"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                The people, living and reposed, you carry through the rule.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open diptychs &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="account"
              eyebrow={signedIn ? "Account" : "Sign in"}
              title={
                signedIn ? "Manage your account" : "Sync across devices"
              }
              href={signedIn ? "/account" : "/signin?next=/account"}
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                {signedIn
                  ? "Email, password, sessions, data export, sign out."
                  : "Optional. Local-first still works without an account."}
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open account &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="preferences"
              eyebrow="Preferences"
              title="Font, calendar style, interlinear"
              href="/account#preferences"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                Reader preferences carry across the Bible and the saint
                writings.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open preferences &rarr;
              </p>
            </MobileCard>,
          ]}
        </MobileTimeline>
      </div>

      <div className="mt-7">
        <MobileSectionLabel>The project</MobileSectionLabel>
        <MobileTimeline>
          {[
            <MobileCard
              key="support"
              eyebrow="Support"
              title="Help keep the work going"
              href="/support"
              tint="gold"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                The core stays free. Donations cover hosting, licensing, and
                iconographer commissions.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open support &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="whats-new"
              eyebrow="What's new"
              title="Release notes"
              href="/whats-new"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                Patch notes from the Purify team.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open release notes &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="about"
              eyebrow="About"
              title="What Purify is, and why"
              href="/about"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                One quiet home for the Orthodox life between Liturgies.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open about &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="privacy"
              eyebrow="Privacy"
              title="What we record and what we don't"
              href="/privacy"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                No third-party trackers, no ads, no behavioural profile.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open privacy &rarr;
              </p>
            </MobileCard>,
          ]}
        </MobileTimeline>
      </div>
    </MobileShell>
  );
}
