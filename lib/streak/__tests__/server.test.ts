// A streak is walked from every day the reader kept, however many there are.
//
// The API returns at most 1,000 rows a request, from a function as from a
// table, and says nothing when it stops (docs/audit/findings.yaml F-31).
// reader_kept_days answers oldest first, so read in one request its
// thousandth day was the last one the walk saw: a reader who had kept a
// thousand days and was still keeping them would have been shown a streak
// that had ended. The stand-in here caps the way the real API does.

import { describe, expect, it } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

import { refreshStreak } from "../server";

const DAY = 86_400_000;
const now = new Date("2026-10-04T12:00:00Z");
const dayAgo = (n: number) => new Date(now.getTime() - n * DAY).toISOString().slice(0, 10);

describe("refreshStreak", () => {
  it("sees a streak longer than a thousand days as still going", async () => {
    const kept = Array.from({ length: 1200 }, (_, i) => ({ day: dayAgo(1199 - i) }));
    const { client, requests } = cappedApi({ reader_streaks: [] }, { reader_kept_days: () => kept });
    const out = await refreshStreak(client, "reader", "UTC", now);
    expect(out).toMatchObject({ state: "ok", current: 1200, best: 1200, keptToday: true, lastKept: "2026-10-04" });
    expect(requests.filter((r) => r.table === "reader_kept_days").map((r) => r.rows)).toEqual([1000, 200]);
  });

  it("folds every mark when the function is not there yet", async () => {
    // Three marks a day for four hundred days: 1,200 rows, 400 days.
    const marks = Array.from({ length: 400 }, (_, d) =>
      ["morning", "evening", "psalter"].map((rule_id) => ({ user_id: "reader", rule_id, prayed_on: dayAgo(d) })),
    ).flat();
    const { client } = cappedApi({ prayer_completions: marks, reader_streaks: [] });
    const out = await refreshStreak(client, "reader", "UTC", now);
    expect(out).toMatchObject({ state: "ok", current: 400, best: 400, keptToday: true });
  });

  it("says it cannot tell when the ledger cannot be read", async () => {
    const { client } = cappedApi({ prayer_completions: { error: { message: "down" } } });
    expect(await refreshStreak(client, "reader", "UTC", now)).toEqual({ state: "unavailable" });
  });
});
