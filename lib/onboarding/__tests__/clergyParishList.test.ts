import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * The US parish screen with a parish list switched on: what turning on a
 * permitted list will show (note 54). The switch is OFF in the app until the
 * Assembly or the jurisdictions give permission (lib/parishes/listSwitch.ts,
 * held there by clergySteps.test.ts), so readers see only the written form;
 * this file switches it on to keep the list's screen built and correct, and
 * proves the SAMPLE could never pass for a real list if it were.
 */

vi.mock("@/lib/parishes/listSwitch", () => ({ US_PARISH_LIST_ON: true }));

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { ClergyParish } from "@/components/onboarding/ClergySteps";
import { getMessages } from "@/lib/i18n";
import { US_PARISH_LIST } from "@/lib/parishes/usParishes";

import type { ParishAnswer } from "../clergy";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const noop = () => {};

function draw(node: ReactElement, locale = "en"): string {
  return renderToString(createElement(MessagesProvider, { locale, messages: getMessages(locale) } as ProviderProps, node));
}

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

const screen = (parish: ParishAnswer | null, list = US_PARISH_LIST, jurisdiction: string | null = null, locale = "en") =>
  draw(createElement(ClergyParish, { jurisdiction, parish, onPick: noop, onContinue: noop, list }), locale);

describe("the parish list, switched on", () => {
  it("searches the list by name, city or state, and marks it SAMPLE while it is one", () => {
    const html = screen(null);
    expect(html).toContain("Search the Orthodox parishes of the United States by name, city or state.");
    expect(html).toMatch(/data-ob-sample[^>]*>[\s\S]*?SAMPLE[\s\S]*?A short sample list for now/);
    expect(html).toMatch(/<input[^>]*type="search"[^>]*placeholder="Name, city or state"/);
    expect(rows(html).filter((x) => x.text[0] !== "My parish is not listed")).toHaveLength(US_PARISH_LIST.parishes.length);
    expect(continueButton(html)).toMatch(/disabled=""/);
    expect(screen(null, US_PARISH_LIST, null, "el")).toContain("ΔΕΙΓΜΑ");
  });

  it("does not say SAMPLE for a permitted list", () => {
    const html = screen(null, { ...US_PARISH_LIST, sample: false, source: "a list the owner cleared" });
    expect(html).not.toContain("data-ob-sample");
    expect(html).not.toContain("SAMPLE");
  });

  it("lights the parish picked, with its city and jurisdiction, the reader's own jurisdiction first", () => {
    const html = screen(LISTED, US_PARISH_LIST, "romanian");
    const picked = rows(html).filter((x) => x.pressed);
    expect(picked).toHaveLength(1);
    expect(picked[0].text).toEqual(["Ss. Constantine and Helen Cathedral", "Chicago, IL", "Romanian Orthodox Metropolia of the Americas"]);
    expect(rows(html)[0].text[0]).toBe("Ss. Constantine and Helen Cathedral");
    expect(continueButton(html)).not.toMatch(/disabled=""/);
  });

  it("keeps the written form for a parish the list lacks, and goes on once it has a name", () => {
    const typed = (name: string): ParishAnswer => ({ kind: "typed", name, place: "Austin, TX" });
    const html = screen(typed(""));
    expect(html).toMatch(/aria-pressed="true"[^>]*>My parish is not listed/);
    expect(html).toMatch(/<input[^>]*placeholder="Parish or monastery"/);
    expect(html).toMatch(/value="Austin, TX"/);
    expect(continueButton(html)).toMatch(/disabled=""/);
    expect(continueButton(screen(typed("St. Mary")))).not.toMatch(/disabled=""/);
  });
});
