// Integrity gate for the saints corpus.
//
// The registry, the writing files on disk, the group tags and the menologion
// are four separate sources of truth that have to agree. Nothing in the app
// checks that at runtime: a `Work` whose JSON is missing renders a 404 on a
// page the index links to, and a calendar commemoration pointing at a slug
// that was never added is a dead tap. Both have happened.
//
// Opened alongside the August menologion workstream, which adds a large
// number of entries in a short time. See docs/editorial/august-menologion.md.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { SAINT_GROUPS, SAINT_GROUP_MEMBERSHIP } from "../groups";
import { SAINTS } from "../saints";
import { commemorationsOn } from "@/lib/calendar/orthodox";

import DAILY_SAINTS from "@/data/calendar/daily-saints.json";

const DATA_DIR = path.join(process.cwd(), "data", "saints");

const SAINT_SLUGS = new Set(SAINTS.map((s) => s.slug));
const GROUP_IDS = new Set(SAINT_GROUPS.map((g) => g.id));

type Commemoration = { name: string; slug?: string; note?: string; kind?: string };
const MENOLOGION = DAILY_SAINTS as Record<string, Commemoration[]>;

function writingPath(saintSlug: string, workSlug: string) {
  return path.join(DATA_DIR, saintSlug, `${workSlug}.json`);
}

describe("saints registry", () => {
  it("has no duplicate saint slugs", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const s of SAINTS) {
      if (seen.has(s.slug)) dupes.push(s.slug);
      seen.add(s.slug);
    }
    expect(dupes).toEqual([]);
  });

  it("gives every saint a name, an epithet and a short bio", () => {
    const offenders = SAINTS.filter(
      (s) => !s.name?.trim() || !s.epithet?.trim() || !s.shortBio?.trim(),
    ).map((s) => s.slug);
    expect(offenders).toEqual([]);
  });

  it("gives every saint at least one feast day", () => {
    const offenders = SAINTS.filter((s) => (s.feastDays ?? []).length === 0).map(
      (s) => s.slug,
    );
    expect(offenders).toEqual([]);
  });

  it("has no duplicate work slugs within a saint", () => {
    const offenders: string[] = [];
    for (const s of SAINTS) {
      const seen = new Set<string>();
      for (const w of s.works) {
        if (seen.has(w.slug)) offenders.push(`${s.slug}/${w.slug}`);
        seen.add(w.slug);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("uses no em dashes in user-facing prose", () => {
    // docs/editorial-standards.md: commas, colons and periods instead.
    //
    // These ten entries predate this gate and still carry em dashes. They are
    // listed rather than ignored so the debt is visible and so nothing NEW can
    // regress. Clear them with scripts/sweep-em-dashes.mjs and delete the
    // allowlist; do not add to it.
    const KNOWN = new Set([
      "cyril-of-alexandria",
      "ephraim-the-syrian",
      "isaac-the-syrian",
      "photius-the-great",
      "simeon-the-myrrh-streaming",
      "sava-of-serbia",
      "lazar-of-serbia",
      "basil-of-ostrog",
      "nikolaj-velimirovic",
      "justin-popovic",
    ]);
    const offenders: string[] = [];
    for (const s of SAINTS) {
      if (KNOWN.has(s.slug)) continue;
      const prose = [
        s.name,
        s.epithet,
        s.byname ?? "",
        s.shortBio,
        ...s.life,
        ...s.works.flatMap((w) => [w.title, w.subtitle ?? "", w.blurb]),
      ].join(" ");
      if (prose.includes("—")) offenders.push(s.slug);
    }
    expect(offenders).toEqual([]);
  });
});

describe("saints writings on disk", () => {
  it("ships a JSON file for every registered work", () => {
    const missing: string[] = [];
    for (const s of SAINTS) {
      for (const w of s.works) {
        if (!fs.existsSync(writingPath(s.slug, w.slug))) {
          missing.push(`${s.slug}/${w.slug}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("has each writing file agree with the registry on saint and work slug", () => {
    const offenders: string[] = [];
    for (const s of SAINTS) {
      for (const w of s.works) {
        const p = writingPath(s.slug, w.slug);
        if (!fs.existsSync(p)) continue;
        const doc = JSON.parse(fs.readFileSync(p, "utf8"));
        if (doc.saint !== s.slug || doc.slug !== w.slug) {
          offenders.push(`${s.slug}/${w.slug}: saint=${doc.saint} slug=${doc.slug}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  }, 120_000);
  // 120s, not the 30s default. This reads and JSON.parses every writing file
  // in the saints corpus. Alone it takes under two seconds; sharing a machine
  // with 140 other test files it has been seen to blow the default and fail a
  // green tree, which is a flake rather than a finding. Same reason as
  // lib/ingest/__tests__/scanArtifacts.test.ts.

  it("cites a source and carries sections in every writing file", () => {
    // Public-domain sourcing is binding (docs/editorial-standards.md). An
    // uncited writing file is the defect that produced the florilegium audit.
    const offenders: string[] = [];
    for (const s of SAINTS) {
      for (const w of s.works) {
        const p = writingPath(s.slug, w.slug);
        if (!fs.existsSync(p)) continue;
        const doc = JSON.parse(fs.readFileSync(p, "utf8"));
        if (!doc.source || String(doc.source).trim().length < 20) {
          offenders.push(`${s.slug}/${w.slug}: no usable source`);
        }
        if (!Array.isArray(doc.sections) || doc.sections.length === 0) {
          offenders.push(`${s.slug}/${w.slug}: no sections`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("numbers sections and gives each one paragraphs", () => {
    const offenders: string[] = [];
    for (const s of SAINTS) {
      for (const w of s.works) {
        const p = writingPath(s.slug, w.slug);
        if (!fs.existsSync(p)) continue;
        const doc = JSON.parse(fs.readFileSync(p, "utf8"));
        for (const sec of doc.sections ?? []) {
          if (typeof sec.n !== "number") {
            offenders.push(`${s.slug}/${w.slug}: section without n`);
          }
          if (!Array.isArray(sec.paragraphs) || sec.paragraphs.length === 0) {
            offenders.push(`${s.slug}/${w.slug}: section ${sec.n} has no paragraphs`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("saint group tags", () => {
  it("tags only saints that exist", () => {
    const unknown = Object.keys(SAINT_GROUP_MEMBERSHIP).filter(
      (slug) => !SAINT_SLUGS.has(slug),
    );
    expect(unknown).toEqual([]);
  });

  it("uses only declared group ids", () => {
    const offenders: string[] = [];
    for (const [slug, ids] of Object.entries(SAINT_GROUP_MEMBERSHIP)) {
      for (const id of ids) if (!GROUP_IDS.has(id)) offenders.push(`${slug}: ${id}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe("menologion cross-links", () => {
  it("points every commemoration slug at a saint in the registry", () => {
    const broken: string[] = [];
    for (const [day, entries] of Object.entries(MENOLOGION)) {
      for (const e of entries) {
        if (e.slug && !SAINT_SLUGS.has(e.slug)) broken.push(`${day}: ${e.slug}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("covers all 366 fixed-date days", () => {
    expect(Object.keys(MENOLOGION).length).toBe(366);
  });

  /**
   * The OTHER direction, which nothing checked and which is the easier
   * mistake to make.
   *
   * commemorationsOn() folds registry saints into a day when their feastDay
   * matches, and it skips the ones already present. But "already present" is
   * decided by SLUG (lib/calendar/orthodox.ts), and most menologion entries
   * are plain names with no slug. So adding a registry record for someone the
   * calendar already names in prose does not replace that line, it renders a
   * SECOND one right underneath it: the same saint twice, once as dead text
   * and once as a link.
   *
   * The test above catches a slug pointing at nobody. This catches a saint
   * being added without the slug that adopts the line already there. Adding
   * St. Arsenius the Great is what surfaced it: the May 8 entry had named him
   * in plain text all along.
   *
   * Names are compared with honorifics and punctuation stripped, because that
   * is the whole difference between "Ven. Arsenius the Great" in the JSON and
   * "St. Arsenius the Great" in the registry.
   */
  it("never lists the same saint twice on one day", () => {
    const normalise = (name: string) =>
      name
        .toLowerCase()
        .replace(/\b(st|ven|venerable|holy|righteous|blessed|our father among the saints)\b\.?/g, "")
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const dupes: string[] = [];
    for (const day of Object.keys(MENOLOGION)) {
      // The menologion is fixed-date, so the year only has to be one where
      // every key resolves to a real date. 2028 is a LEAP year, which is the
      // whole reason it was picked: in a common year Date.UTC(y, 1, 29) rolls
      // over to March 1 and the 02-29 entries would be silently checked
      // against the wrong day's commemorations.
      const [mm, dd] = day.split("-").map((n) => parseInt(n, 10));
      const date = new Date(Date.UTC(2028, mm - 1, dd));
      const names = commemorationsOn(date).map((c) => normalise(c.name));
      const seen = new Set<string>();
      for (const n of names) {
        if (!n) continue;
        if (seen.has(n)) dupes.push(`${day}: ${n}`);
        seen.add(n);
      }
    }
    expect(
      dupes,
      "The same saint appears twice on these days. Almost always this is a " +
        "registry record whose feastDay matches a menologion line that names " +
        "them in prose with no slug, so the fold-in adds a second row instead " +
        "of adopting the first. Add the slug to data/calendar/daily-saints.json " +
        "on that day:\n  " +
        dupes.join("\n  "),
    ).toEqual([]);
  });
});
