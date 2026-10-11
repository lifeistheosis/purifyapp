import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { READING_PLANS } from "@/lib/plans/plans";
import { LESSONS } from "@/lib/prayers/learning";
import { START_STEPS } from "@/lib/start/steps";

// Start here (/start): the newcomer's seven steps (lib/start/steps.ts).
//
// The page teaches nothing itself. Every step is a door to a screen the app
// already has, so what can go wrong is a door that opens on nothing: a lesson
// renamed, a plan retired, a line of wording never written.

const MESSAGES = en as Record<string, string>;
const read = (...parts: string[]) => fs.readFileSync(path.join(...parts), "utf8");

/** Whether the app has a screen at a path, read off app/ as the router reads it. */
function hasScreen(dir: string, segments: string[]): boolean {
  const folders = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const groups = folders.filter((n) => n.startsWith("(") && n.endsWith(")"));
  if (groups.some((g) => hasScreen(path.join(dir, g), segments))) return true;
  if (segments.length === 0) return fs.existsSync(path.join(dir, "page.tsx"));
  const [head, ...rest] = segments;
  return folders.some(
    (n) => (n === head || (n.startsWith("[") && !n.startsWith("[..."))) && hasScreen(path.join(dir, n), rest),
  );
}

describe("the seven steps", () => {
  it("are seven, each its own, in the order a newcomer takes them", () => {
    expect(START_STEPS.map((s) => s.id)).toEqual(["prayer", "cross", "morning", "gospel", "catechism", "day", "parish"]);
    expect(new Set(START_STEPS.map((s) => s.href)).size).toBe(START_STEPS.length);
  });

  it("begin with a prayer and end at a parish", () => {
    expect(START_STEPS[0].href).toBe("/prayers/learning/what-is-prayer");
    expect(START_STEPS[START_STEPS.length - 1].href).toBe("/parishes");
  });

  it("each open a screen the app has", () => {
    const lost = START_STEPS.filter((s) => !hasScreen("app", s.href.split("/").filter(Boolean)));
    expect(lost.map((s) => s.href)).toEqual([]);
  });

  it("name lessons and a plan that exist", () => {
    const lessons = new Set(LESSONS.map((l) => l.id));
    const plans = new Set(READING_PLANS.map((p) => p.id));
    for (const step of START_STEPS) {
      const lesson = /^\/prayers\/learning\/(.+)$/.exec(step.href);
      if (lesson) expect(lessons.has(lesson[1]), step.href).toBe(true);
      const plan = /^\/plans\/(.+)$/.exec(step.href);
      if (plan) expect(plans.has(plan[1]), step.href).toBe(true);
    }
  });

  it("have a title and a line under it in the catalog", () => {
    for (const step of START_STEPS) {
      expect(MESSAGES[step.titleKey], step.titleKey).toBeTruthy();
      expect(MESSAGES[step.bodyKey], step.bodyKey).toBeTruthy();
    }
    for (const key of ["start.eyebrow", "start.title", "start.intro", "start.closing", "discover.tile.start", "discover.tile.startBlurb", "nav.discoverMenu.start"]) {
      expect(MESSAGES[key], key).toBeTruthy();
    }
  });

  it("say nothing in yellow or gold", () => {
    // The owner's rule for 1.6. The page is drawn in the paper tones only.
    expect(read("components", "start", "StartHere.tsx")).not.toMatch(/gold|amber|yellow/);
  });
});

describe("the ways in", () => {
  it("are on Discover on a phone and on a computer, and in its menu", () => {
    expect(read("components", "mobile", "DiscoverMobile.tsx")).toContain('href: "/start"');
    expect(read("app", "(app)", "discover", "page.tsx")).toContain('href: "/start"');
    expect(read("components", "nav", "DiscoverDropdown.tsx")).toContain('href: "/start"');
  });

  it("keep the Discover tab lit, and are in the sitemap", () => {
    expect(read("components", "nav", "MobileTabBar.tsx")).toContain('p === "/start"');
    expect(read("app", "sitemap.ts")).toContain('"/start"');
  });
});
