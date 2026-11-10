import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { TRY_PREVIEW_IDS } from "@/components/billing/PlusTry";
import { PLUS_ROWS } from "@/lib/premium/plusRows";

import { INTRO_FEATURE, PLUS_INTRO_AFTER_DAYS, introRow, plusIntroDue } from "../plusIntro";
import type { Road } from "../road";

/**
 * Plus, introduced once (1.9, his 111): "Plus never shows in the questions
 * or the first week. After week one, one calm card shows the one Plus
 * feature that fits that reader. Nothing pushy."
 */

const ROADS: readonly Road[] = ["practicing", "returning", "catechumen", "catholic", "protestant", "christian", "seeker", "newcomer"];
const en = JSON.parse(readFileSync("lib/i18n/messages/en.json", "utf8")) as Record<string, string>;

const reader = (over: Partial<Parameters<typeof plusIntroDue>[0]> = {}) => ({
  road: "catholic" as Road | null,
  again: false,
  onboardedDay: "2026-12-01",
  today: "2026-12-08",
  plus: false as boolean | null,
  done: false,
  weekUp: false,
  ...over,
});

describe("the one Plus feature for each road", () => {
  it("names a feature for every road but the newcomer's, each a row the Plus sheet has and can show working", () => {
    expect(Object.keys(INTRO_FEATURE).sort()).toEqual([...ROADS].sort());
    for (const road of ROADS) {
      const row = introRow(road);
      if (road === "newcomer") {
        expect(row).toBeNull();
        continue;
      }
      expect(row, road).not.toBeNull();
      expect(PLUS_ROWS, road).toContain(row);
      // Its Try it exists: the card opens it.
      expect(TRY_PREVIEW_IDS, road).toContain(row!.id);
      // Its words are the sheet's own, and are there.
      expect(en[row!.name], `${road}: the feature's name`).toBeTruthy();
      expect(en[row!.body], `${road}: what it does`).toBeTruthy();
    }
    expect(introRow(null)).toBeNull();
  });
});

describe("the card's moment", () => {
  it("comes a week after the questions ended, and not a day sooner", () => {
    expect(PLUS_INTRO_AFTER_DAYS).toBe(7);
    expect(plusIntroDue(reader({ today: "2026-12-07" }))).toBe(false);
    expect(plusIntroDue(reader({ today: "2026-12-08" }))).toBe(true);
    expect(plusIntroDue(reader({ today: "2027-01-20" }))).toBe(true);
  });

  it("never comes while a step of the first week is still up on Today", () => {
    expect(plusIntroDue(reader({ weekUp: true }))).toBe(false);
  });

  it("never comes to a reader who has Plus, where Plus is not sold, or before the answer is known", () => {
    // Where Plus is not sold the app answers true for everyone (lib/entitlements/usePlusFeatures.ts).
    expect(plusIntroDue(reader({ plus: true }))).toBe(false);
    expect(plusIntroDue(reader({ plus: null }))).toBe(false);
  });

  it("never comes to a reader who is back, to the newcomer, or to a reader with no road", () => {
    expect(plusIntroDue(reader({ again: true }))).toBe(false);
    expect(plusIntroDue(reader({ road: "newcomer" }))).toBe(false);
    expect(plusIntroDue(reader({ road: null }))).toBe(false);
  });

  it("comes once: tapped or closed, never again; and never to a device with no day kept", () => {
    expect(plusIntroDue(reader({ done: true }))).toBe(false);
    expect(plusIntroDue(reader({ onboardedDay: null }))).toBe(false);
  });
});

describe("the card as it is drawn", () => {
  const cards = readFileSync("components/onboarding/RoadCards.tsx", "utf8").replace(/\s+/g, " ");
  const card = cards.slice(cards.indexOf("export function PlusIntroCard("));
  const sheet = readFileSync("components/billing/UpgradeModal.tsx", "utf8").replace(/\s+/g, " ");

  it("is drawn only for the test's card version, and the device is said to be shown whichever version it has", () => {
    expect(card).toContain('const here = armHere("today"); exposed("today"); setArm(here?.test.id === PLUS_INTRODUCED.id ? here.arm : null);');
    expect(card).toContain('if (!due || arm !== "card" || !row?.feature) return null;');
  });

  it("says only the feature's own words, under the one Plus mark, and writes none of its own", () => {
    expect(card).toContain("mark={<PlusMark />} title={t(row.name)} body={t(row.body)}");
    const keys = [...card.matchAll(/\bt\("([^"]+)"/g)].map((m) => m[1]);
    expect(keys).toEqual(["plus.try.open"]);
    expect(en["plus.try.open"]).toBe("Try it");
  });

  it("opens the feature's Try it, which shows and never grants, and is gone once tapped or closed", () => {
    expect(card).toContain("markPlusIntroDone(); upgrade.open(feature, { tryNow: true });");
    expect(card).toContain("onClose={markPlusIntroDone}");
    expect(sheet).toContain('if (own && opts?.tryNow) {');
    expect(sheet).toContain('countPlusStep(next, "tried"); beginTry(own.id); setTrying(own.id);');
  });

  it("puts no timer, no price and no count of other readers on it", () => {
    for (const word of ["countdown", "setInterval", "price", "offer", "% off", "subscribers"]) expect(card, word).not.toContain(word);
  });
});
