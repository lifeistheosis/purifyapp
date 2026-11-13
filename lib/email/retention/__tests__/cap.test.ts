import { describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

import { LIBRARY_KINDS, SHOP_KINDS } from "../../campaigns";
import { NON_TRANSACTIONAL_KINDS, WEEKLY_CAP, readWeekCounts, roomLeft } from "../cap";
import { RETENTION_KINDS } from "../kinds";

/**
 * "At most 2 non-transactional emails a week per reader, across every
 * campaign" (the arbiter's rule for these three, 2026-11-13).
 */

vi.mock("server-only", () => ({}));

const NOW = new Date("2026-11-20T11:05:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
let n = 0;
const row = (user_id: string, kind: string, days: number, status = "sent") => ({
  id: `s${String(++n).padStart(6, "0")}`,
  user_id,
  kind,
  status,
  dedupe_key: `${kind}:${n}:${user_id}`,
  created_at: ago(days),
});

describe("the weekly cap", () => {
  it("is two", () => {
    expect(WEEKLY_CAP).toBe(2);
    expect([0, 1, 2, 3].map(roomLeft)).toEqual([2, 1, 0, 0]);
  });

  it("counts every campaign's optional email, the three retention emails among them", () => {
    for (const kind of [...LIBRARY_KINDS, ...SHOP_KINDS, "winback", "name_day", "community_digest", "cart_reminder", "cart_deal", ...RETENTION_KINDS]) {
      expect(NON_TRANSACTIONAL_KINDS, kind).toContain(kind);
    }
    // What a reader asked for or has with us is not optional email.
    for (const kind of ["welcome", "terms_changed", "order_confirmation", "plus_ending", "payment_failed", "ticket_reply", "back_in_stock", "care_guide", "review_ask"]) {
      expect(NON_TRANSACTIONAL_KINDS, kind).not.toContain(kind);
    }
  });

  it("reads the seven days before the send, sent or in flight, from every campaign, for each reader", async () => {
    const { client } = cappedApi({
      email_sends: [
        row("a", "weekly", 1),
        row("a", "community_digest", 6.9),
        row("a", "welcome", 0.5),
        row("a", "release", 7.1),
        row("b", "name_day", 2),
        row("b", "first_week", 0.2, "pending"),
        row("b", "shop_new", 3, "failed"),
        row("b", "monthly", 3, "skipped"),
        row("c", "order_confirmation", 1),
      ],
    });
    const { counts, error } = await readWeekCounts(client, ["a", "b", "c", "d"], NOW);
    expect(error).toBeNull();
    expect(Object.fromEntries(counts)).toEqual({ a: 2, b: 2 });
  });

  it("reads past the first thousand rows", async () => {
    const rows = Array.from({ length: 1500 }, (_, i) => row(`r${String(i).padStart(4, "0")}`, "weekly", 1));
    const { client } = cappedApi({ email_sends: rows });
    const { counts } = await readWeekCounts(client, rows.map((r) => r.user_id), NOW);
    expect(counts.size).toBe(1500);
  });

  it("says so when the send log cannot be read, rather than giving everyone room", async () => {
    const { client } = cappedApi({ email_sends: { error: { message: "permission denied", code: "42501" } } });
    const { counts, error } = await readWeekCounts(client, ["a"], NOW);
    expect(error).toContain("permission denied");
    expect(counts.size).toBe(0);
  });
});
