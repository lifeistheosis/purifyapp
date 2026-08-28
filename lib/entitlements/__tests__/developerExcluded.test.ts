import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The owner's own subscription is not income.
 *
 * On 2026-08-28 the panel reported three paying Google Play subscribers and
 * $29.97 of MRR. One of the three was the owner, on Plus, testing the purchase
 * flow with his own card. So a third of the "paying" base and a sixth of the
 * MRR was the owner paying himself, and it is worse than a comp: a comp is
 * money that never moved, while this is $4.99 leaving a card, the store keeping
 * 15%, and $4.24 coming back. Booking it as revenue records a 75 cent LOSS as a
 * gain.
 *
 * The lookup is mocked here rather than hit, because the real one reads
 * auth.users through the service role and a unit test has no business doing
 * that. What is being pinned is the arithmetic once the lookup answers.
 */

vi.mock("@/lib/admin/accountEmails", () => ({
  userIdByEmail: vi.fn(async (email: string) =>
    email === "lifeistheosis@gmail.com" ? "owner-uid" : null,
  ),
}));

vi.mock("@/lib/dev/developer", () => ({
  DEVELOPER_EMAILS: ["lifeistheosis@gmail.com"] as const,
}));

const { subscriptionStats } = await import("@/lib/entitlements/adminStats");
const { estimatedMrrCents } = await import("@/lib/premium/mrr");

const FUTURE = new Date(Date.now() + 30 * 86_400_000).toISOString();

type Row = {
  user_id: string;
  plus_until: string | null;
  pro_until: string | null;
  plus_source: string | null;
  is_supporter: boolean | null;
};

function fakeAdmin(rows: Row[]): SupabaseClient {
  return {
    from: () => ({ select: async () => ({ data: rows }) }),
  } as unknown as SupabaseClient;
}

/** The three Google Play rows exactly as production carried them. */
const PRODUCTION: Row[] = [
  {
    user_id: "dranem-uid",
    plus_until: FUTURE,
    pro_until: null,
    plus_source: "google_play",
    is_supporter: false,
  },
  {
    user_id: "henry-uid",
    plus_until: FUTURE,
    pro_until: FUTURE,
    plus_source: "google_play",
    is_supporter: false,
  },
  {
    user_id: "owner-uid",
    plus_until: FUTURE,
    pro_until: null,
    plus_source: "google_play",
    is_supporter: false,
  },
];

describe("the owner's own subscription", () => {
  it("is counted as active, because it is", async () => {
    const s = await subscriptionStats(fakeAdmin(PRODUCTION));
    expect(s.activePlus).toBe(3);
    expect(s.activePro).toBe(1);
  });

  it("is NOT counted as paying", async () => {
    const s = await subscriptionStats(fakeAdmin(PRODUCTION));
    expect(s.developerPlus).toBe(1);
    expect(s.paidPlus).toBe(2); // Dranem on Plus, henrymyslicki9 on Pro
    expect(s.paidCounts).toEqual({ plusOnly: 1, pro: 1 });
  });

  it("takes $4.99 back out of MRR", async () => {
    const s = await subscriptionStats(fakeAdmin(PRODUCTION));
    // $24.98, not the $29.97 the panel was reporting.
    expect(estimatedMrrCents(s.paidCounts)).toBe(2498);
  });

  it("keeps the four buckets summing to activePlus", async () => {
    const s = await subscriptionStats(fakeAdmin(PRODUCTION));
    expect(s.paidPlus + s.compedPlus + s.giftedPlus + s.developerPlus).toBe(
      s.activePlus,
    );
  });

  it("does not double count an owner row that is also a comp", async () => {
    // A comp on the owner's account must land in exactly one bucket, or the
    // sum invariant above breaks and the headline stops adding up.
    const s = await subscriptionStats(
      fakeAdmin([{ ...PRODUCTION[2], plus_source: "comp" }]),
    );
    expect(s.compedPlus).toBe(1);
    expect(s.developerPlus).toBe(0);
    expect(s.paidPlus + s.compedPlus + s.giftedPlus + s.developerPlus).toBe(
      s.activePlus,
    );
  });

  it("leaves real customers alone", async () => {
    const s = await subscriptionStats(
      fakeAdmin(PRODUCTION.filter((r) => r.user_id !== "owner-uid")),
    );
    expect(s.developerPlus).toBe(0);
    expect(s.paidPlus).toBe(2);
    expect(estimatedMrrCents(s.paidCounts)).toBe(2498);
  });
});
