import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { summarizeOnboarding, type OnboardingRow, type OnboardingSummary } from "@/lib/admin/onboardingSummary";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type OnboardingAdminPayload =
  | ({ absent: false; truncated: boolean } & OnboardingSummary)
  | { absent: true }
  | { unavailable: string };

const DAY = 86_400_000;
const ONBOARDING_EVENTS = [
  "onboarding_step",
  "onboarding_answer",
  "onboarding_skipped",
  "onboarding_finished",
  "onboarding_dayone",
  "onboarding_returned",
];
/** Rows are read a page at a time; past this many, the sums say they are partial. */
const MAX_ROWS = 50_000;
const PAGE = 1_000;

// Reach > Onboarding: the welcome questions' counts (lib/onboarding/count.ts),
// summed (lib/admin/onboardingSummary.ts). Only onboarding_* rows of
// analytics_events are read, and nothing in them names a reader. The window
// is 7, 30 or 90 days; the 30 days before it are read too, because finishes
// from then are what the return counts are measured against.
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const asked = Number(new URL(req.url).searchParams.get("days"));
  const days = asked === 7 || asked === 90 ? asked : 30;
  const now = new Date();
  const from = new Date(now.getTime() - (days + 30) * DAY).toISOString();

  const supa = createAdminClient();
  const rows: OnboardingRow[] = [];
  let truncated = false;
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supa
      .from("analytics_events")
      .select("name, props, ts")
      .in("name", ONBOARDING_EVENTS)
      .gte("ts", from)
      // Then by id: onboarding rows are kept to the day, so every row of a day
      // has the same time, and pages cut through a tie may repeat a row or
      // skip one (lib/supabase/pageAll.ts).
      .order("ts", { ascending: true })
      .order("id", { ascending: true })
      .range(start, start + PAGE - 1);
    if (error) {
      const payload: OnboardingAdminPayload = isTableAbsent(error) ? { absent: true } : { unavailable: error.message };
      return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
    }
    rows.push(...((data ?? []) as OnboardingRow[]));
    if (!data || data.length < PAGE) break;
    if (rows.length >= MAX_ROWS) {
      truncated = true;
      break;
    }
  }

  const payload: OnboardingAdminPayload = { absent: false, truncated, ...summarizeOnboarding(rows, now, days) };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
