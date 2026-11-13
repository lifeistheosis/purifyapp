import { describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

import { cameBackWithin, readRetentionEffect } from "../effect";

/**
 * Each email's effect for the owner's brief: of the readers it reached, how
 * many kept something with their account within seven days. Counts only,
 * whole weeks only, the owner's own sends left out, "not read" never 0.
 */

vi.mock("server-only", () => ({}));

const DAY = 86_400_000;
const NOW = new Date("2026-12-20T07:00:00Z");
const at = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * DAY).toISOString();

describe("came back within seven days", () => {
  it("counts each reader once, and only for what they kept after the email and within the week", () => {
    const sends = [
      { userId: "a", at: 0 },
      { userId: "a", at: 3 * DAY },
      { userId: "b", at: 0 },
      { userId: "c", at: 0 },
      { userId: "d", at: 0 },
    ];
    const activity = new Map<string, number[]>([
      ["a", [4 * DAY]],
      ["b", [-DAY]],
      ["c", [7 * DAY]],
      ["d", [7 * DAY + 1]],
    ]);
    expect(cameBackWithin(sends, activity)).toEqual({ reached: 4, cameBack: 2 });
  });
});

describe("the figure for the brief", () => {
  const sends = [
    { id: "1", user_id: "a", kind: "first_week", status: "sent", dedupe_key: "first_week:morning:a", sent_at: at(12) },
    { id: "2", user_id: "a", kind: "first_week", status: "sent", dedupe_key: "first_week:calendar:a", sent_at: at(10) },
    { id: "3", user_id: "b", kind: "first_week", status: "sent", dedupe_key: "first_week:morning:b", sent_at: at(12) },
    // The owner's first look is not a reader's.
    { id: "4", user_id: "o", kind: "first_week", status: "sent", dedupe_key: "first_week:owner:morning:o", sent_at: at(12) },
    // Inside the last week: its seven days have not passed.
    { id: "5", user_id: "c", kind: "pick_up", status: "sent", dedupe_key: "pick_up:14:c:2026-12-17", sent_at: at(3) },
    { id: "6", user_id: "d", kind: "fasting_companion", status: "sent", dedupe_key: "fasting_companion:nativity-2026:week-3:d", sent_at: at(14) },
    { id: "7", user_id: "e", kind: "fasting_companion", status: "failed", dedupe_key: "fasting_companion:nativity-2026:week-3:e", sent_at: null },
  ];

  it("counts readers reached and readers who came back, per email, never naming one", async () => {
    const { client } = cappedApi({
      email_sends: sends,
      prayer_completions: [{ user_id: "a", rule_id: "morning", prayed_on: "x", completed_at: at(9) }],
      bookmarks: [],
      annotations: [],
      user_kept: [{ user_id: "d", slice: "places", value: {}, updated_at: at(13) }],
      profiles: [],
    });
    const out = await readRetentionEffect(client, NOW);
    expect(out.errors).toEqual([]);
    expect(out.effects).toEqual([
      { kind: "first_week", reached: 2, cameBack: 1 },
      { kind: "pick_up", reached: 0, cameBack: 0 },
      { kind: "fasting_companion", reached: 1, cameBack: 1 },
    ]);
    expect(out.to).toBe(at(7));
    expect(JSON.stringify(out)).not.toMatch(/"a"|"b"|"d"/);
  });

  it("says not read, never 0, when what readers kept cannot be read", async () => {
    const { client } = cappedApi({ email_sends: sends, prayer_completions: { error: { message: "timeout" } }, bookmarks: [], annotations: [], user_kept: [], profiles: [] });
    const out = await readRetentionEffect(client, NOW);
    expect(out.effects.find((e) => e.kind === "first_week")).toEqual({ kind: "first_week", reached: 2, cameBack: null });
    expect(out.errors.join("\n")).toContain("timeout");
  });

  it("says not read for everything when the send log cannot be read", async () => {
    const { client } = cappedApi({ email_sends: { error: { message: "down" } } });
    const out = await readRetentionEffect(client, NOW);
    expect(out.effects.every((e) => e.reached === null && e.cameBack === null)).toBe(true);
  });
});
