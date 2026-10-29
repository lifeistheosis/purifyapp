import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ADMIN_PAGE_GROUPS, type AdminPageGroup } from "../pages";
import {
  ALWAYS_NEEDED,
  DAILY_SIZE,
  HOME,
  MIN_STAYS,
  RAIL_COOKIE,
  TOOL_MS,
  decodeRail,
  encodeRail,
  normalizeRail,
  pickedRail,
  railCookie,
  railDay,
  railFromUsage,
  type ViewUse,
} from "../rail";

// The owner's pick A, "One home" (2026-10-28): the rail sorted by how he uses
// it, the pages he never opens folded into one quiet Tools line, and nothing
// the admin has today out of reach.

const SHELL = readFileSync(join(process.cwd(), "components/admin/AdminShell.tsx"), "utf8");
const MOBILE = readFileSync(join(process.cwd(), "components/admin/AdminMobileNav.tsx"), "utf8");

/** Every view the shell draws, read from its COMPONENTS map, as pages.test.ts does. */
function shellViews(): string[] {
  const at = SHELL.indexOf("const COMPONENTS");
  const block = SHELL.slice(at, SHELL.indexOf("};", at));
  return [...block.matchAll(/^\s+"?([a-z][a-z-]*)"?:\s/gm)].map((m) => m[1]);
}

const OPS_PAGES = ADMIN_PAGE_GROUPS.filter((g) => g.mode === "ops").flatMap((g) => g.pages.map((p) => p.id));

const ids = (groups: AdminPageGroup[]) => groups.map((g) => g.pages.map((p) => p.id));
const labels = (groups: AdminPageGroup[]) => groups.map((g) => g.pages.map((p) => p.label));

/**
 * The guarantees every rail must keep, however it was built: every page
 * exactly once, every view the shell draws under one of them, Home first,
 * four at most in Daily, the queues never folded, and Tools the one quiet
 * group.
 */
function expectWhole(groups: AdminPageGroup[]) {
  expect(groups.map((g) => g.group)).toEqual(["Daily", "When needed", "Tools"]);
  expect(groups.map((g) => Boolean(g.quiet))).toEqual([false, false, true]);
  const all = groups.flatMap((g) => g.pages.map((p) => p.id));
  expect(new Set(all).size, "a page listed twice").toBe(all.length);
  expect([...all].sort()).toEqual([...OPS_PAGES].sort());
  const views = groups.flatMap((g) => g.pages.flatMap((p) => p.views.map((v) => v.tab)));
  const drawn = shellViews();
  expect(drawn.length).toBeGreaterThan(25);
  for (const id of drawn) expect(views, `${id} cannot be reached`).toContain(id);
  expect(groups[0].pages[0].id).toBe(HOME);
  expect(groups[0].pages.length).toBeLessThanOrEqual(DAILY_SIZE);
  for (const id of ALWAYS_NEEDED) expect(groups[2].pages.map((p) => p.id), id).not.toContain(id);
}

/** A view's use, as the readout counts it. */
const viewUse = (tab: string, opens: number, quickExits: number, totalMs: number): ViewUse => ({
  tab,
  opens,
  quickExits,
  totalMs,
});

/**
 * His week as the readout showed it (21 to 27 Oct): Traffic 50 visits and
 * 12.5 minutes, Money 38 and 6, Today 42 visits with 40 of them left within
 * five seconds, and a long tail of pages under a minute each.
 */
const HIS_WEEK: ViewUse[] = [
  viewUse("today", 42, 40, 95_000),
  viewUse("traffic", 44, 4, 640_000),
  viewUse("onboarding", 6, 1, 110_000),
  viewUse("overview", 30, 4, 300_000),
  viewUse("revenue", 8, 2, 60_000),
  viewUse("users", 12, 2, 150_000),
  viewUse("orders", 9, 3, 80_000),
  viewUse("messages", 6, 2, 70_000),
  viewUse("shop", 5, 2, 65_000),
  viewUse("audit", 1, 0, 25_000),
  viewUse("usage", 2, 0, 30_000),
  viewUse("drop", 2, 1, 20_000),
  viewUse("community", 1, 1, 2_000),
  viewUse("goals", 1, 1, 3_000),
  // An owner page, and a tab no page holds: neither is an operations page.
  viewUse("owner-today", 9, 0, 400_000),
  viewUse("growth", 30, 0, 900_000),
];

describe("the rail as he picked it", () => {
  it("is Daily, When needed and the Tools line, with every page in it", () => {
    const rail = pickedRail();
    expectWhole(rail);
    expect(labels(rail)).toEqual([
      ["Home", "Traffic", "Money", "Users"],
      ["Orders", "Messages", "Catalogue"],
      ["Releases", "Content", "Community", "EIKON Box", "Services", "Audit log"],
    ]);
  });

  it("gives the phone bar Home and the three pages read most", () => {
    // The shell hands the bar the rail's first group, so the two cannot differ.
    expect(pickedRail()[0].pages.map((p) => p.id)).toEqual(["today", "traffic", "overview", "users"]);
    expect(SHELL).toMatch(/primary=\{mode === "ops" \? \(visiblePageGroups\[0\]\?\.pages\.map/);
    expect(MOBILE).not.toMatch(/const PRIMARY\b/);
  });
});

describe("the Tools line", () => {
  const tools = pickedRail()[2];

  it("folds the pages he barely opens, and is the only quiet group", () => {
    expect(tools.quiet).toBe(true);
    expect(tools.pages.map((p) => p.label)).toEqual([
      "Releases",
      "Content",
      "Community",
      "EIKON Box",
      "Services",
      "Audit log",
    ]);
    expect(ADMIN_PAGE_GROUPS.filter((g) => g.quiet).map((g) => g.group)).toEqual(["Tools"]);
  });

  it("opens each page, and every view under it, the never-opened ones too", () => {
    const drawn = shellViews();
    for (const p of tools.pages) {
      expect(drawn, `${p.label} opens a view the shell draws`).toContain(p.id);
      for (const v of p.views) expect(drawn, `${p.label}: ${v.label}`).toContain(v.tab);
    }
    // The views his week never opened, still one tap under a Tools link.
    expect(tools.pages.flatMap((p) => p.views.map((v) => v.label))).toEqual(
      expect.arrayContaining(["Email", "Push", "Patch notes", "Ratings", "Library files"]),
    );
  });

  it("is drawn as one line of links in the rail and as quiet rows on the phone", () => {
    expect(SHELL).toMatch(/g\.quiet \? \(\s*<ToolsLine/);
    expect(MOBILE).toMatch(/g\.quiet \?/);
  });
});

describe("railFromUsage", () => {
  it("sorts his week into the rail he picked", () => {
    const rail = railFromUsage(HIS_WEEK);
    expectWhole(rail);
    expect(labels(rail)).toEqual([
      ["Home", "Traffic", "Money", "Users"],
      ["Orders", "Messages", "Catalogue"],
      ["Releases", "Content", "Community", "EIKON Box", "Services", "Audit log"],
    ]);
  });

  it("keeps Home first though nearly every visit to it is a doorway", () => {
    const rail = railFromUsage(HIS_WEEK.map((v) => (v.tab === "today" ? viewUse("today", 40, 40, 20_000) : v)));
    expect(rail[0].pages[0].id).toBe(HOME);
  });

  it("ranks by the visits that stayed, not by the ones left within seconds", () => {
    // Orders checked forty times and left each time: a glance, not a read.
    const glanced = HIS_WEEK.map((v) => (v.tab === "orders" ? viewUse("orders", 40, 40, 40_000) : v));
    expect(ids(railFromUsage(glanced))[0]).toEqual(["today", "traffic", "overview", "users"]);
  });

  it("moves a page up when it is used, and Daily stays four", () => {
    // A release week: Releases read every day.
    const release = [...HIS_WEEK, viewUse("drop", 60, 2, 1_200_000), viewUse("patch-notes", 20, 1, 400_000)];
    const rail = railFromUsage(release);
    expectWhole(rail);
    expect(ids(rail)[0]).toEqual(["today", "drop", "traffic", "overview"]);
    // Users, pushed out of Daily, had more than a minute, so it waits in
    // When needed rather than folding away.
    expect(ids(rail)[1]).toContain("users");
  });

  it("folds a page with under a minute into Tools, but never Orders or Messages", () => {
    const quiet = HIS_WEEK.filter((v) => !["orders", "messages", "shop"].includes(v.tab)).concat([
      viewUse("shop", 3, 0, TOOL_MS - 1),
    ]);
    const rail = railFromUsage(quiet);
    expectWhole(rail);
    expect(ids(rail)[1]).toEqual(["orders", "messages"]);
    expect(ids(rail)[2]).toContain("shop");
  });

  it("adds up the views of one page", () => {
    // Users has a little; Money's four views together outweigh it.
    const rail = railFromUsage([
      viewUse("users", 12, 0, 120_000),
      viewUse("overview", 4, 0, 40_000),
      viewUse("revenue", 4, 0, 40_000),
      viewUse("subscriptions", 4, 0, 40_000),
      viewUse("costs", 4, 0, 40_000),
    ]);
    expect(ids(rail)[0].slice(0, 3)).toEqual(["today", "overview", "users"]);
  });

  it("leaves the rail as he picked it while the log is too thin to sort by", () => {
    const thin = [viewUse("drop", MIN_STAYS - 1, 0, 600_000)];
    expect(ids(railFromUsage(thin))).toEqual(ids(pickedRail()));
    expect(ids(railFromUsage([]))).toEqual(ids(pickedRail()));
    expect(ids(railFromUsage(null))).toEqual(ids(pickedRail()));
    expect(ids(railFromUsage(undefined))).toEqual(ids(pickedRail()));
  });

  it("ignores owner pages and tabs that no page holds", () => {
    const only = [viewUse("owner-model", 500, 0, 9_000_000), viewUse("growth", 500, 0, 9_000_000)];
    expect(ids(railFromUsage(only))).toEqual(ids(pickedRail()));
  });

  it("keeps every page reachable whatever the log says", () => {
    // A deterministic spread of logs, each a different mix of use.
    const tabs = shellViews();
    let seed = 7;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let run = 0; run < 60; run++) {
      const views = tabs
        .filter(() => next() < 0.7)
        .map((tab) => {
          const opens = Math.floor(next() * 60);
          return viewUse(tab, opens, Math.floor(next() * (opens + 1)), Math.floor(next() * 1_800_000));
        });
      expectWhole(railFromUsage(views));
    }
  });
});

describe("the rail cookie", () => {
  it("comes back as it went in", () => {
    const rail = railFromUsage(HIS_WEEK);
    const back = decodeRail(encodeRail(rail, "20261028"));
    expect(back.day).toBe("20261028");
    expect(ids(back.groups)).toEqual(ids(rail));
  });

  it("holds only characters a cookie value carries unescaped", () => {
    const value = encodeRail(pickedRail(), "20261028");
    expect(value).toMatch(/^[0-9a-z.~-]+$/);
    expect(value.length).toBeLessThan(200);
  });

  it("gives the picked rail for anything it cannot read", () => {
    for (const raw of [null, undefined, "", "nonsense", "~~~", "x".repeat(700), "2026~", "20261028"]) {
      const back = decodeRail(raw);
      expectWhole(back.groups);
      expect(ids(back.groups), String(raw).slice(0, 20)).toEqual(ids(pickedRail()));
    }
  });

  it("repairs a stale or hand-edited order rather than trusting it", () => {
    // Home not first, a page twice, a page that does not exist, five in
    // Daily, Orders folded into Tools, and Audit log missing altogether.
    const back = decodeRail(
      "2026-10-28~traffic.today.overview.users.shop.traffic~messages.nope~drop.content.community.eikon-box.health.orders",
    );
    expectWhole(back.groups);
    expect(back.day).toBeNull();
    expect(ids(back.groups)).toEqual([
      ["today", "traffic", "overview", "users"],
      ["shop", "messages", "orders"],
      ["drop", "content", "community", "eikon-box", "health", "audit"],
    ]);
  });

  it("normalizes the same way whoever built the lists", () => {
    expect(ids(normalizeRail([[], [], []]))).toEqual(ids(pickedRail()));
  });

  it("travels with the admin page only, for a year, and over https when asked", () => {
    const line = railCookie("v", true);
    expect(line.startsWith(`${RAIL_COOKIE}=v; `)).toBe(true);
    expect(line).toContain("Path=/admin");
    expect(line).toContain("SameSite=Lax");
    expect(line).toContain(`Max-Age=${365 * 86_400}`);
    expect(line).toContain("Secure");
    expect(railCookie("v", false)).not.toContain("Secure");
  });

  it("is dated by the local day", () => {
    expect(railDay(new Date(2026, 9, 28, 23, 59))).toBe("20261028");
    expect(railDay(new Date(2026, 0, 3, 0, 1))).toBe("20260103");
  });

  it("is read by the admin page and handed to the shell", () => {
    const page = readFileSync(join(process.cwd(), "app/admin/page.tsx"), "utf8");
    expect(page).toContain("cookies()).get(RAIL_COOKIE)");
    expect(page).toContain("savedRail={savedRail}");
    expect(SHELL).toContain("decodeRail(savedRail)");
  });
});
