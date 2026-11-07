// The Thread (1.9, Purify Plus): an event's steps year by year, with a map
// that follows them from place to place. The steps stay free as the plain
// list; the Thread is how Plus follows them. The walk at phone size checked
// the screen; this holds the data and the rules.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import STEP_PLACES from "@/data/maps/history-step-places.json";
import outline from "@/data/maps/church-history.json";
import { loadEventBody } from "@/lib/history/load";
import { eventThread, stepYear } from "@/lib/history/thread";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");
const THREAD = read("components/history/EventThread.tsx");
const places = STEP_PLACES as { places: Record<string, { name: string; lat: number; lon: number }>; steps: Record<string, (string | null)[]> };

describe("a step's year", () => {
  it("is the first year its date line names", () => {
    expect(stepYear("6 July 1439")).toBe("1439");
    expect(stepYear("March–July 1794")).toBe("1794");
    expect(stepYear("c. 325")).toBe("325");
    expect(stepYear("Spring")).toBeNull();
  });
});

describe("the steps' places", () => {
  it("name one place, or none, for each step of every event that has steps", async () => {
    for (const [slug, keys] of Object.entries(places.steps)) {
      const body = await loadEventBody(slug);
      expect(keys, slug).toHaveLength(body?.chronology?.length ?? -1);
      for (const key of keys) if (key) expect(places.places[key], `${slug} ${key}`).toBeTruthy();
    }
    const used = new Set(Object.values(places.steps).flat().filter(Boolean));
    expect([...used].sort()).toEqual(Object.keys(places.places).sort());
  });

  it("are the step's own and never the event's lent to it: the Council of Lyons did not meet at Florence", async () => {
    const body = await loadEventBody("council-of-florence");
    const { home, steps } = eventThread("council-of-florence", body?.chronology ?? []);
    expect(home?.name).toBe("Florence");
    expect(steps[0].place?.name).toBe("Lyons");
    expect(steps[5].place?.name).toBe("Ferrara");
    // A step whose words name no place has none.
    expect(steps.filter((s) => s.place === null).length).toBeGreaterThan(0);
    for (const [i, s] of steps.entries()) expect(s.place?.name ?? null, `step ${i}`).toBe(places.steps["council-of-florence"][i] ? places.places[places.steps["council-of-florence"][i]!].name : null);
  });

  it("stand on the history map's own outline", async () => {
    const [w, h] = outline.view;
    for (const slug of Object.keys(places.steps)) {
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

  it("names a place on its map only when the step being read names it", () => {
    expect(THREAD).toContain("const own = steps[current]?.place ?? null;");
    expect(THREAD).toMatch(/\{own \? \(\s*<p aria-hidden/);
  });

  it("moves its map only on the app's motion switch", () => {
    expect(THREAD).toContain('className="motion-safe:transition-transform motion-safe:duration-700"');
  });
});
