import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ADMIN_VIEW_TABS, landingOf } from "../pages";

/**
 * Every link into the admin opens the view it names.
 *
 * The panel reads one form of address: `#tab=<view>` (AdminShell's readHash,
 * through landingOf). A bare hash (`/admin#orders`) or a query
 * (`/admin?tab=orders`) is read as nothing, so the panel opens on Home, the
 * fault Updates 3 found on 2026-11-13 in three owner alerts: a sale
 * (lib/admin/ownerAlert.ts), low stock (lib/shop/lowStockServer.ts) and the
 * hourly goals (app/api/cron/hourly-goals/route.ts). The same fault was in
 * the morning email and the billing alert before them. This walks every
 * source file that can send a reader of the admin a link, and holds each
 * link to a view a page holds.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const SCAN = ["app", "lib", "components"];

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      out.push(...files(p));
    } else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const sources = SCAN.flatMap((d) => files(path.join(ROOT, d))).map((p) => ({
  rel: path.relative(ROOT, p),
  src: fs.readFileSync(p, "utf8"),
}));

describe("links into the admin", () => {
  it("never use a bare hash or a query, which the panel reads as nothing", () => {
    const bad: string[] = [];
    for (const { rel, src } of sources) {
      for (const m of src.matchAll(/\/admin(#(?!tab=)[a-z]|\?tab=)[^"'`\s)]*/g)) {
        // A comment that tells the story of the old form is not a link.
        const line = src.slice(src.lastIndexOf("\n", m.index) + 1, src.indexOf("\n", m.index));
        if (/^\s*(\/\/|\*)/.test(line)) continue;
        bad.push(`${rel}: ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("each open a view some page holds", () => {
    const unknown: string[] = [];
    for (const { rel, src } of sources) {
      for (const m of src.matchAll(/\/admin#tab=([a-z-]+)/g)) {
        if (!landingOf(m[1])) unknown.push(`${rel}: #tab=${m[1]}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("the three owner alerts open orders, the catalogue's low stock and goals", () => {
    const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
    expect(read("lib/admin/ownerAlert.ts")).toContain('url: "/admin#tab=orders"');
    expect(read("lib/shop/lowStockServer.ts")).toContain('url: "/admin#tab=shop"');
    expect(read("app/api/cron/hourly-goals/route.ts")).toContain('url: "/admin#tab=goals"');
    for (const tab of ["orders", "shop", "goals"]) expect(ADMIN_VIEW_TABS).toContain(tab);
  });
});
