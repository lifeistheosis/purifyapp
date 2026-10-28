// An address said as the kind of screen it is (lib/analytics/screens.ts), held
// against the app's own routes: every page Purify has lands on a word of its
// own, and every word is a page Purify has.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SCREENS, isScreen, screenOf, screenPath, type ScreenKey } from "../screens";

const APP = path.join(process.cwd(), "app");

/** Every page.tsx under app/, as the address a reader would see, with a sample word for each [param]. */
function routes(dir = APP, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "api" || entry.name.startsWith("_")) continue;
      routes(full, out);
    } else if (entry.name === "page.tsx") {
      const segs = path
        .relative(APP, dir)
        .split(path.sep)
        .filter((s) => s && !/^\(.*\)$/.test(s))
        .map((s) => (/^\[.*\]$/.test(s) ? "sample-word" : s));
      out.push(`/${segs.join("/")}`);
    }
  }
  return out;
}

// Never counted: the tracker and /api/track drop /admin, and /owner is the
// owner's own strategy pages.
const ROUTES = routes().filter((r) => !r.startsWith("/admin") && !r.startsWith("/owner"));

describe("the screens", () => {
  it("names the owner's examples", () => {
    expect(screenOf("/bible/john/3")).toBe("bible-chapter");
    expect(screenOf("/bible/romans/8")).toBe("bible-chapter");
    expect(screenOf("/saints/john-chrysostom")).toBe("saint");
    expect(screenOf("/prayers/psalm-50")).toBe("prayer");
  });

  it("puts a fixed word ahead of the wildcard beside it", () => {
    expect(screenOf("/prayers/morning")).toBe("morning-prayers");
    expect(screenOf("/prayers/evening")).toBe("evening-prayers");
    expect(screenOf("/prayers/today")).toBe("prayers-today");
    expect(screenOf("/prayers/personal/evening")).toBe("own-rule");
    expect(screenOf("/prayers/hours/sixth")).toBe("hour");
    expect(screenOf("/theology/doctrine")).toBe("doctrine");
    expect(screenOf("/theology/theosis")).toBe("theology-topic");
    expect(screenOf("/saints/john-chrysostom/web")).toBe("saint-web");
    expect(screenOf("/saints/john-chrysostom/on-the-priesthood")).toBe("saint-work");
    expect(screenOf("/campaigns/new")).toBe("campaign-new");
    expect(screenOf("/campaigns/detail")).toBe("campaign");
    expect(screenOf("/shop/cart")).toBe("cart");
    expect(screenOf("/shop/seller/listings/new")).toBe("seller");
    expect(screenOf("/shop/holy-trinity-icons")).toBe("shop-store");
    expect(screenOf("/plan")).toBe("plus");
    expect(screenOf("/plans/gospels")).toBe("reading-plan");
  });

  it("reads an address the way a reader says it", () => {
    expect(screenPath("/prayers/evening/")).toBe("/prayers/evening");
    expect(screenOf("/prayers/evening/")).toBe("evening-prayers");
    expect(screenOf("/bible/john/3?v=16#verse-16")).toBe("bible-chapter");
    expect(screenOf("/")).toBe("today");
    expect(screenOf("")).toBe("today");
    expect(screenOf(null)).toBe("today");
    expect(screenOf("/Saints/John-Chrysostom")).toBe("saint");
  });

  it("calls anything it does not know another page", () => {
    expect(screenOf("/bible/john")).toBe("other");
    expect(screenOf("/nowhere/at/all")).toBe("other");
    expect(screenOf("/owner")).toBe("other");
  });

  it("lands every page the app has on a word of its own", () => {
    expect(ROUTES.length).toBeGreaterThan(100);
    expect(ROUTES).toContain("/");
    expect(ROUTES).toContain("/bible/sample-word/sample-word");
    const unnamed = ROUTES.filter((r) => screenOf(r) === "other");
    expect(unnamed, "a page with no screen: add a rule in lib/analytics/screens.ts").toEqual([]);
  });

  it("has no word that no page reaches", () => {
    const reached = new Set<ScreenKey>(ROUTES.map((r) => screenOf(r)));
    const dead = SCREENS.filter((s) => s !== "other" && !reached.has(s));
    expect(dead).toEqual([]);
  });

  it("keeps its words short, plain and once each", () => {
    expect(new Set(SCREENS).size).toBe(SCREENS.length);
    for (const s of SCREENS) expect(s, s).toMatch(/^[a-z]+(-[a-z]+)*$/);
    for (const s of SCREENS) expect(s.length, s).toBeLessThanOrEqual(24);
    expect(isScreen("saint")).toBe(true);
    expect(isScreen("/saints/x")).toBe(false);
    expect(isScreen(7)).toBe(false);
  });
});
