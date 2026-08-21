// No admin surface may read a response body without checking the response.
//
// This exists because it happened twice. Every route under /api/admin answers
// a failure with a JSON body, so `{ error: "Forbidden" }` from an expired
// session parses cleanly, gets stored as if it were the dashboard, and throws
// a TypeError on the first nested read during render. That throw lands in the
// route error boundary and takes the WHOLE panel with it: one stale session,
// and Orders, Push, Community and the rail all vanish behind "Something went
// wrong".
//
// Wave A found it in CommerceOverviewTab and fixed that one file. Six more had
// it, found 2026-08-20 by reading every fetch in the tree rather than trusting
// that the first fix had been general: RevenueTab, SubscriptionsTab,
// AudienceTab, EngagementTab, OverviewTab, SustainabilityTab.
//
// A source-text guard in the idiom of lib/admin/__tests__/adminTheme.test.ts.
// It cannot prove a component survives a 403; it proves nobody has written the
// shape that does not.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  path.join(process.cwd(), "components", "admin"),
  path.join(process.cwd(), "app", "admin"),
];

function sourceFiles(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(entry.name)) {
        out.push({
          file: path.relative(process.cwd(), p).replace(/\\/g, "/"),
          text: fs.readFileSync(p, "utf8"),
        });
      }
    }
  };
  ROOTS.forEach(walk);
  return out;
}

const FILES = sourceFiles();

/**
 * The exact shape that caused it: the response goes straight to .json() with
 * nothing consulting .ok in between.
 *
 * Matching `.then((r) => r.json())` and its `res`/`response` spellings is
 * deliberate over something cleverer. The safe forms in this tree all read
 * `.ok` on the same line or the one before, so a narrow literal pattern has no
 * false positives to explain away, and a reviewer can see at a glance what is
 * banned.
 */
const BARE_THEN_JSON = /\.then\(\s*\(?\s*(r|res|response)\s*\)?\s*=>\s*\1\.json\(\s*\)\s*,?\s*\)/;

describe("admin fetch guards", () => {
  it("has admin sources to check at all", () => {
    // Guards the walker: a moved directory would make every assertion below
    // pass over an empty set.
    expect(FILES.length).toBeGreaterThan(20);
  });

  it("never sends a response straight to .json() without checking it", () => {
    const offenders = FILES.filter((f) => BARE_THEN_JSON.test(f.text)).map((f) => f.file);
    expect(
      offenders,
      "Use adminJson() from lib/admin/fetchJson.ts, or check r.ok first:\n  " +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  it("keeps the tab boundary wired into the shell", () => {
    // The boundary is what stops the NEXT one of these from taking the panel
    // down. It only works from inside the shell, wrapped around the active
    // tab, so a refactor that lifts it out is a regression even though
    // everything still compiles.
    const shell = FILES.find((f) => f.file.endsWith("components/admin/AdminShell.tsx"));
    expect(shell, "AdminShell.tsx not found").toBeTruthy();
    expect(shell!.text).toContain("<TabBoundary");
  });
});
