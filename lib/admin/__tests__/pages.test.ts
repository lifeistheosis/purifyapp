import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ADMIN_PAGE_GROUPS, ADMIN_PAGES, ADMIN_VIEW_TABS, pageOf, viewLabel } from "../pages";
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

  it("opens on Today", () => {
    expect(ADMIN_PAGES[0].id).toBe("today");
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
  });
});
