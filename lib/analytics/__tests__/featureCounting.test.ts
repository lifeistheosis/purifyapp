// The 1.9 counts (admin item A5): what a device sends, what the server's list
// takes, and what the admin sums. The rule that matters most: an id is held to
// the shape of an id, so no name or free words can ride in one.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { PLAN_NAMES } from "@/components/admin/tabs/InUseTab";
import { DOWNLOADABLE_BIBLES } from "@/lib/bible/downloads/catalog";
import { COUNT_PLATFORMS } from "@/lib/onboarding/counting";
import { trackEventSchema } from "@/lib/security/schemas";
import { READING_PLANS } from "@/lib/plans/plans";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";

import {
  APP_VERSION,
  BIBLE_ID,
  featureEventBody,
  isFeatureEvent,
  PLAN_ID,
  summarizeFeatures,
  versionDue,
  versionStamp,
} from "../featureCounting";

describe("the ids a count may carry", () => {
  it("every Bible the catalog offers, every reading plan and today's version fit their shapes", () => {
    for (const b of DOWNLOADABLE_BIBLES) expect(b.id).toMatch(BIBLE_ID);
    for (const p of READING_PLANS) expect(p.id).toMatch(PLAN_ID);
    expect(CURRENT_VERSION).toMatch(APP_VERSION);
  });

  it("nothing that could be a name, an address or free words", () => {
    for (const bad of ["", "Edgar", "edgar@example.com", "ru synodal", "../x", "ru-", "a".repeat(80), "ru-synodal; drop"]) {
      expect(bad).not.toMatch(BIBLE_ID);
    }
    for (const bad of ["", "My Plan", "psalter!", "x@y.z", "-psalter"]) expect(bad).not.toMatch(PLAN_ID);
    for (const bad of ["1", "v1.9", "1.9.0.1", "1.9-beta"]) expect(bad).not.toMatch(APP_VERSION);
  });
});

describe("what a device sends", () => {
  it("the event and the kind of device, nothing else", () => {
    expect(JSON.parse(featureEventBody({ name: "plan_begun", props: { plan: "psalter" } }, "android"))).toEqual({
      name: "plan_begun",
      props: { plan: "psalter", platform: "android" },
    });
    expect(JSON.parse(featureEventBody({ name: "journal_page_shared", props: {} }, "web"))).toEqual({
      name: "journal_page_shared",
      props: { platform: "web" },
    });
    expect(isFeatureEvent("version_in_use")).toBe(true);
    expect(isFeatureEvent("lock_tapped")).toBe(false);
  });

  it("the version in use once a UTC day, and again on a new version the same day", () => {
    const morning = new Date("2026-11-09T06:00:00Z");
    const kept = versionStamp("1.9", morning);
    expect(versionDue(null, "1.9", morning)).toBe(true);
    expect(versionDue(kept, "1.9", new Date("2026-11-09T23:59:00Z"))).toBe(false);
    expect(versionDue(kept, "1.9", new Date("2026-11-10T00:01:00Z"))).toBe(true);
    expect(versionDue(kept, "1.9.1", new Date("2026-11-09T12:00:00Z"))).toBe(true);
  });
});

describe("the admin's sums", () => {
  it("downloads by Bible, plans begun and finished, journal pages, and versions in use with their share", () => {
    const s = summarizeFeatures([
      { name: "bible_downloaded", props: { translation: "ru-synodal", platform: "android" } },
      { name: "bible_downloaded", props: { translation: "ru-synodal", platform: "ios" } },
      { name: "bible_downloaded", props: { translation: "grc-lxx-patriarchal", platform: "web" } },
      { name: "plan_begun", props: { plan: "psalter" } },
      { name: "plan_begun", props: { plan: "psalter" } },
      { name: "plan_finished", props: { plan: "psalter" } },
      { name: "plan_begun", props: { plan: "john" } },
      { name: "journal_page_written", props: {} },
      { name: "journal_page_written", props: {} },
      { name: "journal_page_shared", props: {} },
      { name: "version_in_use", props: { version: "1.9" } },
      { name: "version_in_use", props: { version: "1.9" } },
      { name: "version_in_use", props: { version: "1.9" } },
      { name: "version_in_use", props: { version: "1.8" } },
    ]);
    expect(s.bibles).toEqual([
      { translation: "ru-synodal", downloads: 2 },
      { translation: "grc-lxx-patriarchal", downloads: 1 },
    ]);
    expect(s.plans).toEqual([
      { plan: "psalter", begun: 2, finished: 1 },
      { plan: "john", begun: 1, finished: 0 },
    ]);
    expect(s.journal).toEqual({ written: 2, shared: 1 });
    expect(s.versions).toEqual([
      { version: "1.9", deviceDays: 3, share: 0.75 },
      { version: "1.8", deviceDays: 1, share: 0.25 },
    ]);
  });

  it("leaves out a row it cannot read rather than guessing", () => {
    const s = summarizeFeatures([
      { name: "bible_downloaded", props: { translation: "Edgar's Bible" } },
      { name: "plan_begun", props: null },
      { name: "version_in_use", props: { version: "latest" } },
      { name: "lock_tapped", props: { lock: "plans" } },
    ]);
    expect(s).toEqual({ bibles: [], plans: [], journal: { written: 0, shared: 0 }, versions: [] });
  });
});

describe("what the device sends is what the server takes", () => {
  const parse = (body: string) => trackEventSchema.safeParse(JSON.parse(body));

  it("every one of the six, from every kind of device", () => {
    const events = [
      { name: "bible_downloaded", props: { translation: "ru-synodal" } },
      { name: "plan_begun", props: { plan: "psalter" } },
      { name: "plan_finished", props: { plan: "nativity" } },
      { name: "journal_page_written", props: {} },
      { name: "journal_page_shared", props: {} },
      { name: "version_in_use", props: { version: CURRENT_VERSION } },
    ] as const;
    for (const platform of COUNT_PLATFORMS) {
      for (const e of events) expect(parse(featureEventBody(e as never, platform)).success, `${e.name} ${platform}`).toBe(true);
    }
  });

  it("and nothing else: no extra prop, no words where an id goes, no reader", () => {
    const take = (name: string, props: Record<string, unknown>) => trackEventSchema.safeParse({ name, props }).success;
    expect(take("bible_downloaded", { translation: "My grandmother's Bible", platform: "web" })).toBe(false);
    expect(take("bible_downloaded", { translation: "ru-synodal", platform: "web", user: "u1" })).toBe(false);
    expect(take("plan_begun", { plan: "psalter", platform: "web", page: "/plans/psalter" })).toBe(false);
    expect(take("journal_page_written", { platform: "web", words: 120 })).toBe(false);
    expect(take("journal_page_shared", { platform: "web", slug: "abc" })).toBe(false);
    expect(take("version_in_use", { version: "1.9 beta", platform: "android" })).toBe(false);
    expect(take("version_in_use", { version: "1.9", platform: "toaster" })).toBe(false);
  });

  it("kept to the day, as the locks are", () => {
    const route = fs.readFileSync("app/api/track/event/route.ts", "utf8");
    expect(route).toMatch(/const toTheDay = [^;]*\|\| isFeatureEvent\(name\);/);
  });
});

describe("the admin's In use view", () => {
  it("names every reading plan the app has, by the name the app gives it", () => {
    const en = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8")) as Record<string, string>;
    for (const p of READING_PLANS) expect(PLAN_NAMES[p.id], p.id).toBe(en[`plans.${p.id}.name`]);
  });
});
