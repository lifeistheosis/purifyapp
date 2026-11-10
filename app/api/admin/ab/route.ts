import { NextResponse } from "next/server";

import { tally, verdict } from "@/lib/ab/bandit";
import { panelOf, type TestPanel } from "@/lib/ab/panel";
import { readAbRows } from "@/lib/ab/read";
import { AB_PLANNED, AB_TESTS, runningTest, type PlannedTest } from "@/lib/ab/tests";
import { getAdminUser } from "@/lib/admin/access";
import { roadsBuilt } from "@/lib/onboarding/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type AbAdminPayload = { tests: TestPanel[]; planned: readonly PlannedTest[] } | { unavailable: string };

// Reach > Onboarding, "Tests": every registered test as the admin reads it
// (lib/ab/panel.ts): its question, each version's totals with nothing small
// shown, today's shares, and where it stands. Only the two kinds of row a
// test sends are read, and nothing in them names a reader.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const read = await readAbRows(AB_TESTS);
  if (!read) {
    const payload: AbAdminPayload = { unavailable: "The counts could not be read." };
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  }
  const today = new Date().toISOString().slice(0, 10);
  const lit = { roads: roadsBuilt() };
  const payload: AbAdminPayload = {
    tests: AB_TESTS.map((test) => {
      const tallies = tally(test, read.rows, today);
      const running = runningTest(test.surface, today, lit)?.id === test.id;
      return panelOf(test, tallies, verdict(test, tallies, today), running);
    }),
    planned: AB_PLANNED,
  };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
