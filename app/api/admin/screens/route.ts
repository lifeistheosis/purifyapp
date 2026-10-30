import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { AT_ONCE, readScreenEvents, readTabPlaces, readTabs } from "@/lib/admin/screensRead";
import {
  WHERES,
  finishViews,
  newViewTally,
  screenSentences,
  summarizeScreenEvents,
  tallyTab,
  type EventSums,
  type ViewSums,
  type Where,
} from "@/lib/admin/screensSummary";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ScreensPlace = { views: ViewSums; events: EventSums; sentences: string[] };

export type ScreensAdminPayload =
  | {
      absent: false;
      days: number;
      countedAt: string;
      /** Page views read; `cutAt` is the oldest, when only the newest could be read. */
      pageviews: { rows: number; cutAt: string | null };
      /** The screens' own counts read: absent when the events table is, partial past the cap. */
      events: { absent: boolean; rows: number; truncated: boolean };
      where: Record<Where, ScreensPlace>;
    }
  | { absent: true }
  | { unavailable: string };

const DAY = 86_400_000;
/** A count is kept this long, so moving between the periods does not read it all again. */
const KEEP_MS = 10 * 60_000;
const kept = new Map<number, { at: number; payload: Promise<ScreensAdminPayload> }>();

// Traffic > Screens (1.8): each screen's views, where visits end, the time on
// it and where readers go next, from the page views the site already keeps
// (lib/admin/screensRead.ts reads them, lib/admin/screensSummary.ts sums them),
// and the screens' own counts, which name no reader. Admin only, like
// /api/admin/onboarding. The window is 7, 30 or 90 days; the 30 days before it
// are read for the first opens a return is measured against.
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const asked = Number(new URL(req.url).searchParams.get("days"));
  const days = asked === 7 || asked === 90 ? asked : 30;

  const hit = kept.get(days);
  if (hit && Date.now() - hit.at < KEEP_MS) {
    return NextResponse.json(await hit.payload, { headers: { "Cache-Control": "no-store" } });
  }
  const payload = count(days);
  kept.set(days, { at: Date.now(), payload });
  const answer = await payload;
  if ("unavailable" in answer) kept.delete(days);
  return NextResponse.json(answer, { headers: { "Cache-Control": "no-store" } });
}

async function count(days: number): Promise<ScreensAdminPayload> {
  const now = new Date();
  const since = new Date(now.getTime() - days * DAY);
  try {
    const db = createAdminClient();
    const tabs = await readTabs(db, since.toISOString());
    // The places and the counts side by side, two lanes each, so the
    // database still sees four requests at a time.
    const half = Math.max(1, AT_ONCE >> 1);
    const [places, events] = await Promise.all([
      readTabPlaces(db, tabs.cutAt ?? since.toISOString(), half),
      readScreenEvents(db, new Date(since.getTime() - 30 * DAY), now, half).catch((e: unknown) => {
        if (isTableAbsent(e as { code?: string; message?: string })) return null;
        throw e;
      }),
    ]);

    const tallies = { all: newViewTally(), apps: newViewTally(), web: newViewTally() };
    tabs.eachTab((tab, steps) => {
      tallyTab(tallies.all, steps, now.getTime());
      const place = places.get(tab);
      if (place) tallyTab(tallies[place], steps, now.getTime());
    });
    const sums = summarizeScreenEvents(events?.rows ?? [], now, days);

    const where = Object.fromEntries(
      WHERES.map((w) => {
        const views = finishViews(tallies[w]);
        return [w, { views, events: sums[w], sentences: screenSentences(views, sums[w], days) }];
      }),
    ) as Record<Where, ScreensPlace>;

    return {
      absent: false,
      days,
      countedAt: now.toISOString(),
      pageviews: { rows: tabs.rows, cutAt: tabs.cutAt },
      events: { absent: events === null, rows: events?.rows.length ?? 0, truncated: events?.truncated ?? false },
      where,
    };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (isTableAbsent(err)) return { absent: true };
    console.error("[admin/screens] read failed", err.message);
    return { unavailable: err.message ?? "The page views could not be read." };
  }
}
