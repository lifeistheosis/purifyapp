import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CURRENT_VERSION } from "@/lib/whatsNew/version";

/**
 * The release notes are written by hand in two places and nothing kept them
 * together.
 *
 * `AGENTS.md` step 1 of the release ritual requires an entry in BOTH
 * `data/changelog/patches.json` and the inline `ENTRIES` array in
 * `app/(app)/whats-new/page.tsx`. They are separate files, authored
 * separately, with no generator between them.
 *
 * They had already drifted before this test existed: 20 sections against 21
 * items for the same release, and two different date formats for the same day.
 * Nothing failed, because nothing looked. Commit 97abd568's message claims
 * "the notes are generated from a single source into both places the release
 * ritual requires"; no such generator is in the tree, and this test is the
 * thing that actually holds the claim up.
 *
 * Note what is deliberately NOT asserted: that the wording matches. patches.json
 * carries short headings and whats-new carries full sentences, on purpose. What
 * must agree is which release is newest, and when it shipped.
 *
 * Also note that patches.json is currently read by exactly one consumer,
 * lib/changelog.ts, whose only consumer is the home-page hero chip, which uses
 * `title` and nothing else. Its intro and sections render nowhere today. That
 * is not a reason to let them rot: the file is the release record, and the
 * moment someone renders it a silent divergence becomes a public one.
 */
const ROOT = path.resolve(__dirname, "..", "..", "..");

type Patch = { version: string; date: string; title: string; intro: string };

function readPatches(): Patch[] {
  const raw = fs.readFileSync(
    path.join(ROOT, "data/changelog/patches.json"),
    "utf8",
  );
  return JSON.parse(raw) as Patch[];
}

/**
 * The first ENTRIES object, read out of the .tsx source.
 *
 * Regex rather than a real parse: this is a TSX module with JSX in it, so it
 * cannot simply be imported from a node test. Only the first entry's scalar
 * fields are needed, so the match is anchored to the array opening and stops
 * at the first `items:`. Do not extend this to parse the whole array.
 */
function readNewestEntry(): { version: string; date: string; source: string } {
  const source = fs.readFileSync(
    path.join(ROOT, "app/(app)/whats-new/page.tsx"),
    "utf8",
  );
  const start = source.indexOf("const ENTRIES: Entry[] = [");
  expect(start, "ENTRIES array not found in the whats-new page").toBeGreaterThan(-1);
  const head = source.slice(start, source.indexOf("items:", start));
  const version = head.match(/version:\s*"([^"]+)"/)?.[1];
  const date = head.match(/date:\s*"([^"]+)"/)?.[1];
  expect(version, "could not read version from the newest ENTRIES entry").toBeTruthy();
  expect(date, "could not read date from the newest ENTRIES entry").toBeTruthy();
  return { version: version!, date: date!, source };
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
  const newestEntry = readNewestEntry();

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
    const patchText = [
      newestPatch.title,
      newestPatch.intro,
      JSON.stringify(newestPatch),
    ].join(" ");
    expect(patchText).not.toMatch(/—/);

    // Bounded by the NEXT entry rather than by a character count. The window
    // used to be a flat 12,000 characters, which covered the newest entry
    // when it was written and stopped covering it the moment 1.3 grew to
    // thirteen items: the last two sat past the end and were checked by
    // nothing. A guard that silently shrinks as the thing it guards grows is
    // worse than none, because it still reads as covered.
    const entryStart = newestEntry.source.indexOf("const ENTRIES: Entry[] = [");
    const next = newestEntry.source.indexOf(
      "version:",
      newestEntry.source.indexOf("version:", entryStart) + 1,
    );
    const entryText = newestEntry.source.slice(
      entryStart,
      next > entryStart ? next : undefined,
    );
    expect(entryText).not.toMatch(/—/);
  });

  it("keeps patches.json newest-first, so latestPatch() is the latest", () => {
    // lib/changelog.ts does not sort; the hero chip reads index 0 verbatim.
    const dates = patches.slice(0, 5).map((p) => toIso(p.date));
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });
});
