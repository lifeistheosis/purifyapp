import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ADMIN_PAGE_GROUPS, ADMIN_PAGES, ADMIN_VIEW_TABS, pageOf, tabViews, viewLabel } from "../pages";
import { OWNER_TAB_IDS } from "../tabs";

const SHELL = readFileSync(join(process.cwd(), "components/admin/AdminShell.tsx"), "utf8");

/** Every view id the shell draws, read from its COMPONENTS map. */
function shellComponentIds(): string[] {
  const block = SHELL.slice(SHELL.indexOf("const COMPONENTS"), SHELL.indexOf("};", SHELL.indexOf("const COMPONENTS")));
  return [...block.matchAll(/^\s+"?([a-z][a-z-]*)"?:\s/gm)].map((m) => m[1]);
}

describe("admin pages (1.8 admin silent patch)", () => {
  it("holds every view exactly once", () => {
    expect(new Set(ADMIN_VIEW_TABS).size).toBe(ADMIN_VIEW_TABS.length);
  });

  it("keeps every tab the shell draws, so no old #tab= link is lost", () => {
    const ids = shellComponentIds();
    expect(ids.length).toBeGreaterThan(25);
    for (const id of ids) expect(ADMIN_VIEW_TABS, id).toContain(id);
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
    expect(ADMIN_PAGES[0].sentence).toBe("What needs you, the money and the visitors, in one look.");
    expect(ADMIN_PAGES[0].views.map((v) => v.tab)).toEqual(["today", "goals", "calendar"]);
  });

  it("starts the rail as he picked it: Daily, When needed, and a quiet Tools line", () => {
    const ops = ADMIN_PAGE_GROUPS.filter((g) => g.mode === "ops");
    expect(ops.map((g) => [g.group, g.pages.map((p) => p.label), Boolean(g.quiet)])).toEqual([
      ["Daily", ["Home", "Traffic", "Money", "Users"], false],
      ["When needed", ["Orders", "Messages", "Catalogue"], false],
      ["Tools", ["Releases", "Content", "Community", "EIKON Box", "Services", "Audit log"], true],
    ]);
  });

  it("writes one plain sentence per page, without an em dash", () => {
    for (const p of ADMIN_PAGES) {
      expect(p.sentence.endsWith("."), p.id).toBe(true);
      expect(p.sentence.includes(String.fromCharCode(0x2014)), p.id).toBe(false);
    }
  });

  it("labels a view by its page when the page holds more than one", () => {
    expect(viewLabel("fulfillment")).toBe("Orders: Fulfillment");
    expect(viewLabel("messages")).toBe("Messages");
    expect(viewLabel("goals")).toBe("Home: Goals");
  });

  it("does not say a page's name twice for its first view", () => {
    expect(viewLabel("today")).toBe("Home");
    expect(viewLabel("traffic")).toBe("Traffic");
    expect(viewLabel("overview")).toBe("Money: Overview");
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
