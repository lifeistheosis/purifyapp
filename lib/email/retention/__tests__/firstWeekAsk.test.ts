// The welcome email's one asking line for the first-week guide, and the tap
// that answers it (his "all recs", 2026-11-13 about 14:29 UTC, to question 3
// of docs/plans/retention-emails.md: "A short guide for your first week,
// three emails. Send it to me." Consent is the reader's own tap).
//
// What a reader would notice if this broke: a welcome email promising three
// emails that never come; a guide turned on by a mail scanner opening the
// link; or a link that could turn a list on for somebody else's account.

import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

vi.mock("server-only", () => ({}));

const { firstWeekAskLink, firstWeekSignature, signatureMatches, turnOnFirstWeek, FIRST_WEEK_OPEN_DAYS, FIRST_WEEK_PAGE } = await import("../firstWeekAsk");
const { __setRetention, DESIGN_YES, READERS_YES, RETENTION_SWITCHES } = await import("../switches");
const { welcomeEmail } = await import("../../templates/account");

const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const KEY = "a stand-in for the service role key";
const A = "8d7b2f4e-5c1a-4b7e-9f3d-2a6c8e1b0d4f";
const B = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";
const WORD = { on: "2026-11-13", words: "a stand-in for his word" };
const NOW = new Date("2026-11-20T11:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

/** The guide at readers: his yes to its design, his word for readers, and the page knowing the list. */
const atReaders = () => __setRetention("first_week", { position: "readers", design: WORD, readers: WORD, pageKnows: true });

afterEach(() =>
  __setRetention("first_week", {
    position: RETENTION_SWITCHES.first_week,
    design: DESIGN_YES.first_week,
    readers: READERS_YES.first_week,
    pageKnows: false,
  }),
);

describe("the welcome email's asking line", () => {
  it("asks nothing while the guide does not reach readers, at off or at owner", () => {
    expect(RETENTION_SWITCHES.first_week).toBe("off");
    expect(firstWeekAskLink(A, KEY)).toBeNull();
    __setRetention("first_week", { position: "owner", design: WORD });
    expect(firstWeekAskLink(A, KEY)).toBeNull();
    const mail = welcomeEmail({ firstWeek: firstWeekAskLink(A, KEY) });
    expect(mail.html).not.toContain("Send it to me");
    expect(mail.text).not.toContain("Send it to me");
  });

  it("at readers, ends on his line, its link this reader's own, in the HTML and the text part alike", () => {
    atReaders();
    const link = firstWeekAskLink(A, KEY)!;
    expect(link.startsWith(`${FIRST_WEEK_PAGE}?u=${A}&s=`)).toBe(true);
    const mail = welcomeEmail({ firstWeek: link });
    expect(mail.html).toContain("A short guide for your first week, three emails.");
    expect(mail.html).toContain(`<a href="${link.replace(/&/g, "&amp;")}"`);
    expect(mail.html).toMatch(/>Send it to me<\/a>\./);
    expect(mail.text).toContain(`A short guide for your first week, three emails. Send it to me: ${link}`);
    // After the welcome's own button, which still leads.
    expect(mail.html.indexOf("Open Purify")).toBeLessThan(mail.html.indexOf("Send it to me"));
  });

  it("is never there where the server holds no key", () => {
    atReaders();
    expect(firstWeekAskLink(A, "")).toBeNull();
  });
});

describe("the link's signature", () => {
  it("binds the one account it was made for", () => {
    const sig = firstWeekSignature(A, KEY)!;
    expect(sig).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(signatureMatches(A, sig, KEY)).toBe(true);
    expect(signatureMatches(B, sig, KEY)).toBe(false);
    expect(signatureMatches(A, `${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`, KEY)).toBe(false);
    expect(signatureMatches(A, sig, "another key")).toBe(false);
    expect(signatureMatches(A, "", KEY)).toBe(false);
  });

  it("is kept for this one use: not the plain HMAC of the account under the server's key", async () => {
    const { createHmac } = await import("node:crypto");
    expect(firstWeekSignature(A, KEY)).not.toBe(createHmac("sha256", KEY).update(A).digest("base64url"));
  });

  it("cannot be made or matched where the server holds no key", () => {
    expect(firstWeekSignature(A, "")).toBeNull();
    expect(signatureMatches(A, "x".repeat(43), "")).toBe(false);
  });
});

describe("the tap", () => {
  it("turns the guide on for that account and nothing else, within the guide's days", async () => {
    atReaders();
    const prefs: Record<string, unknown>[] = [{ user_id: B, first_week: null, shop_offers: true }];
    const { client } = cappedApi({ profiles: [{ id: A, joined_at: daysAgo(2) }, { id: B, joined_at: daysAgo(2) }], email_preferences: prefs }, {}, { upserts: true });
    expect(await turnOnFirstWeek(client, A, NOW)).toBe("on");
    expect(prefs).toEqual([
      { user_id: B, first_week: null, shop_offers: true },
      { user_id: A, first_week: true, updated_at: NOW.toISOString() },
    ]);
  });

  it("keeps a reader's other choices when their row is there already", async () => {
    atReaders();
    const prefs: Record<string, unknown>[] = [{ user_id: A, first_week: null, shop_offers: true, release_news: false }];
    const { client } = cappedApi({ profiles: [{ id: A, joined_at: daysAgo(1) }], email_preferences: prefs }, {}, { upserts: true });
    expect(await turnOnFirstWeek(client, A, NOW)).toBe("on");
    expect(prefs[0]).toMatchObject({ user_id: A, first_week: true, shop_offers: true, release_news: false });
  });

  it("turns nothing on past the guide's last day, while it is paused, or for an account it cannot find", async () => {
    expect(FIRST_WEEK_OPEN_DAYS).toBe(10);
    const prefs: Record<string, unknown>[] = [];
    const { client } = cappedApi({ profiles: [{ id: A, joined_at: daysAgo(FIRST_WEEK_OPEN_DAYS) }], email_preferences: prefs }, {}, { upserts: true });
    expect(await turnOnFirstWeek(client, A, NOW)).toBe("paused");
    atReaders();
    expect(await turnOnFirstWeek(client, A, NOW)).toBe("past");
    expect(await turnOnFirstWeek(client, B, NOW)).toBe("unknown");
    expect(prefs).toEqual([]);
  });
});

describe("a tap, never a visit", () => {
  it("the route acts only on a POST with the link's signature, validated, rate limited, through the service role", () => {
    const route = read("app/api/email/first-week/route.ts");
    expect(route).toMatch(/export async function POST\(/);
    expect(route).not.toMatch(/export (async )?(function|const) (GET|HEAD|PUT|PATCH|DELETE)\b/);
    expect(route).toMatch(/u: z\.string\(\)\.uuid\(\)/);
    expect(route).toMatch(/rateLimited\(`email-first-week:/);
    expect(route.indexOf("signatureMatches(")).toBeLessThan(route.indexOf("turnOnFirstWeek(createAdminClient()"));
  });

  it("the page asks first and acts on its one button, never on arrival", () => {
    const page = read("components/email/FirstWeekClient.tsx");
    expect(page).toMatch(/onClick=\{\(\) => void send\(\)\}/);
    expect(page).not.toMatch(/useEffect/);
    expect(page.match(/apiFetch\(/g)?.length).toBe(1);
  });
});
