import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { LOCKS } from "@/lib/analytics/lockCounting";
import { trackEventSchema } from "@/lib/security/schemas";

import {
  ACCOUNT_PLACES,
  ACT_DAYS,
  CARD_DID,
  FIRST_ACTS,
  MORE_COUNTS_SENDING,
  MORE_EVENTS,
  PLUS_STEPS,
  PRICING_PLANS,
  PRIVACY_SENTENCES,
  REMINDER_PLACES,
  STEP_DID,
  TERMS_PARAGRAPH,
  TODAY_CARDS,
  actDay,
  actOf,
  isMoreEvent,
  moreEventBody,
  type MoreEvent,
} from "../moreCounting";

// The seven counts of 1.9, each for one decision
// (docs/1.9-build/notes/onboarding-fable.md, section 11).

const read = (p: string) => fs.readFileSync(p, "utf8");
const takes = (body: string) => trackEventSchema.safeParse(JSON.parse(body)).success;
const takesRaw = (name: string, props: Record<string, unknown>) => trackEventSchema.safeParse({ name, props }).success;

describe("the switch", () => {
  const page = read("components/legal/PrivacyText.tsx").replace(/\s+/g, " ");
  const german = page.slice(page.indexOf("function PrivacyDe()"));
  const english = page.slice(0, page.indexOf("function PrivacyDe()"));
  const onPage = (text: string, sentence: string) =>
    text.includes(sentence) || text.includes(sentence.replace(/'/g, "&rsquo;").replace(/"([^"]*)"/g, "&ldquo;$1&rdquo;"));

  it("is on only while every count's sentence is on the privacy page, in English and in German", () => {
    const missing = PRIVACY_SENTENCES.filter((s) => !onPage(english, s.en) || !onPage(german, s.de)).map((s) => s.what);
    // Turned on in the change that put the sentences on the page (his item 140, 2026-11-10).
    if (MORE_COUNTS_SENDING) expect(missing).toEqual([]);
    else expect(MORE_COUNTS_SENDING).toBe(false);
    expect(MORE_COUNTS_SENDING).toBe(true);
    expect(missing).toEqual([]);
  });

  it("stands beside the Terms' paragraph on tests, word for word", () => {
    const terms = read("components/legal/TermsText.tsx").replace(/\s+/g, " ");
    expect(terms).toContain(TERMS_PARAGRAPH);
    expect(TERMS_PARAGRAPH).not.toContain("\u2014");
  });

  it("has a sentence for each count, for the two words on older rows, and for the first step the page omits", () => {
    expect(PRIVACY_SENTENCES.map((s) => s.what)).toEqual([
      "first_act",
      "week_step",
      "account_made",
      "reminders_set",
      "plus_step",
      "screen_closed.first",
      "today_card",
      "onboarding_dayone",
    ]);
    for (const s of PRIVACY_SENTENCES) {
      expect(s.en.trim().length, s.what).toBeGreaterThan(40);
      expect(s.de.trim().length, s.what).toBeGreaterThan(40);
      expect(s.en + s.de, s.what).not.toContain("—");
    }
  });

  it("is asked by every sender, so nothing leaves a device while it is off", () => {
    const sender = read("lib/analytics/moreCount.ts");
    // One door out, and it asks.
    expect(sender.match(/\bfetch\(/g)).toHaveLength(1);
    expect(sender).toMatch(/function send\(event: MoreEvent\): void \{\s*if \(!moreCountsOn\(\)\) return;/);
    expect(sender).toMatch(/return MORE_COUNTS_SENDING && /);
    // And the two words on older rows ask it too.
    const screens = read("lib/analytics/screenCount.ts");
    expect(screens).toMatch(/const first = MORE_COUNTS_SENDING && /);
    expect(screens).toMatch(/if \(!MORE_COUNTS_SENDING\) \{\s*for \(const day of due\) send\(\{ name: "came_back", props: \{ day \} \}\);\s*return;/);
  });
});

describe("what the device sends is what the server takes", () => {
  const every: MoreEvent[] = [
    ...FIRST_ACTS.flatMap((kind) => ACT_DAYS.map((day) => ({ name: "first_act" as const, props: { kind, day } }))),
    ...STEP_DID.flatMap((did) => [1, 4, 7].map((n) => ({ name: "week_step" as const, props: { n, did } }))),
    ...ACCOUNT_PLACES.map((where) => ({ name: "account_made" as const, props: { where } })),
    ...REMINDER_PLACES.flatMap((where) => (["on", "off"] as const).map((to) => ({ name: "reminders_set" as const, props: { to, where } }))),
    ...PLUS_STEPS.flatMap((step) => LOCKS.map((lock) => ({ name: "plus_step" as const, props: { lock, step } }))),
    ...PRICING_PLANS.map((plan) => ({ name: "pricing_bought" as const, props: { plan } })),
    ...TODAY_CARDS.flatMap((card) => CARD_DID.map((did) => ({ name: "today_card" as const, props: { card, did } }))),
  ];

  it("for every count and every word it can say", () => {
    for (const event of every) expect(takes(moreEventBody(event, "ios")), JSON.stringify(event)).toBe(true);
    expect(new Set(every.map((e) => e.name))).toEqual(new Set(MORE_EVENTS));
  });

  it("and nothing else: no other word, no day of the eight, no reader", () => {
    expect(takesRaw("first_act", { kind: "akathist", day: "0", platform: "ios" })).toBe(false);
    expect(takesRaw("first_act", { kind: "prayer", day: "3", platform: "ios" })).toBe(false);
    expect(takesRaw("week_step", { n: 0, did: "opened", platform: "ios" })).toBe(false);
    expect(takesRaw("week_step", { n: 8, did: "opened", platform: "ios" })).toBe(false);
    // Never which step, and never the road.
    expect(takesRaw("week_step", { n: 2, did: "opened", step: "leo", platform: "ios" })).toBe(false);
    expect(takesRaw("week_step", { n: 2, did: "opened", road: "catholic", platform: "ios" })).toBe(false);
    expect(takesRaw("account_made", { where: "card", email: "a@b.c", platform: "ios" })).toBe(false);
    expect(takesRaw("account_made", { where: "elsewhere", platform: "ios" })).toBe(false);
    expect(takesRaw("reminders_set", { to: "maybe", where: "card", platform: "ios" })).toBe(false);
    expect(takesRaw("plus_step", { lock: "not-a-lock", step: "pay", platform: "ios" })).toBe(false);
    expect(takesRaw("pricing_bought", { plan: "lifetime", platform: "ios" })).toBe(false);
    // Answered, never what was answered.
    expect(takesRaw("today_card", { card: "second", did: "answered", answer: "protestant", platform: "ios" })).toBe(false);
  });

  it("takes the two words on older rows, and only as what they are", () => {
    expect(takesRaw("screen_closed", { screen: "today", open: "10s-1m", platform: "ios", first: true })).toBe(true);
    expect(takesRaw("screen_closed", { screen: "today", open: "10s-1m", platform: "ios", first: false })).toBe(false);
    expect(takesRaw("came_back", { day: 7, platform: "android", reminders: true })).toBe(true);
    expect(takesRaw("came_back", { day: 7, platform: "android", reminders: "on" })).toBe(false);
    // And as they were, without them.
    expect(takesRaw("screen_closed", { screen: "today", open: "10s-1m", platform: "ios" })).toBe(true);
    expect(takesRaw("came_back", { day: 7, platform: "android" })).toBe(true);
  });

  it("keeps them to the day", () => {
    const route = read("app/api/track/event/route.ts");
    expect(route).toMatch(/const dayOnly = toTheDay \|\| isAbEvent\(name\) \|\| isMoreEvent\(name\);/);
    for (const name of MORE_EVENTS) expect(isMoreEvent(name)).toBe(true);
    expect(isMoreEvent("first_open")).toBe(false);
  });
});

describe("the first prayer or chapter", () => {
  it("is a prayer for a rule of prayer and a chapter for a day's reading, and nothing for the other strands", () => {
    expect(actOf("morning")).toBe("prayer");
    expect(actOf("before-sleep")).toBe("prayer");
    expect(actOf("day:gospel")).toBe("chapter");
    expect(actOf("day:reading")).toBe("chapter");
    expect(actOf("day:saint")).toBeNull();
    expect(actOf("day:teaching")).toBeNull();
  });

  it("is said with how many days after the first open, in four spans", () => {
    expect([0, 1, 2, 6, 7, 40].map(actDay)).toEqual(["0", "1", "2-6", "2-6", "7+", "7+"]);
    expect(actDay(-1)).toBe("0");
  });
});

describe("nothing about where a reader comes from in faith", () => {
  it("is on any of the seven, by name or by value", () => {
    const rules = read("lib/analytics/moreCounting.ts");
    const types = rules.slice(rules.indexOf("export type MoreEvent ="), rules.indexOf("/** The body the device sends"));
    for (const word of ["background", "road", "catholic", "protestant", "orthodox", "level", "intent"]) {
      expect(types, word).not.toContain(word);
    }
  });
});
