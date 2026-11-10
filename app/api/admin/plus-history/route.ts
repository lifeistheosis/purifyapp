import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { readPlusFacts } from "@/lib/admin/plusEvents.server";
import { byDay, byWeek, inTrialNow, setAside, tally, utcDay, weekOf, type PlusTally } from "@/lib/admin/plusHistory";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Money > Subscriptions, Plus over time (admin item A2): who joined and who
 * left each week, which free trials paid, what Plus brought in each day, and
 * who is in a free trial now, from the kept RevenueCat events
 * (lib/admin/plusHistory.ts says what each word counts).
 *
 * Only what the events cover is shown: the weeks and days from the first
 * kept event on. Before it nothing was kept, which is not the same as no
 * Plus. Until the 1.9 release has run supabase/migrations/20261110002920_plus_events.sql the answer
 * is { state: "absent" }, never empty weeks.
 *
 * Admin only: 403 to anyone else.
 */

const WEEKS = 12;
const DAYS = 30;
/** Far enough back for the twelve weeks and for any trial still running. */
const LOOKBACK_DAYS = 100;

export type PlusWeek = { week: string } & PlusTally;
export type PlusDay = { day: string; grossCents: number; afterStoreCents: number };

export type PlusHistoryPayload =
  | { state: "absent" }
  | { state: "unavailable" }
  | {
      state: "ok";
      /** When the first event was kept (ISO), or null when none has been yet. */
      since: string | null;
      /** The weeks the events cover, oldest first, up to twelve. */
      weeks: PlusWeek[];
      /** The days the events cover, oldest first, up to thirty. */
      days: PlusDay[];
      /** The last 30 days (or since the first event), together. */
      last30: PlusTally;
      /** Members in a free trial now: Plus, and nothing paid yet. */
      inTrial: number;
      /** Events set aside in the same days: test money, and RevenueCat's promotional grants. */
      setAside: { test: number; grants: number };
    };

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const read = await readPlusFacts(createAdminClient(), new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString());
  const headers = { "Cache-Control": "no-store" };
  if (read.state !== "ok") return NextResponse.json({ state: read.state } satisfies PlusHistoryPayload, { headers });

  const firstDay = read.since ? utcDay(read.since) : null;
  const firstWeek = read.since ? weekOf(read.since) : null;
  const days = firstDay ? byDay(read.facts, now, DAYS).filter((d) => d.day >= firstDay) : [];
  const dayStart = days[0]?.day ?? null;
  const recent = dayStart ? read.facts.filter((f) => utcDay(f.event_at) >= dayStart) : [];

  const payload: PlusHistoryPayload = {
    state: "ok",
    since: read.since,
    weeks: firstWeek ? byWeek(read.facts, now, WEEKS).filter((w) => w.week >= firstWeek) : [],
    days,
    last30: tally(recent),
    inTrial: inTrialNow(read.facts, now).size,
    setAside: setAside(recent),
  };
  return NextResponse.json(payload, { headers });
}
