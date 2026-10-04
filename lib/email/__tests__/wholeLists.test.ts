// The lists an email is sent from are read whole.
//
// The API returns at most 1,000 rows a request, whatever .limit() asks for,
// and says nothing when it stops (docs/audit/findings.yaml F-31). A send
// built on one request therefore reaches a thousand readers and reports
// itself finished. Every read here goes through a stand-in that caps the way
// the real API does, so each of these fails if its read goes back to being
// one request.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { feastsOn } from "@/lib/calendar/orthodox";
import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

import { recentLibraryReaders } from "../campaigns";
import { runCommunityDigest } from "../communityDigest";
import { runNameDays } from "../nameDay";
import { subscribersOf } from "../preferences";

const DAY = 86_400_000;
const pad = (i: number) => String(i).padStart(5, "0");

// With no postal address the marketing sender refuses the whole send before
// it looks anyone up, so nothing here can reach a mail provider: what is
// under test is who would have been written to.
beforeEach(() => vi.stubEnv("EMAIL_POSTAL_ADDRESS", ""));
afterEach(() => vi.unstubAllEnvs());

describe("name days", () => {
  const now = new Date("2026-12-06T12:00:00Z");
  const saints = feastsOn(now);

  it("has a saint to test with", () => {
    expect(saints.length).toBeGreaterThan(0);
  });

  it("matches every reader who chose today's saint, past the first thousand", async () => {
    const today = saints[0].slug;
    const { client, requests } = cappedApi({
      profiles: [
        ...Array.from({ length: 2300 }, (_, i) => ({ id: `r${pad(i)}`, patron_saint: today })),
        ...Array.from({ length: 40 }, (_, i) => ({ id: `x${pad(i)}`, patron_saint: "somebody-else-entirely" })),
      ],
      shop_product_subjects: [],
    });
    const out = await runNameDays(client, now);
    expect(out.errors).toEqual([]);
    expect(out.matched).toBe(2300);
    expect(out.report?.refused).toBe("no_postal_address");
    expect(requests.filter((r) => r.table === "profiles").every((r) => r.ordered)).toBe(true);
  });

  it("reports a failed read and matches nobody", async () => {
    const { client } = cappedApi({ profiles: { error: { message: "down" } } });
    const out = await runNameDays(client, now);
    expect(out.matched).toBe(0);
    expect(out.errors).toEqual(["profiles.patron_saint: down"]);
  });
});

describe("the cadence rule's skip list", () => {
  it("holds every reader who had a library email this week, past the first thousand", async () => {
    const now = new Date("2026-10-04T12:00:00Z");
    const recent = new Date(now.getTime() - 2 * DAY).toISOString();
    const old = new Date(now.getTime() - 9 * DAY).toISOString();
    const { client } = cappedApi({
      email_sends: [
        ...Array.from({ length: 2500 }, (_, i) => ({ id: `s${pad(i)}`, user_id: `r${pad(i)}`, kind: "weekly", status: "sent", created_at: recent })),
        { id: "t-old", user_id: "last-week", kind: "weekly", status: "sent", created_at: old },
        { id: "t-shop", user_id: "shop-only", kind: "shop_new", status: "sent", created_at: recent },
        { id: "t-failed", user_id: "never-arrived", kind: "weekly", status: "failed", created_at: recent },
      ],
    });
    const readers = await recentLibraryReaders(client, now);
    expect(readers.size).toBe(2500);
    expect(readers.has("r02499")).toBe(true);
    expect(readers.has("last-week")).toBe(false);
    expect(readers.has("shop-only")).toBe(false);
    expect(readers.has("never-arrived")).toBe(false);
  });
});

describe("a list's subscribers", () => {
  it("are all read, each once, in pages of one ordered list", async () => {
    const { client, requests } = cappedApi({
      email_preferences: [
        ...Array.from({ length: 2300 }, (_, i) => ({ user_id: `r${pad(i)}`, unsubscribe_token: `t${i}`, product_updates: true })),
        ...Array.from({ length: 60 }, (_, i) => ({ user_id: `off${pad(i)}`, unsubscribe_token: `o${i}`, product_updates: false })),
      ],
    });
    const { subscribers, error } = await subscribersOf(client, "product_updates");
    expect(error).toBeNull();
    expect(subscribers).toHaveLength(2300);
    expect(new Set(subscribers.map((s) => s.userId)).size).toBe(2300);
    expect(requests).toHaveLength(3);
    expect(requests.every((r) => r.ordered)).toBe(true);
  });
});

describe("the weekly Community email", () => {
  const sunday = new Date("2026-10-04T12:00:00Z");
  const written = new Date(sunday.getTime() - DAY).toISOString();
  const posts = [
    { id: "post-1", user_id: "author-1", kind: "discussion", status: "visible", group_id: null, created_at: written, title: "A", body: "b", author_name: "A" },
  ];
  const subscribers = Array.from({ length: 250 }, (_, i) => ({
    user_id: `r${pad(i)}`,
    unsubscribe_token: `t${i}`,
    community_digest: true,
  }));

  it("is a Sunday", () => {
    expect(sunday.getUTCDay()).toBe(0);
  });

  it("reads whom each reader follows and has blocked a hundred readers at a time, each piece to its end", async () => {
    const { client, requests } = cappedApi({
      community_posts: posts,
      email_preferences: subscribers,
      // One reader follows more people than a request returns.
      community_follows: Array.from({ length: 1500 }, (_, i) => ({ follower_id: "r00000", followee_id: `f${pad(i)}` })),
      community_blocks: [{ id: "b1", blocker_id: "r00007", blocked_id: "author-1" }],
      profiles: [],
    });
    const out = await runCommunityDigest(client, sunday);
    expect(out.errors).toEqual([]);
    expect(out.report?.refused).toBe("no_postal_address");
    const follows = requests.filter((r) => r.table === "community_follows");
    // 250 readers in pieces of 100, 100 and 50, and the first piece takes two pages.
    expect(follows.map((r) => r.rows)).toEqual([1000, 500, 0, 0]);
    expect(requests.filter((r) => r.table === "community_blocks")).toHaveLength(3);
    expect([...follows, ...requests.filter((r) => r.table === "community_blocks")].every((r) => r.ordered)).toBe(true);
  });

  it("sends nothing when the blocks cannot be read, and says so", async () => {
    const { client } = cappedApi({
      community_posts: posts,
      email_preferences: subscribers,
      community_follows: [],
      community_blocks: { error: { message: "canceling statement due to statement timeout", code: "57014" } },
      profiles: [],
    });
    const out = await runCommunityDigest(client, sunday);
    expect(out.report).toBeNull();
    expect(out.errors).toEqual(["community follows and blocks: canceling statement due to statement timeout"]);
  });

  it("reads a table that is not there yet as nobody followed and nobody blocked", async () => {
    const { client } = cappedApi({ community_posts: posts, email_preferences: subscribers, profiles: [] });
    const out = await runCommunityDigest(client, sunday);
    expect(out.errors).toEqual([]);
    expect(out.report?.refused).toBe("no_postal_address");
  });
});
