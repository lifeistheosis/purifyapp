// The tab bar a tab root wears (components/mobile/MobileHeader.tsx: the
// tab's name, Plus, search and the bell) stands only on the five tab roots.
// Fresh eyes M3 (2026-11-11): the reading room wore it too, under the apps'
// back bar, so the reader met two bars where every other page under Discover
// has one. Its page now mounts its own bar, Back and its name.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { OWN_HEADER_PATTERNS } from "@/lib/nav/backBar";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
/** The code without its comments: a note naming the bar is not the bar. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (!["node_modules", "__tests__"].includes(e.name)) walk(rel, out);
    } else if (/\.tsx$/.test(e.name)) out.push(rel);
  }
  return out;
}

/** The five tabs' own screens, and You's while it loads. */
const TAB_ROOTS = [
  "app/(app)/account/(you)/loading.tsx",
  "components/mobile/BibleMobile.tsx",
  "components/mobile/DiscoverMobile.tsx",
  "components/mobile/PrayersMobile.tsx",
  "components/mobile/YouMobile.tsx",
  "components/today/TodayMobileV3.tsx",
];

describe("the tab's own bar", () => {
  it("stands only on the five tab roots", () => {
    const wearing = [...walk("app"), ...walk("components")].filter((f) => /<MobileHeader\b/.test(code(f))).sort();
    expect(wearing).toEqual(TAB_ROOTS);
  });

  it("is not the reading room's: its page's own bar is, Back to Discover, and the apps' back bar stands aside", () => {
    expect(code("components/reading/ReadingRoom.tsx")).not.toContain("MobileHeader");
    expect(code("app/(app)/reading/page.tsx")).toContain('<MobileTopBar titleKey="nav.reading" back backFallback="/discover" />');
    expect(OWN_HEADER_PATTERNS.some((p) => p.test("/reading"))).toBe(true);
  });
});
