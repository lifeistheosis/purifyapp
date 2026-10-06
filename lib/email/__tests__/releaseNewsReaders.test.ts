import { describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

import { readPreferences, releaseNewsReaders, unsubscribeByToken, unsubscribeTokenFor } from "../preferences";

/**
 * Who a release email goes to, and how a reader stops it.
 *
 * Release news is the one choice that starts on, so the dangerous mistakes
 * are the quiet ones: reaching a reader who said stop, reaching only the
 * first thousand accounts, or turning a reader's other choices on or off
 * while changing this one. Read through the stand-in that caps a request at
 * a thousand rows the way the real API does.
 */

vi.mock("server-only", () => ({}));

const pad = (i: number) => String(i).padStart(5, "0");
const row = (id: string, over: Record<string, unknown> = {}) => ({
  user_id: id,
  shop_offers: false,
  product_updates: false,
  community_digest: false,
  release_news: true,
  unsubscribe_token: `token-${id}`,
  ...over,
});

describe("the readers of a release email", () => {
  it("are every account that has not said stop, past the first thousand", async () => {
    const rows = [
      ...Array.from({ length: 2300 }, (_, i) => row(`r${pad(i)}`)),
      ...Array.from({ length: 36 }, (_, i) => row(`off${pad(i)}`, { release_news: false })),
    ];
    const { client } = cappedApi({ email_preferences: rows });
    const { subscribers, error } = await releaseNewsReaders(client, rows.map((r) => r.user_id));
    expect(error).toBeNull();
    expect(subscribers).toHaveLength(2300);
    expect(subscribers.every((s) => s.userId.startsWith("r"))).toBe(true);
    // Each goes with its own token: that is the button in its email.
    expect(subscribers[0]).toEqual({ userId: "r00000", unsubscribeToken: "token-r00000" });
    expect(new Set(subscribers.map((s) => s.unsubscribeToken)).size).toBe(2300);
  });

  it("do not depend on the lists a reader turned on or left off", async () => {
    const rows = [row("a", { product_updates: true }), row("b"), row("c", { shop_offers: true, release_news: false })];
    const { client } = cappedApi({ email_preferences: rows });
    const { subscribers } = await releaseNewsReaders(client, ["a", "b", "c"]);
    expect(subscribers.map((s) => s.userId)).toEqual(["a", "b"]);
  });

  it("say so when the table cannot be read, and reach nobody", async () => {
    const { client } = cappedApi({ email_preferences: { error: { message: "column email_preferences.release_news does not exist", code: "42703" } } });
    const out = await releaseNewsReaders(client, ["a"]);
    expect(out.subscribers).toEqual([]);
    expect(out.error).toContain("release_news");
  });
});

describe("stopping it", () => {
  it("turns off release news alone when the email named it", async () => {
    const rows = [row("a", { product_updates: true, shop_offers: true })];
    const { client } = cappedApi({ email_preferences: rows });
    expect(await unsubscribeByToken(client, "token-a", "release_news")).toBe(true);
    expect(rows[0]).toMatchObject({ release_news: false, product_updates: true, shop_offers: true, community_digest: false });
  });

  it("turns off everything that can be turned off when no list is named", async () => {
    const rows = [row("a", { product_updates: true, shop_offers: true, community_digest: true })];
    const { client } = cappedApi({ email_preferences: rows });
    expect(await unsubscribeByToken(client, "token-a", "all")).toBe(true);
    expect(rows[0]).toMatchObject({ release_news: false, product_updates: false, shop_offers: false, community_digest: false });
  });

  it("leaves release news on when a reader leaves one of the other lists", async () => {
    const rows = [row("a", { product_updates: true })];
    const { client } = cappedApi({ email_preferences: rows });
    await unsubscribeByToken(client, "token-a", "product_updates");
    expect(rows[0]).toMatchObject({ release_news: true, product_updates: false });
  });

  it("answers false for a token nobody has, and changes nothing", async () => {
    const rows = [row("a")];
    const { client } = cappedApi({ email_preferences: rows });
    expect(await unsubscribeByToken(client, "token-nobody", "all")).toBe(false);
    expect(rows[0].release_news).toBe(true);
  });
});

describe("a reader's own token and choices", () => {
  it("hands back the token a reader already has", async () => {
    const { client } = cappedApi({ email_preferences: [row("a")] });
    expect(await unsubscribeTokenFor(client, "a")).toBe("token-a");
  });

  it("asks for a row to be made when there is none, and never throws for want of one", async () => {
    const { client } = cappedApi({ email_preferences: [] });
    // The stand-in forgets what is upserted, so there is still nothing to read:
    // the sender then falls back to the page itself.
    expect(await unsubscribeTokenFor(client, "new-reader")).toBeNull();
  });

  it("shows release news as on for a reader who has chosen nothing", async () => {
    const { client } = cappedApi({ email_preferences: [] });
    expect(await readPreferences(client, "nobody-yet")).toEqual({ shopOffers: false, productUpdates: false, communityDigest: false, releaseNews: true });
  });

  it("shows what a reader chose", async () => {
    const { client } = cappedApi({ email_preferences: [row("a", { release_news: false, shop_offers: true })] });
    expect(await readPreferences(client, "a")).toEqual({ shopOffers: true, productUpdates: false, communityDigest: false, releaseNews: false });
  });
});
