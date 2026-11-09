// The Thread's steps for eighteen more events (1.9, PLAN row 20): every step
// held to its event's own words. docs/1.9-build/thread-steps.json keeps, for
// each step, the words of the event's account it rests on; this holds the
// chronology in each event's file to that record, and the record to the
// accounts, so a step cannot say what its event does not.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import STEP_PLACES from "@/data/maps/history-step-places.json";

const ROOT = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

type Step = { date: string; text: string; pivotal?: boolean; place: string | null; basis: string[] };
type Block = { text?: string };
const RECORD = JSON.parse(read("docs/1.9-build/thread-steps.json")) as { events: Record<string, Step[]> };
const REGISTRY = read("lib/history/events.ts");
const places = STEP_PLACES as { places: Record<string, unknown>; steps: Record<string, (string | null)[]> };

/** An event's own words: its account's context and narrative, and its date and summary in the registry. */
function wordsOf(slug: string): string {
  const body = JSON.parse(read(`data/history/${slug}.json`)) as Record<string, Block[] | undefined>;
  const blocks = [...(body.context ?? []), ...(body.narrative ?? [])].map((b) => b.text ?? "");
  const at = REGISTRY.indexOf(`slug: "${slug}"`);
  const entry = REGISTRY.slice(at, at + 3000);
  const display = /displayDate: "([^"]*)"/.exec(entry)?.[1] ?? "";
  const summary = /summary:\s*"((?:[^"\\]|\\.)*)"/.exec(entry)?.[1] ?? "";
  return [...blocks, display, summary].join("\n");
}

describe("the Thread's steps for eighteen more events", () => {
  const slugs = Object.keys(RECORD.events);

  it("are eighteen events, none of the three left for the owner's word", () => {
    expect(slugs).toHaveLength(18);
    for (const left of ["moscow-constantinople-schism-2018", "oca-autocephaly", "ukrainian-autocephaly", "pentecost", "council-of-jerusalem"]) {
      expect(slugs).not.toContain(left);
    }
  });

  it("are, in each event's file, exactly the steps of the record", () => {
    for (const slug of slugs) {
      const body = JSON.parse(read(`data/history/${slug}.json`)) as { chronology?: unknown };
      const want = RECORD.events[slug].map(({ date, text, pivotal }) => ({ date, text, ...(pivotal ? { pivotal } : {}) }));
      expect(body.chronology, slug).toEqual(want);
    }
  });

  it("say only what their event says: each rests on its event's own words, copied exactly", () => {
    for (const slug of slugs) {
      const words = wordsOf(slug);
      for (const [i, step] of RECORD.events[slug].entries()) {
        expect(step.basis.length, `${slug} ${i}`).toBeGreaterThan(0);
        for (const quote of step.basis) expect(words, `${slug} ${i}: ${quote}`).toContain(quote);
      }
    }
  });

  it("give no year their words do not give", () => {
    for (const slug of slugs) {
      for (const [i, step] of RECORD.events[slug].entries()) {
        for (const year of step.date.match(/\b\d{3,4}\b/g) ?? []) {
          expect(step.basis.some((q) => q.includes(year)), `${slug} ${i}: ${year}`).toBe(true);
        }
      }
    }
  });

  it("are placed as the map's record places them, by the step's own words", () => {
    for (const slug of slugs) {
      expect(places.steps[slug], slug).toEqual(RECORD.events[slug].map((s) => s.place));
    }
  });

  it("carry no em dash", () => {
    for (const slug of slugs) for (const step of RECORD.events[slug]) expect(`${step.date} ${step.text}`).not.toContain("—");
  });

  it("are marked, with their account, for a priest's review", () => {
    for (const slug of slugs) {
      const body = JSON.parse(read(`data/history/${slug}.json`)) as { review?: { status: string; basis: string } };
      expect(body.review?.status, slug).toBe("awaiting-clergy-review");
      expect(body.review?.basis, slug).toContain("docs/1.9-build/thread-steps.json");
    }
  });
});
