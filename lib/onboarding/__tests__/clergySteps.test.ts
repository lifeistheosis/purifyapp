import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { ClergyJurisdiction, ClergyParish, ClergyWhere } from "@/components/onboarding/ClergySteps";
import { getMessages } from "@/lib/i18n";
import { US_PARISH_LIST_ON } from "@/lib/parishes/listSwitch";
import { US_PARISH_LIST } from "@/lib/parishes/usParishes";

import { COUNTRIES, OTHER, US_JURISDICTIONS, type ParishAnswer } from "../clergy";

/**
 * A priest's or deacon's screens as they are drawn (1.8.x, the owner's note
 * 54): where they serve, their jurisdiction, their parish in the United
 * States. No design sheet was drawn for them; they are the level question's
 * own parts. Above all, none of them shows a mark: answering asks the team,
 * who verify before any seal appears. And until a parish list is permitted,
 * the parish is written, never picked from the SAMPLE list; the list's own
 * screen, behind its switch, is clergyParishList.test.ts.
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

describe("the parish, in the United States, as the app ships it", () => {
  const written = (name: string, place = ""): ParishAnswer => ({ kind: "typed", name, place });
  const parishScreen = (parish: ParishAnswer | null, locale = "en") =>
    // The SAMPLE list handed in as well: the switch, not the caller, decides.
    draw(createElement(ClergyParish, { jurisdiction: "romanian", parish, onPick: noop, onContinue: noop, list: US_PARISH_LIST }), locale);

  it("keeps the parish list switched off until a list is permitted, and can be switched on only with one that is", () => {
    expect(US_PARISH_LIST_ON).toBe(false);
    // Turning it on is a data change and this one line: a permitted list in
    // lib/parishes/usParishes.ts, no longer the sample, naming who gave it.
    if (US_PARISH_LIST_ON) {
      expect(US_PARISH_LIST.sample).toBe(false);
      expect(US_PARISH_LIST.source).toBeTruthy();
    }
  });

  it("asks the reader to write their parish: its name, and its city and state", () => {
    const html = parishScreen(null);
    expect(html).toContain("Which parish do you serve?");
    expect(html).toContain("Write the name of your parish, and its city and state.");
    expect(html).toMatch(/<input[^>]*placeholder="Parish or monastery"/);
    expect(html).toMatch(/<input[^>]*placeholder="City and state"/);
    expect([...html.matchAll(/<input/g)]).toHaveLength(2);
  });

  it("never shows the SAMPLE list, its search, or a word about a list that missed them", () => {
    for (const html of [parishScreen(null), parishScreen(written("St. Mary")), parishScreen(null, "el")]) {
      expect(html).not.toContain("data-ob-sample");
      expect(html).not.toMatch(/SAMPLE|ΔΕΙΓΜΑ/);
      expect(html).not.toContain('type="search"');
      expect(html).not.toContain("Search the Orthodox parishes");
      expect(html).not.toContain("not listed");
      expect(rows(html)).toEqual([]);
      for (const p of US_PARISH_LIST.parishes) expect(html).not.toContain(p.name.replace(/“|”/g, ""));
    }
  });

  it("goes on once a name is written, and shows what was written", () => {
    expect(continueButton(parishScreen(null))).toMatch(/disabled=""/);
    expect(continueButton(parishScreen(written(" ")))).toMatch(/disabled=""/);
    const html = parishScreen(written("St. Mary", "Austin, TX"));
    expect(continueButton(html)).not.toMatch(/disabled=""/);
    expect(html).toMatch(/value="St. Mary"/);
    expect(html).toMatch(/value="Austin, TX"/);
    // The city and state are welcome, not required.
    expect(continueButton(parishScreen(written("St. Mary")))).not.toMatch(/disabled=""/);
  });

  it("asks in the reader's language", () => {
    const html = parishScreen(null, "el");
    expect(html).toContain("Γράψτε το όνομα της ενορίας σας");
    expect(html).toMatch(/placeholder="Ενορία ή μονή"/);
  });

  it("loads the list only behind the switch, so the shipped app never fetches it", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "components/onboarding/ClergySteps.tsx"), "utf8");
    // Types only at the top: the data itself is imported on demand, inside the list's own screen.
    expect(src).not.toMatch(/^import (?!type )[^;]*from "@\/lib\/parishes\/usParishes"/m);
    const load = src.indexOf('import("@/lib/parishes/usParishes")');
    expect(load).toBeGreaterThan(src.indexOf("function ParishSearch("));
    expect(src).toMatch(/US_PARISH_LIST_ON \? <ParishSearch [^>]*\/> : <ParishWritten [^>]*\/>/);
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
