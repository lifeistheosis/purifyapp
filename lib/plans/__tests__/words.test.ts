// A reading plan's page arrives whole (the owner's note 42 of build 80: "On
// the reading plans section, when you click on any of the three reading
// plans, there's a frame where it bugs out").
//
// The frame, filmed on the native export: the day's card was drawn as a day
// and a passage, and a moment later grew its intro and the verses it quotes
// (168 px to 296 px on the Psalter's first day, 409 px on its third), pushing
// Begin and the days down. The guide was loaded on the device after the page
// was drawn (lib/plans/guideContent.ts, usePlanGuide, null on the first
// render). Now the page is handed the plan's own words at build
// (lib/plans/words.ts) and the guide is there at the first render.
//
// What a reader would notice if this broke: the card jumps on opening a plan,
// or the finish's saying arrives after its questions.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import cites from "@/data/plans/guide/cites.json";
import en from "@/data/plans/guide/en.json";
import sayings from "@/data/plans/sayings.json";

import { dayGuide, sayingFor, type GuideCites, type GuideContent, type SayingsContent } from "../guide";
import { handedGuide } from "../guideContent";
import { READING_PLANS } from "../plans";
import { planWords } from "../words";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("a plan's own words, handed to its page at build", () => {
  it("are that plan's guide, verses and sayings, and no other plan's", () => {
    for (const plan of READING_PLANS) {
      const words = planWords(plan.id);
      expect(Object.keys(words.en)).toEqual([plan.id]);
      expect(Object.keys(words.cites)).toEqual([plan.id]);
      expect(Object.keys(words.sayings)).toEqual([plan.id]);
      expect(words.en[plan.id]).toEqual((en as GuideContent)[plan.id]);
      expect(words.cites[plan.id]).toEqual((cites as GuideCites)[plan.id]);
      expect(words.sayings[plan.id]).toEqual((sayings as SayingsContent)[plan.id]);
    }
  });

  it("give the day's card its intro and verses at the first render, in English and in a language with no guide yet", () => {
    for (const plan of READING_PLANS) {
      const words = planWords(plan.id);
      const english = handedGuide("en", true, words);
      expect(english).not.toBeNull();
      expect(english!.own).toBe(english!.en);
      expect(english!.cites).toBe(words.cites);
      const day = dayGuide(english!.own, english!.en, plan.id, 0, english!.cites);
      expect(day?.intro).toBeTruthy();
      expect(day?.english).toBe(false);
      // A language whose guide is not written yet reads the English, and says so, as it did once loaded.
      const greek = handedGuide("el", true, words);
      expect(greek?.own).toBeNull();
      expect(dayGuide(greek!.own, greek!.en, plan.id, 0, greek!.cites)?.english).toBe(true);
      // The finish's saying is there with it.
      const firstSaid = Object.keys(words.sayings[plan.id] ?? {})[0];
      if (firstSaid) expect(sayingFor(words.sayings, plan.id, Number(firstSaid) - 1)).not.toBeNull();
    }
    expect(handedGuide("en", false, planWords("psalter"))?.cites).toBeNull();
    expect(handedGuide("en", true, undefined)).toBeNull();
  });

  it("are what the plan's page hands its client, which loads none of them after the page is drawn", () => {
    const page = read("app/(app)/plans/[id]/page.tsx");
    expect(page).toContain("words={planWords(id)}");
    const client = read("components/plans/PlanClient.tsx");
    expect(client).toContain("usePlanGuide(locale, true, words)");
    expect(client).toContain("sayings={words.sayings}");
    const finish = read("components/plans/PlanFinish.tsx");
    expect(finish).not.toMatch(/useSayings|import\(/);
    // The words are read on the server only: a client file importing them would carry every plan's.
    expect(read("lib/plans/words.ts")).toMatch(/^import "server-only";/);
  });

  it("keep Begin's Plus mark in its place, unseen, while the answer is on its way", () => {
    const client = read("components/plans/PlanClient.tsx");
    expect(client).toContain("const lockPlace = locked || (plus === null && expectedPlus !== true);");
    expect(client).toContain("lockPlace={lockPlace}");
    const card = read("components/plans/PlanTodayCard.tsx");
    expect(card).toContain('className={cn(PREMIUM_CHIP, !locked && "invisible")}');
  });
});
