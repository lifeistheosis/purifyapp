import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { ClergyJurisdiction, ClergyParish, ClergyWhere } from "@/components/onboarding/ClergySteps";
import { getMessages } from "@/lib/i18n";
import { US_PARISH_LIST } from "@/lib/parishes/usParishes";

import { COUNTRIES, OTHER, US_JURISDICTIONS, type ParishAnswer } from "../clergy";

/**
 * A priest's or deacon's screens as they are drawn (1.8.x, the owner's note
 * 54): where they serve, their jurisdiction, their parish in the United
 * States. No design sheet was drawn for them; they are the level question's
 * own parts. Above all, none of them shows a mark: answering asks the team,
 * who verify before any seal appears.
 */

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const noop = () => {};

function draw(node: ReactElement, locale = "en"): string {
  return renderToString(createElement(MessagesProvider, { locale, messages: getMessages(locale) } as ProviderProps, node));
}

/** The answers in the order drawn: pressed or not, and their words. */
function rows(html: string) {
  return [...html.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>([\s\S]*?)<\/button>/g)].map(([, pressed, inner]) => ({
    pressed: pressed === "true",
    text: inner
      .replace(/<[^>]+>/g, "|")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean),
  }));
}

const text = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

/** The way on: the one button that is not an answer. */
function continueButton(html: string): string | null {
  return [...html.matchAll(/<button(?![^>]*aria-pressed)[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0])[0] ?? null;
}

const LISTED: ParishAnswer = {
  kind: "listed",
  id: "romanian-chicago-constantine-helen",
  name: "Ss. Constantine and Helen Cathedral",
  city: "Chicago",
  state: "IL",
  sample: true,
};

describe("where they serve", () => {
  it("asks the question with a search, and lists every country, the United States first", () => {
    const html = draw(createElement(ClergyWhere, { country: null, onChoose: noop }));
    expect(html).toContain("Where do you serve?");
    expect(html).toMatch(/<input[^>]*type="search"[^>]*placeholder="Search for a country"/);
    const r = rows(html);
    expect(r).toHaveLength(COUNTRIES.length);
    expect(r[0].text[0]).toBe("United States");
    expect(r.every((x) => !x.pressed)).toBe(true);
  });

  it("names the countries in the reader's language and marks the one chosen", () => {
    const html = draw(createElement(ClergyWhere, { country: "GR", onChoose: noop }), "el");
    const chosen = rows(html).filter((x) => x.pressed);
    expect(chosen).toHaveLength(1);
    expect(chosen[0].text[0]).toBe("Ελλάδα");
    // Shown near the top, where a reader coming back to the screen sees it.
    expect(rows(html).findIndex((x) => x.pressed)).toBeLessThan(3);
  });
});

describe("the jurisdiction", () => {
  it("in the United States, lists the Assembly's jurisdictions under their Mother Churches, then another", () => {
    const html = draw(createElement(ClergyJurisdiction, { country: "US", jurisdiction: null, otherName: "", onChoose: noop, onOtherName: noop, onContinue: noop }));
    expect(html).toContain("Which jurisdiction do you serve in?");
    expect(html).toContain("The jurisdictions of the Assembly of Canonical Orthodox Bishops of the United States of America.");
    const headings = [...html.matchAll(/<p class="font-sans text-caption font-semibold text-paper\/55">([^<]+)<\/p>/g)].map((m) => m[1]);
    expect(headings).toEqual([
      "Ecumenical Patriarchate",
      "Patriarchate of Antioch",
      "Patriarchate of Moscow",
      "Patriarchate of Serbia",
      "Patriarchate of Romania",
      "Patriarchate of Bulgaria",
      "Patriarchate of Georgia",
      "Orthodox Church in America",
    ]);
    const r = rows(html).map((x) => text(x.text[0]));
    expect(r).toEqual([...US_JURISDICTIONS.map((j) => j.name), "Another jurisdiction"]);
    // A proper name in English, said as English by a screen reader.
    expect(html).toContain('lang="en"');
    // A listed one moves on by itself: no Continue until "another" is chosen.
    expect(continueButton(html)).toBeNull();
  });

  it("elsewhere, puts the country's own Church first and says so, then the rest, then another", () => {
    const html = draw(createElement(ClergyJurisdiction, { country: "GR", jurisdiction: null, otherName: "", onChoose: noop, onOtherName: noop, onContinue: noop }));
    const r = rows(html);
    expect(r[0].text).toEqual(["Church of Greece", "The local Church of this country"]);
    expect(r).toHaveLength(16);
    expect(r[r.length - 1].text).toEqual(["Another jurisdiction"]);
    expect(html).not.toContain("Assembly of Canonical");
  });

  it("draws the Churches in the reader's language", () => {
    const html = draw(
      createElement(ClergyJurisdiction, { country: "RO", jurisdiction: "romania", otherName: "", onChoose: noop, onOtherName: noop, onContinue: noop }),
      "ro",
    );
    const r = rows(html);
    expect(r[0]).toEqual({ pressed: true, text: ["Patriarhia Română", "Biserica locală a acestei țări"] });
  });

  it("asks for another jurisdiction's name and waits for it before Continue", () => {
    const empty = draw(createElement(ClergyJurisdiction, { country: "DE", jurisdiction: OTHER, otherName: "", onChoose: noop, onOtherName: noop, onContinue: noop }));
    expect(empty).toMatch(/<input[^>]*placeholder="Name your jurisdiction"/);
    expect(continueButton(empty)).toMatch(/disabled=""/);
    const named = draw(createElement(ClergyJurisdiction, { country: "DE", jurisdiction: OTHER, otherName: "ROCOR", onChoose: noop, onOtherName: noop, onContinue: noop }));
    expect(continueButton(named)).not.toMatch(/disabled=""/);
  });
});

describe("the parish, in the United States", () => {
  it("marks the list SAMPLE while it is one, and shows it whole with a search by name, city or state", () => {
    const html = draw(createElement(ClergyParish, { jurisdiction: null, parish: null, onPick: noop, onContinue: noop, list: US_PARISH_LIST }));
    expect(html).toContain("Which parish do you serve?");
    expect(html).toMatch(/data-ob-sample[^>]*>[\s\S]*?SAMPLE[\s\S]*?A short sample list for now/);
    expect(html).toMatch(/<input[^>]*type="search"[^>]*placeholder="Name, city or state"/);
    expect(rows(html).filter((x) => x.text[0] !== "My parish is not listed")).toHaveLength(US_PARISH_LIST.parishes.length);
    expect(continueButton(html)).toMatch(/disabled=""/);
  });

  it("says SAMPLE in the reader's language", () => {
    expect(draw(createElement(ClergyParish, { jurisdiction: null, parish: null, onPick: noop, onContinue: noop, list: US_PARISH_LIST }), "el")).toContain(
      "ΔΕΙΓΜΑ",
    );
  });

  it("does not say SAMPLE once the list is a whole one", () => {
    const whole = { ...US_PARISH_LIST, sample: false, source: "a list the owner cleared" };
    const html = draw(createElement(ClergyParish, { jurisdiction: null, parish: null, onPick: noop, onContinue: noop, list: whole }));
    expect(html).not.toContain("data-ob-sample");
    expect(html).not.toContain("SAMPLE");
  });

  it("lights the parish picked, with its city and jurisdiction, and lets the reader go on", () => {
    const html = draw(createElement(ClergyParish, { jurisdiction: "romanian", parish: LISTED, onPick: noop, onContinue: noop, list: US_PARISH_LIST }));
    const picked = rows(html).filter((x) => x.pressed);
    expect(picked).toHaveLength(1);
    expect(picked[0].text).toEqual(["Ss. Constantine and Helen Cathedral", "Chicago, IL", "Romanian Orthodox Metropolia of the Americas"]);
    // The reader's own jurisdiction leads the list.
    expect(rows(html)[0].text[0]).toBe("Ss. Constantine and Helen Cathedral");
    expect(continueButton(html)).not.toMatch(/disabled=""/);
  });

  it("takes a parish that is not listed as a name and a place, and goes on once it has a name", () => {
    const typed = (name: string): ParishAnswer => ({ kind: "typed", name, place: "Austin, TX" });
    const html = draw(createElement(ClergyParish, { jurisdiction: null, parish: typed(""), onPick: noop, onContinue: noop, list: US_PARISH_LIST }));
    expect(html).toMatch(/aria-pressed="true"[^>]*>My parish is not listed/);
    expect(html).toMatch(/<input[^>]*placeholder="Parish or monastery"/);
    expect(html).toMatch(/<input[^>]*placeholder="City and state"[^>]*value="Austin, TX"|<input[^>]*value="Austin, TX"[^>]*placeholder="City and state"/);
    expect(continueButton(html)).toMatch(/disabled=""/);
    const named = draw(createElement(ClergyParish, { jurisdiction: null, parish: typed("St. Mary"), onPick: noop, onContinue: noop, list: US_PARISH_LIST }));
    expect(continueButton(named)).not.toMatch(/disabled=""/);
  });
});

describe("no mark before the team has verified", () => {
  const SEAL_WORDS = ["Verified priest", "Verified deacon", "Verified clergy", "Verified bishop", "Verified monastic"];

  it("is drawn on none of a priest's or deacon's screens, answered or not", () => {
    const screens = [
      draw(createElement(ClergyWhere, { country: "US", onChoose: noop })),
      draw(createElement(ClergyJurisdiction, { country: "US", jurisdiction: "oca", otherName: "", onChoose: noop, onOtherName: noop, onContinue: noop })),
      draw(createElement(ClergyJurisdiction, { country: "GR", jurisdiction: OTHER, otherName: "x", onChoose: noop, onOtherName: noop, onContinue: noop })),
      draw(createElement(ClergyParish, { jurisdiction: "romanian", parish: LISTED, onPick: noop, onContinue: noop, list: US_PARISH_LIST })),
    ];
    for (const html of screens) {
      expect(html).not.toContain("clergy-seal");
      expect(html).not.toContain("supporter-mark");
      for (const w of SEAL_WORDS) expect(html).not.toContain(w);
    }
  });

  it("is never imported by the welcome questions: the seal comes only from the team's verification", () => {
    for (const file of ["components/onboarding/ClergySteps.tsx", "components/onboarding/OnboardingFlow.tsx", "components/onboarding/HandoffSlate.tsx"]) {
      const src = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(src, file).not.toMatch(/ClergySeal|SupporterMark|VerifiedMark|clergyLabelKey/);
    }
  });

  it("is not something the request can ask to be: it carries no status, and the route files every request as requested", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "app/api/profile/clergy/route.ts"), "utf8");
    expect(route).toMatch(/status: "requested"/);
    expect(route).not.toMatch(/status: p\.status|status: body/);
    const sender = fs.readFileSync(path.join(process.cwd(), "lib/onboarding/clergyRequest.ts"), "utf8");
    expect(sender).not.toMatch(/status:\s*"verified"/);
  });
});
