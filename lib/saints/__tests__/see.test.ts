// A saint's see is a bishop's city (build 93, the fresh-eyes walk, 2026-11-11).
//
// The facts list on a saint's page draws `see` under the label "See"
// (components/saints/SaintFacts.tsx, SaintStudyRail.tsx), and the structured
// data names it as his affiliation (lib/seo/jsonld.ts). Ninety-nine saints
// carried a role there in brackets, "(soldier)" or "(martyrs)", so St Menas,
// the saint of the day on Today's first tap, read "See (soldier)"; forty more
// carried an apostle's mission, an emperor's title, a monastery or "(lay)".
// None of those is a see. So a see stands only on a bishop.

import { describe, expect, it } from "vitest";

import { SAINTS } from "../saints";

/** A bishop's rank, as a saint's title or the start of his entry names it. */
const BISHOP = /\b(bishop|archbishop|patriarch|metropolitan|pope|hierarch|catholicos)s?\b/i;

/**
 * Bishops whose rank their title does not name, each with where his see
 * comes from.
 */
const NAMED: Record<string, string> = {
  "apostle-peter": "by tradition the first bishop of Antioch, then of Rome",
  "cyril-and-methodius": "St Methodius, Archbishop of Sirmium",
};

describe("a saint's see", () => {
  it("is never a role in brackets", () => {
    const wrong = SAINTS.filter((s) => s.see && /^\s*\(/.test(s.see)).map((s) => `${s.slug}: ${s.see}`);
    expect(wrong).toEqual([]);
  });

  it("stands only on a bishop", () => {
    const wrong = SAINTS.filter((s) => s.see && !NAMED[s.slug] && !BISHOP.test(s.epithet) && !BISHOP.test(s.shortBio.slice(0, 240))).map(
      (s) => `${s.slug}: ${s.see} (${s.epithet})`,
    );
    expect(wrong).toEqual([]);
  });

  it("names its exceptions only while they still carry a see", () => {
    for (const slug of Object.keys(NAMED)) expect(SAINTS.find((s) => s.slug === slug)?.see, slug).toBeTruthy();
  });
});
