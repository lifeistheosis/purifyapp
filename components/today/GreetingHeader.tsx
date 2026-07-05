"use client";

import { useMounted } from "@/lib/useMounted";

/**
 * Warm, time-aware greeting at the top of the mobile Today shell — the
 * meditation-app "Good morning" pattern, adapted to Purify's reverent
 * register. The greeting is derived from the user's LOCAL hour on the
 * client (the server renders in UTC, so a time-of-day greeting must be
 * resolved after mount). Until then it falls back to the neutral first
 * option, so there is no layout shift, only a word settling in.
 *
 * `dateline` is the already-localized long date from the server.
 */
export function GreetingHeader({
  dateline,
  isDe = false,
}: {
  dateline: string;
  isDe?: boolean;
}) {
  // Local hour exists only on the client; until mounted, fall back to the
  // neutral morning option so server and hydration renders agree.
  const mounted = useMounted();

  const greet = (() => {
    const h = mounted ? new Date().getHours() : 8;
    if (isDe) {
      if (h < 12) return "Guten Morgen";
      if (h < 18) return "Guten Tag";
      return "Guten Abend";
    }
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <header className="mb-5">
      <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/45">
        {dateline}
      </p>
      <h1 className="mt-1.5 font-serif text-heading leading-[1.1] text-paper">
        {greet}
      </h1>
      <p className="mt-1 font-sans text-detail text-paper/55">
        {isDe
          ? "Bleibe heute im Gebet."
          : "May you abide in prayer today."}
      </p>
    </header>
  );
}
