import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

import { unsubscribeByToken } from "../../preferences";
import { RETENTION_KINDS, isRetentionKind } from "../kinds";
import { retentionSubscribers, stopRetentionByToken } from "../preferences";
import { retentionFooter, retentionUnsubscribeHeaders } from "../render";

/**
 * Each type gets its own preference and its own unsubscribe (the arbiter's
 * brief, 2026-11-13), and "every optional Purify email" stops these too.
 */

vi.mock("server-only", () => ({}));

const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const row = (id: string, over: Record<string, unknown> = {}) => ({
  user_id: id,
  shop_offers: true,
  product_updates: true,
  release_news: true,
  first_week: true,
  pick_up: true,
  fasting_companion: true,
  unsubscribe_token: `token-${id}`,
  ...over,
});

describe("one retention list, stopped by its own link", () => {
  it("stops that list and nothing else", async () => {
    const rows = [row("a"), row("b")];
    const { client } = cappedApi({ email_preferences: rows });
    expect(await stopRetentionByToken(client, "token-a", "pick_up")).toBe(true);
    expect(rows[0]).toMatchObject({ pick_up: false, first_week: true, fasting_companion: true, product_updates: true, shop_offers: true, release_news: true });
    expect(rows[1].pick_up).toBe(true);
    expect(await stopRetentionByToken(client, "no-such-token", "pick_up")).toBe(false);
  });

  it("has nothing to stop before the column exists", async () => {
    const { client } = cappedApi({ email_preferences: { error: { code: "42703", message: "column email_preferences.pick_up does not exist" } } });
    expect(await stopRetentionByToken(client, "token-a", "pick_up")).toBe(false);
  });

  it("is named in the email's one-click header and its button, for that list alone", () => {
    for (const kind of RETENTION_KINDS) {
      expect(retentionUnsubscribeHeaders("token-a", kind)["List-Unsubscribe"]).toContain(`/api/email/unsubscribe?t=token-a&l=${kind}`);
      expect(retentionUnsubscribeHeaders("token-a", kind)["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    }
  });

  it("is honoured by the unsubscribe route, which takes a retention list by name", () => {
    const route = fs.readFileSync(path.join(ROOT, "app/api/email/unsubscribe/route.ts"), "utf8");
    expect(route).toMatch(/if \(isRetentionKind\(list\)\) await stopRetentionByToken\(createAdminClient\(\), token, list\);/);
    expect(route).not.toMatch(/export async function GET/);
    expect(RETENTION_KINDS.every(isRetentionKind)).toBe(true);
    expect(isRetentionKind("product_updates")).toBe(false);
  });
});

describe("every optional Purify email", () => {
  it("stops the three retention lists with the rest", async () => {
    const rows = [row("a")];
    const { client } = cappedApi({ email_preferences: rows });
    expect(await unsubscribeByToken(client, "token-a", "all")).toBe(true);
    expect(rows[0]).toMatchObject({ first_week: false, pick_up: false, fasting_companion: false, shop_offers: false, product_updates: false, release_news: false });
  });

  it("leaves the retention lists alone when one other list is stopped", async () => {
    const rows = [row("a")];
    const { client } = cappedApi({ email_preferences: rows });
    await unsubscribeByToken(client, "token-a", "shop_offers");
    expect(rows[0]).toMatchObject({ shop_offers: false, first_week: true, pick_up: true, fasting_companion: true });
  });
});

describe("who is on a list", () => {
  it("is only a reader whose column says true: the default is no", async () => {
    const { client } = cappedApi({
      email_preferences: [row("yes"), row("null", { first_week: null }), row("no", { first_week: false }), row("absent", { first_week: undefined })],
    });
    const { subscribers, absent, error } = await retentionSubscribers(client, "first_week");
    expect({ absent, error }).toEqual({ absent: false, error: null });
    expect(subscribers).toEqual([{ userId: "yes", unsubscribeToken: "token-yes" }]);
  });

  it("reads past the first thousand", async () => {
    const rows = Array.from({ length: 1200 }, (_, i) => row(`r${String(i).padStart(4, "0")}`));
    const { client } = cappedApi({ email_preferences: rows });
    expect((await retentionSubscribers(client, "fasting_companion")).subscribers).toHaveLength(1200);
  });

  it("says why it came in the foot of each copy, with the company and its address", () => {
    expect(retentionFooter("fasting_companion", "1 Example Street", { owner: false })).toMatch(
      /^You are getting this because you turned on "The fasting companion" in your Purify settings\. .+, 1 Example Street\.$/,
    );
    expect(retentionFooter("first_week", "1 Example Street", { owner: true })).toContain("your address is in ADMIN_EMAILS");
  });
});
