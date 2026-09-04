import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CURRENT_VERSION } from "@/lib/whatsNew/version";

/**
 * The release notes are written by hand in two places and nothing kept them
 * together.
 *
 * `AGENTS.md` step 1 of the release ritual requires an entry in BOTH
 * `data/changelog/patches.json` and `data/changelog/entries.json`. They are
 * separate files, authored separately, with no generator between them.
 *
 * They had already drifted before this test existed: 20 sections against 21
 * items for the same release, and two different date formats for the same day.
 * Nothing failed, because nothing looked. Commit 97abd568's message claims
 * "the notes are generated from a single source into both places the release
 * ritual requires"; no such generator is in the tree, and this test is the
 * thing that actually holds the claim up.
 *
 * Until 2026-09-04 the entries lived inline in app/(app)/whats-new/page.tsx
 * and this test regex-scraped the newest one out of the TSX. They are JSON
 * now, the committed fallback behind the patch_notes table, so the test reads
 * the same file the page and the native bundle read.
 *
 * Note what is deliberately NOT asserted: that the wording matches. patches.json
 * carries short headings and entries.json carries full sentences, on purpose.
 * What must agree is which release is newest, and when it shipped.
 *
 * Also note that patches.json is currently read by exactly one consumer,
 * lib/changelog.ts, whose only consumer is the home-page hero chip, which uses
 * `title` and nothing else. Its intro and sections render nowhere today. That
 * is not a reason to let them rot: the file is the release record, and the
 * moment someone renders it a silent divergence becomes a public one.
 */
const ROOT = path.resolve(__dirname, "..", "..", "..");

type Patch = { version: string; date: string; title: string; intro: string };
type Entry = { version: string; kind: string; date: string; blurb: string; items: string[] };

function readPatches(): Patch[] {
  const raw = fs.readFileSync(
    path.join(ROOT, "data/changelog/patches.json"),
    "utf8",
  );
  return JSON.parse(raw) as Patch[];
}

function readEntries(): Entry[] {
  const raw = fs.readFileSync(
    path.join(ROOT, "data/changelog/entries.json"),
    "utf8",
  );
  const entries = JSON.parse(raw) as Entry[];
  expect(entries.length, "entries.json is empty").toBeGreaterThan(0);
  return entries;
}

/** "August 12, 2026" and "2026-08-12" both to "2026-08-12". */
function toIso(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(`${value} UTC`);
  expect(
    Number.isNaN(parsed.getTime()),
    `could not parse the date "${value}". The two files use different formats ` +
      `on purpose, but both have to name the same day.`,
  ).toBe(false);
  return parsed.toISOString().slice(0, 10);
}

describe("the two release-note sources agree", () => {
  const patches = readPatches();
  const newestPatch = patches[0];
  const entries = readEntries();
  const newestEntry = entries[0];

  it("name the same version at the top", () => {
    expect(newestPatch.version).toBe(newestEntry.version);
  });

  it("name the same day at the top", () => {
    expect(toIso(newestPatch.date)).toBe(toIso(newestEntry.date));
  });

  it("agree with CURRENT_VERSION", () => {
    // The badge, the seen-state key and the hero chip all key off this. A
    // release whose notes say 1.2 while CURRENT_VERSION says 1.1 re-arms the
    // "New" badge for nobody.
    expect(newestPatch.version).toBe(CURRENT_VERSION);
  });

  it("carry no em dash in the newest release notes", () => {
    // Enforced for the weekly note (board.test.ts), the i18n catalogues
    // (i18n-check.mjs) and saints prose, and nowhere for the release notes,
    // which is the copy a reader is most likely to meet one in.
    expect(JSON.stringify(newestPatch)).not.toMatch(/—/);
    // The whole entry, items included. The old TSX window silently shrank as
    // the entry grew; a JSON object has no such edge.
    expect(JSON.stringify(newestEntry)).not.toMatch(/—/);
  });

  it("keeps every entry the shape the page renders", () => {
    for (const e of entries) {
      expect(typeof e.version, `version on ${JSON.stringify(e).slice(0, 60)}`).toBe("string");
      expect(typeof e.kind, `kind on ${e.version}`).toBe("string");
      expect(typeof e.date, `date on ${e.version}`).toBe("string");
      expect(typeof e.blurb, `blurb on ${e.version}`).toBe("string");
      expect(Array.isArray(e.items), `items on ${e.version}`).toBe(true);
    }
  });

  it("keeps patches.json newest-first, so latestPatch() is the latest", () => {
    // lib/changelog.ts does not sort; the hero chip reads index 0 verbatim.
    const dates = patches.slice(0, 5).map((p) => toIso(p.date));
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });
});
