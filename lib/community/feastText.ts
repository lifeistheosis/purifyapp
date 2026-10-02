// The words of the day's feast thread (lib/community/feast.ts), and the day
// it belongs to. Pure, so the tests hold them.
//
// The thread asks for the readers' own words and supplies none about the
// feast: no summary of the saint, no teaching. The library has the saint's
// life, and the thread links to it.

import type { Commemoration } from "@/lib/calendar/orthodox";

/** New York, where the day turns for the one shared feed. */
export const COMMUNITY_ZONE = "America/New_York";

/** "2026-10-02": the community's day at this instant. */
export function communityDay(now: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: COMMUNITY_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function feastThreadText(c: Pick<Commemoration, "name" | "kind" | "slug" | "saint">): {
  title: string;
  body: string;
  slug: string | null;
} {
  const name = (c.saint?.name ?? c.name).trim();
  const slug = c.saint?.slug ?? null;
  if (c.kind === "feast") {
    return {
      title: name.slice(0, 160),
      body: "Today the Church keeps this feast. Share a thought, a prayer, or a line that has stayed with you.",
      slug,
    };
  }
  return {
    title: `Today we remember ${name}`.slice(0, 160),
    body: "Share a thought, a prayer, or a line from their life that has stayed with you.",
    slug,
  };
}
