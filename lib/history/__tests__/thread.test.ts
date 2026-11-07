// The Thread (1.9, Purify Plus): an event's steps year by year, with a map
// that follows them from place to place. The steps stay free as the plain
// list; the Thread is how Plus follows them. The walk at phone size checked
// the screen; this holds the data and the rules.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import outline from "@/data/maps/church-history.json";
import { loadEventBody } from "@/lib/history/load";
import { eventThread, stepYear } from "@/lib/history/thread";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");
const THREAD = read("components/history/EventThread.tsx");
const STEPPED = ["council-of-florence", "fall-of-constantinople", "alaska-mission", "first-council-of-constantinople"];

describe("a step's year", () => {
  it("is the first year its date line names", () => {
    expect(stepYear("6 July 1439")).toBe("1439");
    expect(stepYear("March–July 1794")).toBe("1794");
    expect(stepYear("c. 325")).toBe("325");
    expect(stepYear("Spring")).toBeNull();
  });
});

describe("the steps' places", () => {
  it("are never the event's place lent to a step: a step names its own or has none", async () => {
    const body = await loadEventBody("council-of-florence");
    const thread = eventThread("council-of-florence", body?.chronology ?? []);
    expect(thread.steps.length).toBe(24);
    // Until a step's own words are read for its place, it has none; the map stands at the event's.
    expect(thread.steps.every((s) => s.place === null)).toBe(true);
    expect(thread.home?.name).toBe("Florence");
  });

  it("stand on the history map's own outline", async () => {
    const [w, h] = outline.view;
    for (const slug of STEPPED) {
      const body = await loadEventBody(slug);
      const { home, steps } = eventThread(slug, body?.chronology ?? []);
      expect(steps.length, slug).toBeGreaterThan(0);
      for (const p of [home, ...steps.map((s) => s.place)]) {
        if (!p) continue;
        expect(p.x, `${slug} ${p.name}`).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(w);
        expect(p.y, `${slug} ${p.name}`).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(h);
      }
    }
  });
});

describe("the Thread on an event's page", () => {
  it("keeps the steps free as the plain list, and is Plus's way to follow them", () => {
    expect(THREAD).toContain("if (plus === true) return <Thread steps={steps} home={home} />;");
    expect(THREAD).toContain("<PlainSteps steps={steps} />");
    expect(THREAD).toMatch(/plus === false \? \(\s*<button[\s\S]*?onClick=\{\(\) => upgrade\.open\("history"\)\}[\s\S]*?<PlusMark \/>/);
  });

  it("asks for the map's land as one file, never carrying the outline in the page or the app's code", () => {
    expect(THREAD).toContain('fetch("/history-land.json")');
    expect(THREAD).toContain('import type { EventThreadData, ThreadPlace, ThreadStep } from "@/lib/history/thread";');
    expect(THREAD).not.toMatch(/church-history\.json/);
    const route = read("app/history-land.json/route.ts");
    expect(route).toContain('export const dynamic = "force-static";');
  });

  it("moves its map only on the app's motion switch", () => {
    expect(THREAD).toContain('className="motion-safe:transition-transform motion-safe:duration-700"');
  });
});
