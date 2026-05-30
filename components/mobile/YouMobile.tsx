"use client";

// You / Account mobile shell. Renders client-side so it can read
// localStorage (rule rhythm, bookmark counts) and surface the signed-in
// state from Supabase auth.
//
// The dark-card vocabulary stays the same as Today / Bible / Discover /
// Prayers so the bottom-tab navigation feels like one shell, not five.

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MobileShell } from "./MobileShell";
import { MobileTimeline } from "./MobileTimeline";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import {
  readPrayedDates,
  readIntentions,
  readRopeSessions,
} from "@/lib/prayers/storage";

type AuthState =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "signed-in"; email: string };

export function YouMobile() {
  const [auth, setAuth] = useState<AuthState>({ kind: "loading" });
  const [counts, setCounts] = useState({
    morningLast14: 0,
    eveningLast14: 0,
    bookmarks: 0,
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
        setAuth(
          user
            ? { kind: "signed-in", email: user.email ?? "Signed in" }
            : { kind: "anon" },
        );
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
      try {
        const raw = localStorage.getItem("purify:bookmarks");
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) bookmarks = parsed.length;
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

  return (
    <MobileShell
      header={<MobileHeader title="You" trailing={<UserAvatarSmall />} />}
      eyebrow={
        auth.kind === "signed-in"
          ? auth.email
          : auth.kind === "anon"
            ? "Local profile"
            : "Loading…"
      }
    >
      <MobileTimeline>
        {[
          <MobileCard
            key="rhythm"
            eyebrow="Rhythm · last 14 days"
            title={`${counts.morningLast14}m · ${counts.eveningLast14}e`}
            href="/prayers/today"
            tint="warm"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              Morning rule done on {counts.morningLast14} of the last 14 days,
              evening on {counts.eveningLast14}. No streak, just the pattern.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open today →
            </p>
          </MobileCard>,
          <MobileCard
            key="rope"
            eyebrow="Prayer rope · this year"
            title={`${counts.ropeKnotsYTD.toLocaleString()} knots`}
            href="/prayers/rope"
            tint="gold"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              Lifetime-of-the-year knots. The only counter that never resets.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open the rope →
            </p>
          </MobileCard>,
          <MobileCard
            key="saved"
            eyebrow="Saved"
            title={`${counts.bookmarks} bookmarks`}
            href="/saved"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              Verses, chapters, prayers, and writing sections you&rsquo;ve
              starred.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open saved →
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
              Open diptychs →
            </p>
          </MobileCard>,
          <MobileCard
            key="account"
            eyebrow={auth.kind === "signed-in" ? "Account" : "Sign in"}
            title={auth.kind === "signed-in" ? "Manage your account" : "Sync across devices"}
            href="/account"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              {auth.kind === "signed-in"
                ? "Email, password, sessions, data export, sign out."
                : "Optional. Local-first still works without an account."}
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open account →
            </p>
          </MobileCard>,
          <MobileCard
            key="support"
            eyebrow="Support"
            title="Help keep the work going"
            href="/support"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              The core stays free. Donations cover hosting, licensing, and
              iconographer commissions.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open support →
            </p>
          </MobileCard>,
          <MobileCard
            key="whats-new"
            eyebrow="What's new"
            title="The release notes"
            href="/whats-new"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              Patch notes from the Purify team.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open release notes →
            </p>
          </MobileCard>,
        ]}
      </MobileTimeline>
    </MobileShell>
  );
}
