import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ADMIN_PAGE_GROUPS,
  ADMIN_PAGES,
  ADMIN_VIEW_TABS,
  RETIRED_VIEWS,
  aliasesOf,
  headingOf,
  landingOf,
  pageOf,
  pageOfAny,
  tabViews,
  viewLabel,
} from "../pages";
import { OWNER_TAB_IDS } from "../tabs";

const SHELL = readFileSync(join(process.cwd(), "components/admin/AdminShell.tsx"), "utf8");

/** Every view id the shell draws, read from its COMPONENTS map. */
function shellComponentIds(): string[] {
  const block = SHELL.slice(SHELL.indexOf("const COMPONENTS"), SHELL.indexOf("};", SHELL.indexOf("const COMPONENTS")));
  return [...block.matchAll(/^\s+"?([a-z][a-z-]*)"?:\s/gm)].map((m) => m[1]);
}

/**
 * Every #tab= id the admin has ever answered, so none of them stops landing:
 * the ids of the 1.8 rail, Traffic's old name, and the ids sheet r3-15 retired.
 */
const EVERY_OLD_ID = [
  "today", "goals", "calendar", "traffic", "onboarding", "screens", "overview", "revenue", "subscriptions",
  "costs", "users", "verification", "badges", "orders", "fulfillment", "messages", "shop", "sourcing", "drop",
  "patch-notes", "push", "email", "content", "catechism", "ratings", "community", "ambassadors", "eikon-box",
  "health", "content-health", "audit", "usage", "growth",
];

describe("admin pages", () => {
  it("holds every view exactly once", () => {
    expect(new Set(ADMIN_VIEW_TABS).size).toBe(ADMIN_VIEW_TABS.length);
  });

  it("draws every view it holds, and holds every view the shell draws", () => {
    const ids = shellComponentIds();
    expect(ids.length).toBeGreaterThan(25);
    for (const id of ids) expect(ADMIN_VIEW_TABS, id).toContain(id);
    const owner = new Set<string>(OWNER_TAB_IDS);
    for (const tab of ADMIN_VIEW_TABS.filter((t) => !owner.has(t))) expect(ids, tab).toContain(tab);
  });

  it("lands every #tab= id the admin ever answered", () => {
    for (const id of EVERY_OLD_ID) {
      const to = landingOf(id);
      expect(to, id).not.toBeNull();
      expect(ADMIN_VIEW_TABS, `${id} lands on ${to?.tab}`).toContain(to!.tab);
    }
  });

  it("retires ids that are not views, onto views that are", () => {
    for (const [id, to] of Object.entries(RETIRED_VIEWS)) {
      expect(ADMIN_VIEW_TABS, `${id} is retired and a view at once`).not.toContain(id);
      expect(ADMIN_VIEW_TABS, `${id} lands nowhere`).toContain(to.tab);
    }
    expect(landingOf("nope")).toBeNull();
    expect(landingOf("toString")).toBeNull();
  });

  it("gives every owner tab a page in an owner group, and nothing else there", () => {
    for (const id of OWNER_TAB_IDS) {
      const g = ADMIN_PAGE_GROUPS.find((x) => x.pages.some((p) => p.id === pageOf(id)?.id));
      expect(g?.mode, id).toBe("owner");
    }
    for (const g of ADMIN_PAGE_GROUPS.filter((x) => x.mode === "owner")) {
      for (const p of g.pages) for (const v of p.views) expect(OWNER_TAB_IDS).toContain(v.tab);
    }
  });

  it("names each page by its first view, and keeps the operations rail short", () => {
    for (const p of ADMIN_PAGES) expect(p.id).toBe(p.views[0].tab);
    const ops = ADMIN_PAGE_GROUPS.filter((g) => g.mode === "ops").flatMap((g) => g.pages);
    expect(ops.length).toBeLessThanOrEqual(14);
  });

  it("opens on Home, the page that was Today, under its old id", () => {
    // The owner's pick A (2026-10-28). The id stays so #tab=today still lands.
    expect(ADMIN_PAGES[0].id).toBe("today");
    expect(ADMIN_PAGES[0].label).toBe("Home");
    expect(ADMIN_PAGES[0].views.map((v) => [v.tab, v.label])).toEqual([
      ["today", "Today"],
      ["goals", "Goals"],
      ["calendar", "Calendar"],
    ]);
  });

  it("starts the rail as he picked it: Daily, When needed, and a quiet Tools line", () => {
    const ops = ADMIN_PAGE_GROUPS.filter((g) => g.mode === "ops");
    expect(ops.map((g) => [g.group, g.pages.map((p) => p.label), Boolean(g.quiet)])).toEqual([
      ["Daily", ["Home", "Traffic", "Money", "Users"], false],
      ["When needed", ["Orders", "Messages", "Catalogue"], false],
      ["Tools", ["Releases", "Content", "Community", "EIKON Box", "Services", "Audit log"], true],
    ]);
  });

  it("gives each Daily page the one figure he opens it for (sheet r3-15, pick A)", () => {
    const daily = ADMIN_PAGE_GROUPS[0].pages;
    expect(daily.map((p) => [p.label, p.figure])).toEqual([
      ["Home", "waiting"],
      ["Traffic", "live"],
      ["Money", "revenue"],
      ["Users", "signups"],
    ]);
    // Only the Daily pages carry one.
    for (const p of ADMIN_PAGES.filter((x) => !daily.includes(x))) expect(p.figure, p.id).toBeUndefined();
  });

  it("has one level of views: Traffic's panels are its views now", () => {
    expect(pageOf("traffic")?.views.map((v) => v.label)).toEqual(["Overview", "Map", "Sources", "Onboarding", "Screens"]);
    expect(pageOf("traffic-map")?.id).toBe("traffic");
    expect(pageOf("sources")?.id).toBe("traffic");
  });

  it("makes Users one directory, Verification and Badges filters of it (pick C)", () => {
    expect(pageOf("users")?.views.map((v) => v.label)).toEqual(["Readers", "Live carts", "Abandoned checkouts"]);
    expect(pageOf("verification")).toBeNull();
    expect(landingOf("verification")).toEqual({ tab: "users", intent: "waiting" });
    expect(landingOf("badges")).toEqual({ tab: "users", intent: "badges" });
    expect(pageOfAny("verification")?.id).toBe("users");
    expect(aliasesOf("users").sort()).toEqual(["badges", "verification"]);
    expect(aliasesOf("traffic")).toEqual(["growth"]);
  });

  it("lands Fulfillment on Orders and Sourcing on the Catalogue (sheet r3-16)", () => {
    expect(pageOf("fulfillment")).toBeNull();
    expect(pageOf("sourcing")).toBeNull();
    expect(landingOf("fulfillment")).toEqual({ tab: "orders" });
    expect(landingOf("sourcing")).toEqual({ tab: "shop" });
    expect(pageOf("orders")?.views).toHaveLength(1);
    expect(pageOf("shop")?.views).toHaveLength(1);
  });

  it("writes one plain sentence per page and per view that has its own, without an em dash", () => {
    const dash = String.fromCharCode(0x2014);
    for (const p of ADMIN_PAGES) {
      expect(p.sentence.endsWith("."), p.id).toBe(true);
      expect(p.sentence.includes(dash), p.id).toBe(false);
      for (const v of p.views) {
        if (!v.sentence) continue;
        expect(v.sentence.endsWith("."), v.tab).toBe(true);
        expect(v.sentence.includes(dash), v.tab).toBe(false);
      }
    }
  });

  it("heads a view with its own title when it has one, else with its page", () => {
    const users = pageOf("users")!;
    expect(headingOf(users, "users").title).toBe("Readers");
    const traffic = pageOf("traffic")!;
    expect(headingOf(traffic, "traffic")).toEqual({ title: "Traffic", sentence: traffic.sentence });
    expect(headingOf(traffic, "traffic-map").title).toBe("Map");
    const money = pageOf("overview")!;
    expect(headingOf(money, "revenue").title).toBe("Money");
  });

  it("labels a view by its page when the page holds more than one", () => {
    expect(viewLabel("revenue")).toBe("Money: Revenue");
    expect(viewLabel("messages")).toBe("Messages");
    expect(viewLabel("orders")).toBe("Orders");
    expect(viewLabel("goals")).toBe("Home: Goals");
    expect(viewLabel("today")).toBe("Home: Today");
    expect(viewLabel("traffic")).toBe("Traffic: Overview");
    expect(viewLabel("overview")).toBe("Money: Overview");
    // A retired id reads as the view it lands on, so the usage readout of
    // his old weeks still says where he was.
    expect(viewLabel("verification")).toBe("Users: Readers");
    expect(viewLabel("nope")).toBe("nope");
  });
});

describe("the Tools pages and Strategy as he picked them (r3-17, 2026-10-30)", () => {
  const page = (id: string) => ADMIN_PAGES.find((p) => p.id === id);
  const tabs = (id: string) => tabViews(page(id)!).map((v) => v.tab);

  it("folds a view into its page without losing its link", () => {
    // Every folded view is still a view of exactly one page, so the shell
    // still routes its #tab= id, and it is never a page's first view.
    for (const p of ADMIN_PAGES) {
      expect(p.views[0].folded, p.id).toBeUndefined();
      for (const v of p.views.filter((x) => x.folded)) expect(pageOf(v.tab)?.id).toBe(p.id);
    }
  });

  it("draws Releases, Content, Community and Services as one page each", () => {
    // Releases A: one path; Content A: the editors' desk; Community A: one
    // queue with its own switch; Services A: the library is one line.
    for (const id of ["drop", "content", "community", "health"]) expect(tabs(id), id).toEqual([id]);
    expect(pageOf("patch-notes")?.id).toBe("drop");
    expect(pageOf("push")?.id).toBe("drop");
    expect(pageOf("email")?.id).toBe("drop");
    expect(pageOf("catechism")?.id).toBe("content");
    expect(pageOf("ratings")?.id).toBe("content");
    expect(pageOf("ambassadors")?.id).toBe("community");
    expect(pageOf("content-health")?.id).toBe("health");
  });

  it("opens the Audit log on his week, with the record second", () => {
    expect(tabs("usage")).toEqual(["usage", "audit"]);
    expect(viewLabel("usage")).toBe("Audit log: Your week");
    expect(viewLabel("audit")).toBe("Audit log: Record");
  });

  it("keeps Strategy one page that opens on the plan, with its three doors", () => {
    const owner = ADMIN_PAGE_GROUPS.filter((g) => g.mode === "owner").flatMap((g) => g.pages);
    expect(owner.map((p) => p.label)).toEqual(["Strategy"]);
    expect(tabs("owner-investors")).toEqual(["owner-investors", "owner-today", "owner-model", "owner-markets"]);
    expect(owner[0].views.map((v) => v.label)).toEqual(["The plan", "Counted", "The model", "Markets"]);
  });
});
